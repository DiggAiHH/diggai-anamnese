// ============================================
// PVS Auto-Detection Service
// ============================================
// Automatische Erkennung von PVS-Systemen im Netzwerk
// und auf dem lokalen Dateisystem

import { promises as fs } from 'fs';
import * as path from 'path';
import type { PvsType, PvsProtocol } from '../types.js';

export interface DetectedPvsSystem {
  type: PvsType;
  protocol: PvsProtocol;
  confidence: number; // 0-100
  detectedPaths?: {
    importDir?: string;
    exportDir?: string;
    installDir?: string;
  };
  detectedUrls?: {
    fhirBaseUrl?: string;
    apiEndpoint?: string;
  };
  version?: string;
  suggestedConfig: Partial<{
    gdtSenderId: string;
    gdtReceiverId: string;
    gdtEncoding: string;
    fhirAuthType: string;
  }>;
}

/**
 * Service for automatic PVS detection and configuration
 */
export class PvsDetectionService {
  private lastDetectionResults: DetectedPvsSystem[] | null = null;
  
  /**
   * Detect PVS systems on local filesystem (file-based PVS)
   */
  async detectLocalPVS(): Promise<DetectedPvsSystem[]> {
    const results = await this.scanFileSystem();
    this.lastDetectionResults = results;
    return results;
  }
  
  /**
   * Detect PVS systems via network (API-based PVS)
   */
  async detectNetworkPVS(): Promise<DetectedPvsSystem[]> {
    // Currently returns empty - network detection would require
    // scanning local network or specific endpoints
    return [];
  }
  
  /**
   * Get last detection results
   */
  getLastResults(): DetectedPvsSystem[] | null {
    return this.lastDetectionResults;
  }
  
  /**
   * Clear cached results
   */
  clearResults(): void {
    this.lastDetectionResults = null;
  }
  
  /**
   * Scan common installation directories for PVS systems
   */
  async scanFileSystem(): Promise<DetectedPvsSystem[]> {
    const detected: DetectedPvsSystem[] = [];
    
    // Windows-typische Pfade
    const windowsPaths = [
      'C:\\Program Files\\CGM',
      'C:\\Program Files (x86)\\CGM',
      'C:\\CGM',
      'C:\\Program Files\\medatixx',
      'C:\\Program Files (x86)\\medatixx',
      'C:\\medatixx',
      'C:\\Program Files\\Zollsoft',
      'C:\\Program Files (x86)\\Zollsoft',
      'C:\\T2Med',
      'C:\\ProgramData\\CGM',
      'C:\\ProgramData\\medatixx',
    ];
    
    // Linux/macOS-typische Pfade (für Server-Installationen)
    const unixPaths = [
      '/opt/cgm',
      '/opt/medatixx',
      '/opt/tomedo',
      '/var/lib/pvs',
      '/usr/share/pvs',
    ];
    
    const allPaths = process.platform === 'win32' ? windowsPaths : unixPaths;
    
    for (const basePath of allPaths) {
      try {
        await fs.access(basePath);
        const systems = await this.analyzeDirectory(basePath);
        detected.push(...systems);
      } catch {
        // Directory doesn't exist, skip
      }
    }
    
    return detected;
  }
  
  /**
   * Analyze a directory for PVS installations
   */
  private async analyzeDirectory(basePath: string): Promise<DetectedPvsSystem[]> {
    const detected: DetectedPvsSystem[] = [];
    
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(basePath, entry.name);
          const system = await this.identifySystem(fullPath, entry.name);
          if (system) {
            detected.push(system);
          }
        }
      }
    } catch {
      // Ignore errors
    }
    
    return detected;
  }
  
  /**
   * Identify PVS system based on directory content
   */
  private async identifySystem(dirPath: string, dirName: string): Promise<DetectedPvsSystem | null> {
    const lowerName = dirName.toLowerCase();
    
    // CGM MEDISTAR
    if (lowerName.includes('medistar') || lowerName.includes('meist')) {
      return this.detectMedistar(dirPath);
    }
    
    // CGM TurboMed
    if (lowerName.includes('turbomed') || lowerName.includes('turbo')) {
      return this.detectTurbomed(dirPath);
    }
    
    // CGM M1 PRO / ALBIS
    if (lowerName.includes('m1') || lowerName.includes('albis') || lowerName.includes('quadriga')) {
      return this.detectCgmM1(dirPath);
    }
    
    // medatixx
    if (lowerName.includes('isynet') || lowerName.includes('xconcept')) {
      return this.detectMedatixx(dirPath);
    }
    
    // tomedo
    if (lowerName.includes('tomedo') || lowerName.includes('zollsoft')) {
      return this.detectTomedo(dirPath);
    }
    
    // T2Med
    if (lowerName.includes('t2med')) {
      return this.detectT2Med(dirPath);
    }
    
    return null;
  }
  
  /**
   * Detect CGM MEDISTAR installation
   */
  private async detectMedistar(installPath: string): Promise<DetectedPvsSystem> {
    const gdtPaths = await this.findGdtPaths(installPath);
    
    return {
      type: 'MEDISTAR',
      protocol: 'GDT',
      confidence: gdtPaths.importDir && gdtPaths.exportDir ? 95 : 75,
      detectedPaths: gdtPaths,
      version: await this.detectVersion(installPath, 'medistar'),
      suggestedConfig: {
        gdtSenderId: 'DIGGAI01',
        gdtReceiverId: 'MEDISTAR01',
        gdtEncoding: 'ISO-8859-15',
      },
    };
  }
  
  /**
   * Detect CGM TurboMed installation
   */
  private async detectTurbomed(installPath: string): Promise<DetectedPvsSystem> {
    const gdtPaths = await this.findGdtPaths(installPath);
    
    return {
      type: 'TURBOMED',
      protocol: 'GDT',
      confidence: gdtPaths.importDir && gdtPaths.exportDir ? 95 : 75,
      detectedPaths: gdtPaths,
      version: await this.detectVersion(installPath, 'turbomed'),
      suggestedConfig: {
        gdtSenderId: 'DIGGAI01',
        gdtReceiverId: 'TURBOMED1',
        gdtEncoding: 'ISO-8859-15',
      },
    };
  }
  
  /**
   * Detect CGM M1/ALBIS installation
   */
  private async detectCgmM1(installPath: string): Promise<DetectedPvsSystem> {
    const gdtPaths = await this.findGdtPaths(installPath);
    
    // Unterscheide zwischen M1 PRO und ALBIS
    const isAlbis = installPath.toLowerCase().includes('albis');
    
    return {
      type: isAlbis ? 'ALBIS' : 'CGM_M1',
      protocol: 'GDT',
      confidence: gdtPaths.importDir && gdtPaths.exportDir ? 95 : 70,
      detectedPaths: gdtPaths,
      version: await this.detectVersion(installPath, 'cgm'),
      suggestedConfig: {
        gdtSenderId: 'DIGGAI01',
        gdtReceiverId: isAlbis ? 'ALBIS0001' : 'CGMM1001',
        gdtEncoding: 'ISO-8859-15',
      },
    };
  }
  
  /**
   * Detect medatixx installation
   */
  private async detectMedatixx(installPath: string): Promise<DetectedPvsSystem> {
    const gdtPaths = await this.findGdtPaths(installPath);
    const isConcept = installPath.toLowerCase().includes('concept');
    
    return {
      type: isConcept ? 'MEDATIXX' : 'X_ISYNET',
      protocol: 'GDT',
      confidence: gdtPaths.importDir && gdtPaths.exportDir ? 90 : 70,
      detectedPaths: gdtPaths,
      version: await this.detectVersion(installPath, 'medatixx'),
      suggestedConfig: {
        gdtSenderId: 'DIGGAI01',
        gdtReceiverId: isConcept ? 'MEDAT001' : 'ISYNET001',
        gdtEncoding: 'ISO-8859-15',
      },
    };
  }
  
  /**
   * Detect tomedo installation
   */
  private async detectTomedo(installPath: string): Promise<DetectedPvsSystem> {
    return {
      type: 'TOMEDO',
      protocol: 'FHIR',
      confidence: 85,
      detectedUrls: {
        fhirBaseUrl: 'https://api.tomedo.de/fhir/R4',
      },
      version: await this.detectVersion(installPath, 'tomedo'),
      suggestedConfig: {
        fhirAuthType: 'oauth2',
      },
    };
  }
  
  /**
   * Detect T2Med installation
   */
  private async detectT2Med(installPath: string): Promise<DetectedPvsSystem> {
    return {
      type: 'T2MED',
      protocol: 'FHIR',
      confidence: 85,
      detectedUrls: {
        fhirBaseUrl: 'https://api.t2med.de/fhir/R4',
      },
      version: await this.detectVersion(installPath, 't2med'),
      suggestedConfig: {
        fhirAuthType: 'apikey',
      },
    };
  }
  
  /**
   * Find GDT import/export directories
   */
  private async findGdtPaths(installPath: string): Promise<{ importDir?: string; exportDir?: string }> {
    const result: { importDir?: string; exportDir?: string } = {};
    
    // Typische GDT-Pfade
    const possiblePaths = [
      { import: 'GDT\\Import', export: 'GDT\\Export' },
      { import: 'GDT_Import', export: 'GDT_Export' },
      { import: 'Import', export: 'Export' },
      { import: 'gdt\\import', export: 'gdt\\export' },
      { import: 'Schnittstellen\\GDT\\Import', export: 'Schnittstellen\\GDT\\Export' },
    ];
    
    for (const paths of possiblePaths) {
      const importPath = path.join(installPath, paths.import);
      const exportPath = path.join(installPath, paths.export);
      
      try {
        await fs.access(importPath);
        result.importDir = importPath;
      } catch {}
      
      try {
        await fs.access(exportPath);
        result.exportDir = exportPath;
      } catch {}
      
      if (result.importDir && result.exportDir) {
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Detect version from version files
   */
  private async detectVersion(installPath: string, systemName: string): Promise<string | undefined> {
    const versionFiles = [
      'version.txt',
      'VERSION',
      'version.json',
      'package.json',
      'manifest.json',
    ];
    
    for (const file of versionFiles) {
      try {
        const versionPath = path.join(installPath, file);
        const content = await fs.readFile(versionPath, 'utf-8');
        
        // Einfache Versionserkennung
        const versionMatch = content.match(/(\d+\.\d+(\.\d+)?)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      } catch {}
    }
    
    return undefined;
  }
  
  /**
   * Test if detected configuration actually works
   */
  async testDetectedSystem(system: DetectedPvsSystem): Promise<{ works: boolean; message: string }> {
    if (system.protocol === 'GDT') {
      return this.testGdtConnection(system);
    } else {
      return this.testFhirConnection(system);
    }
  }
  
  /**
   * Test GDT file access
   */
  private async testGdtConnection(system: DetectedPvsSystem): Promise<{ works: boolean; message: string }> {
    const paths = system.detectedPaths;
    
    if (!paths?.importDir && !paths?.exportDir) {
      return { works: false, message: 'Keine GDT-Verzeichnisse gefunden' };
    }
    
    const checks: string[] = [];
    
    if (paths.importDir) {
      try {
        await fs.access(paths.importDir);
        checks.push('✅ Import-Verzeichnis erreichbar');
      } catch {
        checks.push('❌ Import-Verzeichnis nicht erreichbar');
      }
    }
    
    if (paths.exportDir) {
      try {
        await fs.access(paths.exportDir);
        // Test write permission
        const testFile = path.join(paths.exportDir, '.diggai_test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        checks.push('✅ Export-Verzeichnis erreichbar + beschreibbar');
      } catch {
        checks.push('❌ Export-Verzeichnis nicht beschreibbar');
      }
    }
    
    const works = checks.every(c => c.startsWith('✅'));
    return { works, message: checks.join('\n') };
  }
  
  /**
   * Test FHIR API connectivity
   */
  private async testFhirConnection(system: DetectedPvsSystem): Promise<{ works: boolean; message: string }> {
    const url = system.detectedUrls?.fhirBaseUrl;
    
    if (!url) {
      return { works: false, message: 'Keine FHIR URL konfiguriert' };
    }
    
    try {
      // Simple connectivity test
      const response = await fetch(`${url}/metadata`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        return { works: true, message: `FHIR API erreichbar: ${url}` };
      } else {
        return { works: false, message: `FHIR API antwortet mit Status ${response.status}` };
      }
    } catch (error) {
      return { works: false, message: `Verbindungsfehler: ${(error as Error).message}` };
    }
  }
  
  /**
   * Generate optimal configuration for detected system
   */
  generateOptimalConfig(system: DetectedPvsSystem): {
    pvsType: PvsType;
    protocol: PvsProtocol;
    gdtImportDir?: string;
    gdtExportDir?: string;
    gdtSenderId?: string;
    gdtReceiverId?: string;
    gdtEncoding?: string;
    fhirBaseUrl?: string;
    fhirAuthType?: string;
  } {
    return {
      pvsType: system.type,
      protocol: system.protocol,
      gdtImportDir: system.detectedPaths?.importDir,
      gdtExportDir: system.detectedPaths?.exportDir,
      gdtSenderId: system.suggestedConfig.gdtSenderId,
      gdtReceiverId: system.suggestedConfig.gdtReceiverId,
      gdtEncoding: system.suggestedConfig.gdtEncoding,
      fhirBaseUrl: system.detectedUrls?.fhirBaseUrl,
      fhirAuthType: system.suggestedConfig.fhirAuthType as any,
    };
  }
}

// Singleton instance
export const pvsDetectionService = new PvsDetectionService();
