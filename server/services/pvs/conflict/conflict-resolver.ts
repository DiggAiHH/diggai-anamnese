// ============================================
// Conflict Resolver
// ============================================

import { EventEmitter } from 'events';

export type ConflictType = 
  | 'patient.data.mismatch'
  | 'session.already.exported'
  | 'file.already.exists'
  | 'version.mismatch'
  | 'concurrent.modification';

export type ResolutionStrategy = 
  | 'diggai.wins'
  | 'pvs.wins'
  | 'merge'
  | 'manual'
  | 'timestamp.wins'
  | 'reject';

export interface Conflict {
  id: string;
  type: ConflictType;
  connectionId: string;
  pvsType: string;
  entityType: string;
  entityId: string;
  diggaiData: unknown;
  pvsData: unknown;
  detectedAt: Date;
  description: string;
  suggestedStrategy: ResolutionStrategy;
  resolvedAt?: Date;
  resolution?: ResolutionStrategy;
  resolvedBy?: string;
}

export class ConflictResolver extends EventEmitter {
  private conflicts = new Map<string, Conflict>();
  private autoResolveStrategies = new Map<ConflictType, ResolutionStrategy>();

  constructor() {
    super();
    this.autoResolveStrategies.set('session.already.exported', 'reject');
    this.autoResolveStrategies.set('file.already.exists', 'timestamp.wins');
    this.autoResolveStrategies.set('version.mismatch', 'manual');
    this.autoResolveStrategies.set('concurrent.modification', 'timestamp.wins');
    this.autoResolveStrategies.set('patient.data.mismatch', 'merge');
  }

  detectConflict(type: ConflictType, params: {
    connectionId: string;
    pvsType: string;
    entityType: string;
    entityId: string;
    diggaiData: unknown;
    pvsData: unknown;
    description: string;
  }): Conflict {
    const id = `${params.connectionId}:${params.entityType}:${params.entityId}:${Date.now()}`;
    
    const conflict: Conflict = {
      id,
      type,
      connectionId: params.connectionId,
      pvsType: params.pvsType,
      entityType: params.entityType,
      entityId: params.entityId,
      diggaiData: params.diggaiData,
      pvsData: params.pvsData,
      detectedAt: new Date(),
      description: params.description,
      suggestedStrategy: this.autoResolveStrategies.get(type) || 'manual',
    };

    this.conflicts.set(id, conflict);
    this.emit('conflict:detected', conflict);
    return conflict;
  }

  async resolve(conflictId: string, strategy: ResolutionStrategy, resolvedBy: string): Promise<{ success: boolean; finalData?: unknown; error?: string }> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return { success: false, error: 'Conflict not found' };

    conflict.resolvedAt = new Date();
    conflict.resolution = strategy;
    conflict.resolvedBy = resolvedBy;

    let finalData: unknown;

    switch (strategy) {
      case 'diggai.wins': finalData = conflict.diggaiData; break;
      case 'pvs.wins': finalData = conflict.pvsData; break;
      case 'merge': finalData = { ...conflict.pvsData as object, ...conflict.diggaiData as object }; break;
      case 'timestamp.wins':
        finalData = new Date((conflict.diggaiData as any)?.updatedAt || 0) > new Date((conflict.pvsData as any)?.updatedAt || 0) 
          ? conflict.diggaiData : conflict.pvsData;
        break;
      case 'reject': return { success: false, error: 'Operation rejected' };
      default: return { success: false, error: 'Manual resolution required' };
    }

    this.emit('conflict:resolved', conflict);
    return { success: true, finalData };
  }

  getUnresolved(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolvedAt);
  }

  getStats() {
    const all = Array.from(this.conflicts.values());
    return {
      total: all.length,
      unresolved: all.filter(c => !c.resolvedAt).length,
      resolved: all.filter(c => c.resolvedAt).length,
    };
  }
}

export const conflictResolver = new ConflictResolver();
