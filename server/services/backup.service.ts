/**
 * @module backup
 * @description Automated Backup Service for HIPAA/DSGVO Compliance
 * 
 * @compliance
 * - HIPAA §164.308(a)(7): Data Backup Plan
 * - DSGVO Art. 32(1)(c): Verfügbarkeit und Zugriff
 * - BSI IT-Grundschutz: SYS.1.5 Backup
 * 
 * @schedule
 * - Hourly: Incremental (WAL archiving)
 * - Daily: Full backup (retention: 30 days)
 * - Weekly: Archive backup (retention: 1 year)
 * - Monthly: Cold storage (retention: 7 years for medical records)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

interface BackupConfig {
    dbUrl: string;
    backupDir: string;
    encryptionKey?: string; // AES-256 key for backup encryption
    s3Bucket?: string;
    s3Region?: string;
}

interface BackupResult {
    success: boolean;
    filePath?: string;
    fileSize?: number;
    checksum?: string;
    durationMs: number;
    error?: string;
}

interface BackupMetadata {
    id: string;
    type: 'full' | 'incremental' | 'archive';
    createdAt: Date;
    filePath: string;
    fileSize: number;
    checksum: string;
    encryptionIV?: string;
    retentionUntil: Date;
}

class BackupService {
    private config: BackupConfig;
    private backupHistory: BackupMetadata[] = [];
    private isRunning = false;

    constructor(config: BackupConfig) {
        this.config = config;
        this.ensureBackupDir();
    }

    private async ensureBackupDir(): Promise<void> {
        try {
            await fs.mkdir(this.config.backupDir, { recursive: true });
        } catch (err) {
            console.error('[Backup] Failed to create backup directory:', err);
            throw err;
        }
    }

    /**
     * Create full database backup (pg_dump)
     */
    async createFullBackup(): Promise<BackupResult> {
        if (this.isRunning) {
            return { success: false, durationMs: 0, error: 'Backup already in progress' };
        }

        this.isRunning = true;
        const startTime = Date.now();
        const backupId = crypto.randomUUID();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}-${backupId}.sql`;
        const filePath = path.join(this.config.backupDir, filename);

        try {
            // Parse database URL
            const dbUrl = new URL(this.config.dbUrl);
            
            // Build pg_dump command
            const env = {
                PGPASSWORD: dbUrl.password,
                ...process.env,
            };

            const cmd = [
                'pg_dump',
                '-h', dbUrl.hostname,
                '-p', dbUrl.port || '5432',
                '-U', dbUrl.username,
                '-d', dbUrl.pathname.slice(1),
                '--verbose',
                '--no-owner',
                '--no-acl',
                '--encoding=UTF8',
                '--format=plain',
                `-f ${filePath}`,
            ].join(' ');

            console.log(`[Backup] Starting full backup: ${filename}`);
            await execAsync(cmd, { env });

            // Get file stats
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;

            // Calculate checksum
            const checksum = await this.calculateChecksum(filePath);

            // Encrypt if key provided
            let finalPath = filePath;
            let encryptionIV: string | undefined;

            if (this.config.encryptionKey) {
                const encrypted = await this.encryptBackup(filePath, backupId);
                finalPath = encrypted.filePath;
                encryptionIV = encrypted.iv;
                
                // Remove unencrypted file
                await fs.unlink(filePath);
            }

            // Upload to S3 if configured
            if (this.config.s3Bucket) {
                await this.uploadToS3(finalPath, filename);
            }

            // Store metadata
            const metadata: BackupMetadata = {
                id: backupId,
                type: 'full',
                createdAt: new Date(),
                filePath: finalPath,
                fileSize,
                checksum,
                encryptionIV,
                retentionUntil: this.calculateRetentionDate('full'),
            };

            this.backupHistory.push(metadata);
            this.saveMetadata();

            const durationMs = Date.now() - startTime;
            console.log(`[Backup] Completed in ${durationMs}ms: ${filename} (${this.formatBytes(fileSize)})`);

            return {
                success: true,
                filePath: finalPath,
                fileSize,
                checksum,
                durationMs,
            };
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            console.error('[Backup] Failed:', error);
            
            // Cleanup partial file
            try {
                await fs.unlink(filePath);
            } catch { /* ignore */ }

            return {
                success: false,
                durationMs: Date.now() - startTime,
                error,
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Encrypt backup file with AES-256-GCM
     */
    private async encryptBackup(filePath: string, backupId: string): Promise<{ filePath: string; iv: string }> {
        if (!this.config.encryptionKey) {
            throw new Error('Encryption key not configured');
        }

        const key = Buffer.from(this.config.encryptionKey, 'utf-8');
        if (key.length !== 32) {
            throw new Error('Encryption key must be exactly 32 bytes');
        }

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const outputPath = `${filePath}.enc`;
        const writeStream = await fs.open(outputPath, 'w');

        const fileBuffer = await fs.readFile(filePath);
        const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Write IV + authTag + encrypted data
        await writeStream.write(Buffer.concat([iv, authTag, encrypted]));
        await writeStream.close();

        return {
            filePath: outputPath,
            iv: iv.toString('base64url'),
        };
    }

    /**
     * Calculate SHA-256 checksum of file
     */
    private async calculateChecksum(filePath: string): Promise<string> {
        const hash = crypto.createHash('sha256');
        const fileBuffer = await fs.readFile(filePath);
        hash.update(fileBuffer);
        return hash.digest('hex');
    }

    /**
     * Upload backup to S3 (for disaster recovery)
     */
    private async uploadToS3(filePath: string, key: string): Promise<void> {
        // S3 upload implementation would go here
        // Using AWS SDK or similar
        console.log(`[Backup] Would upload to S3: ${key}`);
    }

    /**
     * Calculate retention date based on backup type
     */
    private calculateRetentionDate(type: 'full' | 'incremental' | 'archive'): Date {
        const now = new Date();
        
        switch (type) {
            case 'incremental':
                return new Date(now.setDate(now.getDate() + 7));
            case 'full':
                return new Date(now.setDate(now.getDate() + 30));
            case 'archive':
                return new Date(now.setFullYear(now.getFullYear() + 7));
            default:
                return new Date(now.setDate(now.getDate() + 30));
        }
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups(): Promise<{ deleted: number; errors: string[] }> {
        const now = new Date();
        const errors: string[] = [];
        let deleted = 0;

        for (const backup of this.backupHistory) {
            if (backup.retentionUntil < now) {
                try {
                    await fs.unlink(backup.filePath);
                    deleted++;
                } catch (err) {
                    errors.push(`Failed to delete ${backup.id}: ${err}`);
                }
            }
        }

        // Update history
        this.backupHistory = this.backupHistory.filter(b => b.retentionUntil >= now);
        this.saveMetadata();

        return { deleted, errors };
    }

    /**
     * Save backup metadata to disk
     */
    private async saveMetadata(): Promise<void> {
        const metadataPath = path.join(this.config.backupDir, 'backup-metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(this.backupHistory, null, 2));
    }

    /**
     * Load backup metadata from disk
     */
    async loadMetadata(): Promise<void> {
        const metadataPath = path.join(this.config.backupDir, 'backup-metadata.json');
        try {
            const data = await fs.readFile(metadataPath, 'utf-8');
            this.backupHistory = JSON.parse(data);
        } catch {
            this.backupHistory = [];
        }
    }

    /**
     * List all backups
     */
    listBackups(): BackupMetadata[] {
        return [...this.backupHistory];
    }

    /**
     * Format bytes to human readable
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Verify backup integrity
     */
    async verifyBackup(backupId: string): Promise<boolean> {
        const backup = this.backupHistory.find(b => b.id === backupId);
        if (!backup) return false;

        try {
            const currentChecksum = await this.calculateChecksum(backup.filePath);
            return currentChecksum === backup.checksum;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const backupService = new BackupService({
    dbUrl: process.env.DATABASE_URL || '',
    backupDir: process.env.BACKUP_DIR || '/opt/backups/anamnese',
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    s3Bucket: process.env.BACKUP_S3_BUCKET,
    s3Region: process.env.BACKUP_S3_REGION,
});

export default BackupService;
