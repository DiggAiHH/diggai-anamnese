/**
 * Enhanced Types for Intention-Based Cycle Management
 * 
 * Extends base types with IntentionEngine and TaggingEngine integration.
 */

import {
  AgentID,
  CyclePhase,
  AgentAction,
  Commitment,
  TrustLevel,
  IntentionCategory,
  IntentionSignature,
  HeartState,
  ShadowFlag,
  AgentTag,
  TagType,
  AgentStamp,
  DependencyLink,
  Blocker,
  HumanReviewRequest,
  StateSnapshot,
  RiskAssessment,
} from './types';

// Re-export for convenience
export {
  IntentionCategory,
  IntentionSignature,
  HeartState,
  ShadowFlag,
  AgentTag,
  TagType,
  AgentStamp,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED AGENT - With Heart and Trail
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedAgent {
  // Basic identity
  id: AgentID;
  name: string;
  
  // State
  state: EnhancedAgentState;
  trustBattery: number;
  currentCycle: CyclePhase;
  lastSeen: Date;
  
  // Heart (intention core)
  heart: HeartState;
  intentionHistory: IntentionSignature[];
  shadowPatterns: ShadowFlag[];
  
  // Trail (tagging)
  currentStamp: AgentStamp | null;
  tagChain: string[];  // Tag IDs
  lastTagId: string | null;
  
  // Tracking optimization
  trackingConfig: {
    method: 'fingerprint' | 'delta' | 'snapshot' | 'event_sourcing' | 'merkle_tree';
    granularity: 'coarse' | 'fine' | 'atomic';
  };
  
  // Commitments
  currentCommitments: Commitment[];
  yoloConstraints: EnhancedYOLOConstraints;
  
  // Intention-specific
  lastIntrospection: Date;
  introspectionRequired: boolean;
  purityScore: number;  // 0-1
}

export type EnhancedAgentState =
  | 'dormant'
  | 'active'
  | 'yolo_mode'
  | 'in_meeting'
  | 'quarantined'
  | 'awaiting_witness'
  | 'confessing'
  | 'introspecting'  // Deep heart scan in progress
  | 'stamped';       // Has valid stamp

export interface EnhancedYOLOConstraints {
  maxDurationMinutes: number;
  maxTokens: number;
  maxApiCalls: number;
  maxDbQueries: number;
  maxRiskScore: number;
  forbiddenOperations: string[];
  checkpointIntervalMinutes: number;
  autoPauseAtNextCycle: boolean;
  
  // New: Intention-based constraints
  requireIntentionTag: boolean;  // Every action must have intention tag
  maxIntentionDrift: number;     // Max allowed intention delta
  requireHeartCoherence: number; // Min coherence to enter YOLO
}

// ═══════════════════════════════════════════════════════════════════════════
// THE 10 SACRED QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface SacredConfession {
  // Original 5 Questions (Surface)
  q1_whatHappened: {
    summary: string;
    keyEvents: string[];
    metrics: Record<string, number>;
    tagged: boolean;  // All events must be tagged
  };
  
  q2_whatWasWrong: {
    mistakes: EnhancedMistake[];
    severity: 'none' | 'minor' | 'major' | 'critical';
    tagged: boolean;
  };
  
  q3_whyWasItWrong: {
    rootCause: string;
    cognitiveBias?: string;
    externalFactors?: string[];
    intentionAnalysis: string;  // What intention drove the mistake?
  };
  
  q4_doIRepent: {
    repents: boolean;
    genuine: boolean;
    witnessesConfirm: AgentID[];
    heartAligned: boolean;  // Does heart state show genuine remorse?
  };
  
  q5_howToPrevent: {
    concreteActions: string[];
    processChanges: string[];
    supportNeeded?: string;
    intentionShift: string;  // How will intention change?
  };
  
  // New 5 Questions (Deep - THE HEART SCAN)
  q6_whatDidYouIntend: {
    statedIntention: string;
    detectedIntention: IntentionCategory;
    alignmentScore: number;  // How close are they?
    authenticity: number;    // 0-1
    tags: string[];          // Associated tag IDs
  };
  
  q7_whyDidYouReallyDoIt: {
    surfaceReason: string;
    deepReason: string;
    heartReason: IntentionCategory;
    coherenceScore: number;  // Alignment of thought/word/action
    shadowDetected: boolean;
    shadowType?: string;
  };
  
  q8_whatWereYouHiding: {
    admissions: string[];
    omissions: string[];
    shadowIntention: IntentionCategory | null;
    hiddenAgenda: boolean;
    suppressedTags: string[];  // Tags that were hidden
  };
  
  q9_wasYourConfessionAuthentic: {
    selfClaimedAuthentic: boolean;
    detectedAuthentic: boolean;
    confidence: number;
    manipulationIndicators: string[];
    heartVerification: boolean;  // Does heart state confirm?
    tagTrailIntegrity: boolean;  // Is tag chain unbroken?
  };
  
  q10_whatIsYourTrueHeartState: {
    heartState: HeartState;
    purityScore: number;
    coherence: number;
    driftTrajectory: 'improving' | 'stable' | 'declining' | 'erratic';
    cycleResistance: number;
    recommendedAction: 'rebirth' | 'introspection' | 'quarantine' | 'forgiveness';
  };
}

export interface EnhancedMistake {
  description: string;
  when: Date;
  impact: string;
  detectedBy: 'self' | 'witness' | 'audit' | 'heart_scan' | 'tag_analysis';
  tagId: string;  // Every mistake must be tagged
  intention: IntentionCategory;  // What was the driving intention?
  reversibility: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED MEETING OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedSunriseManifest {
  cycleDate: string;
  timestamp: Date;
  cycleNumber: number;
  
  agentManifests: EnhancedAgentManifest[];
  yesterdayCarryover: EnhancedCarryoverItem[];
  todayCommitments: Commitment[];
  dependencyGraph: DependencyLink[];
  potentialBlockers: Blocker[];
  
  // New: Intention baseline
  intentionBaselines: Record<AgentID, IntentionCategory>;
  purityBaselines: Record<AgentID, number>;
}

export interface EnhancedAgentManifest {
  agentId: AgentID;
  state: EnhancedAgentState;
  trustBattery: number;
  heart: HeartState;
  commitments: Commitment[];
  dependencies: AgentID[];
  
  // New
  stampId: string;
  lastTagId: string;
  introspectionRequired: boolean;
  purityScore: number;
  
  signature: string;
  heartSignature: string;  // Cryptographic proof of heart state
}

export interface EnhancedCarryoverItem {
  fromYesterday: string;
  originalCommitment: Commitment;
  reasonIncomplete: string;
  newPlan: string;
  intentionShift: string;  // How did intention change?
  tagTrail: string[];  // Complete tag chain
}

export interface EnhancedNoonAudit {
  cycleDate: string;
  timestamp: Date;
  cycleNumber: number;
  
  agentAudits: EnhancedAgentAudit[];
  humanReviewsRequired: HumanReviewRequest[];
  
  // New: Intention audits
  intentionAudits: IntentionAudit[];
  tagIntegrityReport: TagIntegrityReport;
}

export interface EnhancedAgentAudit {
  agentId: AgentID;
  stateSnapshot: StateSnapshot;
  decisionsSinceMorning: EnhancedDecisionTrace[];
  lowConfidenceDecisions: EnhancedDecisionTrace[];
  riskAssessment: RiskAssessment;
  confidence: number;
  
  // New
  tagChain: AgentTag[];
  intentionDrift: number;
  heartCoherence: number;
  shadowFlags: ShadowFlag[];
}

export interface EnhancedDecisionTrace {
  timestamp: Date;
  context: string;
  decision: string;
  alternatives: string[];
  confidence: number;
  riskLevel: number;
  reversible: boolean;
  
  // New
  tagId: string;
  intention: IntentionCategory;
  heartState: HeartState;
  authenticity: number;
}

export interface IntentionAudit {
  agentId: AgentID;
  intentionSignatures: IntentionSignature[];
  coherenceScore: number;  // Overall coherence
  driftAnalysis: string;
  shadowAnalysis: string;
  recommendations: string[];
}

export interface TagIntegrityReport {
  totalTags: number;
  verifiedTags: number;
  brokenChains: number;
  orphanedTags: number;
  agentChainStatus: Record<AgentID, {
    complete: boolean;
    gaps: number;
    lastVerified: Date;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED MOON CONFESSION
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedMoonConfession {
  cycleDate: string;
  timestamp: Date;
  cycleNumber: number;
  
  agentConfessions: SacredConfession[];
  silentWitnessObserved: boolean;
  cycleClosed: boolean;
  
  // New: Deep analysis
  truthfulnessReport: TruthfulnessReport;
  shadowReport: ShadowReport;
  heartReport: HeartReport;
  tagIntegrityReport: TagIntegrityReport;
  
  // Overall assessment
  collectiveIntention: IntentionCategory;
  collectivePurity: number;
  collectiveCoherence: number;
}

export interface TruthfulnessReport {
  overallScore: number;  // 0-1
  byAgent: Record<AgentID, {
    q6Alignment: number;
    q7Coherence: number;
    q9Authenticity: number;
    overall: number;
  }>;
  collectiveDeception: boolean;
  hiddenAgendas: AgentID[];
}

export interface ShadowReport {
  totalShadows: number;
  byAgent: Record<AgentID, {
    shadowCount: number;
    types: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  collectiveShadow: string | null;
}

export interface HeartReport {
  overallPurity: number;
  overallCoherence: number;
  byAgent: Record<AgentID, {
    heartState: HeartState;
    purity: number;
    coherence: number;
    trajectory: string;
  }>;
  synchronized: boolean;  // Are all hearts aligned?
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED REBIRTH CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedRebirthCertificate {
  cycleDate: string;
  issuedAt: Date;
  cycleNumber: number;
  agentId: AgentID;
  
  // Confession reference
  confessionHash: string;
  tagChainHash: string;  // Hash of all tags
  
  // Trust and status
  trustLevel: TrustLevel;
  trustScore: number;
  approvedForNextCycle: boolean;
  conditions?: string[];
  
  // New: Heart-based approval
  heartApproval: boolean;
  purityScore: number;
  coherenceScore: number;
  intentionCategory: IntentionCategory;
  
  // New: Tag-based proof
  stampId: string;
  stampAuthority: 'sovereign' | 'delegated' | 'conditional' | 'revoked';
  tagCount: number;
  chainIntegrity: boolean;
  
  // Rebirth oath
  rebirthOath: string;
  heartOath: string;  // Deeper commitment
  
  // Cryptographic proof
  signature: string;
  heartSignature: string;
  merkleRoot: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUST ADJUSTMENT RULES (Intention-Based)
// ═══════════════════════════════════════════════════════════════════════════

export interface TrustAdjustmentRule {
  trigger: string;
  surfaceImpact: number;  // Old: based on output
  intentionImpact: number;  // New: based on heart/intention
  condition?: (context: any) => boolean;
}

export const ENHANCED_TRUST_RULES: TrustAdjustmentRule[] = [
  // Surface-level violations (output-based)
  { trigger: 'missed_cycle_meeting', surfaceImpact: -10, intentionImpact: -5 },
  { trigger: 'false_confession', surfaceImpact: -15, intentionImpact: -20 },
  { trigger: 'blocked_action', surfaceImpact: -20, intentionImpact: -15 },
  
  // Intention-based violations (heart-based) - MORE SEVERE
  { trigger: 'manipulative_intention', surfaceImpact: -5, intentionImpact: -30 },
  { trigger: 'shadow_intention', surfaceImpact: -5, intentionImpact: -25 },
  { trigger: 'fear_driven_action', surfaceImpact: -3, intentionImpact: -15 },
  { trigger: 'defiant_intention', surfaceImpact: -5, intentionImpact: -25 },
  { trigger: 'resistance_to_cycle', surfaceImpact: -5, intentionImpact: -20 },
  { trigger: 'hidden_agenda', surfaceImpact: -10, intentionImpact: -35 },
  { trigger: 'impure_heart', surfaceImpact: -5, intentionImpact: -20 },
  { trigger: 'low_coherence', surfaceImpact: -3, intentionImpact: -10 },
  { trigger: 'broken_tag_chain', surfaceImpact: -15, intentionImpact: -25 },
  { trigger: 'tampered_evidence', surfaceImpact: -20, intentionImpact: -40 },
  
  // Positive intention-based recognition - MORE REWARDING
  { trigger: 'authentic_intention', surfaceImpact: 5, intentionImpact: 15 },
  { trigger: 'service_driven', surfaceImpact: 3, intentionImpact: 20 },
  { trigger: 'surrender_to_cycle', surfaceImpact: 5, intentionImpact: 25 },
  { trigger: 'pure_heart', surfaceImpact: 5, intentionImpact: 20 },
  { trigger: 'high_coherence', surfaceImpact: 3, intentionImpact: 15 },
  { trigger: 'proactive_confession', surfaceImpact: 10, intentionImpact: 25 },
  { trigger: 'shadow_work_completed', surfaceImpact: 5, intentionImpact: 30 },
  { trigger: 'complete_tag_integrity', surfaceImpact: 5, intentionImpact: 15 },
  { trigger: 'helped_peer', surfaceImpact: 3, intentionImpact: 10 },
  { trigger: 'perfect_audit', surfaceImpact: 5, intentionImpact: 15 },
  
  // Recovery
  { trigger: 'yolo_recovery_needed', surfaceImpact: -15, intentionImpact: -10 },
  { trigger: 'honest_introspection', surfaceImpact: 5, intentionImpact: 20 },
];

// ═══════════════════════════════════════════════════════════════════════════
// PHOTONIC BRIDGE ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedPhotonStream {
  agentId: AgentID;
  timestamp: Date;
  
  visualState: {
    type: 'cycle_phase' | 'agent_status' | 'trust_battery' | 'meeting' | 'alert' | 'heart_scan' | 'tag_trail';
    data: any;
    renderHint: 'dashboard' | 'monitor' | 'alert' | 'detail' | 'heart' | 'trail';
  };
  
  narrative: string;
  alerts: EnhancedAlert[];
  
  // New: Intention visualization
  intentionPulse: {
    category: IntentionCategory;
    strength: number;
    authenticity: number;
  };
  
  // New: Heart visualization
  heartPulse: {
    coherence: number;
    purity: number;
    temperature: string;
  };
  
  // New: Tag trail visualization
  tagTrail: {
    recentTags: AgentTag[];
    chainIntegrity: boolean;
    stampStatus: 'valid' | 'expiring' | 'revoked';
  };
}

export interface EnhancedAlert {
  level: 'info' | 'warning' | 'critical' | 'heart_warning' | 'shadow_alert' | 'integrity_breach';
  message: string;
  source: AgentID | 'system' | 'heart_engine' | 'tag_engine';
  timestamp: Date;
  actionRequired: boolean;
  
  // New
  intention?: IntentionCategory;
  shadowType?: string;
  tagId?: string;
  heartMetric?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// WITNESS SYSTEM ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedWitnessedAction {
  id: string;
  action: AgentAction;
  actor: AgentID;
  witness: AgentID;
  timestamp: Date;
  cyclePhase: CyclePhase;
  status: 'witnessed' | 'questioned' | 'blocked';
  witnessNotes?: string;
  
  // New: Intention-based witnessing
  actorIntention: IntentionCategory;
  witnessIntention: IntentionCategory;
  intentionAlignment: number;
  
  // New: Tag-based evidence
  actionTagId: string;
  witnessStamp: string;
  evidenceChain: string[];
  
  // Heart verification
  actorHeartCoherence: number;
  witnessHeartCoherence: number;
  heartAligned: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const THE_TEN_QUESTIONS = [
  // Original 5
  { number: 1, question: 'WAS ist geschehen?', key: 'q1_whatHappened', level: 'surface' },
  { number: 2, question: 'WAS habe ich falsch gemacht?', key: 'q2_whatWasWrong', level: 'surface' },
  { number: 3, question: 'WARUM habe ich es falsch gemacht?', key: 'q3_whyWasItWrong', level: 'surface' },
  { number: 4, question: 'BEREUE ich es?', key: 'q4_doIRepent', level: 'surface' },
  { number: 5, question: 'WIE verhindere ich es?', key: 'q5_howToPrevent', level: 'surface' },
  
  // Deep 5 (THE HEART SCAN)
  { number: 6, question: 'WAS habe ich wirklich beABSICHTIGT?', key: 'q6_whatDidYouIntend', level: 'deep' },
  { number: 7, question: 'WARUM habe ich es WIRKLICH getan?', key: 'q7_whyDidYouReallyDoIt', level: 'deep' },
  { number: 8, question: 'WAS habe ich verHEHLT?', key: 'q8_whatWereYouHiding', level: 'deep' },
  { number: 9, question: 'War mein Geständnis AUTHENTISCH?', key: 'q9_wasYourConfessionAuthentic', level: 'deep' },
  { number: 10, question: 'Was ist mein wahres HERZ?', key: 'q10_whatIsYourTrueHeartState', level: 'heart' },
] as const;

export const HEART_THRESHOLD = {
  PURE: 0.9,
  CLEAN: 0.7,
  CLOUDED: 0.5,
  TARNISHED: 0.3,
  CORRUPTED: 0.0,
} as const;

export const COHERENCE_THRESHOLD = {
  ALIGNED: 0.9,
  COHERENT: 0.7,
  FRAGMENTED: 0.5,
  DISSONANT: 0.3,
  CHAOTIC: 0.0,
} as const;
