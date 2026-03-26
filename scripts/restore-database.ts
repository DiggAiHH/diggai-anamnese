#!/usr/bin/env tsx
/**
 * DiggAI Anamnese Platform — Datenbank-Wiederherstellung Script
 * 
 * Stellt ein verschlüsseltes PostgreSQL-Backup aus S3 oder lokalem Speicher wieder her.
 * 
 * Verwendung:
 *   # Aus S3 wiederherstellen
 *   npx tsx scripts/restore-database.ts s3://bucket/backups/backup-file.sql.gz.enc
 * 
 *   # Lokal wiederherstellen
 *   npx tsx scripts/restore-database.ts /path/to/backup.sql.gz.enc
 * 
 *   # Mit Bestätigung überspringen (Danger Zone!)
 *   npx tsx scripts/restore-database.ts s3://bucket/backups/file.sql.gz.enc --force
 * 
 * Umgebungsvariablen:
 *   - DATABASE_URL: PostgreSQL Verbindungsstring
 *   - BACKUP_ENCRYPTION_KEY: Schlüssel für AES-256 Entschlüsselung
 *   - AWS_*: AWS Credentials für S3 Zugriff
 */

import { execSync } from 'child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from '../server/config';

// Lazy-load AWS SDK
let S3Client: any;
let GetObjectCommand: any;

try {
    const awsSdk = require('@aws-sdk/client-s3');
    S3Client = awsSdk.S3Client;
    GetObjectCommand = awsSdk.GetObjectCommand;
} catch {
    console.warn('[Restore] @aws-sdk/client-s3 nicht installiert.');
}

// Argumente parsen
const BACKUP_SOURCE = process.argv[2];
const FORCE_RESTORE = process.argv.includes('--force');
const SKIP_CONFIRMATION = process.argv.includes('--yes');

// Konfiguration
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || config.encryptionKey;
const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\temp' : '/tmp';

// Logging
const log = (level: string, message: string) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${level.toUpperCase()}] ${message}`);
};

// Hilfsfunktionen
function parseS3Url(url: string): { bucket: string; key: string } | null {
    const match = url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], key: match[2] };
}

async function downloadFromS3(bucket: string, key: string, outputPath: string): Promise<void> {
    if (!S3Client) {
        throw new Error('AWS SDK nicht installiert');
    }

    const s3 = new S3Client({
        region: process.env.AWS_REGION || 'eu-central-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    log('info', `Lade von S3: ${bucket}/${key}`);
    
    const response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    if (!response.Body) {
        throw new Error('Leere Antwort von S3');
    }

    const writeStream = createWriteStream(outputPath);
    await pipeline(response.Body as any, writeStream);
    
    log('info', `Download abgeschlossen: ${outputPath}`);
}

function decryptFile(inputPath: string, outputPath: string): void {
    log('info', 'Entschlüssele Backup...');
    
    // Prüfe Header für AES-256-GCM
    const fd = require('fs').openSync(inputPath, 'r');
    const header = Buffer.alloc(32);
    require('fs').readSync(fd, header, 0, 32, 0);
    require('fs').closeSync(fd);
    
    // Native Entschlüsselung versuchen (AES-256-GCM)
    try {
        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        const iv = header.subarray(0, 16);
        const tag = header.subarray(16, 32);
        
        const encrypted = require('fs').readFileSync(inputPath).subarray(32);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        require('fs').writeFileSync(outputPath, decrypted);
        
        log('info', 'Native Entschlüsselung erfolgreich');
        return;
    } catch (err) {
        log('warn', 'Native Entschlüsselung fehlgeschlagen, versuche OpenSSL...');
    }
    
    // Fallback zu OpenSSL (AES-256-CBC)
    try {
        const cmd = `openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in "${inputPath}" -out "${outputPath}" -k "${ENCRYPTION_KEY}"`;
        execSync(cmd, { stdio: 'pipe' });
        log('info', 'OpenSSL Entschlüsselung erfolgreich');
    } catch (err: any) {
        throw new Error(`Entschlüsselung fehlgeschlagen: ${err.message}`);
    }
}

async function confirmRestore(): Promise<boolean> {
    if (SKIP_CONFIRMATION) return true;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  WARNUNG: DATENBANK WIRD ZURÜCKGESETZT!  ⚠️               ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║  Dieser Vorgang wird:                                          ║');
    console.log('║  • ALLE bestehenden Patientendaten LÖSCHEN                     ║');
    console.log('║  • ALLE Anamnese-Einträge LÖSCHEN                              ║');
    console.log('║  • ALLE Termine und Wartelisten LÖSCHEN                        ║');
    console.log('║                                                                ║');
    console.log('║  Diese Aktion kann NICHT rückgängig gemacht werden!            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // In non-interactive mode, require --force
    if (!process.stdin.isTTY) {
        if (!FORCE_RESTORE) {
            log('error', 'Non-interactive Modus: Verwenden Sie --force für automatische Wiederherstellung');
            return false;
        }
        log('warn', 'Force-Flag gesetzt, überspringe Bestätigung');
        return true;
    }
    
    // Interactive confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('Geben Sie "RESTORE" ein, um fortzufahren: ', (answer: string) => {
            rl.close();
            resolve(answer.trim() === 'RESTORE');
        });
    });
}

async function restoreDatabase(): Promise<void> {
    if (!BACKUP_SOURCE) {
        console.error('Verwendung: restore-database.ts <s3://bucket/key | /local/path> [--force] [--yes]');
        console.error('');
        console.error('Optionen:');
        console.error('  --force    Vorhandene Datenbank überschreiben');
        console.error('  --yes      Bestätigung überspringen');
        process.exit(1);
    }
    
    log('info', '═══════════════════════════════════════════════════════════════');
    log('info', 'DiggAI Datenbank-Wiederherstellung');
    log('info', '═══════════════════════════════════════════════════════════════');
    log('info', `Quelle: ${BACKUP_SOURCE}`);
    
    // Bestätigung einholen
    const confirmed = await confirmRestore();
    if (!confirmed) {
        log('info', 'Wiederherstellung abgebrochen');
        process.exit(0);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const workDir = path.join(tempDir, `restore-${timestamp}`);
    mkdirSync(workDir, { recursive: true });
    
    const encryptedPath = path.join(workDir, 'backup.enc');
    const compressedPath = path.join(workDir, 'backup.sql.gz');
    const sqlPath = path.join(workDir, 'backup.sql');
    
    try {
        // 1. Backup herunterladen
        const s3Info = parseS3Url(BACKUP_SOURCE);
        if (s3Info) {
            await downloadFromS3(s3Info.bucket, s3Info.key, encryptedPath);
        } else if (existsSync(BACKUP_SOURCE)) {
            log('info', `Nutze lokale Datei: ${BACKUP_SOURCE}`);
            require('fs').copyFileSync(BACKUP_SOURCE, encryptedPath);
        } else {
            throw new Error(`Backup-Quelle nicht gefunden: ${BACKUP_SOURCE}`);
        }
        
        // 2. Entschlüsseln
        decryptFile(encryptedPath, compressedPath);
        
        // 3. Dekomprimieren
        log('info', 'Dekomprimiere Backup...');
        execSync(`gunzip -c "${compressedPath}" > "${sqlPath}"`, { timeout: 300000 });
        log('info', `SQL-Datei erstellt: ${sqlPath}`);
        
        // 4. Pre-restore: Aktuellen Zustand speichern (falls --force nicht gesetzt)
        if (!FORCE_RESTORE) {
            log('info', 'Erstelle Sicherheits-Backup des aktuellen Zustands...');
            const safetyBackup = path.join(workDir, 'pre-restore-backup.sql');
            try {
                execSync(`pg_dump "${config.databaseUrl}" > "${safetyBackup}"`, { timeout: 300000 });
                log('info', `Sicherheits-Backup: ${safetyBackup}`);
            } catch (err) {
                log('warn', 'Konnte kein Sicherheits-Backup erstellen');
            }
        }
        
        // 5. Datenbank wiederherstellen
        log('info', 'Starte Wiederherstellung...');
        
        // Verbindungsdaten parsen
        const dbUrl = new URL(config.databaseUrl);
        const dbName = dbUrl.pathname.slice(1);
        
        log('info', `Ziel-Datenbank: ${dbName}`);
        
        // Datenbank neu erstellen (alle Verbindungen trennen)
        try {
            const maintenanceCmd = `psql "${config.databaseUrl}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`;
            execSync(maintenanceCmd, { timeout: 30000 });
        } catch { /* ignore */ }
        
        // Restore durchführen
        const restoreCmd = `psql "${config.databaseUrl}" < "${sqlPath}"`;
        execSync(restoreCmd, { 
            timeout: 600000, // 10 Minuten
            stdio: 'inherit'
        });
        
        log('info', 'Wiederherstellung abgeschlossen ✓');
        
        // 6. Post-restore: Verification
        log('info', 'Führe Verifikation durch...');
        try {
            const result = execSync(`psql "${config.databaseUrl}" -c "SELECT COUNT(*) FROM \\"Patient\\";"`, { encoding: 'utf-8' });
            const count = result.match(/\d+/)?.[0] || 'unknown';
            log('info', `Verifikation: ${count} Patienten in Datenbank`);
        } catch (err) {
            log('warn', 'Verifikation fehlgeschlagen');
        }
        
        // 7. Cleanup
        log('info', 'Bereinige temporäre Dateien...');
        try {
            unlinkSync(encryptedPath);
            unlinkSync(compressedPath);
            unlinkSync(sqlPath);
            require('fs').rmdirSync(workDir);
        } catch { /* ignore cleanup errors */ }
        
        log('info', '═══════════════════════════════════════════════════════════════');
        log('info', 'Wiederherstellung erfolgreich abgeschlossen!');
        log('info', '═══════════════════════════════════════════════════════════════');
        
    } catch (error: any) {
        log('error', `Wiederherstellung fehlgeschlagen: ${error.message}`);
        
        // Cleanup bei Fehler
        try {
            if (existsSync(workDir)) {
                require('fs').rmSync(workDir, { recursive: true });
            }
        } catch { /* ignore */ }
        
        process.exit(1);
    }
}

// Script ausführen
restoreDatabase().catch((err) => {
    console.error('[Restore] Unbehandelter Fehler:', err);
    process.exit(1);
});
