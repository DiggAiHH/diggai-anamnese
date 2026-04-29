// ============================================
// GdtBaseAdapter Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GdtBaseAdapter } from '../gdt-base.adapter.js';
import type { PvsConnectionData, PvsType, PatientSessionFull, TransferResult } from '../../types.js';

// Mock fs and path modules
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    stat: vi.fn(() => Promise.resolve({ isDirectory: () => true })),
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
    copyFile: vi.fn(),
  },
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  parse: vi.fn((filename: string) => ({
    name: filename.replace('.gdt', ''),
    ext: '.gdt',
  })),
  basename: vi.fn((filepath: string) => filepath.split('/').pop()),
}));

vi.mock('../../gdt/gdt-parser.js', () => ({
  parseGdtFile: vi.fn(),
  extractPatientData: vi.fn(),
}));

vi.mock('../../gdt/gdt-writer.js', () => ({
  buildAnamneseResult: vi.fn(() => 'mock-gdt-content'),
  writeGdtFile: vi.fn(() => Promise.resolve('/mock/path/file.gdt')),
}));

import { promises as fs } from 'fs';
import { parseGdtFile, extractPatientData } from '../../gdt/gdt-parser.js';

// Test adapter implementation
class TestGdtAdapter extends GdtBaseAdapter {
  readonly type: PvsType = 'CGM_M1';
  protected defaultReceiverId = 'TEST0001';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';
  protected supportedSatzarten = ['6310', '6311', '6301'];

  // Expose protected methods for testing
  testCheckImportDirectory = () => (this as any).checkImportDirectory();
  testCheckExportDirectory = () => (this as any).checkExportDirectory();
  testArchiveFile = (filePath: string, fileName: string) => this.archiveFile(filePath, fileName);
  testMatchesQuery = (patData: any, query: any) => (this as any).matchesSearchQuery(patData, query);

  // Track hook calls
  hookCalls: string[] = [];

  protected async onInitialize(): Promise<void> {
    this.hookCalls.push('onInitialize');
  }

  protected async onDisconnect(): Promise<void> {
    this.hookCalls.push('onDisconnect');
  }

  protected async onBeforeTestConnection(): Promise<{ continue: boolean; message?: string }> {
    this.hookCalls.push('onBeforeTestConnection');
    return { continue: true };
  }

  protected async onAfterTestConnection(checks: string[], allOk: boolean): Promise<{ ok?: boolean; message?: string }> {
    this.hookCalls.push('onAfterTestConnection');
    return { ok: allOk, message: checks.join('\n') };
  }

  protected async onBeforeImportPatient(externalId: string): Promise<void> {
    this.hookCalls.push(`onBeforeImportPatient:${externalId}`);
  }

  protected async onAfterImportPatient(): Promise<void> {
    this.hookCalls.push('onAfterImportPatient');
  }
}

// Hook customization test adapter
class CustomHookAdapter extends GdtBaseAdapter {
  readonly type: PvsType = 'TURBOMED';
  protected defaultReceiverId = 'CUST0001';
  protected defaultSenderId = 'DIGGAI01';
  protected defaultEncoding = 'ISO-8859-15';

  customPreCheckResult = { continue: true };
  customPostCheckResult = { ok: true, message: 'Custom message' };

  protected async onBeforeTestConnection(): Promise<{ continue: boolean; message?: string }> {
    return this.customPreCheckResult;
  }

  protected async onAfterTestConnection(): Promise<{ ok?: boolean; message?: string }> {
    return this.customPostCheckResult;
  }
}

describe('GdtBaseAdapter', () => {
  let adapter: TestGdtAdapter;
  let mockConnection: PvsConnectionData;

  beforeEach(() => {
    adapter = new TestGdtAdapter();
    mockConnection = {
      id: 'test-conn-1',
      praxisId: 'praxis-1',
      pvsType: 'CGM_M1',
      protocol: 'GDT',
      gdtImportDir: '/test/import',
      gdtExportDir: '/test/export',
      gdtSenderId: 'TEST_SENDER',
      gdtReceiverId: 'TEST_RECEIVER',
      gdtEncoding: 'ISO-8859-15',
      isActive: true,
      syncIntervalSec: 60,
      retryCount: 3,
      autoMapFields: true,
    };
    vi.clearAllMocks();
  });

  describe('Lifecycle Methods', () => {
    it('should initialize with connection data', async () => {
      await adapter.initialize(mockConnection);
      expect(adapter['connection']).toBe(mockConnection);
      expect(adapter.hookCalls).toContain('onInitialize');
    });

    it('should disconnect and clear connection', async () => {
      await adapter.initialize(mockConnection);
      await adapter.disconnect();
      expect(adapter['connection']).toBeNull();
    });
  });

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const caps = adapter.getCapabilities();
      expect(caps.canImportPatients).toBe(true);
      expect(caps.canExportResults).toBe(true);
      expect(caps.canExportTherapyPlans).toBe(false);
      expect(caps.canReceiveOrders).toBe(false);
      expect(caps.canSearchPatients).toBe(true);
      expect(caps.supportsRealtime).toBe(false);
      expect(caps.supportedSatzarten).toEqual(['6310', '6311', '6301']);
      expect(caps.supportedFhirResources).toEqual([]);
    });

    it('should have correct type and protocols', () => {
      expect(adapter.type).toBe('CGM_M1');
      expect(adapter.supportedProtocols).toEqual(['GDT']);
    });
  });

  describe('Connection Testing', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
    });

    it('should fail testConnection when not initialized', async () => {
      const newAdapter = new TestGdtAdapter();
      const result = await newAdapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Keine Verbindung konfiguriert');
    });

    it('should pass testConnection when directories are accessible', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toContain('✅ Import-Verzeichnis: /test/import');
      expect(result.message).toContain('✅ Export-Verzeichnis beschreibbar: /test/export');
    });

    it('should fail when import directory is not accessible', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('❌ Import-Verzeichnis nicht erreichbar: /test/import');
    });

    it('should fail when export directory has no write permissions', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined); // import OK
      vi.mocked(fs.access).mockResolvedValueOnce(undefined); // export accessible
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('EACCES'));

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('❌ Export-Verzeichnis nicht beschreibbar');
    });

    it('should warn when neither directory is configured', async () => {
      adapter['connection'] = {
        ...mockConnection,
        gdtImportDir: null,
        gdtExportDir: null,
      };

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('⚠️ Kein Import-Verzeichnis konfiguriert\n⚠️ Kein Export-Verzeichnis konfiguriert');
    });
  });

  describe('Directory Checking', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
    });

    it('should check import directory successfully', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toContain('✅ Import-Verzeichnis: /test/import');
    });

    it('should fail import directory check when not accessible', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('❌ Import-Verzeichnis nicht erreichbar: /test/import');
    });

    it('should check export directory with write test', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toContain('✅ Export-Verzeichnis beschreibbar: /test/export');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/export/.diggai_test', 'test');
      expect(fs.unlink).toHaveBeenCalledWith('/test/export/.diggai_test');
    });
  });

  describe('Patient Import', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
    });

    it('should throw when import directory is not configured', async () => {
      adapter['connection'] = { ...mockConnection, gdtImportDir: null };
      
      await expect(adapter.importPatient('12345')).rejects.toThrow(
        'GDT Import-Verzeichnis nicht konfiguriert'
      );
    });

    it('should import patient and archive file', async () => {
      const mockFiles = ['patient_12345.gdt'];
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock-gdt-content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({
        satzart: '6311',
        version: '03.00',
        senderId: 'PVS001',
        receiverId: 'DIGGAI01',
        fields: new Map(),
        raw: 'mock',
      });
      vi.mocked(extractPatientData).mockReturnValue({
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-01'),
        gender: 'male',
        insuranceNr: 'A123456789',
      });
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.rename).mockResolvedValue(undefined as any);

      const result = await adapter.importPatient('12345') as any;

      expect(result.patNr).toBe('12345');
      expect(result.lastName).toBe('Mustermann');
      expect(fs.rename).toHaveBeenCalled();
    });

    it('should throw when patient is not found', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['other.gdt'] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock-content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({
        satzart: '6311',
        version: '03.00',
        senderId: 'PVS001',
        receiverId: 'DIGGAI01',
        fields: new Map(),
        raw: 'mock',
      });
      vi.mocked(extractPatientData).mockReturnValue({
        patNr: '99999', // Different patient
        lastName: 'Other',
        firstName: 'Patient',
        birthDate: null,
        gender: 'unknown',
      });

      await expect(adapter.importPatient('12345')).rejects.toThrow(
        'Patient nicht gefunden: 12345'
      );
    });
  });

  describe('Patient Export', () => {
    it('should throw by default', async () => {
      await adapter.initialize(mockConnection);
      
      await expect(adapter.exportPatient({
        pvsPatientId: '123',
        lastName: 'Test',
        firstName: 'Patient',
      })).rejects.toThrow('exportPatient not implemented for GDT adapters');
    });
  });

  describe('Patient Search', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
      vi.mocked(fs.readFile).mockReset();
      vi.mocked(parseGdtFile).mockReset();
      vi.mocked(extractPatientData).mockReset();
    });

    it('should throw when import directory is not configured', async () => {
      adapter['connection'] = { ...mockConnection, gdtImportDir: null };
      
      await expect(adapter.searchPatient({})).rejects.toThrow(
        'GDT Import-Verzeichnis nicht konfiguriert'
      );
    });

    it('should search patients by name', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['patient.gdt'] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock-content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({
        satzart: '6311',
        version: '03.00',
        senderId: 'PVS001',
        receiverId: 'DIGGAI01',
        fields: new Map(),
        raw: 'mock',
      });
      vi.mocked(extractPatientData).mockReturnValue({
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-01'),
        gender: 'male',
        insuranceNr: 'A123456789',
      });

      const results = await adapter.searchPatient({ name: 'Mustermann' });

      expect(results).toHaveLength(1);
      expect(results[0].pvsPatientId).toBe('12345');
      expect(results[0].lastName).toBe('Mustermann');
    });

    it('should search patients by KVNR', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['patient.gdt'] as any);
      vi.mocked(fs.readFile).mockResolvedValue('mock-content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({
        satzart: '6311',
        version: '03.00',
        senderId: 'PVS001',
        receiverId: 'DIGGAI01',
        fields: new Map(),
        raw: 'mock',
      });
      vi.mocked(extractPatientData).mockReturnValue({
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-01'),
        gender: 'male',
        insuranceNr: 'A123456789',
      });

      const results = await adapter.searchPatient({ kvnr: 'A123456789' });

      expect(results).toHaveLength(1);
      expect(results[0].insuranceNr).toBe('A123456789');
    });

    it('should return empty array when no matches', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const results = await adapter.searchPatient({ name: 'NonExistent' });

      expect(results).toEqual([]);
    });

    it('should skip unparseable files', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['bad.gdt', 'good.gdt'] as any);
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Read error'));
      vi.mocked(fs.readFile).mockResolvedValueOnce('good-content' as any);
      vi.mocked(parseGdtFile).mockReturnValue({
        satzart: '6311',
        version: '03.00',
        senderId: 'PVS001',
        receiverId: 'DIGGAI01',
        fields: new Map(),
        raw: 'mock',
      });
      vi.mocked(extractPatientData).mockReturnValue({
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-01'),
        gender: 'male',
        insuranceNr: 'A123456789',
      });

      const results = await adapter.searchPatient({ name: 'Mustermann' });

      expect(results).toHaveLength(1);
    });
  });

  describe('Query Matching', () => {
    it('should match by last name', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-01'),
        gender: 'male' as const,
        insuranceNr: 'A123456789',
      };

      expect(adapter.testMatchesQuery(patData, { name: 'Muster' })).toBe(true);
      expect(adapter.testMatchesQuery(patData, { name: 'Max' })).toBe(true);
      expect(adapter.testMatchesQuery(patData, { name: 'Schmidt' })).toBe(false);
    });

    it('should match by KVNR', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-01'),
        gender: 'male' as const,
        insuranceNr: 'A123456789',
      };

      expect(adapter.testMatchesQuery(patData, { kvnr: 'A123456789' })).toBe(true);
      expect(adapter.testMatchesQuery(patData, { kvnr: 'B987654321' })).toBe(false);
    });

    it('should not match by birth date (not implemented)', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-15'),
        gender: 'male' as const,
      };

      expect(adapter.testMatchesQuery(patData, { birthDate: '1990-01-15' })).toBe(false);
      expect(adapter.testMatchesQuery(patData, { birthDate: '1990-01-16' })).toBe(false);
    });

    it('should match when all criteria match', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-15'),
        gender: 'male' as const,
        insuranceNr: 'A123456789',
      };

      expect(adapter.testMatchesQuery(patData, { 
        name: 'Muster', 
        kvnr: 'A123456789',
        birthDate: '1990-01-15'
      })).toBe(true);
    });

    it('should not match when no query criteria provided', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: null,
        gender: 'male' as const,
      };

      expect(adapter.testMatchesQuery(patData, {})).toBe(false);
    });
  });

  describe('Anamnese Export', () => {
    const mockSession: PatientSessionFull = {
      id: 'session-1',
      patientId: 'patient-1',
      patient: {
        id: 'patient-1',
        patientNumber: '12345',
      },
      status: 'COMPLETED',
      selectedService: 'checkup',
      createdAt: new Date(),
      answers: [],
      triageEvents: [],
    };

    beforeEach(async () => {
      await adapter.initialize(mockConnection);
    });

    it('should fail when export directory is not configured', async () => {
      adapter['connection'] = { ...mockConnection, gdtExportDir: null };

      await expect(adapter.exportAnamneseResult(mockSession)).rejects.toThrow(
        'GDT Export-Verzeichnis nicht konfiguriert'
      );
    });

    it('should export anamnese successfully', async () => {
      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
      expect(result.transferLogId).toBe('session-1');
      expect(result.pvsReferenceId).toMatch(/^DIGGAI_CGM_M1_12345_.*\.gdt$/);
    });

    it('should use default IDs when connection config is empty', async () => {
      adapter['connection'] = {
        ...mockConnection,
        gdtSenderId: null,
        gdtReceiverId: null,
        gdtEncoding: null,
      };

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
    });
  });

  describe('File Archiving', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.rename).mockResolvedValue(undefined as any);
    });

    it('should archive file to archiv subdirectory', async () => {
      await adapter.testArchiveFile('/test/import/patient.gdt', 'patient.gdt');

      expect(fs.mkdir).toHaveBeenCalledWith('/test/import/archiv', { recursive: true });
      expect(fs.rename).toHaveBeenCalledWith(
        '/test/import/patient.gdt',
        '/test/import/archiv/patient.gdt'
      );
    });

    it('should not archive when import dir is not set', async () => {
      adapter['connection'] = { ...mockConnection, gdtImportDir: null };

      await adapter.testArchiveFile('/some/path.gdt', 'file.gdt');

      expect(fs.mkdir).not.toHaveBeenCalled();
      expect(fs.rename).not.toHaveBeenCalled();
    });
  });

  describe('Template Method Pattern', () => {
    it('should allow subclasses to customize archive behavior', async () => {
      class TimestampedArchiveAdapter extends TestGdtAdapter {
        protected useTimestampedArchive = true;
      }

      const timestampedAdapter = new TimestampedArchiveAdapter();
      await timestampedAdapter.initialize(mockConnection);
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.rename).mockResolvedValue(undefined as any);

      await timestampedAdapter.testArchiveFile('/test/import/patient.gdt', 'patient.gdt');

      expect(fs.mkdir).toHaveBeenCalledWith('/test/import/archiv', { recursive: true });
      expect(fs.rename).toHaveBeenCalledWith(
        '/test/import/patient.gdt',
        '/test/import/archiv/patient.gdt'
      );
    });
  });
});

describe('Concrete Adapter Implementations', () => {
  it('CgmM1Adapter should have correct defaults', async () => {
    const { CgmM1Adapter } = await import('../cgm-m1.adapter.js');
    const adapter = new CgmM1Adapter();
    
    expect(adapter.type).toBe('CGM_M1');
    expect(adapter.supportedProtocols).toEqual(['GDT']);
    
    const caps = adapter.getCapabilities();
    expect(caps.supportedSatzarten).toEqual(['6310', '6311', '6301']);
  });

  it('TurbomedAdapter should have correct defaults', async () => {
    const { TurbomedAdapter } = await import('../turbomed.adapter.js');
    const adapter = new TurbomedAdapter();
    
    expect(adapter.type).toBe('TURBOMED');
    expect(adapter.supportedProtocols).toEqual(['GDT']);
  });

  it('MedistarAdapter should have correct defaults', async () => {
    const { MedistarAdapter } = await import('../medistar.adapter.js');
    const adapter = new MedistarAdapter();
    
    expect(adapter.type).toBe('MEDISTAR');
  });

  it('xIsynetAdapter should have correct defaults', async () => {
    const { xIsynetAdapter } = await import('../xisynet.adapter.js');
    const adapter = new xIsynetAdapter();
    
    expect(adapter.type).toBe('X_ISYNET');
  });

  it('AlbisAdapter should have timestamped archiving', async () => {
    const { AlbisAdapter } = await import('../albis.adapter.js');
    const adapter = new AlbisAdapter();
    
    expect(adapter.type).toBe('ALBIS');
    // Archive uses timestamp for ALBIS
    expect((adapter as any).useTimestampedArchive).toBe(true);
  });
});
