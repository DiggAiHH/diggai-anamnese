// Modul 6: Backup & Recovery Service — pg_dump → AES-256-GCM → SHA-256 checksum
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { BackupRequest, BackupRecordData, RestoreRequest, BackupSchedule } from './types';

const prisma = () => (globalThis as any).__prisma;

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || '';

// Ensure backup directory exists
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function generateChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function encryptFile(inputPath: string, outputPath: string): { iv: string; tag: string } {
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const input = fs.readFileSync(inputPath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Write: [IV 16 bytes][Auth Tag 16 bytes][Encrypted Data]
  fs.writeFileSync(outputPath, Buffer.concat([iv, tag, encrypted]));

  return { iv: iv.toString('hex'), tag: tag.toString('hex') };
}

function decryptFile(inputPath: string, outputPath: string): void {
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest();
  const data = fs.readFileSync(inputPath);

  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
}

export async function createBackup(request: BackupRequest = {}): Promise<BackupRecordData> {
  const db = prisma();
  if (!db) throw new Error('Database not available');

  ensureBackupDir();

  const type = request.type || 'full';
  const trigger = request.trigger || 'manual';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpFilename = `diggai_${type}_${timestamp}.sql`;
  const dumpPath = path.join(BACKUP_DIR, dumpFilename);

  // Create backup record
  const record = await db.backupRecord.create({
    data: {
      filename: dumpFilename,
      filePath: dumpPath,
      fileSize: 0,
      checksum: '',
      status: 'IN_PROGRESS',
      type,
      trigger,
      appVersion: process.env.APP_VERSION || '3.0.0',
      tablesIncluded: request.tables || [],
    },
  });

  try {
    // Execute pg_dump
    const dbUrl = process.env.DATABASE_URL || '';
    const tableArgs = request.tables?.map(t => `-t ${t}`).join(' ') || '';
    const schemaFlag = type === 'schema_only' ? '--schema-only' : '';
    const cmd = `pg_dump "${dbUrl}" ${schemaFlag} ${tableArgs} -f "${dumpPath}"`;

    execSync(cmd, { timeout: 300000 }); // 5 min timeout

    // Encrypt if key is set
    let finalPath = dumpPath;
    if (ENCRYPTION_KEY) {
      const encPath = dumpPath + '.enc';
      encryptFile(dumpPath, encPath);
      fs.unlinkSync(dumpPath); // Remove unencrypted
      finalPath = encPath;
    }

    const stats = fs.statSync(finalPath);
    const checksum = generateChecksum(finalPath);

    // Get record counts
    const recordCounts: Record<string, number> = {};
    if (type !== 'schema_only') {
      const tables = ['Patient', 'PatientSession', 'Answer', 'ArztUser', 'QueueEntry', 'Appointment'];
      for (const table of tables) {
        try {
          recordCounts[table] = await (db as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
        } catch { /* skip missing tables */ }
      }
    }

    // Update record
    const updated = await db.backupRecord.update({
      where: { id: record.id },
      data: {
        filename: path.basename(finalPath),
        filePath: finalPath,
        fileSize: stats.size,
        checksum,
        status: 'COMPLETED',
        completedAt: new Date(),
        duration: Math.floor((Date.now() - new Date(record.startedAt).getTime()) / 1000),
        recordCounts,
        encryptionKey: ENCRYPTION_KEY ? 'env:BACKUP_ENCRYPTION_KEY' : null,
      },
    });

    return mapBackupRecord(updated);
  } catch (error: any) {
    await db.backupRecord.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMessage: error.message, completedAt: new Date() },
    });
    throw error;
  }
}

export async function restoreBackup(request: RestoreRequest): Promise<{ success: boolean; message: string }> {
  const db = prisma();
  if (!db) throw new Error('Database not available');

  const backup = await db.backupRecord.findUnique({ where: { id: request.backupId } });
  if (!backup) throw new Error('Backup not found');
  if (backup.status !== 'COMPLETED') throw new Error('Backup is not in COMPLETED state');

  let restorePath = backup.filePath;

  // Verify checksum
  if (request.verifyChecksum !== false) {
    const currentChecksum = generateChecksum(restorePath);
    if (currentChecksum !== backup.checksum) {
      throw new Error('Backup checksum verification failed — file may be corrupted');
    }
  }

  try {
    // Decrypt if needed
    if (restorePath.endsWith('.enc')) {
      const decPath = restorePath.replace('.enc', '.restore.sql');
      decryptFile(restorePath, decPath);
      restorePath = decPath;
    }

    await db.backupRecord.update({
      where: { id: request.backupId },
      data: { status: 'RESTORING' },
    });

    // Execute pg_restore
    const dbUrl = process.env.DATABASE_URL || '';
    const tableArgs = request.targetTables?.map(t => `-t ${t}`).join(' ') || '';
    execSync(`psql "${dbUrl}" ${tableArgs} < "${restorePath}"`, { timeout: 600000 });

    // Cleanup temp decrypt file
    if (restorePath.endsWith('.restore.sql')) {
      fs.unlinkSync(restorePath);
    }

    await db.backupRecord.update({
      where: { id: request.backupId },
      data: { status: 'COMPLETED', restoredAt: new Date() },
    });

    return { success: true, message: 'Backup erfolgreich wiederhergestellt' };
  } catch (error: any) {
    await db.backupRecord.update({
      where: { id: request.backupId },
      data: { status: 'FAILED', errorMessage: `Restore failed: ${error.message}` },
    });
    throw error;
  }
}

export async function listBackups(params?: { status?: string; limit?: number }): Promise<BackupRecordData[]> {
  const db = prisma();
  if (!db) return [];

  const where = params?.status ? { status: params.status } : {};
  const backups = await db.backupRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params?.limit || 50,
  });

  return backups.map(mapBackupRecord);
}

export async function deleteBackup(id: string): Promise<void> {
  const db = prisma();
  if (!db) throw new Error('Database not available');

  const backup = await db.backupRecord.findUnique({ where: { id } });
  if (!backup) throw new Error('Backup not found');

  // Delete file
  if (fs.existsSync(backup.filePath)) {
    fs.unlinkSync(backup.filePath);
  }

  await db.backupRecord.delete({ where: { id } });
}

export async function getBackupSchedule(): Promise<BackupSchedule> {
  const db = prisma();
  const defaults: BackupSchedule = { enabled: false, cronExpression: '0 2 * * *', type: 'full', retentionDays: 30, maxBackups: 10 };
  if (!db) return defaults;

  try {
    const configs = await db.systemConfig.findMany({ where: { category: 'backup' } });
    const map = new Map<string, string>(configs.map((c: any) => [c.key, c.value]));
    return {
      enabled: map.get('backup.schedule.enabled') === 'true',
      cronExpression: map.get('backup.schedule.cron') || defaults.cronExpression,
      type: (map.get('backup.schedule.type') as 'full' | 'incremental') || defaults.type,
      retentionDays: parseInt(map.get('backup.retention.days') || '30', 10),
      maxBackups: parseInt(map.get('backup.max.count') || '10', 10),
    };
  } catch {
    return defaults;
  }
}

function mapBackupRecord(r: any): BackupRecordData {
  return {
    id: r.id,
    filename: r.filename,
    fileSize: r.fileSize,
    checksum: r.checksum,
    status: r.status,
    type: r.type,
    trigger: r.trigger,
    dbVersion: r.dbVersion,
    appVersion: r.appVersion,
    startedAt: r.startedAt?.toISOString?.() || r.startedAt,
    completedAt: r.completedAt?.toISOString?.() || r.completedAt,
    duration: r.duration,
    errorMessage: r.errorMessage,
  };
}
