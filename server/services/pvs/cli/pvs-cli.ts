// ============================================
// PVS CLI Tool
// ============================================

import { readFileSync, writeFileSync } from 'fs';
import { credentialEncryption } from '../security/credential-encryption.service.js';

export class PvsCli {
  static async detect(): Promise<void> {
    console.log('🔍 Detecting PVS systems...');
    console.log('Run: npx tsx pvs-cli.ts detect');
  }

  static async encrypt(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const credentials = JSON.parse(content);
      const encrypted = credentialEncryption.encryptCredentials(credentials);
      writeFileSync(`${filePath}.encrypted`, JSON.stringify(encrypted, null, 2));
      console.log('✅ Encrypted successfully');
    } catch (error) {
      console.error('❌ Encryption failed:', (error as Error).message);
    }
  }
}
