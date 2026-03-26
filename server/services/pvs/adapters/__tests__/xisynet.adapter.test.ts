// ============================================
// xIsynetAdapter Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { xIsynetAdapter } from '../xisynet.adapter.js';
import type { PvsConnectionData, PatientSessionFull } from '../../types.js';
import { promises as fs } from 'fs';

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

describe('xIsynetAdapter', () => {
  let adapter: xIsynetAdapter;
  let mockConnection: PvsConnectionData;

  beforeEach(() => {
    adapter = new xIsynetAdapter();
    mockConnection = {
      id: 'test-conn-1',
      praxisId: 'praxis-1',
      pvsType: 'X_ISYNET',
      protocol: 'GDT',
      gdtImportDir: '/tmp/import',
      gdtExportDir: '/tmp/export',
      gdtSenderId: 'DIGGAI01',
      gdtReceiverId: 'ISYNET001',
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
      expect(adapter.type).toBe('X_ISYNET');
      expect(adapter.supportedProtocols).toContain('GDT');
    });
  });

  describe('testConnection', () => {
    it('should return success when directories are accessible', async () => {
      await adapter.initialize(mockConnection);
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await adapter.testConnection();
      
      expect(result.ok).toBe(true);
    });
  });

  describe('importPatient', () => {
    it('should import patient from GDT file', async () => {
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
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);
      vi.mocked(parseGdtFile).mockReturnValue({ satzart: '6311' } as any);
      vi.mocked(extractPatientData).mockReturnValue(mockPatientData);

      const result = await adapter.importPatient('12345');

      expect(result).toEqual(mockPatientData);
    });
  });

  describe('searchPatient', () => {
    it('should return matching patients', async () => {
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

      const results = await adapter.searchPatient({ name: 'Schmidt' });

      expect(results).toHaveLength(1);
      expect(results[0].lastName).toBe('Schmidt');
    });
  });

  describe('exportAnamneseResult', () => {
    it('should export anamnese successfully', async () => {
      await adapter.initialize(mockConnection);
      
      const mockSession = {
        id: 'session-1',
        patientId: 'patient-1',
        patient: { id: 'patient-1', patientNumber: '12345' },
        status: 'COMPLETED',
        selectedService: 'ANAMNESE',
        answers: [],
        triageEvents: [],
        createdAt: new Date(),
      } as PatientSessionFull;

      vi.mocked(buildAnamneseResult).mockReturnValue('mock gdt content');
      vi.mocked(writeGdtFile).mockResolvedValue('/tmp/export/DIGGAI_12345_1234567890.gdt');

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
      expect(buildAnamneseResult).toHaveBeenCalledWith(
        mockSession,
        expect.objectContaining({
          satzart: '6301',
          senderId: 'DIGGAI01',
          receiverId: 'ISYNET001',
        })
      );
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const caps = adapter.getCapabilities();

      expect(caps.canImportPatients).toBe(true);
      expect(caps.canExportResults).toBe(true);
      expect(caps.canSearchPatients).toBe(true);
      expect(caps.supportedSatzarten).toContain('6310');
      expect(caps.supportedSatzarten).toContain('6311');
      expect(caps.supportedSatzarten).toContain('6301');
    });
  });
});
