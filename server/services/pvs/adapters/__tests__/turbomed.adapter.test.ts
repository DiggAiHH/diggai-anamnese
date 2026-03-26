// ============================================
// TurbomedAdapter Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TurbomedAdapter } from '../turbomed.adapter.js';
import type { PvsConnectionData, PatientSessionFull } from '../../types.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
  },
}));

// Mock GDT parser
vi.mock('../../gdt/gdt-parser.js', () => ({
  parseGdtFile: vi.fn(),
  extractPatientData: vi.fn(),
  validateGdtRecord: vi.fn(),
}));

// Mock GDT writer
vi.mock('../../gdt/gdt-writer.js', () => ({
  buildAnamneseResult: vi.fn(),
  writeGdtFile: vi.fn(),
  buildStammdatenAnfordern: vi.fn(),
}));

import { parseGdtFile, extractPatientData } from '../../gdt/gdt-parser.js';
import { buildAnamneseResult, writeGdtFile } from '../../gdt/gdt-writer.js';

describe('TurbomedAdapter', () => {
  let adapter: TurbomedAdapter;
  let mockConnection: PvsConnectionData;

  beforeEach(() => {
    adapter = new TurbomedAdapter();
    mockConnection = {
      id: 'test-conn-1',
      praxisId: 'praxis-1',
      pvsType: 'TURBOMED',
      protocol: 'GDT',
      gdtImportDir: '/tmp/import',
      gdtExportDir: '/tmp/export',
      gdtSenderId: 'DIGGAI01',
      gdtReceiverId: 'TURBOMED1',
      isActive: true,
      syncIntervalSec: 60,
      retryCount: 3,
      autoMapFields: true,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with connection data', async () => {
      await adapter.initialize(mockConnection);
      // Adapter should be initialized (no error thrown)
      expect(adapter.type).toBe('TURBOMED');
      expect(adapter.supportedProtocols).toContain('GDT');
    });
  });

  describe('testConnection', () => {
    it('should return error when no connection configured', async () => {
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Keine Verbindung konfiguriert');
    });

    it('should return success when both directories are accessible', async () => {
      await adapter.initialize(mockConnection);
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await adapter.testConnection();
      
      expect(result.ok).toBe(true);
      expect(result.message).toContain('Import-Verzeichnis erreichbar');
      expect(result.message).toContain('Export-Verzeichnis erreichbar');
    });

    it('should return error when import directory is not accessible', async () => {
      await adapter.initialize(mockConnection);
      
      vi.mocked(fs.access).mockRejectedValue(new Error('Permission denied'));

      const result = await adapter.testConnection();
      
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Import-Verzeichnis nicht erreichbar');
    });

    it('should return error when no directories are configured', async () => {
      const connWithoutDirs = { ...mockConnection, gdtImportDir: null, gdtExportDir: null };
      await adapter.initialize(connWithoutDirs);

      const result = await adapter.testConnection();
      
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Weder Import- noch Export-Verzeichnis konfiguriert');
    });
  });

  describe('importPatient', () => {
    it('should throw error when import directory not configured', async () => {
      const connWithoutImport = { ...mockConnection, gdtImportDir: null };
      await adapter.initialize(connWithoutImport);

      await expect(adapter.importPatient('12345')).rejects.toThrow('GDT Import-Verzeichnis nicht konfiguriert');
    });

    it('should find and return patient from GDT file', async () => {
      await adapter.initialize(mockConnection);
      
      const mockGdtFile = 'test.gdt';
      const mockPatientData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1980-01-01'),
        gender: 'male' as const,
        insuranceNr: 'A123456789',
      };

      vi.mocked(fs.readdir).mockResolvedValue([mockGdtFile] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock gdt content' as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);
      vi.mocked(parseGdtFile).mockReturnValue({ satzart: '6311' } as any);
      vi.mocked(extractPatientData).mockReturnValue(mockPatientData);

      const result = await adapter.importPatient('12345');

      expect(result).toEqual(mockPatientData);
      expect(fs.rename).toHaveBeenCalled(); // File should be archived
    });

    it('should throw error when patient not found', async () => {
      await adapter.initialize(mockConnection);
      
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      await expect(adapter.importPatient('99999')).rejects.toThrow('nicht in GDT-Import gefunden');
    });
  });

  describe('searchPatient', () => {
    it('should return matching patients by name', async () => {
      await adapter.initialize(mockConnection);
      
      const mockPatientData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1980-01-01'),
        gender: 'male' as const,
        insuranceNr: 'A123456789',
      };

      vi.mocked(fs.readdir).mockResolvedValue(['test.gdt'] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock gdt content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({ satzart: '6311' } as any);
      vi.mocked(extractPatientData).mockReturnValue(mockPatientData);

      const results = await adapter.searchPatient({ name: 'Mustermann' });

      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Mustermann');
      expect(results[0].firstName).toBe('Max');
    });

    it('should return matching patients by KVNR', async () => {
      await adapter.initialize(mockConnection);
      
      const mockPatientData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1980-01-01'),
        gender: 'male' as const,
        insuranceNr: 'A123456789',
      };

      vi.mocked(fs.readdir).mockResolvedValue(['test.gdt'] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock gdt content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({ satzart: '6311' } as any);
      vi.mocked(extractPatientData).mockReturnValue(mockPatientData);

      const results = await adapter.searchPatient({ kvnr: 'A123456789' });

      expect(results).toHaveLength(1);
      expect(results[0].insuranceNr).toBe('A123456789');
    });

    it('should return empty array when no matches found', async () => {
      await adapter.initialize(mockConnection);
      
      const mockPatientData = {
        patNr: '12345',
        lastName: 'Schmidt',
        firstName: 'Anna',
        birthDate: new Date('1985-05-15'),
        gender: 'female' as const,
        insuranceNr: 'B987654321',
      };

      vi.mocked(fs.readdir).mockResolvedValue(['test.gdt'] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock gdt content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({ satzart: '6311' } as any);
      vi.mocked(extractPatientData).mockReturnValue(mockPatientData);

      const results = await adapter.searchPatient({ name: 'Mustermann' });

      expect(results).toHaveLength(0);
    });
  });

  describe('exportPatient', () => {
    it('should throw error as TurboMed does not support patient export', async () => {
      await adapter.initialize(mockConnection);

      await expect(adapter.exportPatient({
        pvsPatientId: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
      })).rejects.toThrow('nicht unterstützt');
    });
  });

  describe('exportAnamneseResult', () => {
    it('should return error when export directory not configured', async () => {
      const connWithoutExport = { ...mockConnection, gdtExportDir: null };
      await adapter.initialize(connWithoutExport);

      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: null,
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export-Verzeichnis nicht konfiguriert');
    });

    it('should successfully export anamnese result', async () => {
      await adapter.initialize(mockConnection);
      
      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: {
          id: 'patient-1',
          patientNumber: '12345',
          birthDate: new Date('1980-01-01'),
          gender: 'male',
        },
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [{ id: 'a1', atomId: 'q1', value: '{"value":"test"}' }],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      vi.mocked(buildAnamneseResult).mockReturnValue('mock gdt content');
      vi.mocked(writeGdtFile).mockResolvedValue('/tmp/export/DIGGAI_12345_1234567890.gdt');

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
      expect(result.transferLogId).toMatch(/^gdt-/);
      expect(result.pvsReferenceId).toContain('DIGGAI_12345');
    });

    it('should handle export errors gracefully', async () => {
      await adapter.initialize(mockConnection);
      
      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: null,
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      vi.mocked(buildAnamneseResult).mockImplementation(() => {
        throw new Error('GDT build failed');
      });

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toBe('GDT build failed');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const caps = adapter.getCapabilities();

      expect(caps.canImportPatients).toBe(true);
      expect(caps.canExportResults).toBe(true);
      expect(caps.canExportTherapyPlans).toBe(false);
      expect(caps.canReceiveOrders).toBe(true);
      expect(caps.canSearchPatients).toBe(true);
      expect(caps.supportsRealtime).toBe(false);
      expect(caps.supportedSatzarten).toContain('6310');
      expect(caps.supportedSatzarten).toContain('6311');
      expect(caps.supportedSatzarten).toContain('6301');
      expect(caps.supportedFhirResources).toHaveLength(0);
    });
  });

  describe('disconnect', () => {
    it('should clear connection on disconnect', async () => {
      await adapter.initialize(mockConnection);
      await adapter.disconnect();
      
      // After disconnect, testConnection should fail
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
    });
  });
});
