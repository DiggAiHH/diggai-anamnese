// ============================================
// PVS Router Service — Strategy Pattern
// ============================================

import type { PvsAdapter, PvsType, PvsConnectionData, TransferResult, PatientSessionFull } from './types.js';
import { CgmM1Adapter } from './adapters/cgm-m1.adapter.js';
import { FhirGenericAdapter } from './adapters/fhir-generic.adapter.js';

/**
 * Adapter registry: Maps PVS type to adapter constructor.
 * CGM family (CGM_M1, TURBOMED, MEDISTAR) shares the CgmM1Adapter.
 * medatixx family (MEDATIXX, X_ISYNET) also uses GDT but could have variations.
 * For MVP, all GDT-based PVS use CgmM1Adapter; FHIR-based use FhirGenericAdapter.
 */
type AdapterConstructor = new () => PvsAdapter;

const ADAPTER_REGISTRY: Record<PvsType, AdapterConstructor> = {
  CGM_M1: CgmM1Adapter,
  MEDATIXX: CgmM1Adapter,       // GDT-based, same interface
  MEDISTAR: CgmM1Adapter,       // CGM family
  T2MED: FhirGenericAdapter,    // Supports FHIR natively
  X_ISYNET: CgmM1Adapter,      // medatixx family, GDT
  DOCTOLIB: FhirGenericAdapter, // REST/FHIR
  TURBOMED: CgmM1Adapter,      // CGM family
  FHIR_GENERIC: FhirGenericAdapter,
};

/**
 * PVS Router — manages active adapter instances and provides
 * a facade for all PVS operations.
 */
export class PvsRouter {
  private activeAdapters = new Map<string, PvsAdapter>();

  /**
   * Get or create adapter for a connection.
   */
  async getAdapter(connection: PvsConnectionData): Promise<PvsAdapter> {
    if (this.activeAdapters.has(connection.id)) {
      return this.activeAdapters.get(connection.id)!;
    }

    const AdapterClass = ADAPTER_REGISTRY[connection.pvsType];
    if (!AdapterClass) {
      throw new Error(`Kein Adapter für PVS-Typ: ${connection.pvsType}`);
    }

    const adapter = new AdapterClass();
    await adapter.initialize(connection);
    this.activeAdapters.set(connection.id, adapter);
    return adapter;
  }

  /**
   * Test connection for a PVS configuration.
   */
  async testConnection(connection: PvsConnectionData): Promise<{ ok: boolean; message: string }> {
    const adapter = await this.getAdapter(connection);
    return adapter.testConnection();
  }

  /**
   * Export anamnese result via the appropriate adapter.
   */
  async exportAnamnese(
    connection: PvsConnectionData,
    session: PatientSessionFull,
  ): Promise<TransferResult> {
    const adapter = await this.getAdapter(connection);
    return adapter.exportAnamneseResult(session);
  }

  /**
   * Remove an active adapter (e.g., on disconnect).
   */
  async removeAdapter(connectionId: string): Promise<void> {
    const adapter = this.activeAdapters.get(connectionId);
    if (adapter) {
      await adapter.disconnect();
      this.activeAdapters.delete(connectionId);
    }
  }

  /**
   * Get capabilities for a PVS type.
   */
  getCapabilities(pvsType: PvsType) {
    const AdapterClass = ADAPTER_REGISTRY[pvsType];
    if (!AdapterClass) return null;
    const temp = new AdapterClass();
    return temp.getCapabilities();
  }

  /**
   * Shutdown all active adapters.
   */
  async shutdown(): Promise<void> {
    for (const [, adapter] of this.activeAdapters) {
      await adapter.disconnect();
    }
    this.activeAdapters.clear();
  }
}

// Singleton instance
export const pvsRouter = new PvsRouter();
