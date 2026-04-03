#!/usr/bin/env tsx
/**
 * DiggAI Anamnese Platform — Billing Data Backup Script
 * 
 * Erstellt ein verschlüsseltes Backup von Billing-Daten (Subscriptions, Transactions, Stripe-Referenzen).
 * Nutzt AES-256-GCM Verschlüsselung für DSGVO-konforme Datensicherung.
 * 
 * Verwendung:
 *   npx tsx scripts/backup-billing.ts [--dry-run]
 * 
 * Umgebungsvariablen:
 *   - DATABASE_URL: PostgreSQL Verbindungsstring
 *   - BACKUP_ENCRYPTION_KEY: 32+ Zeichen für AES-256
 *   - BACKUP_BUCKET: S3 Bucket Name
 *   - BACKUP_DIR: Lokales Backup-Verzeichnis (default: ./backups/billing)
 *   - AWS_REGION: AWS Region (default: eu-central-1)
 *   - AWS_ACCESS_KEY_ID: AWS Credentials
 *   - AWS_SECRET_ACCESS_KEY: AWS Credentials
 *   - BACKUP_RETENTION_DAYS: Aufbewahrungsdauer (default: 30)
 */

import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
import { promisify } from 'util';
import { getPrismaClientForDomain } from '../server/db.js';
import { config } from '../server/config';

// Lazy-load AWS SDK (optional dependency)
let S3Client: any;
let PutObjectCommand: any;

try {
    const awsSdk = require('@aws-sdk/client-s3');
    S3Client = awsSdk.S3Client;
    PutObjectCommand = awsSdk.PutObjectCommand;
} catch {
    console.warn('[BillingBackup] @aws-sdk/client-s3 nicht installiert. Lokales Backup wird erstellt.');
}

interface BackupConfig {
    outputDir: string;
    retentionDays: number;
    compress: boolean;
    uploadToS3: boolean;
    dryRun: boolean;
    encryptionKey: string;
}

interface BackupMetadata {
    timestamp: string;
    version: string;
    type: string;
    dryRun: boolean;
    counts: {
        subscriptions: number;
        transactions: number;
        customers: number;
    };
    checksums: {
        subscriptions: string;
        transactions: string;
        customers: string;
        metadata: string;
    };
}

class BillingBackup {
    private prisma = getPrismaClientForDomain('company');
    private config: BackupConfig;
    
    constructor(config: Partial<BackupConfig> = {}) {
        const isDryRun = process.argv.includes('--dry-run');
        
        this.config = {
            outputDir: process.env.BACKUP_DIR || './backups/billing',
            retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
            compress: true,
            uploadToS3: !!process.env.AWS_ACCESS_KEY_ID && !isDryRun,
            dryRun: isDryRun,
            encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || config.encryptionKey || config.encryptionKey || '',
            ...config
        };
    }
    
    async run(): Promise<void> {
        const timestamp = () => new Date().toISOString();
        const log = (level: string, message: string) => {
            console.log(`[${timestamp()}] [${level.toUpperCase()}] [BillingBackup] ${message}`);
        };

        log('info', `Starting backup... (Dry Run: ${this.config.dryRun})`);
        
        const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.config.outputDir, backupTimestamp);
        
        if (!this.config.dryRun) {
            await fs.mkdir(backupDir, { recursive: true });
        }
        
        try {
            // 1. Subscriptions backup
            log('info', 'Backing up subscriptions...');
            const subscriptions = await (this.prisma as any).subscription.findMany({
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            subdomain: true,
                            stripeCustomerId: true
                        }
                    }
                }
            });
            
            if (this.config.dryRun) {
                log('info', `[DRY RUN] Would backup ${subscriptions.length} subscriptions`);
            } else {
                await this.writeJson(backupDir, 'subscriptions.json', subscriptions);
            }
            
            // 2. Payment Transactions backup
            log('info', 'Backing up transactions...');
            const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 Tage
            const transactions = await (this.prisma as any).paymentTransaction.findMany({
                where: { createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' }
            });
            
            if (this.config.dryRun) {
                log('info', `[DRY RUN] Would backup ${transactions.length} transactions (since ${since.toISOString()})`);
            } else {
                await this.writeJson(backupDir, 'transactions.json', transactions);
            }
            
            // 3. Stripe Customer Mapping
            log('info', 'Backing up customer mapping...');
            const customers = await (this.prisma as any).tenant.findMany({
                where: { stripeCustomerId: { not: null } },
                select: {
                    id: true,
                    name: true,
                    stripeCustomerId: true,
                    stripeSubscriptionId: true
                }
            });
            
            if (this.config.dryRun) {
                log('info', `[DRY RUN] Would backup ${customers.length} Stripe customers`);
            } else {
                await this.writeJson(backupDir, 'stripe-customers.json', customers);
            }
            
            // 4. Metadata & Checksums
            const metadata: BackupMetadata = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                type: 'billing',
                dryRun: this.config.dryRun,
                counts: {
                    subscriptions: subscriptions.length,
                    transactions: transactions.length,
                    customers: customers.length
                },
                checksums: {
                    subscriptions: this.calculateChecksum(subscriptions),
                    transactions: this.calculateChecksum(transactions),
                    customers: this.calculateChecksum(customers),
                    metadata: '' // Wird später berechnet
                }
            };
            
            // Metadata checksum ohne sich selbst
            metadata.checksums.metadata = this.calculateChecksum(metadata);
            
            if (!this.config.dryRun) {
                await this.writeJson(backupDir, 'metadata.json', metadata);
            }
            
            log('info', `Backup data collected:`);
            log('info', `  - Subscriptions: ${subscriptions.length}`);
            log('info', `  - Transactions: ${transactions.length} (last 90 days)`);
            log('info', `  - Stripe Customers: ${customers.length}`);
            
            if (this.config.dryRun) {
                log('info', '[DRY RUN] No files written, no compression, no upload');
                log('info', '[DRY RUN] Backup simulation completed successfully');
                return;
            }
            
            // 5. Kompression & Verschlüsselung
            let finalPath = backupDir;
            if (this.config.compress) {
                finalPath = await this.compressAndEncrypt(backupDir);
            }
            
            // 6. S3 Upload (optional)
            if (this.config.uploadToS3) {
                await this.uploadToS3(finalPath, backupTimestamp);
            }
            
            // 7. Alte Backups aufräumen
            await this.cleanup();
            
            // 8. Backup-Metadaten in Datenbank speichern
            try {
                const stats = await fs.stat(finalPath);
                await (this.prisma as any).backupRecord?.create?.({
                    data: {
                        filename: path.basename(finalPath),
                        filePath: this.config.uploadToS3 
                            ? `s3://${process.env.BACKUP_BUCKET}/billing/${path.basename(finalPath)}` 
                            : finalPath,
                        fileSize: stats.size,
                        checksum: metadata.checksums.metadata,
                        status: 'COMPLETED',
                        type: 'billing',
                        trigger: 'manual',
                        appVersion: process.env.APP_VERSION || '3.0.0',
                        tablesIncluded: ['subscriptions', 'payment_transactions', 'tenants'],
                        encryptionKey: 'env:BACKUP_ENCRYPTION_KEY',
                        completedAt: new Date(),
                        duration: 0,
                    },
                });
                log('info', 'Backup metadata saved to database');
            } catch (dbErr) {
                log('warn', `Could not save backup metadata: ${dbErr}`);
            }
            
            log('info', 'Backup completed successfully ✓');
            log('info', `Location: ${finalPath}`);
            
        } catch (error) {
            log('error', `Backup failed: ${error}`);
            
            // Cleanup on error
            try {
                if (existsSync(backupDir)) {
                    await fs.rm(backupDir, { recursive: true });
                }
            } catch { /* ignore cleanup errors */ }
            
            process.exit(1);
        }
    }
    
    private calculateChecksum(data: unknown): string {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }
    
    private async writeJson(dir: string, filename: string, data: unknown): Promise<void> {
        const filepath = path.join(dir, filename);
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    }
    
    private async compressAndEncrypt(dir: string): Promise<string> {
        const timestamp = () => new Date().toISOString();
        const log = (level: string, message: string) => {
            console.log(`[${timestamp()}] [${level.toUpperCase()}] [BillingBackup] ${message}`);
        };

        log('info', 'Compressing backup...');
        
        const tarFile = `${dir}.tar.gz`;
        const encryptedFile = `${tarFile}.enc`;
        
        // Create tar.gz using tar command
        execFileSync('tar', [
            '-czf', tarFile,
            '-C', path.dirname(dir),
            path.basename(dir)
        ], { stdio: 'pipe' });
        
        // Remove uncompressed directory
        await fs.rm(dir, { recursive: true });
        
        log('info', `Compressed: ${tarFile}`);
        
        // Verschlüsselung
        if (this.config.encryptionKey) {
            log('info', 'Encrypting backup...');
            await this.encryptFile(tarFile, encryptedFile);
            await fs.unlink(tarFile);
            log('info', `Encrypted: ${encryptedFile}`);
            return encryptedFile;
        }
        
        return tarFile;
    }
    
    private async encryptFile(inputPath: string, outputPath: string): Promise<{ iv: string; tag: string }> {
        const key = crypto.createHash('sha256').update(this.config.encryptionKey).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);
        
        return new Promise((resolve, reject) => {
            let encryptedData = Buffer.alloc(0);
            
            input.on('data', (chunk) => {
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
                    
                    resolve({ iv: iv.toString('hex'), tag: tag.toString('hex') });
                } catch (err) {
                    reject(err);
                }
            });
            
            input.on('error', reject);
            output.on('error', reject);
        });
    }
    
    private async uploadToS3(backupPath: string, timestamp: string): Promise<void> {
        const log = (level: string, message: string) => {
            console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [BillingBackup] ${message}`);
        };

        if (!S3Client || !PutObjectCommand) {
            throw new Error('AWS SDK nicht verfügbar');
        }
        
        const bucket = process.env.BACKUP_BUCKET;
        if (!bucket) {
            throw new Error('BACKUP_BUCKET nicht konfiguriert');
        }
        
        log('info', `Uploading to S3 (Bucket: ${bucket})...`);
        
        const s3 = new S3Client({
            region: process.env.AWS_REGION || 'eu-central-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
        
        const key = `billing/${path.basename(backupPath)}`;
        const fileStream = createReadStream(backupPath);
        
        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileStream,
            ServerSideEncryption: 'AES256',
            StorageClass: 'STANDARD_IA',
            Metadata: {
                'backup-type': 'billing',
                'created-at': new Date().toISOString(),
                'app-version': process.env.APP_VERSION || '3.0.0',
            },
        }));
        
        log('info', `S3 Upload successful: s3://${bucket}/${key}`);
        
        // Lokale Datei nach Upload löschen (optional)
        if (process.env.BACKUP_KEEP_LOCAL !== 'true') {
            await fs.unlink(backupPath);
            log('info', 'Local backup file removed after S3 upload');
        }
    }
    
    private async cleanup(): Promise<void> {
        const log = (level: string, message: string) => {
            console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [BillingBackup] ${message}`);
        };

        log('info', `Cleaning up backups older than ${this.config.retentionDays} days...`);
        
        try {
            const files = await fs.readdir(this.config.outputDir);
            const now = Date.now();
            let deletedCount = 0;
            
            for (const file of files) {
                const filepath = path.join(this.config.outputDir, file);
                const stats = await fs.stat(filepath);
                const age = now - stats.mtime.getTime();
                
                if (age > this.config.retentionDays * 24 * 60 * 60 * 1000) {
                    await fs.rm(filepath, { recursive: true });
                    log('info', `Deleted old backup: ${file}`);
                    deletedCount++;
                }
            }
            
            log('info', `Cleanup complete. Deleted ${deletedCount} old backup(s)`);
        } catch (err) {
            log('warn', `Cleanup warning: ${err}`);
        }
    }
}

// CLI
const backup = new BillingBackup();
backup.run().catch((err) => {
    console.error('[BillingBackup] Unhandled error:', err);
    process.exit(1);
});
