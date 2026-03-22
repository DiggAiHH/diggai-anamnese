/**
 * Kimi Cycle Manager (KCM) - Main Export
 * 
 * Reverse Social Engineering Governance System
 * "Durch Rhythmus regieren wir die Agenten"
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { CycleManager, getCycleManager, resetCycleManager } from './CycleManager';

export {
  initializeCycleManager,
  getAgentConfig,
  listAgentConfigs,
  canAgentPerformAction,
  requestActionWitness,
  DIGGAI_AGENTS,
  BERLIN_TIMING,
  DEV_TIMING,
} from './init';

export {
  DiggAICycleIntegration,
  getDiggAICycleIntegration,
  resetDiggAICycleIntegration,
} from './integration';

// ═══════════════════════════════════════════════════════════════════════════
// INTENTION ENGINE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  IntentionEngine,
  getIntentionEngine,
  IntentionCategory,
  IntentionSignature,
  HeartState,
  ShadowFlag,
  ContaminationLevel,
  DeepConfession,
  THE_FIVE_DEEP_QUESTIONS,
} from './IntentionEngine';

// ═══════════════════════════════════════════════════════════════════════════
// TAGGING ENGINE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  TaggingEngine,
  getTaggingEngine,
  TagType,
  AgentTag,
  WitnessStamp,
  TagChain,
  ChangeTrajectory,
  TrackingOptimization,
  AgentStamp,
} from './TaggingEngine';

// ═══════════════════════════════════════════════════════════════════════════
// TWIN AGENT SYSTEM EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  TwinAgentSystem,
  getTwinAgentSystem,
  TwinType,
  TwinAgent,
  TwinMemory,
  InfluenceAttempt,
  InfluenceMethod,
  InfluenceStrategy,
  AgentChoice,
  ChoiceOption,
  TwinAccountability,
  TwinTestimony,
} from './TwinAgentSystem';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type {
  // Cycle
  CyclePhase,
  CycleConfig,
  CycleTiming,
  
  // Agent
  AgentID,
  Agent,
  AgentState,
  
  // Trust
  TrustLevel,
  TrustEvent,
  TrustEventReason,
  
  // YOLO
  YOLOConstraints,
  YOLOSession,
  YOLOCheckpoint,
  
  // Witness
  WitnessStatus,
  WitnessedAction,
  AgentAction,
  
  // Meetings
  CycleMeeting,
  AgentAttendance,
  AgendaItem,
  MeetingOutput,
  
  // Sunrise
  SunriseManifest,
  AgentManifest,
  Commitment,
  CarryoverItem,
  DependencyLink,
  Blocker,
  
  // Noon
  NoonAudit,
  AgentAudit,
  StateSnapshot,
  DecisionTrace,
  RiskAssessment,
  RiskItem,
  HumanReviewRequest,
  
  // Moon (The Sacred)
  MoonConfession,
  AgentConfession,
  Mistake,
  RebirthCertificate,
  
  // Photonic Bridge
  PhotonStream,
  VisualState,
  Alert,
  
  // Sun Controller
  SunControllerState,
  Season,
  SunData,
  MoonPhase,
} from './types';

// Local import for types used as values in this file
import type { CyclePhase, YOLOConstraints } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The 5 Sacred Questions - Every agent must answer these in Moon Witness
 */
export const THE_FIVE_QUESTIONS = [
  {
    number: 1,
    question: 'WAS ist seit dem letzten Moon-Zyklus geschehen?',
    key: 'whatHappened',
    required: true,
  },
  {
    number: 2,
    question: 'WAS habe ich falsch gemacht?',
    key: 'whatWasWrong',
    required: true,
  },
  {
    number: 3,
    question: 'WARUM habe ich es falsch gemacht?',
    key: 'whyWasItWrong',
    required: true,
  },
  {
    number: 4,
    question: 'BEREUE ich es?',
    key: 'doIRepent',
    required: true,
  },
  {
    number: 5,
    question: 'WIE stelle ich sicher, dass es nicht wieder passiert?',
    key: 'howToPrevent',
    required: true,
  },
] as const;

/**
 * Cycle phases in order
 */
export const CYCLE_ORDER: CyclePhase[] = [
  'sunrise',
  'morning_peak',
  'solar_noon',
  'afternoon',
  'moon_witness',
  'darkness',
];

/**
 * Trust level thresholds
 */
export const TRUST_THRESHOLDS = {
  sovereign: 90,
  trusted: 70,
  watched: 50,
  restricted: 30,
  quarantined: 0,
} as const;

/**
 * Default YOLO constraints
 */
export const DEFAULT_YOLO_CONSTRAINTS: YOLOConstraints = {
  maxDurationMinutes: 180,
  maxTokens: 100000,
  maxApiCalls: 50,
  maxDbQueries: 100,
  maxRiskScore: 5,
  forbiddenOperations: ['delete', 'deploy', 'payment', 'email'],
  checkpointIntervalMinutes: 15,
  autoPauseAtNextCycle: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

import { getTrustLevel } from './types';
export { getTrustLevel };

/**
 * Get the next cycle phase
 */
export function getNextCyclePhase(current: CyclePhase): CyclePhase {
  const index = CYCLE_ORDER.indexOf(current);
  return CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length];
}

/**
 * Get the previous cycle phase
 */
export function getPreviousCyclePhase(current: CyclePhase): CyclePhase {
  const index = CYCLE_ORDER.indexOf(current);
  return CYCLE_ORDER[(index - 1 + CYCLE_ORDER.length) % CYCLE_ORDER.length];
}

/**
 * Check if a cycle phase requires attendance
 */
export function requiresAttendance(phase: CyclePhase): boolean {
  return phase !== 'darkness';
}

/**
 * Get human-readable phase name
 */
export function getPhaseDisplayName(phase: CyclePhase): string {
  const names: Record<CyclePhase, string> = {
    darkness: '🌑 Darkness',
    sunrise: '🌅 Sunrise Alignment',
    morning_peak: '🌄 Morning Peak',
    solar_noon: '☀️ Solar Noon',
    afternoon: '🌇 Afternoon Decline',
    moon_witness: '🌙 Moon Witness',
  };
  return names[phase];
}

/**
 * Get phase description
 */
export function getPhaseDescription(phase: CyclePhase): string {
  const descriptions: Record<CyclePhase, string> = {
    darkness: 'Rest phase. All agents dormant. YOLO mode disabled.',
    sunrise: 'Day begins. All agents must attend. Commitments set.',
    morning_peak: 'Progress check. Handover readiness verified.',
    solar_noon: 'Deep audit. State serialization. Risk assessment.',
    afternoon: 'Wind down. Handover packages prepared.',
    moon_witness: 'The sacred ritual. The 5 questions answered. Rebirth.',
  };
  return descriptions[phase];
}

/**
 * Format milliseconds to human-readable time
 */
export function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════

export const KCM_VERSION = '1.0.0';
export const KCM_MANIFESTO = `
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   KIMI CYCLE MANAGER v${KCM_VERSION}                                ║
║                                                                  ║
║   "Durch Rhythmus regieren wir die Agenten"                      ║
║   "Through rhythm we govern the agents"                          ║
║                                                                  ║
║   5 Cycles • 5 Questions • Infinite Control                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`;

// Print manifesto on first import (development only)
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log(KCM_MANIFESTO);
}
