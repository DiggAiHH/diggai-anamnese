#!/usr/bin/env tsx
/**
 * DiggAI Anamnese Platform — Datenbank-Backup Script
 * 
 * Erstellt ein verschlüsseltes PostgreSQL-Backup und lädt es zu S3 hoch.
 * Nutzt AES-256-GCM Verschlüsselung für DSGVO-konforme Datensicherung.
 * 
 * Verwendung:
 *   npx tsx scripts/backup-database.ts [full|incremental|schema_only]
 * 
 * Umgebungsvariablen:
 *   - DATABASE_URL: PostgreSQL Verbindungsstring
 *   - BACKUP_ENCRYPTION_KEY: 32+ Zeichen für AES-256
 *   - BACKUP_BUCKET: S3 Bucket Name
 *   - AWS_REGION: AWS Region (default: eu-central-1)
 *   - AWS_ACCESS_KEY_ID: AWS Credentials
 *   - AWS_SECRET_ACCESS_KEY: AWS Credentials
 */

import { execSync } from 'child_process';
import { createReadStream, createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from '../server/config';

// Lazy-load AWS SDK (optional dependency)
let S3Client: any;
let PutObjectCommand: any;

try {
    const awsSdk = require('@aws-sdk/client-s3');
    S3Client = awsSdk.S3Client;
    PutObjectCommand = awsSdk.PutObjectCommand;
} catch {
    console.warn('[Backup] @aws-sdk/client-s3 nicht installiert. Lokales Backup wird erstellt.');
}

// Konfiguration
const BACKUP_TYPE = (process.argv[2] as 'full' | 'incremental' | 'schema_only') || 'full';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || config.encryptionKey;
const BUCKET = process.env.BACKUP_BUCKET;

// Logging
const timestamp = () => new Date().toISOString();
const log = (level: string, message: string) => {
    console.log(`[${timestamp()}] [${level.toUpperCase()}] ${message}`);
};

// Verschlüsselungs-Funktionen (AES-256-GCM)
function encryptFile(inputPath: string, outputPath: string): { iv: string; tag: string; checksum: string } {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    
    const hash = crypto.createHash('sha256');

    return new Promise((resolve, reject) => {
        let encryptedData = Buffer.alloc(0);

        input.on('data', (chunk) => {
            hash.update(chunk);
            encryptedData = Buffer.concat([encryptedData, cipher.update(chunk)]);
        });

        input.on('end', () => {
            try {
                encryptedData = Buffer.concat([encryptedData, cipher.final()]);
                const tag = cipher.getAuthTag();
                
                // Write: [IV 16 bytes][Auth Tag 16 bytes][Encrypted Data]
                const header = Buffer.concat([iv, tag]);
                output.write(Buffer.concat([header, encryptedData]));
                output.end();
                
                const checksum = hash.digest('hex');
                resolve({ iv: iv.toString('hex'), tag: tag.toString('hex'), checksum });
            } catch (err) {
                reject(err);
            }
        });

        input.on('error', reject);
        output.on('error', reject);
        output.on('finish', () => {
            const checksum = hash.digest('hex');
            resolve({ iv: iv.toString('hex'), tag: tag.toString('hex'), checksum });
        });
    });
}

// Alternative: OpenSSL Verschlüsselung (falls native Probleme)
function encryptWithOpenSSL(inputPath: string, outputPath: string): void {
    const cmd = `openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -in "${inputPath}" -out "${outputPath}" -k "${ENCRYPTION_KEY}"`;
    execSync(cmd, { stdio: 'pipe' });
}

// S3 Upload
async function uploadToS3(filePath: string, key: string): Promise<void> {
    if (!S3Client || !BUCKET) {
        throw new Error('S3 nicht konfiguriert');
    }

    const s3 = new S3Client({
        region: process.env.AWS_REGION || 'eu-central-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    const fileStream = createReadStream(filePath);
    
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileStream,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA', // Infrequent Access für Backups
        Metadata: {
            'backup-type': BACKUP_TYPE,
            'created-at': new Date().toISOString(),
            'app-version': process.env.APP_VERSION || '3.0.0',
        },
    }));
}

// Haupt-Backup-Funktion
async function createBackup(): Promise<void> {
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `anamnese-${BACKUP_TYPE}-${backupTimestamp}.sql.gz.enc`;
    const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\temp' : '/tmp';
    
    // Ensure directories exist
    if (!existsSync(BACKUP_DIR)) {
        mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const localPath = path.join(BACKUP_DIR, filename);
    const tempPath = path.join(tempDir, `${filename}.tmp`);
    const compressedPath = `${tempPath}.gz`;

    log('info', `Starte Backup: ${filename}`);
    log('info', `Typ: ${BACKUP_TYPE}`);

    try {
        // 1. pg_dump ausführen
        log('info', 'Erstelle Datenbank-Dump...');
        const dbUrl = config.databaseUrl;
        const schemaFlag = BACKUP_TYPE === 'schema_only' ? '--schema-only' : '';
        
        const dumpCmd = `pg_dump "${dbUrl}" ${schemaFlag} --verbose --no-owner --no-privileges`;
        execSync(dumpCmd, { 
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024 * 100, // 100MB buffer
            timeout: 300000, // 5 minutes
        });
        
        // Write to temp file first
        execSync(`${dumpCmd} > "${tempPath}"`, { timeout: 300000 });
        log('info', `Dump erstellt: ${tempPath}`);

        // 2. Komprimieren mit gzip
        log('info', 'Komprimiere Backup...');
        execSync(`gzip -f "${tempPath}"`, { timeout: 120000 });
        log('info', `Komprimiert: ${compressedPath}`);

        // 3. Verschlüsseln
        log('info', 'Verschlüssele Backup...');
        let encryptionInfo: { iv?: string; tag?: string; checksum?: string } = {};
        
        try {
            encryptionInfo = await encryptFile(compressedPath, localPath);
        } catch {
            log('warn', 'Native Verschlüsselung fehlgeschlagen, nutze OpenSSL...');
            encryptWithOpenSSL(compressedPath, localPath);
            // Calculate checksum manually
            const hash = crypto.createHash('sha256');
            const fileBuffer = require('fs').readFileSync(localPath);
            hash.update(fileBuffer);
            encryptionInfo.checksum = hash.digest('hex');
        }
        
        const stats = require('fs').statSync(localPath);
        log('info', `Verschlüsselt: ${localPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        // 4. Zu S3 hochladen (falls konfiguriert)
        if (BUCKET && S3Client) {
            log('info', `Lade zu S3 hoch (Bucket: ${BUCKET})...`);
            await uploadToS3(localPath, `backups/${filename}`);
            log('info', 'S3 Upload erfolgreich');
            
            // Lokale Datei nach Upload löschen (optional)
            if (process.env.BACKUP_KEEP_LOCAL !== 'true') {
                unlinkSync(localPath);
                log('info', 'Lokale Backup-Datei entfernt');
            }
        } else {
            log('info', `Backup lokal gespeichert: ${localPath}`);
        }

        // 5. Cleanup temp files
        if (existsSync(compressedPath)) unlinkSync(compressedPath);
        if (existsSync(tempPath)) unlinkSync(tempPath);

        // 6. Metadaten in Datenbank speichern (falls verfügbar)
        try {
            const { prisma } = await import('../server/db');
            await (prisma as any).backupRecord.create({
                data: {
                    filename,
                    filePath: BUCKET ? `s3://${BUCKET}/backups/${filename}` : localPath,
                    fileSize: stats.size,
                    checksum: encryptionInfo.checksum || '',
                    status: 'COMPLETED',
                    type: BACKUP_TYPE,
                    trigger: 'manual',
                    appVersion: process.env.APP_VERSION || '3.0.0',
                    tablesIncluded: [],
                    encryptionKey: 'env:BACKUP_ENCRYPTION_KEY',
                    completedAt: new Date(),
                    duration: 0, // Wird nach Berechnung aktualisiert
                },
            });
            log('info', 'Backup-Metadaten in Datenbank gespeichert');
        } catch (dbErr) {
            log('warn', `Konnte Backup-Metadaten nicht speichern: ${dbErr}`);
        }

        log('info', 'Backup erfolgreich abgeschlossen ✓');
        
    } catch (error: any) {
        log('error', `Backup fehlgeschlagen: ${error.message}`);
        
        // Cleanup on error
        try {
            if (existsSync(compressedPath)) unlinkSync(compressedPath);
            if (existsSync(tempPath)) unlinkSync(tempPath);
            if (existsSync(localPath)) unlinkSync(localPath);
        } catch { /* ignore cleanup errors */ }
        
        process.exit(1);
    }
}

// Script ausführen
createBackup().catch((err) => {
    console.error('[Backup] Unbehandelter Fehler:', err);
    process.exit(1);
});
