// ============================================
// CGM M1 PRO Adapter — GDT-basiert
// ============================================

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  PvsAdapter,
  PvsConnectionData,
  PvsType,
  PvsProtocol,
  AdapterCapabilities,
  TransferResult,
  PatientSessionFull,
  PatientSearchResult,
  GdtPatientData,
} from '../types.js';
import { parseGdtFile, extractPatientData, validateGdtRecord } from '../gdt/gdt-parser.js';
import { buildAnamneseResult, writeGdtFile, buildStammdatenAnfordern } from '../gdt/gdt-writer.js';

/**
 * Adapter for CGM M1 PRO, TurboMed, and other CGM-family PVS systems.
 * Communicates via GDT 3.0 file exchange.
 */
export class CgmM1Adapter implements PvsAdapter {
  readonly type: PvsType = 'CGM_M1';
  readonly supportedProtocols: PvsProtocol[] = ['GDT'];

  private connection: PvsConnectionData | null = null;

  async initialize(connection: PvsConnectionData): Promise<void> {
    this.connection = connection;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.connection) {
      return { ok: false, message: 'Keine Verbindung konfiguriert' };
    }

    const checks: string[] = [];
    let allOk = true;

    // Check import dir
    if (this.connection.gdtImportDir) {
      try {
        await fs.access(this.connection.gdtImportDir);
        checks.push('✅ Import-Verzeichnis erreichbar');
      } catch {
        checks.push('❌ Import-Verzeichnis nicht erreichbar');
        allOk = false;
      }
    }

    // Check export dir
    if (this.connection.gdtExportDir) {
      try {
        await fs.access(this.connection.gdtExportDir);
        // Test write
        const testFile = path.join(this.connection.gdtExportDir, '.diggai_test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        checks.push('✅ Export-Verzeichnis erreichbar + Schreibrechte');
      } catch {
        checks.push('❌ Export-Verzeichnis nicht erreichbar oder keine Schreibrechte');
        allOk = false;
      }
    }

    if (!this.connection.gdtImportDir && !this.connection.gdtExportDir) {
      return { ok: false, message: 'Weder Import- noch Export-Verzeichnis konfiguriert' };
    }

    return {
      ok: allOk,
      message: checks.join('\n'),
    };
  }

  async disconnect(): Promise<void> {
    this.connection = null;
  }

  async importPatient(externalId: string): Promise<GdtPatientData> {
    if (!this.connection?.gdtImportDir) {
      throw new Error('GDT Import-Verzeichnis nicht konfiguriert');
    }

    // Look for a GDT file with this patient number in the import dir
    const files = await fs.readdir(this.connection.gdtImportDir);
    const gdtFiles = files.filter(f => f.toLowerCase().endsWith('.gdt'));

    for (const file of gdtFiles) {
      const filePath = path.join(this.connection.gdtImportDir, file);
      const content = await fs.readFile(filePath, { encoding: 'latin1' });
      const record = parseGdtFile(content);

      if (record.satzart === '6311') { // Stammdaten übermitteln
        const patData = extractPatientData(record);
        if (patData.patNr === externalId) {
          // Archive the processed file
          const archiveDir = path.join(this.connection.gdtImportDir, 'archiv');
          await fs.mkdir(archiveDir, { recursive: true });
          await fs.rename(filePath, path.join(archiveDir, file));
          return patData;
        }
      }
    }

    throw new Error(`Patient ${externalId} nicht in GDT-Import gefunden`);
  }

  async exportPatient(_patient: PatientSearchResult): Promise<string> {
    // CGM M1 doesn't support direct patient export — only results
    throw new Error('Patient-Export wird von CGM M1 nicht unterstützt');
  }

  async searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]> {
    if (!this.connection?.gdtExportDir || !this.connection?.gdtImportDir) {
      throw new Error('GDT-Verzeichnisse nicht konfiguriert');
    }

    // Request patient data via GDT 6310 (Stammdaten anfordern)
    // In real implementation, we'd write a 6310 file and wait for 6311 response
    // For MVP: scan import dir for existing 6311 files matching query
    const results: PatientSearchResult[] = [];
    const files = await fs.readdir(this.connection.gdtImportDir).catch(() => []);
    const gdtFiles = files.filter(f => f.toLowerCase().endsWith('.gdt'));

    for (const file of gdtFiles) {
      try {
        const filePath = path.join(this.connection.gdtImportDir!, file);
        const content = await fs.readFile(filePath, { encoding: 'latin1' });
        const record = parseGdtFile(content);

        if (record.satzart === '6311') {
          const patData = extractPatientData(record);
          const matchesName = !query.name ||
            patData.lastName.toLowerCase().includes(query.name.toLowerCase()) ||
            patData.firstName.toLowerCase().includes(query.name.toLowerCase());
          const matchesKvnr = !query.kvnr || patData.insuranceNr === query.kvnr;

          if (matchesName && matchesKvnr) {
            results.push({
              pvsPatientId: patData.patNr,
              lastName: patData.lastName,
              firstName: patData.firstName,
              birthDate: patData.birthDate?.toISOString().split('T')[0],
              gender: patData.gender,
              insuranceNr: patData.insuranceNr,
            });
          }
        }
      } catch {
        // Skip unparseable files
      }
    }

    return results;
  }

  async exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult> {
    if (!this.connection?.gdtExportDir) {
      return {
        success: false,
        transferLogId: '',
        error: 'GDT Export-Verzeichnis nicht konfiguriert',
      };
    }

    try {
      const gdtContent = buildAnamneseResult(session, {
        satzart: '6301',
        senderId: this.connection.gdtSenderId || 'DIGGAI01',
        receiverId: this.connection.gdtReceiverId || 'CGMM1001',
        encoding: this.connection.gdtEncoding || 'ISO-8859-15',
      });

      const patNr = session.patient?.patientNumber || session.patientId || 'unknown';
      const filePath = await writeGdtFile(gdtContent, this.connection.gdtExportDir, patNr);

      return {
        success: true,
        transferLogId: `gdt-${Date.now()}`,
        pvsReferenceId: path.basename(filePath),
        warnings: [],
      };
    } catch (err) {
      return {
        success: false,
        transferLogId: '',
        error: (err as Error).message,
      };
    }
  }

  getCapabilities(): AdapterCapabilities {
    return {
      canImportPatients: true,
      canExportResults: true,
      canExportTherapyPlans: false,
      canReceiveOrders: true,
      canSearchPatients: true,
      supportsRealtime: false,
      supportedSatzarten: ['6310', '6311', '6302', '6301'],
      supportedFhirResources: [],
    };
  }
}
