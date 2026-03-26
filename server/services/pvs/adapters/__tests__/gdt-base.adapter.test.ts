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
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
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
  testMatchesQuery = (patData: any, query: any) => (this as any).matchesQuery(patData, query);

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
      expect(adapter.hookCalls).toContain('onDisconnect');
    });
  });

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const caps = adapter.getCapabilities();
      expect(caps.canImportPatients).toBe(true);
      expect(caps.canExportResults).toBe(true);
      expect(caps.canExportTherapyPlans).toBe(false);
      expect(caps.canReceiveOrders).toBe(true);
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
      expect(result.message).toContain('✅ Import-Verzeichnis erreichbar');
      expect(result.message).toContain('✅ Export-Verzeichnis erreichbar + Schreibrechte');
      expect(adapter.hookCalls).toContain('onBeforeTestConnection');
      expect(adapter.hookCalls).toContain('onAfterTestConnection');
    });

    it('should fail when import directory is not accessible', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('❌ Import-Verzeichnis nicht erreichbar');
    });

    it('should fail when export directory has no write permissions', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined); // import OK
      vi.mocked(fs.access).mockResolvedValueOnce(undefined); // export accessible
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('EACCES'));

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('❌ Export-Verzeichnis nicht erreichbar oder keine Schreibrechte');
    });

    it('should fail when neither directory is configured', async () => {
      adapter['connection'] = {
        ...mockConnection,
        gdtImportDir: null,
        gdtExportDir: null,
      };

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Weder Import- noch Export-Verzeichnis konfiguriert');
    });

    it('should call pre-check hook and respect abort', async () => {
      const customAdapter = new CustomHookAdapter();
      await customAdapter.initialize(mockConnection);
      customAdapter.customPreCheckResult = { continue: false, message: 'Custom abort' } as any;

      const result = await customAdapter.testConnection();

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Custom abort');
    });

    it('should call post-check hook and use custom result', async () => {
      const customAdapter = new CustomHookAdapter();
      await customAdapter.initialize(mockConnection);
      customAdapter.customPostCheckResult = { ok: true, message: 'Custom success' };

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await customAdapter.testConnection();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Custom success');
    });
  });

  describe('Directory Checking', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
    });

    it('should check import directory successfully', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await adapter.testCheckImportDirectory();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('✅ Import-Verzeichnis erreichbar');
    });

    it('should fail import directory check when not accessible', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const result = await adapter.testCheckImportDirectory();

      expect(result.ok).toBe(false);
      expect(result.message).toBe('❌ Import-Verzeichnis nicht erreichbar');
    });

    it('should check export directory with write test', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await adapter.testCheckExportDirectory();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('✅ Export-Verzeichnis erreichbar + Schreibrechte');
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
      expect(adapter.hookCalls).toContain('onBeforeImportPatient:12345');
      expect(adapter.hookCalls).toContain('onAfterImportPatient');
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
        'Patient 12345 nicht in GDT-Import gefunden'
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
      })).rejects.toThrow('Patient-Export wird von CGM_M1 nicht unterstützt');
    });
  });

  describe('Patient Search', () => {
    beforeEach(async () => {
      await adapter.initialize(mockConnection);
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

      const results = await adapter.searchPatient({});

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

    it('should match by birth date', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: new Date('1990-01-15'),
        gender: 'male' as const,
      };

      expect(adapter.testMatchesQuery(patData, { birthDate: '1990-01-15' })).toBe(true);
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

    it('should match when no query criteria provided', () => {
      const patData = {
        patNr: '12345',
        lastName: 'Mustermann',
        firstName: 'Max',
        birthDate: null,
        gender: 'male' as const,
      };

      expect(adapter.testMatchesQuery(patData, {})).toBe(true);
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

      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toBe('GDT Export-Verzeichnis nicht konfiguriert');
    });

    it('should export anamnese successfully', async () => {
      const result = await adapter.exportAnamneseResult(mockSession);

      expect(result.success).toBe(true);
      expect(result.transferLogId).toMatch(/^gdt-\d+$/);
      expect(result.pvsReferenceId).toBe('file.gdt');
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

      // Mock Date to get predictable timestamp
      const mockDate = new Date('2024-01-15T10:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      await timestampedAdapter.testArchiveFile('/test/import/patient.gdt', 'patient.gdt');

      expect(fs.rename).toHaveBeenCalled();
      const renameCall = vi.mocked(fs.rename).mock.calls[0];
      expect(renameCall[1]).toContain('2024-01-15T10-30-45');
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
    expect(caps.supportedSatzarten).toEqual(['6310', '6311', '6302', '6301']);
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
