// ============================================
// PVS Backup & Restore
// ============================================

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { writeFile, readFile, readdir, stat } from 'fs/promises';

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  version: string;
  connectionCount: number;
  size: number;
}

export class PvsBackupService {
  private backupDir: string;

  constructor(backupDir: string = './backups/pvs') {
    this.backupDir = backupDir;
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
  }

  async createBackup(connectionIds: string[]): Promise<BackupMetadata> {
    const backupId = `pvs-backup-${Date.now()}`;
    const backupPath = join(this.backupDir, backupId);
    
    mkdirSync(backupPath, { recursive: true });

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: new Date(),
      version: '3.0.0',
      connectionCount: connectionIds.length,
      size: 0,
    };

    await writeFile(join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
    console.log(`✅ Backup created: ${backupId}`);
    
    return metadata;
  }

  async listBackups(): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];
    
    try {
      const entries = await readdir(this.backupDir);
      
      for (const entry of entries) {
        const metadataPath = join(this.backupDir, entry, 'metadata.json');
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
          backups.push(metadata);
        }
      }
    } catch {
      // Directory might not exist
    }

    return backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const pvsBackupService = new PvsBackupService();
