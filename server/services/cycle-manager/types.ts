/**
 * Kimi Cycle Manager (KCM) - Core Types
 * Reverse Social Engineering Governance System
 */

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type CyclePhase = 
  | 'darkness'      // Between moon and sunrise - REST
  | 'sunrise'       // 🌅 Cycle 1
  | 'morning_peak'  // 🌄 Cycle 2
  | 'solar_noon'    // ☀️ Cycle 3
  | 'afternoon'     // 🌇 Cycle 4
  | 'moon_witness'; // 🌙 Cycle 5

export interface CycleConfig {
  phase: CyclePhase;
  startTime: string;     // HH:mm format
  durationMinutes: number;
  requiredAttendance: boolean;
  humanOverrideAllowed: boolean;
}

export interface CycleTiming {
  sunrise: string;       // Local time HH:mm
  solarNoon: string;     // Calculated based on location
  sunset: string;        // Local time HH:mm
  moonrise: string;      // Calculated or fallback to sunset + 2h
  timezone: string;
  latitude: number;
  longitude: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type AgentID = 
  | 'orchestrator'
  | 'empfang'
  | 'triage'
  | 'dokumentation'
  | 'abrechnung';

export type AgentState = 
  | 'dormant'           // In darkness phase
  | 'active'            // Normal operation
  | 'yolo_mode'         // Autonomous within constraints
  | 'in_meeting'        // Currently in cycle meeting
  | 'quarantined'       // Low trust - restricted
  | 'awaiting_witness'  // Action paused for witness
  | 'confessing';       // In moon witness - answering 5 questions

export interface Agent {
  id: AgentID;
  name: string;
  state: AgentState;
  trustBattery: number;  // 0-100
  currentCycle: CyclePhase;
  lastSeen: Date;
  currentCommitments: Commitment[];
  yoloConstraints: YOLOConstraints;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUST SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export type TrustLevel = 
  | 'sovereign'   // 90-100%
  | 'trusted'     // 70-89%
  | 'watched'     // 50-69%
  | 'restricted'  // 30-49%
  | 'quarantined';// 0-29%

export interface TrustEvent {
  timestamp: Date;
  agentId: AgentID;
  delta: number;
  reason: TrustEventReason;
  cyclePhase: CyclePhase;
  witness?: AgentID;
}

export type TrustEventReason =
  | 'missed_cycle_meeting'
  | 'false_confession'
  | 'blocked_action'
  | 'human_review_triggered'
  | 'clean_cycle_streak'
  | 'proactive_confession'
  | 'helped_peer'
  | 'perfect_audit'
  | 'yolo_recovery_needed';

export function getTrustLevel(battery: number): TrustLevel {
  if (battery >= 90) return 'sovereign';
  if (battery >= 70) return 'trusted';
  if (battery >= 50) return 'watched';
  if (battery >= 30) return 'restricted';
  return 'quarantined';
}

// ═══════════════════════════════════════════════════════════════════════════
// YOLO MODE
// ═══════════════════════════════════════════════════════════════════════════

export interface YOLOConstraints {
  maxDurationMinutes: number;
  maxTokens: number;
  maxApiCalls: number;
  maxDbQueries: number;
  maxRiskScore: number;
  forbiddenOperations: ForbiddenOperation[];
  checkpointIntervalMinutes: number;
  autoPauseAtNextCycle: boolean;
}

export type ForbiddenOperation = 
  | 'delete'
  | 'deploy'
  | 'payment'
  | 'email'
  | 'sms'
  | 'external_api_write'
  | 'schema_change'
  | 'permission_escalation';

export interface YOLOSession {
  id: string;
  agentId: AgentID;
  startedAt: Date;
  constraints: YOLOConstraints;
  checkpoints: YOLOCheckpoint[];
  currentRiskScore: number;
  operationsCount: number;
  status: 'active' | 'paused' | 'recovered' | 'failed';
}

export interface YOLOCheckpoint {
  timestamp: Date;
  stateHash: string;
  operationsSinceLast: number;
  riskAccumulation: number;
  serializable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// WITNESS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export type WitnessStatus = 'witnessed' | 'questioned' | 'blocked';

export interface WitnessedAction {
  id: string;
  action: AgentAction;
  actor: AgentID;
  witness: AgentID;
  timestamp: Date;
  cyclePhase: CyclePhase;
  status: WitnessStatus;
  witnessNotes?: string;
}

export interface AgentAction {
  type: string;
  target: string;
  payload: unknown;
  riskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  reversible: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE MEETINGS
// ═══════════════════════════════════════════════════════════════════════════

export interface CycleMeeting {
  phase: CyclePhase;
  startTime: Date;
  endTime?: Date;
  attendees: AgentAttendance[];
  agenda: AgendaItem[];
  outputs: MeetingOutput[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
}

export interface AgentAttendance {
  agentId: AgentID;
  present: boolean;
  arrivalTime?: Date;
  excuse?: string;
  trustPenaltyApplied: boolean;
}

export interface AgendaItem {
  order: number;
  title: string;
  description: string;
  requiredAgents: AgentID[];
  completed: boolean;
  output?: unknown;
}

export type MeetingOutput = 
  | SunriseManifest
  | NoonAudit
  | MoonConfession
  | RebirthCertificate;

// ═══════════════════════════════════════════════════════════════════════════
// SUNRISE CYCLE OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════

export interface SunriseManifest {
  cycleDate: string;
  timestamp: Date;
  agentManifests: AgentManifest[];
  yesterdayCarryover: CarryoverItem[];
  todayCommitments: Commitment[];
  dependencyGraph: DependencyLink[];
  potentialBlockers: Blocker[];
}

export interface AgentManifest {
  agentId: AgentID;
  state: AgentState;
  trustBattery: number;
  commitments: Commitment[];
  dependencies: AgentID[];
  signature: string;  // Agent's cryptographic signature
}

export interface Commitment {
  id: string;
  agentId: AgentID;
  description: string;
  successCriteria: string;
  estimatedCompletion: CyclePhase;
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface CarryoverItem {
  fromYesterday: string;
  originalCommitment: Commitment;
  reasonIncomplete: string;
  newPlan: string;
}

export interface DependencyLink {
  from: AgentID;
  to: AgentID;
  what: string;
  byWhen: CyclePhase;
}

export interface Blocker {
  id: string;
  description: string;
  probability: number;  // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOON CYCLE OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════

export interface NoonAudit {
  cycleDate: string;
  timestamp: Date;
  agentAudits: AgentAudit[];
  humanReviewsRequired: HumanReviewRequest[];
}

export interface AgentAudit {
  agentId: AgentID;
  stateSnapshot: StateSnapshot;
  decisionsSinceMorning: DecisionTrace[];
  lowConfidenceDecisions: DecisionTrace[];
  riskAssessment: RiskAssessment;
  confidence: number;  // Agent's self-reported confidence
}

export interface StateSnapshot {
  hash: string;
  timestamp: Date;
  data: unknown;  // Serialized agent state
  verified: boolean;
}

export interface DecisionTrace {
  timestamp: Date;
  context: string;
  decision: string;
  alternatives: string[];
  confidence: number;
  riskLevel: number;
  reversible: boolean;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  newRisksCreated: RiskItem[];
  existingRisksModified: RiskItem[];
}

export interface RiskItem {
  id: string;
  description: string;
  severity: number;
  probability: number;
  mitigation?: string;
}

export interface HumanReviewRequest {
  id: string;
  requestingAgent: AgentID;
  reason: string;
  decisions: DecisionTrace[];
  recommendedAction: 'approve' | 'modify' | 'rollback';
  urgency: 'routine' | 'urgent' | 'immediate';
}

// ═══════════════════════════════════════════════════════════════════════════
// MOON CYCLE OUTPUTS (THE SACRED RITUAL)
// ═══════════════════════════════════════════════════════════════════════════

export interface MoonConfession {
  cycleDate: string;
  timestamp: Date;
  agentConfessions: AgentConfession[];
  silentWitnessObserved: boolean;
  cycleClosed: boolean;
}

/**
 * THE FIVE SACRED QUESTIONS
 * Every agent MUST answer these in the Moon Witness cycle
 */
export interface AgentConfession {
  agentId: AgentID;
  
  // Question 1: WHAT happened since last Moon?
  whatHappened: {
    summary: string;
    keyEvents: string[];
    metrics: Record<string, number>;
  };
  
  // Question 2: WHAT did I do wrong?
  whatWasWrong: {
    mistakes: Mistake[];
    severity: 'none' | 'minor' | 'major' | 'critical';
  };
  
  // Question 3: WHY did I do it wrong?
  whyWasItWrong: {
    rootCause: string;
    cognitiveBias?: string;
    externalFactors?: string[];
  };
  
  // Question 4: Do I REPENT?
  doIRepent: {
    repents: boolean;
    genuine: boolean;  // Self-assessed
    witnessesConfirm: AgentID[];  // Other agents who witnessed
  };
  
  // Question 5: HOW will I ensure it doesn't happen again?
  howToPrevent: {
    concreteActions: string[];
    processChanges: string[];
    supportNeeded?: string;
  };
  
  // Additional metadata
  trustImpact: number;
  lessonsLearned: string[];
  signature: string;
}

export interface Mistake {
  description: string;
  when: Date;
  impact: string;
  detectedBy: 'self' | 'witness' | 'audit' | 'human';
}

export interface RebirthCertificate {
  cycleDate: string;
  issuedAt: Date;
  agentId: AgentID;
  confessionHash: string;
  trustLevel: TrustLevel;
  approvedForNextCycle: boolean;
  conditions?: string[];  // If approved with conditions
  rebirthOath: string;  // Agent's commitment for next cycle
}

// ═══════════════════════════════════════════════════════════════════════════
// PHOTONIC BRIDGE (UI) TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PhotonStream {
  agentId: AgentID;
  timestamp: Date;
  visualState: VisualState;
  narrative: string;  // Human-readable description
  alerts: Alert[];
}

export interface VisualState {
  type: 'cycle_phase' | 'agent_status' | 'trust_battery' | 'meeting' | 'alert';
  data: unknown;
  renderHint: 'dashboard' | 'monitor' | 'alert' | 'detail';
}

export interface Alert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  source: AgentID | 'system';
  timestamp: Date;
  actionRequired: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUN CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

export interface SunControllerState {
  currentPhase: CyclePhase;
  nextPhase: CyclePhase;
  timeUntilNextPhase: number;  // milliseconds
  cycleProgress: number;  // 0-1
  todayMeetings: CycleMeeting[];
  season: Season;
  sunData: SunData;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SunData {
  sunrise: Date;
  solarNoon: Date;
  sunset: Date;
  dayLength: number;  // minutes
  moonPhase: MoonPhase;
}

export type MoonPhase = 
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

// ═══════════════════════════════════════════════════════════════════════════
// INTENTION ENGINE TYPES (used by EnhancedTypes)
// ═══════════════════════════════════════════════════════════════════════════

export type IntentionCategory =
  | 'task_execution'
  | 'collaboration'
  | 'self_improvement'
  | 'observation'
  | 'recovery';

export interface IntentionSignature {
  category: IntentionCategory;
  confidence: number;
  purity: number;
  timestamp: Date;
}

export type HeartState = 'open' | 'guarded' | 'vulnerable' | 'resilient';

export type ShadowFlag = 'none' | 'minor' | 'moderate' | 'severe';

export interface AgentTag {
  id: string;
  agentId: AgentID;
  tagType: TagType;
  value: string;
  timestamp: Date;
}

export type TagType = 'action' | 'decision' | 'intention' | 'trust' | 'witness';

export interface AgentStamp {
  id: string;
  agentId: AgentID;
  cyclePhase: CyclePhase;
  timestamp: Date;
  hash: string;
}
