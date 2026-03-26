// ============================================
// GDT Base Adapter
// ============================================
// Abstrakte Basisklasse für alle GDT-basierten PVS-Adapter
// Eliminiert Code-Duplikation (DRY-Prinzip)

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  PvsAdapter,
  PvsConnectionData,
  PvsType,
  PvsProtocol,
  GdtPatientData,
  PatientSearchResult,
  PatientSessionFull,
  TransferResult,
  AdapterCapabilities,
} from '../types.js';
import { parseGdtFile, extractPatientData } from '../gdt/gdt-parser.js';
import { buildAnamneseResult, writeGdtFile } from '../gdt/gdt-writer.js';
import { GDT_SATZARTEN } from '../gdt/gdt-constants.js';
import { PvsError } from '../errors/pvs-error.js';

/**
 * Abstract base class for GDT adapters
 * Implements common functionality for all GDT-based PVS systems
 */
export abstract class GdtBaseAdapter implements PvsAdapter {
  protected connection: PvsConnectionData | null = null;
  abstract readonly type: PvsType;
  readonly receiverId: string = '';
  readonly senderId: string = '';

  readonly supportedProtocols: PvsProtocol[] = ['GDT'];

  /**
   * Disconnect adapter
   */
  async disconnect(): Promise<void> {
    this.connection = null;
  }

  /**
   * Export patient (stub — GDT adapters export via exportAnamneseResult)
   */
  async exportPatient(_patient: PatientSearchResult): Promise<string> {
    throw new Error('exportPatient not implemented for GDT adapters');
  }

  /**
   * Initialize adapter with connection data
   */
  async initialize(connection: PvsConnectionData): Promise<void> {
    this.connection = connection;
    await this.onInitialize();
  }

  /**
   * Hook for subclass-specific initialization
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Test connection to PVS
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.connection) {
      return { ok: false, message: 'Keine Verbindung konfiguriert' };
    }

    const checks: string[] = [];
    let allOk = true;

    // Check import directory
    if (this.connection.gdtImportDir) {
      try {
        await fs.access(this.connection.gdtImportDir);
        const stat = await fs.stat(this.connection.gdtImportDir);
        if (stat.isDirectory()) {
          checks.push(`✅ Import-Verzeichnis: ${this.connection.gdtImportDir}`);
        } else {
          checks.push(`❌ Import-Pfad ist kein Verzeichnis`);
          allOk = false;
        }
      } catch {
        checks.push(`❌ Import-Verzeichnis nicht erreichbar: ${this.connection.gdtImportDir}`);
        allOk = false;
      }
    } else {
      checks.push('⚠️ Kein Import-Verzeichnis konfiguriert');
    }

    // Check export directory
    if (this.connection.gdtExportDir) {
      try {
        await fs.access(this.connection.gdtExportDir);
        const stat = await fs.stat(this.connection.gdtExportDir);
        if (stat.isDirectory()) {
          // Test write permission
          const testFile = path.join(this.connection.gdtExportDir, '.diggai_test');
          try {
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            checks.push(`✅ Export-Verzeichnis beschreibbar: ${this.connection.gdtExportDir}`);
          } catch {
            checks.push(`❌ Export-Verzeichnis nicht beschreibbar`);
            allOk = false;
          }
        } else {
          checks.push(`❌ Export-Pfad ist kein Verzeichnis`);
          allOk = false;
        }
      } catch {
        checks.push(`❌ Export-Verzeichnis nicht erreichbar: ${this.connection.gdtExportDir}`);
        allOk = false;
      }
    } else {
      checks.push('⚠️ Kein Export-Verzeichnis konfiguriert');
    }

    return { ok: allOk, message: checks.join('\n') };
  }

  /**
   * Import patient from GDT file
   */
  async importPatient(externalId: string): Promise<GdtPatientData | import('../types.js').FhirPatient> {
    if (!this.connection?.gdtImportDir) {
      throw PvsError.importDirMissing();
    }

    try {
      const files = await fs.readdir(this.connection.gdtImportDir);
      const gdtFiles = files.filter(f => f.toLowerCase().endsWith('.gdt'));

      for (const file of gdtFiles) {
        const filePath = path.join(this.connection.gdtImportDir, file);
        
        try {
          const content = await fs.readFile(filePath, { encoding: 'latin1' });
          const record = parseGdtFile(content);
          const patientData = extractPatientData(record);

          // Check if this is the patient we're looking for
          if (this.matchesPatient(patientData, externalId)) {
            // Archive processed file
            await this.archiveFile(filePath, file);
            return patientData;
          }
        } catch {
          // Skip unparseable files
          continue;
        }
      }

      throw PvsError.patientNotFound(externalId);
    } catch (error) {
      if (error instanceof PvsError) throw error;
      throw new PvsError(
        'PVS_GDT_1009_PATIENT_NOT_FOUND',
        `Fehler beim Import: ${(error as Error).message}`,
        { originalError: error as Error }
      );
    }
  }

  /**
   * Search patients in GDT files
   */
  async searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]> {
    if (!this.connection?.gdtImportDir) {
      throw PvsError.importDirMissing();
    }

    const results: PatientSearchResult[] = [];

    try {
      const files = await fs.readdir(this.connection.gdtImportDir);
      const gdtFiles = files.filter(f => f.toLowerCase().endsWith('.gdt'));

      for (const file of gdtFiles) {
        const filePath = path.join(this.connection.gdtImportDir, file);
        
        try {
          const content = await fs.readFile(filePath, { encoding: 'latin1' });
          const record = parseGdtFile(content);
          const patientData = extractPatientData(record);

          // Check if matches query
          if (this.matchesSearchQuery(patientData, query)) {
            results.push({
              pvsPatientId: patientData.patNr || file,
              pvsPatientNr: patientData.patNr,
              lastName: patientData.lastName || '',
              firstName: patientData.firstName || '',
              birthDate: patientData.birthDate ? patientData.birthDate.toISOString().split('T')[0] : undefined,
              insuranceNr: patientData.insuranceNr,
            });
          }
        } catch {
          // Skip unparseable files
          continue;
        }
      }

      return results;
    } catch (error) {
      throw new PvsError(
        'PVS_SYS_5004_UNKNOWN_ERROR',
        `Suchfehler: ${(error as Error).message}`,
        { originalError: error as Error }
      );
    }
  }

  /**
   * Export anamnese result to GDT
   */
  async exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult> {
    if (!this.connection?.gdtExportDir) {
      throw PvsError.exportDirMissing();
    }

    try {
      // Build GDT content
      const content = buildAnamneseResult(session, {
        senderId: this.senderId,
        receiverId: this.receiverId,
        satzart: (GDT_SATZARTEN as any).ANAMNESE_RESULT ?? GDT_SATZARTEN.ERGEBNIS_UEBERMITTELN,
        encoding: this.connection.gdtEncoding || 'ISO-8859-15',
      });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const patientId = session.patient?.patientNumber || session.id;
      const fileName = `DIGGAI_${this.type}_${patientId}_${timestamp}.gdt`;
      const filePath = path.join(this.connection.gdtExportDir, fileName);

      // Write file
      await writeGdtFile(filePath, content, this.connection.gdtEncoding || 'ISO-8859-15');

      return {
        success: true,
        transferLogId: session.id,
        pvsReferenceId: fileName,
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        transferLogId: session.id,
        error: (error as Error).message,
        warnings: [],
      };
    }
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterCapabilities {
    return {
      canImportPatients: true,
      canExportResults: true,
      canExportTherapyPlans: false,
      canReceiveOrders: false,
      canSearchPatients: true,
      supportsRealtime: false,
      supportedSatzarten: ['6310', '6311', '6301'],
      supportedFhirResources: [],
    };
  }

  /**
   * Archive processed file
   */
  protected async archiveFile(filePath: string, fileName: string): Promise<void> {
    if (!this.connection?.gdtImportDir) return;

    const archiveDir = path.join(this.connection.gdtImportDir, 'archiv');
    const archivePath = path.join(archiveDir, fileName);

    try {
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.rename(filePath, archivePath);
    } catch {
      // Fallback: copy and delete
      await fs.copyFile(filePath, archivePath);
      await fs.unlink(filePath);
    }
  }

  /**
   * Check if patient data matches external ID
   * Override in subclass for specific matching logic
   */
  protected matchesPatient(patientData: GdtPatientData, externalId: string): boolean {
    return (
      patientData.patNr === externalId ||
      patientData.insuranceNr === externalId
    );
  }

  /**
   * Check if patient data matches search query
   */
  protected matchesSearchQuery(
    patientData: GdtPatientData,
    query: { name?: string; birthDate?: string; kvnr?: string }
  ): boolean {
    if (query.kvnr && patientData.insuranceNr === query.kvnr) {
      return true;
    }

    if (query.name) {
      const normalizedQuery = query.name.toLowerCase();
      const normalizedName = `${patientData.lastName || ''} ${patientData.firstName || ''}`.toLowerCase();
      return normalizedName.includes(normalizedQuery);
    }

    return false;
  }
}
