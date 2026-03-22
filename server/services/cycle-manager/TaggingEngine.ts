/**
 * Tagging Engine - The Unforgeable Trail
 * 
 * "Every agent leaves their tag on every change.
 * Every action has an optimized tracking method.
 * Their traces and stamps are everywhere."
 * 
 * This system ensures complete traceability and accountability.
 * Nothing happens without a tag. Nothing moves without a stamp.
 */

import { createHash, randomBytes } from 'crypto';
import { AgentID, AgentAction, CyclePhase } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TAG TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TagType = 
  | 'action'      // Direct action taken
  | 'modification' // Change to state/data
  | 'observation' // Witness or monitoring
  | 'decision'    // Choice made
  | 'communication' // Message sent
  | 'access'      // Data/resource accessed
  | 'creation'    // New entity created
  | 'deletion'    // Entity removed
  | 'transfer'    // Data moved between agents
  | 'validation'  // Verification performed
  | 'rejection'   // Action denied/blocked
  | 'inheritance'; // Inherited from previous

export interface AgentTag {
  // Unique identifier (immutable)
  tagId: string;
  
  // Tag classification
  type: TagType;
  category: 'critical' | 'important' | 'routine' | 'minor';
  
  // Agent attribution
  agentId: AgentID;
  agentSignature: string;  // Cryptographic proof
  
  // Temporal context
  timestamp: Date;
  cyclePhase: CyclePhase;
  cycleNumber: number;  // Which daily cycle
  
  // Content hash (what was done)
  contentHash: string;
  actionFingerprint: string;  // Unique action signature
  
  // Chain of custody
  previousTagId: string | null;
  chainHash: string;  // Hash of this + previous
  
  // Witness data
  witnesses: string[];
  witnessStamps: WitnessStamp[];
  
  // Validation
  validationProof: string;
  merkleRoot: string | null;  // If batched
  
  // Metadata
  location: string;  // Code location/module
  contextSnapshot: any;  // State at time of action
  impact: {
    affectedEntities: string[];
    riskScore: number;
    reversibility: boolean;
  };
  
  // Audit trail
  parentTagId: string | null;  // If this is a sub-action
  childTagIds: string[];  // Sub-actions spawned
  
  // Tamper evidence
  tamperHash: string;  // Hash of all above fields
  integrityVerified: boolean;
}

export interface WitnessStamp {
  witnessId: AgentID;
  timestamp: Date;
  stampType: 'observed' | 'validated' | 'questioned' | 'blocked';
  signature: string;
  confidence: number;  // Witness certainty
}

export interface TagChain {
  rootTag: AgentTag;
  tags: AgentTag[];
  complete: boolean;
  verified: boolean;
}

export interface ChangeTrajectory {
  tagId: string;
  agentId: AgentID;
  changeType: TagType;
  magnitude: number;  // How big was the change
  direction: 'constructive' | 'destructive' | 'neutral' | 'ambiguous';
  ripples: string[];  // Affected downstream tags
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface TrackingOptimization {
  agentId: AgentID;
  method: 'fingerprint' | 'delta' | 'snapshot' | 'event_sourcing' | 'merkle_tree';
  granularity: 'coarse' | 'fine' | 'atomic';
  compression: boolean;
  redundancy: number;  // Copies stored
  accessPattern: 'read_heavy' | 'write_heavy' | 'balanced';
  retention: number;  // Days to keep
}

const DEFAULT_OPTIMIZATIONS: Record<AgentID, TrackingOptimization> = {
  orchestrator: {
    agentId: 'orchestrator',
    method: 'event_sourcing',
    granularity: 'fine',
    compression: true,
    redundancy: 3,
    accessPattern: 'balanced',
    retention: 365,
  },
  empfang: {
    agentId: 'empfang',
    method: 'delta',
    granularity: 'atomic',
    compression: false,
    redundancy: 2,
    accessPattern: 'write_heavy',
    retention: 90,
  },
  triage: {
    agentId: 'triage',
    method: 'snapshot',
    granularity: 'atomic',
    compression: false,
    redundancy: 3,
    accessPattern: 'read_heavy',
    retention: 2555,  // 7 years for medical
  },
  dokumentation: {
    agentId: 'dokumentation',
    method: 'merkle_tree',
    granularity: 'atomic',
    compression: true,
    redundancy: 3,
    accessPattern: 'write_heavy',
    retention: 2555,
  },
  abrechnung: {
    agentId: 'abrechnung',
    method: 'merkle_tree',
    granularity: 'atomic',
    compression: true,
    redundancy: 5,
    accessPattern: 'balanced',
    retention: 2555,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// THE STAMP - Unforgeable Agent Signature
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentStamp {
  // Identity
  agentId: AgentID;
  stampId: string;
  
  // Temporal
  createdAt: Date;
  expiresAt: Date;
  cyclePhase: CyclePhase;
  
  // Authority level
  authority: 'sovereign' | 'delegated' | 'conditional' | 'revoked';
  
  // Scope
  scope: string[];  // What can be stamped
  restrictions: string[];  // What cannot be stamped
  
  // Cryptographic proof
  publicKey: string;
  stampHash: string;
  
  // Usage tracking
  usageCount: number;
  lastUsed: Date;
  revoked: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAGGING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class TaggingEngine {
  private tagDatabase: Map<string, AgentTag> = new Map();
  private agentChains: Map<AgentID, string[]> = new Map();  // agent -> tag IDs
  private entityTags: Map<string, string[]> = new Map();  // entity -> tag IDs
  private stamps: Map<AgentID, AgentStamp> = new Map();
  private cycleNumber: number = 0;
  private lastTagIds: Map<AgentID, string> = new Map();  // For chain linking
  
  private optimizationSettings: Map<AgentID, TrackingOptimization> = new Map();

  constructor() {
    this.initializeStamps();
    this.initializeOptimizations();
  }

  private initializeStamps(): void {
    const agents: AgentID[] = ['orchestrator', 'empfang', 'triage', 'dokumentation', 'abrechnung'];
    
    agents.forEach(agentId => {
      const now = new Date();
      this.stamps.set(agentId, {
        agentId,
        stampId: `stamp-${agentId}-${now.getTime()}`,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),  // 24 hours
        cyclePhase: 'sunrise',
        authority: agentId === 'orchestrator' ? 'sovereign' : 'delegated',
        scope: ['all'],
        restrictions: agentId === 'abrechnung' ? ['patient_data_modify'] : [],
        publicKey: this.generatePublicKey(agentId),
        stampHash: this.generateStampHash(agentId, now),
        usageCount: 0,
        lastUsed: now,
        revoked: false,
      });
    });
  }

  private initializeOptimizations(): void {
    Object.entries(DEFAULT_OPTIMIZATIONS).forEach(([agentId, config]) => {
      this.optimizationSettings.set(agentId as AgentID, config);
    });
  }

  private generatePublicKey(agentId: AgentID): string {
    return `pk-${agentId}-${randomBytes(16).toString('hex')}`;
  }

  private generateStampHash(agentId: AgentID, timestamp: Date): string {
    return createHash('sha256')
      .update(`${agentId}-${timestamp.toISOString()}-${randomBytes(8).toString('hex')}`)
      .digest('hex');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CORE TAGGING
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Create a tag for an agent action
   * This is the primary method - EVERY action MUST be tagged
   */
  createTag(
    agentId: AgentID,
    action: AgentAction,
    type: TagType,
    category: AgentTag['category'],
    context: {
      cyclePhase: CyclePhase;
      location: string;
      affectedEntities: string[];
    }
  ): AgentTag {
    const timestamp = new Date();
    const tagId = this.generateTagId(agentId, timestamp, action);
    const stamp = this.stamps.get(agentId)!;
    
    // Check stamp validity
    if (stamp.revoked || stamp.expiresAt < timestamp) {
      throw new Error(`Invalid stamp for agent ${agentId}`);
    }

    // Get chain link
    const previousTagId = this.lastTagIds.get(agentId) || null;
    
    // Create content hash
    const contentHash = this.hashAction(action);
    const actionFingerprint = this.generateFingerprint(agentId, action, timestamp);
    
    // Create chain hash
    const chainHash = this.createChainHash(tagId, previousTagId, contentHash);
    
    // Create tag
    const tag: AgentTag = {
      tagId,
      type,
      category,
      agentId,
      agentSignature: this.signTag(agentId, tagId, contentHash),
      timestamp,
      cyclePhase: context.cyclePhase,
      cycleNumber: this.cycleNumber,
      contentHash,
      actionFingerprint,
      previousTagId,
      chainHash,
      witnesses: [],
      witnessStamps: [],
      validationProof: this.createValidationProof(tagId, agentId),
      merkleRoot: null,
      location: context.location,
      contextSnapshot: this.captureContext(agentId),
      impact: {
        affectedEntities: context.affectedEntities,
        riskScore: action.riskLevel,
        reversibility: action.reversible,
      },
      parentTagId: null,
      childTagIds: [],
      tamperHash: '',  // Will be set below
      integrityVerified: true,
    };
    
    // Calculate tamper hash
    tag.tamperHash = this.calculateTamperHash(tag);
    
    // Store tag
    this.tagDatabase.set(tagId, tag);
    
    // Update chain
    this.lastTagIds.set(agentId, tagId);
    
    // Update agent chain
    const agentChain = this.agentChains.get(agentId) || [];
    agentChain.push(tagId);
    this.agentChains.set(agentId, agentChain);
    
    // Update entity tracking
    context.affectedEntities.forEach(entity => {
      const entityChain = this.entityTags.get(entity) || [];
      entityChain.push(tagId);
      this.entityTags.set(entity, entityChain);
    });
    
    // Update stamp usage
    stamp.usageCount++;
    stamp.lastUsed = timestamp;
    
    return tag;
  }

  /**
   * Add witness stamp to a tag
   */
  addWitnessStamp(
    tagId: string,
    witnessId: AgentID,
    stampType: WitnessStamp['stampType'],
    confidence: number
  ): void {
    const tag = this.tagDatabase.get(tagId);
    if (!tag) throw new Error(`Tag ${tagId} not found`);
    
    const witnessStamp: WitnessStamp = {
      witnessId,
      timestamp: new Date(),
      stampType,
      signature: this.signWitness(witnessId, tagId, stampType),
      confidence,
    };
    
    tag.witnessStamps.push(witnessStamp);
    tag.witnesses.push(witnessId);
    
    // Recalculate tamper hash
    tag.tamperHash = this.calculateTamperHash(tag);
  }

  /**
   * Create child tag (sub-action)
   */
  createChildTag(
    parentTagId: string,
    agentId: AgentID,
    action: AgentAction,
    type: TagType,
    category: AgentTag['category'],
    context: any
  ): AgentTag {
    const parent = this.tagDatabase.get(parentTagId);
    if (!parent) throw new Error(`Parent tag ${parentTagId} not found`);
    
    const childTag = this.createTag(agentId, action, type, category, context);
    childTag.parentTagId = parentTagId;
    
    parent.childTagIds.push(childTag.tagId);
    
    return childTag;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VERIFICATION & AUDIT
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Verify tag integrity
   */
  verifyTag(tagId: string): { valid: boolean; issues: string[] } {
    const tag = this.tagDatabase.get(tagId);
    if (!tag) return { valid: false, issues: ['Tag not found'] };
    
    const issues: string[] = [];
    
    // Verify tamper hash
    const calculatedTamperHash = this.calculateTamperHash(tag);
    if (calculatedTamperHash !== tag.tamperHash) {
      issues.push('Tamper hash mismatch - tag may be corrupted');
      tag.integrityVerified = false;
    }
    
    // Verify chain link
    if (tag.previousTagId) {
      const previous = this.tagDatabase.get(tag.previousTagId);
      if (!previous) {
        issues.push('Previous tag in chain not found');
      } else {
        const expectedChainHash = this.createChainHash(tag.tagId, tag.previousTagId, tag.contentHash);
        if (expectedChainHash !== tag.chainHash) {
          issues.push('Chain hash mismatch - chain may be broken');
        }
      }
    }
    
    // Verify agent signature
    if (!this.verifySignature(tag.agentId, tag.tagId, tag.contentHash, tag.agentSignature)) {
      issues.push('Agent signature invalid');
    }
    
    // Verify witness stamps
    tag.witnessStamps.forEach(stamp => {
      if (!this.verifySignature(stamp.witnessId, tag.tagId, stamp.stampType, stamp.signature)) {
        issues.push(`Witness stamp from ${stamp.witnessId} invalid`);
      }
    });
    
    return { valid: issues.length === 0, issues };
  }

  /**
   * Verify complete chain for an agent
   */
  verifyAgentChain(agentId: AgentID): { 
    complete: boolean; 
    gaps: number; 
    verified: number;
    total: number;
  } {
    const chain = this.agentChains.get(agentId) || [];
    let gaps = 0;
    let verified = 0;
    
    for (const tagId of chain) {
      const result = this.verifyTag(tagId);
      if (result.valid) verified++;
      if (result.issues.length > 0) gaps++;
    }
    
    return {
      complete: gaps === 0,
      gaps,
      verified,
      total: chain.length,
    };
  }

  /**
   * Get audit trail for any entity
   */
  getAuditTrail(entityId: string): AgentTag[] {
    const tagIds = this.entityTags.get(entityId) || [];
    return tagIds.map(id => this.tagDatabase.get(id)!).filter(Boolean);
  }

  /**
   * Get complete chain for a tag
   */
  getTagChain(tagId: string): TagChain {
    const rootTag = this.tagDatabase.get(tagId);
    if (!rootTag) throw new Error('Tag not found');
    
    const tags: AgentTag[] = [rootTag];
    
    // Get parent chain
    let current: AgentTag | undefined = rootTag;
    while (current?.parentTagId) {
      current = this.tagDatabase.get(current.parentTagId);
      if (current) tags.unshift(current);
    }
    
    // Get children
    const getChildren = (parentId: string) => {
      const parent = this.tagDatabase.get(parentId);
      if (!parent) return;
      parent.childTagIds.forEach(childId => {
        const child = this.tagDatabase.get(childId);
        if (child) {
          tags.push(child);
          getChildren(childId);
        }
      });
    };
    getChildren(tagId);
    
    return {
      rootTag,
      tags,
      complete: true,
      verified: tags.every(t => this.verifyTag(t.tagId).valid),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHANGE TRAJECTORY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Analyze the trajectory of changes
   */
  analyzeChangeTrajectory(agentId: AgentID, timeWindow: number = 24 * 60 * 60 * 1000): ChangeTrajectory[] {
    const chain = this.agentChains.get(agentId) || [];
    const cutoff = Date.now() - timeWindow;
    
    return chain
      .map(tagId => this.tagDatabase.get(tagId)!)
      .filter(tag => tag.timestamp.getTime() > cutoff)
      .map(tag => ({
        tagId: tag.tagId,
        agentId: tag.agentId,
        changeType: tag.type,
        magnitude: this.calculateMagnitude(tag),
        direction: this.determineDirection(tag),
        ripples: this.findRipples(tag),
        timestamp: tag.timestamp,
      }));
  }

  private calculateMagnitude(tag: AgentTag): number {
    let magnitude = tag.impact.affectedEntities.length;
    magnitude += tag.impact.riskScore / 2;
    if (!tag.impact.reversibility) magnitude *= 1.5;
    return magnitude;
  }

  private determineDirection(tag: AgentTag): ChangeTrajectory['direction'] {
    switch (tag.type) {
      case 'creation':
      case 'validation':
        return 'constructive';
      case 'deletion':
      case 'rejection':
        return 'destructive';
      case 'modification':
        return 'ambiguous';
      default:
        return 'neutral';
    }
  }

  private findRipples(tag: AgentTag): string[] {
    // Find tags that were affected by this tag
    const ripples: string[] = [];
    
    tag.impact.affectedEntities.forEach(entity => {
      const entityTags = this.entityTags.get(entity) || [];
      entityTags.forEach(id => {
        if (id !== tag.tagId) {
          const otherTag = this.tagDatabase.get(id);
          if (otherTag && otherTag.timestamp > tag.timestamp) {
            ripples.push(id);
          }
        }
      });
    });
    
    return ripples;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAMP MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Issue new stamp (after Moon Witness rebirth)
   */
  issueNewStamp(agentId: AgentID, authority: AgentStamp['authority']): AgentStamp {
    const now = new Date();
    const stamp: AgentStamp = {
      agentId,
      stampId: `stamp-${agentId}-${now.getTime()}`,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      cyclePhase: 'sunrise',
      authority,
      scope: ['all'],
      restrictions: authority === 'revoked' ? ['all'] : [],
      publicKey: this.generatePublicKey(agentId),
      stampHash: this.generateStampHash(agentId, now),
      usageCount: 0,
      lastUsed: now,
      revoked: authority === 'revoked',
    };
    
    this.stamps.set(agentId, stamp);
    return stamp;
  }

  /**
   * Revoke stamp
   */
  revokeStamp(agentId: AgentID, reason: string): void {
    const stamp = this.stamps.get(agentId);
    if (stamp) {
      stamp.revoked = true;
      stamp.restrictions = ['all'];
      console.log(`[TaggingEngine] Stamp revoked for ${agentId}: ${reason}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OPTIMIZATION METHODS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Batch tags into Merkle tree (for high-volume agents)
   */
  batchTags(agentId: AgentID, tagIds: string[]): string {
    const optimization = this.optimizationSettings.get(agentId)!;
    if (optimization.method !== 'merkle_tree') {
      throw new Error('Merkle batching only available for merkle_tree optimization');
    }
    
    // Create Merkle root
    const hashes = tagIds.map(id => this.tagDatabase.get(id)?.tamperHash || '');
    const merkleRoot = this.createMerkleRoot(hashes);
    
    // Update tags with root
    tagIds.forEach(id => {
      const tag = this.tagDatabase.get(id);
      if (tag) tag.merkleRoot = merkleRoot;
    });
    
    return merkleRoot;
  }

  /**
   * Compress old tags (based on optimization settings)
   */
  compressOldTags(agentId: AgentID): number {
    const optimization = this.optimizationSettings.get(agentId)!;
    if (!optimization.compression) return 0;
    
    const chain = this.agentChains.get(agentId) || [];
    const cutoff = Date.now() - (optimization.retention * 24 * 60 * 60 * 1000);
    
    let compressed = 0;
    chain.forEach(tagId => {
      const tag = this.tagDatabase.get(tagId);
      if (tag && tag.timestamp.getTime() < cutoff) {
        // Compress: keep hash, remove full snapshot
        tag.contextSnapshot = { compressed: true, originalHash: tag.contentHash };
        compressed++;
      }
    });
    
    return compressed;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════

  private generateTagId(agentId: AgentID, timestamp: Date, action: AgentAction): string {
    const data = `${agentId}-${timestamp.getTime()}-${action.type}-${randomBytes(4).toString('hex')}`;
    return `tag-${createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  private hashAction(action: AgentAction): string {
    return createHash('sha256').update(JSON.stringify(action)).digest('hex');
  }

  private generateFingerprint(agentId: AgentID, action: AgentAction, timestamp: Date): string {
    return createHash('sha256')
      .update(`${agentId}-${action.type}-${timestamp.getTime()}-${randomBytes(8).toString('hex')}`)
      .digest('hex')
      .substring(0, 32);
  }

  private createChainHash(currentId: string, previousId: string | null, contentHash: string): string {
    const data = `${currentId}-${previousId || 'genesis'}-${contentHash}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private signTag(agentId: AgentID, tagId: string, contentHash: string): string {
    const stamp = this.stamps.get(agentId)!;
    return createHash('sha256')
      .update(`${stamp.stampHash}-${tagId}-${contentHash}`)
      .digest('hex');
  }

  private signWitness(witnessId: AgentID, tagId: string, stampType: string): string {
    const stamp = this.stamps.get(witnessId)!;
    return createHash('sha256')
      .update(`${stamp.stampHash}-${tagId}-${stampType}-${Date.now()}`)
      .digest('hex');
  }

  private createValidationProof(tagId: string, agentId: AgentID): string {
    return createHash('sha256').update(`valid-${tagId}-${agentId}-${Date.now()}`).digest('hex');
  }

  private captureContext(agentId: AgentID): any {
    // Capture relevant context at time of tagging
    return {
      timestamp: new Date().toISOString(),
      cycleNumber: this.cycleNumber,
      agentState: 'active',  // Would be actual state
    };
  }

  private calculateTamperHash(tag: AgentTag): string {
    const data = JSON.stringify({
      tagId: tag.tagId,
      agentId: tag.agentId,
      timestamp: tag.timestamp,
      contentHash: tag.contentHash,
      chainHash: tag.chainHash,
      witnessStamps: tag.witnessStamps,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  private verifySignature(agentId: AgentID, data: string, context: string, signature: string): boolean {
    const stamp = this.stamps.get(agentId);
    if (!stamp) return false;
    
    const expected = createHash('sha256')
      .update(`${stamp.stampHash}-${data}-${context}`)
      .digest('hex');
    
    return expected === signature;
  }

  private createMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];
    
    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      nextLevel.push(createHash('sha256').update(left + right).digest('hex'));
    }
    
    return this.createMerkleRoot(nextLevel);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Increment cycle number (at Sunrise)
   */
  incrementCycle(): void {
    this.cycleNumber++;
  }

  /**
   * Get current cycle number
   */
  getCurrentCycle(): number {
    return this.cycleNumber;
  }

  /**
   * Get tag by ID
   */
  getTag(tagId: string): AgentTag | undefined {
    return this.tagDatabase.get(tagId);
  }

  /**
   * Get all tags for an agent
   */
  getAgentTags(agentId: AgentID): AgentTag[] {
    const chain = this.agentChains.get(agentId) || [];
    return chain.map(id => this.tagDatabase.get(id)!).filter(Boolean);
  }

  /**
   * Get stamp for agent
   */
  getStamp(agentId: AgentID): AgentStamp | undefined {
    return this.stamps.get(agentId);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalTags: number;
    tagsByAgent: Record<AgentID, number>;
    tagsByType: Record<TagType, number>;
    verifiedChains: number;
    brokenChains: number;
  } {
    const stats = {
      totalTags: this.tagDatabase.size,
      tagsByAgent: {} as Record<AgentID, number>,
      tagsByType: {} as Record<TagType, number>,
      verifiedChains: 0,
      brokenChains: 0,
    };
    
    this.agentChains.forEach((chain, agentId) => {
      stats.tagsByAgent[agentId] = chain.length;
      
      const verification = this.verifyAgentChain(agentId);
      if (verification.complete) stats.verifiedChains++;
      else stats.brokenChains++;
    });
    
    this.tagDatabase.forEach(tag => {
      stats.tagsByType[tag.type] = (stats.tagsByType[tag.type] || 0) + 1;
    });
    
    return stats;
  }
}

// Singleton
let instance: TaggingEngine | null = null;

export function getTaggingEngine(): TaggingEngine {
  if (!instance) {
    instance = new TaggingEngine();
  }
  return instance;
}

export default TaggingEngine;
