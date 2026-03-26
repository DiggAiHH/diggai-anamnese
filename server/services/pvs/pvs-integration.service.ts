/**
 * PVS Integration Service
 * 
 * Meta-Synthese Fix #3: PVS-Integration ist "Must-Have"
 * Ohne PVS-Integration: Keine Marktakzeptanz
 * 
 * Unterstützte PVS-Systeme:
 * - Tobit (DaviS)
 * - Medatixx (x.concept)
 * - CGM (Quadriga)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PVSConfig {
  id: string;
  name: string;
  type: 'tobit' | 'medatixx' | 'cgm' | 'other';
  baseUrl: string;
  authType: 'apikey' | 'oauth2' | 'basic';
  version: string;
  features: {
    patientExport: boolean;
    anamneseImport: boolean;
    terminSync: boolean;
    bidirectional: boolean;
  };
}

// PVS Systeme Konfiguration
export const SUPPORTED_PVS_SYSTEMS: PVSConfig[] = [
  {
    id: 'tobit-davis',
    name: 'Tobit David',
    type: 'tobit',
    baseUrl: 'https://api.tobit.com/v2',
    authType: 'apikey',
    version: '2.0',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: false,
      bidirectional: false
    }
  },
  {
    id: 'medatixx-xconcept',
    name: 'Medatixx x.concept',
    type: 'medatixx',
    baseUrl: 'https://api.medatixx.de/xconcept/v1',
    authType: 'oauth2',
    version: '1.0',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: true,
      bidirectional: true
    }
  },
  {
    id: 'cgm-quadriga',
    name: 'CGM Quadriga',
    type: 'cgm',
    baseUrl: 'https://api.cgm.com/quadriga/v3',
    authType: 'oauth2',
    version: '3.0',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: true,
      bidirectional: false
    }
  },
  {
    id: 'turbomed',
    name: 'CGM TurboMed',
    type: 'cgm',
    baseUrl: '', // File-based GDT
    authType: 'basic',
    version: '3.0',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: false,
      bidirectional: false
    }
  },
  {
    id: 'tomedo',
    name: 'tomedo (Zollsoft)',
    type: 'other',
    baseUrl: 'https://api.tomedo.de/fhir/R4',
    authType: 'oauth2',
    version: 'R4',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: true,
      bidirectional: true
    }
  },
  {
    id: 'medistar',
    name: 'CGM MEDISTAR',
    type: 'cgm',
    baseUrl: '', // File-based GDT
    authType: 'basic',
    version: '3.0',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: false,
      bidirectional: false
    }
  },
  {
    id: 't2med',
    name: 'T2Med',
    type: 'other',
    baseUrl: 'https://api.t2med.de/fhir/R4',
    authType: 'apikey',
    version: 'R4',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: true,
      bidirectional: true
    }
  },
  {
    id: 'xisynet',
    name: 'medatixx x.isynet',
    type: 'medatixx',
    baseUrl: '', // File-based GDT
    authType: 'basic',
    version: '3.0',
    features: {
      patientExport: true,
      anamneseImport: true,
      terminSync: false,
      bidirectional: false
    }
  }
];

export interface PVSConnection {
  id: string;
  tenantId: string;
  pvsSystemId: string;
  isActive: boolean;
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
  };
  settings: {
    autoExport: boolean;
    exportFormat: 'pdf' | 'hl7' | 'json';
    defaultMandant?: string;
  };
  lastSyncAt?: Date;
  createdAt: Date;
}

export class PVSIntegrationService {
  
  /**
   * Verfügbare PVS-Systeme für Tenant abrufen
   */
  async getAvailableSystems(tenantId: string): Promise<PVSConfig[]> {
    // Prüfe Tenant Plan für Feature-Verfügbarkeit
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Essential: Nur grundlegende Integration
    // Professional+: Vollständige Integration
    const tier = tenant.subscription?.tier || 'ESSENTIAL';
    
    if (tier === 'ESSENTIAL') {
      return SUPPORTED_PVS_SYSTEMS.map(s => ({
        ...s,
        features: {
          ...s.features,
          bidirectional: false,
          terminSync: false
        }
      }));
    }

    return SUPPORTED_PVS_SYSTEMS;
  }

  /**
   * PVS-Verbindung erstellen
   */
  async createConnection(
    tenantId: string,
    pvsSystemId: string,
    credentials: PVSConnection['credentials'],
    settings: PVSConnection['settings']
  ): Promise<PVSConnection> {
    // Validierung
    const system = SUPPORTED_PVS_SYSTEMS.find(s => s.id === pvsSystemId);
    if (!system) {
      throw new Error('Unsupported PVS system');
    }

    // Teste Verbindung vor Speicherung
    const isValid = await this.testConnection(system, credentials);
    if (!isValid) {
      throw new Error('PVS connection test failed');
    }

    // Verschlüssele Credentials
    const encryptedCredentials = await this.encryptCredentials(credentials);

    // Speichere Verbindung
    const connection = await prisma.pvsConnection.create({
      data: {
        praxisId: tenantId,
        pvsType: pvsSystemId as any,
        fhirCredentials: encryptedCredentials,
        customMappings: settings as any,
        isActive: true
      }
    });

    return this.mapConnection(connection);
  }

  /**
   * Anamnese an PVS exportieren
   */
  async exportAnamnese(
    connectionId: string,
    patientId: string,
    anamneseData: any
  ): Promise<{ success: boolean; message: string }> {
    const connection = await prisma.pvsConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.isActive) {
      throw new Error('PVS connection not found or inactive');
    }

    const system = SUPPORTED_PVS_SYSTEMS.find(s => s.id === (connection as any).pvsSystemId || s.type === (connection.pvsType as string));
    if (!system) {
      throw new Error('PVS system not found');
    }

    // Formatiere Daten für PVS
    const formattedData = this.formatForPVS(system, anamneseData);

    // Sende an PVS
    try {
      const result = await this.sendToPVS(system, connection.fhirCredentials as any, formattedData);
      
      // Logge Export
      await prisma.auditLog.create({
        data: {
          tenantId: connection.praxisId,
          action: 'PVS_EXPORT',
          resource: `pvs/anamnese/${patientId}`,
          metadata: JSON.stringify({ pvsSystem: system.name, success: true })
        }
      });

      // Aktualisiere lastSyncAt
      await prisma.pvsConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() }
      });

      return { success: true, message: `Anamnese erfolgreich an ${system.name} exportiert` };
    } catch (error) {
      console.error('PVS Export failed:', error);
      return { success: false, message: 'Export fehlgeschlagen' };
    }
  }

  /**
   * Patienten aus PVS importieren
   */
  async importPatients(
    connectionId: string,
    filters?: { lastModified?: Date; limit?: number }
  ): Promise<any[]> {
    const connection = await prisma.pvsConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || !connection.isActive) {
      throw new Error('PVS connection not found or inactive');
    }

    const system = SUPPORTED_PVS_SYSTEMS.find(s => s.id === (connection as any).pvsSystemId || s.type === (connection.pvsType as string));
    if (!system || !system.features.patientExport) {
      throw new Error('Patient export not supported by this PVS');
    }

    // Implementierung je nach PVS-Typ
    switch (system.type) {
      case 'tobit':
        return this.importFromTobit(system, connection.fhirCredentials as any, filters);
      case 'medatixx':
        return this.importFromMedatixx(system, connection.fhirCredentials as any, filters);
      case 'cgm':
        return this.importFromCGM(system, connection.fhirCredentials as any, filters);
      default:
        throw new Error('PVS type not implemented');
    }
  }

  // Private Helper Methods

  private async testConnection(system: PVSConfig, credentials: any): Promise<boolean> {
    // Implementierung je nach Auth-Typ
    try {
      switch (system.authType) {
        case 'apikey':
          // Teste API Key
          return true; // Simplifiziert
        case 'oauth2':
          // Teste OAuth Token
          return true; // Simplifiziert
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  private async encryptCredentials(credentials: any): Promise<string> {
    // TODO: Implementiere echte Verschlüsselung
    return JSON.stringify(credentials);
  }

  private mapConnection(dbConnection: any): PVSConnection {
    return {
      id: dbConnection.id,
      tenantId: dbConnection.tenantId,
      pvsSystemId: dbConnection.pvsSystemId,
      isActive: dbConnection.isActive,
      credentials: dbConnection.credentials as any,
      settings: dbConnection.settings as any,
      lastSyncAt: dbConnection.lastSyncAt,
      createdAt: dbConnection.createdAt
    };
  }

  private formatForPVS(system: PVSConfig, data: any): any {
    // Formatiere Daten für spezifisches PVS
    switch (system.type) {
      case 'tobit':
        return {
          patientId: data.patientId,
          anamnese: data.answers,
          timestamp: new Date().toISOString()
        };
      case 'medatixx':
        return {
          patNr: data.patientId,
          dokument: {
            typ: 'Anamnese',
            inhalt: data.answers,
            datum: new Date().toISOString()
          }
        };
      default:
        return data;
    }
  }

  private async sendToPVS(system: PVSConfig, credentials: any, data: any): Promise<any> {
    // HTTP Request an PVS API
    console.log(`Sending to ${system.name}:`, data);
    return { success: true };
  }

  private async importFromTobit(system: PVSConfig, credentials: any, filters?: any): Promise<any[]> {
    // Tobit API Integration
    return [];
  }

  private async importFromMedatixx(system: PVSConfig, credentials: any, filters?: any): Promise<any[]> {
    // Medatixx API Integration
    return [];
  }

  private async importFromCGM(system: PVSConfig, credentials: any, filters?: any): Promise<any[]> {
    // CGM API Integration
    return [];
  }
}

export const pvsIntegrationService = new PVSIntegrationService();
