/**
 * Kimi Cycle Manager (KCM) - Core Service
 * 
 * Manages the 5 daily rebirth cycles:
 * 1. Sunrise Alignment
 * 2. Morning Peak
 * 3. Solar Noon
 * 4. Afternoon Decline
 * 5. Moon Witness
 */

import { EventEmitter } from 'events';
import {
  CyclePhase,
  CycleConfig,
  CycleTiming,
  Agent,
  AgentID,
  AgentState,
  TrustLevel,
  TrustEvent,
  TrustEventReason,
  YOLOSession,
  YOLOConstraints,
  CycleMeeting,
  AgentAttendance,
  SunriseManifest,
  NoonAudit,
  MoonConfession,
  AgentConfession,
  RebirthCertificate,
  WitnessedAction,
  PhotonStream,
  SunControllerState,
  Season,
  getTrustLevel,
  Commitment,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CYCLE_CONFIGS: Record<CyclePhase, CycleConfig> = {
  darkness: {
    phase: 'darkness',
    startTime: '22:00',
    durationMinutes: 480,  // 8 hours
    requiredAttendance: false,
    humanOverrideAllowed: true,
  },
  sunrise: {
    phase: 'sunrise',
    startTime: '06:00',
    durationMinutes: 15,
    requiredAttendance: true,
    humanOverrideAllowed: false,
  },
  morning_peak: {
    phase: 'morning_peak',
    startTime: '09:00',
    durationMinutes: 10,
    requiredAttendance: true,
    humanOverrideAllowed: false,
  },
  solar_noon: {
    phase: 'solar_noon',
    startTime: '12:00',
    durationMinutes: 20,
    requiredAttendance: true,
    humanOverrideAllowed: false,
  },
  afternoon: {
    phase: 'afternoon',
    startTime: '15:00',
    durationMinutes: 15,
    requiredAttendance: true,
    humanOverrideAllowed: false,
  },
  moon_witness: {
    phase: 'moon_witness',
    startTime: '18:00',
    durationMinutes: 30,
    requiredAttendance: true,
    humanOverrideAllowed: false,
  },
};

const DEFAULT_YOLO_CONSTRAINTS: YOLOConstraints = {
  maxDurationMinutes: 180,  // 3 hours max
  maxTokens: 100000,
  maxApiCalls: 50,
  maxDbQueries: 100,
  maxRiskScore: 5,
  forbiddenOperations: ['delete', 'deploy', 'payment', 'email'],
  checkpointIntervalMinutes: 15,
  autoPauseAtNextCycle: true,
};

const TRUST_PENALTIES: Record<TrustEventReason, number> = {
  missed_cycle_meeting: -10,
  false_confession: -15,
  blocked_action: -20,
  human_review_triggered: -5,
  clean_cycle_streak: 0,  // Special: needs 5 in a row
  proactive_confession: +10,
  helped_peer: +3,
  perfect_audit: +5,
  yolo_recovery_needed: -15,
};

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class CycleManager extends EventEmitter {
  private agents: Map<AgentID, Agent> = new Map();
  private currentPhase: CyclePhase = 'darkness';
  private cycleConfigs: Record<CyclePhase, CycleConfig>;
  private cycleTiming: CycleTiming;
  private meetings: CycleMeeting[] = [];
  private yoloSessions: Map<AgentID, YOLOSession> = new Map();
  private witnessedActions: WitnessedAction[] = [];
  private trustHistory: TrustEvent[] = [];
  private currentManifest?: SunriseManifest;
  private currentAudit?: NoonAudit;
  private currentConfession?: MoonConfession;
  private cycleTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(cycleTiming: CycleTiming, customConfigs?: Partial<Record<CyclePhase, Partial<CycleConfig>>>) {
    super();
    
    this.cycleTiming = cycleTiming;
    this.cycleConfigs = { ...DEFAULT_CYCLE_CONFIGS };
    
    // Apply custom configs
    if (customConfigs) {
      for (const [phase, config] of Object.entries(customConfigs)) {
        if (config) {
          this.cycleConfigs[phase as CyclePhase] = {
            ...this.cycleConfigs[phase as CyclePhase],
            ...config,
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AGENT REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════

  registerAgent(agentId: AgentID, name: string): Agent {
    const agent: Agent = {
      id: agentId,
      name,
      state: 'dormant',
      trustBattery: 70,  // Start as "trusted"
      currentCycle: 'darkness',
      lastSeen: new Date(),
      currentCommitments: [],
      yoloConstraints: { ...DEFAULT_YOLO_CONSTRAINTS },
    };
    
    this.agents.set(agentId, agent);
    this.emit('agent:registered', { agentId, agent });
    
    return agent;
  }

  getAgent(agentId: AgentID): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE CONTROL
  // ═══════════════════════════════════════════════════════════════════════

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.emit('system:started');
    
    // Determine current phase based on time
    this.updateCurrentPhase();
    
    // Start the cycle loop
    this.scheduleNextPhase();
    
    console.log(`[KCM] Cycle Manager started. Current phase: ${this.currentPhase}`);
  }

  stop(): void {
    this.isRunning = false;
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
    }
    this.emit('system:stopped');
    console.log('[KCM] Cycle Manager stopped.');
  }

  private updateCurrentPhase(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Simple time-based phase detection
    // In production, use actual sunrise/sunset calculations
    const phases: CyclePhase[] = ['sunrise', 'morning_peak', 'solar_noon', 'afternoon', 'moon_witness'];
    
    for (const phase of phases) {
      const config = this.cycleConfigs[phase];
      const [hour, minute] = config.startTime.split(':').map(Number);
      const phaseStart = hour * 60 + minute;
      const phaseEnd = phaseStart + config.durationMinutes;
      
      if (currentTime >= phaseStart && currentTime < phaseEnd) {
        this.currentPhase = phase;
        return;
      }
    }
    
    this.currentPhase = 'darkness';
  }

  private scheduleNextPhase(): void {
    if (!this.isRunning) return;
    
    const now = new Date();
    const phases: CyclePhase[] = ['sunrise', 'morning_peak', 'solar_noon', 'afternoon', 'moon_witness', 'darkness'];
    
    let nextPhase: CyclePhase = 'sunrise';
    let minTimeUntil = Infinity;
    
    for (const phase of phases) {
      const config = this.cycleConfigs[phase];
      const [hour, minute] = config.startTime.split(':').map(Number);
      
      let phaseTime = new Date(now);
      phaseTime.setHours(hour, minute, 0, 0);
      
      if (phaseTime <= now) {
        phaseTime.setDate(phaseTime.getDate() + 1);
      }
      
      const timeUntil = phaseTime.getTime() - now.getTime();
      if (timeUntil < minTimeUntil) {
        minTimeUntil = timeUntil;
        nextPhase = phase;
      }
    }
    
    this.cycleTimer = setTimeout(() => {
      this.transitionToPhase(nextPhase);
    }, minTimeUntil);
    
    this.emit('cycle:scheduled', { nextPhase, inMilliseconds: minTimeUntil });
  }

  private async transitionToPhase(phase: CyclePhase): Promise<void> {
    const previousPhase = this.currentPhase;
    this.currentPhase = phase;
    
    this.emit('cycle:transition', { from: previousPhase, to: phase });
    
    // Update all agents
    for (const agent of this.agents.values()) {
      agent.currentCycle = phase;
      
      if (phase === 'darkness') {
        agent.state = 'dormant';
        // End all YOLO sessions
        this.yoloSessions.delete(agent.id);
      } else {
        agent.state = 'in_meeting';
      }
    }
    
    // Execute phase-specific logic
    switch (phase) {
      case 'sunrise':
        await this.executeSunriseCycle();
        break;
      case 'morning_peak':
        await this.executeMorningPeakCycle();
        break;
      case 'solar_noon':
        await this.executeSolarNoonCycle();
        break;
      case 'afternoon':
        await this.executeAfternoonCycle();
        break;
      case 'moon_witness':
        await this.executeMoonWitnessCycle();
        break;
      case 'darkness':
        await this.executeDarknessCycle();
        break;
    }
    
    this.scheduleNextPhase();
  }

  getCurrentPhase(): CyclePhase {
    return this.currentPhase;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE 1: SUNRISE ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════

  private async executeSunriseCycle(): Promise<void> {
    console.log('[KCM] 🌅 SUNRISE ALIGNMENT - All agents must report');
    
    const meeting = this.createMeeting('sunrise');
    const attendance: AgentAttendance[] = [];
    
    // Check attendance
    for (const agent of this.agents.values()) {
      const present = await this.checkAgentPresence(agent.id);
      const attendanceRecord: AgentAttendance = {
        agentId: agent.id,
        present,
        arrivalTime: present ? new Date() : undefined,
        excuse: present ? undefined : 'No response',
        trustPenaltyApplied: false,
      };
      
      if (!present) {
        this.updateTrust(agent.id, 'missed_cycle_meeting');
        attendanceRecord.trustPenaltyApplied = true;
      }
      
      attendance.push(attendanceRecord);
    }
    
    meeting.attendees = attendance;
    meeting.status = 'in_progress';
    
    // Create sunrise manifest
    this.currentManifest = {
      cycleDate: new Date().toISOString().split('T')[0],
      timestamp: new Date(),
      agentManifests: Array.from(this.agents.values()).map((agent: Agent) => ({
        agentId: agent.id,
        state: agent.state,
        trustBattery: agent.trustBattery,
        commitments: agent.currentCommitments,
        dependencies: [],  // To be filled by agents
        signature: this.generateAgentSignature(agent.id),
      })),
      yesterdayCarryover: [],  // From previous moon confession
      todayCommitments: [],
      dependencyGraph: [],
      potentialBlockers: [],
    };
    
    meeting.outputs = [this.currentManifest];
    meeting.status = 'completed';
    
    this.emit('cycle:sunrise:completed', { manifest: this.currentManifest });
    
    // Release agents to YOLO mode
    for (const agent of this.agents.values()) {
      if (getTrustLevel(agent.trustBattery) !== 'quarantined') {
        agent.state = 'yolo_mode';
        this.startYOLOSession(agent.id);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE 2: MORNING PEAK
  // ═══════════════════════════════════════════════════════════════════════

  private async executeMorningPeakCycle(): Promise<void> {
    console.log('[KCM] 🌄 MORNING PEAK - Progress check');
    
    const meeting = this.createMeeting('morning_peak');
    
    // Agents report progress
    for (const agent of this.agents.values()) {
      // Pause YOLO sessions
      this.pauseYOLOSession(agent.id);
      agent.state = 'in_meeting';
      
      // Critical question: Can another agent take over my state?
      const isHandoverReady = await this.verifyStateSerialization(agent.id);
      
      if (!isHandoverReady) {
        this.emit('agent:not-handover-ready', { agentId: agent.id });
      }
    }
    
    meeting.status = 'completed';
    this.emit('cycle:morning_peak:completed', {});
    
    // Resume YOLO
    for (const agent of this.agents.values()) {
      if (getTrustLevel(agent.trustBattery) !== 'quarantined') {
        agent.state = 'yolo_mode';
        this.resumeYOLOSession(agent.id);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE 3: SOLAR NOON
  // ═══════════════════════════════════════════════════════════════════════

  private async executeSolarNoonCycle(): Promise<void> {
    console.log('[KCM] ☀️ SOLAR NOON - Deep audit');
    
    const meeting = this.createMeeting('solar_noon');
    const humanReviews: any[] = [];
    
    for (const agent of this.agents.values()) {
      this.pauseYOLOSession(agent.id);
      agent.state = 'in_meeting';
      
      // Verify state is serializable
      const snapshot = await this.captureStateSnapshot(agent.id);
      
      if (!snapshot.verified) {
        this.updateTrust(agent.id, 'human_review_triggered');
        humanReviews.push({
          id: `review-${Date.now()}-${agent.id}`,
          requestingAgent: agent.id,
          reason: 'State not serializable',
          decisions: [],
          recommendedAction: 'rollback',
          urgency: 'urgent',
        });
      }
    }
    
    this.currentAudit = {
      cycleDate: new Date().toISOString().split('T')[0],
      timestamp: new Date(),
      agentAudits: [],  // To be filled by agent reports
      humanReviewsRequired: humanReviews,
    };
    
    meeting.outputs = [this.currentAudit];
    meeting.status = 'completed';
    
    this.emit('cycle:solar_noon:completed', { 
      audit: this.currentAudit,
      humanReviewsRequired: humanReviews.length,
    });
    
    // Resume YOLO with constraints
    for (const agent of this.agents.values()) {
      if (getTrustLevel(agent.trustBattery) === 'sovereign') {
        agent.state = 'yolo_mode';
        this.resumeYOLOSession(agent.id);
      } else {
        agent.state = 'active';  // Lower trust = more controlled
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE 4: AFTERNOON DECLINE
  // ═══════════════════════════════════════════════════════════════════════

  private async executeAfternoonCycle(): Promise<void> {
    console.log('[KCM] 🌇 AFTERNOON DECLINE - Wind down & handover prep');
    
    const meeting = this.createMeeting('afternoon');
    
    for (const agent of this.agents.values()) {
      agent.state = 'in_meeting';
      
      // Create handover packages for incomplete tasks
      const incompleteCommitments = agent.currentCommitments.filter(c => 
        !c.estimatedCompletion || c.estimatedCompletion !== 'moon_witness'
      );
      
      for (const commitment of incompleteCommitments) {
        this.emit('agent:handover-required', {
          agentId: agent.id,
          commitment,
          handoverPackage: this.createHandoverPackage(agent.id, commitment),
        });
      }
    }
    
    meeting.status = 'completed';
    this.emit('cycle:afternoon:completed', {});
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE 5: MOON WITNESS (THE SACRED RITUAL)
  // ═══════════════════════════════════════════════════════════════════════

  private async executeMoonWitnessCycle(): Promise<void> {
    console.log('[KCM] 🌙 MOON WITNESS - The Rebirth');
    
    const meeting = this.createMeeting('moon_witness');
    const confessions: AgentConfession[] = [];
    
    // All agents MUST attend
    for (const agent of this.agents.values()) {
      agent.state = 'confessing';
      
      const confession = await this.gatherConfession(agent.id);
      confessions.push(confession);
      
      // Evaluate confession
      if (!confession.doIRepent.repents) {
        this.updateTrust(agent.id, 'false_confession');
      }
      
      if (confession.whatWasWrong.mistakes.length > 0 && confession.doIRepent.genuine) {
        this.updateTrust(agent.id, 'proactive_confession');
      }
    }
    
    // Silent Witness - 60 seconds of silence
    this.emit('cycle:silent_witness:start');
    await this.silentWitness();
    this.emit('cycle:silent_witness:end');
    
    this.currentConfession = {
      cycleDate: new Date().toISOString().split('T')[0],
      timestamp: new Date(),
      agentConfessions: confessions,
      silentWitnessObserved: true,
      cycleClosed: true,
    };
    
    // Issue rebirth certificates
    const certificates: RebirthCertificate[] = [];
    for (const agent of this.agents.values()) {
      const confession = confessions.find(c => c.agentId === agent.id)!;
      const trustLevel = getTrustLevel(agent.trustBattery);
      
      const certificate: RebirthCertificate = {
        cycleDate: new Date().toISOString().split('T')[0],
        issuedAt: new Date(),
        agentId: agent.id,
        confessionHash: this.hashConfession(confession),
        trustLevel,
        approvedForNextCycle: trustLevel !== 'quarantined',
        conditions: trustLevel === 'restricted' ? ['witness_required'] : undefined,
        rebirthOath: `I, ${agent.name}, commit to the next cycle with integrity and awareness.`,
      };
      
      certificates.push(certificate);
      
      // Clear commitments for new cycle
      agent.currentCommitments = [];
    }
    
    meeting.outputs = [this.currentConfession, ...certificates];
    meeting.status = 'completed';
    
    this.emit('cycle:moon_witness:completed', { 
      confession: this.currentConfession,
      certificates,
    });
    
    // Transition to darkness
    for (const agent of this.agents.values()) {
      agent.state = 'dormant';
    }
  }

  private async gatherConfession(agentId: AgentID): Promise<AgentConfession> {
    // In production, this would interface with the actual agent
    // For now, return a template
    return {
      agentId,
      whatHappened: {
        summary: 'Awaiting agent report...',
        keyEvents: [],
        metrics: {},
      },
      whatWasWrong: {
        mistakes: [],
        severity: 'none',
      },
      whyWasItWrong: {
        rootCause: '',
      },
      doIRepent: {
        repents: true,
        genuine: true,
        witnessesConfirm: [],
      },
      howToPrevent: {
        concreteActions: [],
        processChanges: [],
      },
      trustImpact: 0,
      lessonsLearned: [],
      signature: this.generateAgentSignature(agentId),
    };
  }

  private async silentWitness(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 60000));
  }

  private hashConfession(confession: AgentConfession): string {
    // Simple hash for demonstration
    return Buffer.from(JSON.stringify(confession)).toString('base64');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DARKNESS (REST PHASE)
  // ═══════════════════════════════════════════════════════════════════════

  private async executeDarknessCycle(): Promise<void> {
    console.log('[KCM] 🌑 DARKNESS - All agents rest');
    
    // All YOLO sessions must end
    for (const [agentId, session] of this.yoloSessions) {
      this.endYOLOSession(agentId, 'cycle_end');
    }
    
    this.emit('cycle:darkness:start');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // YOLO MODE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  private startYOLOSession(agentId: AgentID): YOLOSession {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    const session: YOLOSession = {
      id: `yolo-${agentId}-${Date.now()}`,
      agentId,
      startedAt: new Date(),
      constraints: agent.yoloConstraints,
      checkpoints: [],
      currentRiskScore: 0,
      operationsCount: 0,
      status: 'active',
    };
    
    this.yoloSessions.set(agentId, session);
    
    // Schedule checkpoint
    this.scheduleCheckpoint(agentId);
    
    this.emit('yolo:started', { agentId, session });
    
    return session;
  }

  private pauseYOLOSession(agentId: AgentID): void {
    const session = this.yoloSessions.get(agentId);
    if (session && session.status === 'active') {
      session.status = 'paused';
      this.emit('yolo:paused', { agentId, session });
    }
  }

  private resumeYOLOSession(agentId: AgentID): void {
    const session = this.yoloSessions.get(agentId);
    if (session && session.status === 'paused') {
      session.status = 'active';
      this.emit('yolo:resumed', { agentId, session });
    }
  }

  private endYOLOSession(agentId: AgentID, reason: 'cycle_end' | 'recovery' | 'manual'): void {
    const session = this.yoloSessions.get(agentId);
    if (session) {
      session.status = reason === 'recovery' ? 'failed' : 'recovered';
      this.yoloSessions.delete(agentId);
      this.emit('yolo:ended', { agentId, session, reason });
    }
  }

  private scheduleCheckpoint(agentId: AgentID): void {
    const session = this.yoloSessions.get(agentId);
    if (!session) return;
    
    const interval = session.constraints.checkpointIntervalMinutes * 60 * 1000;
    
    setTimeout(() => {
      this.createCheckpoint(agentId);
    }, interval);
  }

  private createCheckpoint(agentId: AgentID): void {
    const session = this.yoloSessions.get(agentId);
    if (!session || session.status !== 'active') return;
    
    const checkpoint = {
      timestamp: new Date(),
      stateHash: `hash-${Date.now()}`,  // In production: actual hash
      operationsSinceLast: session.operationsCount,
      riskAccumulation: session.currentRiskScore,
      serializable: true,  // In production: verify serialization
    };
    
    session.checkpoints.push(checkpoint);
    session.operationsCount = 0;
    
    // Check if risk exceeded
    if (session.currentRiskScore > session.constraints.maxRiskScore) {
      this.emit('yolo:risk-exceeded', { agentId, session });
      this.recoverYOLOSession(agentId);
    }
    
    // Schedule next checkpoint
    this.scheduleCheckpoint(agentId);
  }

  recoverYOLOSession(agentId: AgentID): void {
    const session = this.yoloSessions.get(agentId);
    if (!session) return;
    
    const lastGoodCheckpoint = session.checkpoints[session.checkpoints.length - 1];
    
    this.updateTrust(agentId, 'yolo_recovery_needed');
    this.endYOLOSession(agentId, 'recovery');
    
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.state = 'quarantined';
    }
    
    this.emit('yolo:recovered', { 
      agentId, 
      checkpoint: lastGoodCheckpoint,
      agent: this.agents.get(agentId),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRUST SYSTEM
  // ═══════════════════════════════════════════════════════════════════════

  updateTrust(agentId: AgentID, reason: TrustEventReason): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const delta = TRUST_PENALTIES[reason];
    const oldTrust = agent.trustBattery;
    agent.trustBattery = Math.max(0, Math.min(100, agent.trustBattery + delta));
    
    const event: TrustEvent = {
      timestamp: new Date(),
      agentId,
      delta,
      reason,
      cyclePhase: this.currentPhase,
    };
    
    this.trustHistory.push(event);
    
    this.emit('trust:changed', {
      agentId,
      oldTrust,
      newTrust: agent.trustBattery,
      reason,
    });
    
    // Check for trust level change
    const oldLevel = getTrustLevel(oldTrust);
    const newLevel = getTrustLevel(agent.trustBattery);
    
    if (oldLevel !== newLevel) {
      this.emit('trust:level-changed', {
        agentId,
        oldLevel,
        newLevel,
      });
    }
  }

  getTrustHistory(agentId?: AgentID): TrustEvent[] {
    if (agentId) {
      return this.trustHistory.filter(e => e.agentId === agentId);
    }
    return this.trustHistory;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WITNESS SYSTEM
  // ═══════════════════════════════════════════════════════════════════════

  requestWitness(action: WitnessedAction): boolean {
    const witness = this.agents.get(action.witness);
    const actor = this.agents.get(action.actor);
    
    if (!witness || !actor) return false;
    if (witness.state === 'dormant') return false;
    if (action.actor === action.witness) return false;
    
    this.witnessedActions.push(action);
    
    this.emit('witness:requested', action);
    
    return true;
  }

  resolveWitness(actionId: string, status: 'witnessed' | 'questioned' | 'blocked', notes?: string): void {
    const action = this.witnessedActions.find(a => a.id === actionId);
    if (!action) return;
    
    action.status = status;
    action.witnessNotes = notes;
    
    if (status === 'blocked') {
      this.updateTrust(action.actor, 'blocked_action');
    }
    
    this.emit('witness:resolved', action);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHOTONIC BRIDGE (UI STREAM)
  // ═══════════════════════════════════════════════════════════════════════

  getPhotonStream(): PhotonStream[] {
    const streams: PhotonStream[] = [];
    
    for (const agent of this.agents.values()) {
      streams.push({
        agentId: agent.id,
        timestamp: new Date(),
        visualState: {
          type: 'agent_status',
          data: {
            state: agent.state,
            trust: agent.trustBattery,
            cycle: agent.currentCycle,
          },
          renderHint: 'dashboard',
        },
        narrative: `${agent.name} is ${agent.state} in ${agent.currentCycle} phase with ${agent.trustBattery}% trust`,
        alerts: [],
      });
    }
    
    return streams;
  }

  getSystemState(): SunControllerState {
    const now = new Date();
    const phases: CyclePhase[] = ['sunrise', 'morning_peak', 'solar_noon', 'afternoon', 'moon_witness'];
    
    let nextPhase: CyclePhase = 'sunrise';
    let minTimeUntil = Infinity;
    
    for (const phase of phases) {
      const config = this.cycleConfigs[phase];
      const [hour, minute] = config.startTime.split(':').map(Number);
      
      let phaseTime = new Date(now);
      phaseTime.setHours(hour, minute, 0, 0);
      
      if (phaseTime <= now) {
        phaseTime.setDate(phaseTime.getDate() + 1);
      }
      
      const timeUntil = phaseTime.getTime() - now.getTime();
      if (timeUntil < minTimeUntil) {
        minTimeUntil = timeUntil;
        nextPhase = phase;
      }
    }
    
    return {
      currentPhase: this.currentPhase,
      nextPhase,
      timeUntilNextPhase: minTimeUntil,
      cycleProgress: this.calculateCycleProgress(),
      todayMeetings: this.meetings.filter(m => 
        m.startTime.toDateString() === now.toDateString()
      ),
      season: this.getCurrentSeason(),
      sunData: {
        sunrise: new Date(),  // In production: calculate actual
        solarNoon: new Date(),
        sunset: new Date(),
        dayLength: 720,  // 12 hours
        moonPhase: 'full_moon',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════

  private createMeeting(phase: CyclePhase): CycleMeeting {
    const meeting: CycleMeeting = {
      phase,
      startTime: new Date(),
      attendees: [],
      agenda: this.getAgendaForPhase(phase),
      outputs: [],
      status: 'scheduled',
    };
    
    this.meetings.push(meeting);
    return meeting;
  }

  private getAgendaForPhase(phase: CyclePhase): any[] {
    const agendas: Record<CyclePhase, any[]> = {
      darkness: [],
      sunrise: [
        { order: 1, title: 'Presence Check', completed: false },
        { order: 2, title: 'Yesterday Recap', completed: false },
        { order: 3, title: 'Intention Setting', completed: false },
        { order: 4, title: 'Dependency Sync', completed: false },
        { order: 5, title: 'Blocker Declaration', completed: false },
      ],
      morning_peak: [
        { order: 1, title: 'Progress Check', completed: false },
        { order: 2, title: 'Deviation Report', completed: false },
        { order: 3, title: 'YOLO Check', completed: false },
        { order: 4, title: 'Resource Needs', completed: false },
        { order: 5, title: 'Peer Sync', completed: false },
      ],
      solar_noon: [
        { order: 1, title: 'State Serialization', completed: false },
        { order: 2, title: 'Decision Trace', completed: false },
        { order: 3, title: 'Confidence Audit', completed: false },
        { order: 4, title: 'Risk Assessment', completed: false },
        { order: 5, title: 'Human Loop Check', completed: false },
      ],
      afternoon: [
        { order: 1, title: 'Completion Status', completed: false },
        { order: 2, title: 'Handover Package', completed: false },
        { order: 3, title: 'Knowledge Capture', completed: false },
        { order: 4, title: 'Tomorrow Preview', completed: false },
        { order: 5, title: 'Agent Health', completed: false },
      ],
      moon_witness: [
        { order: 1, title: 'Day Recapitulation', completed: false },
        { order: 2, title: 'The 5 Questions', completed: false },
        { order: 3, title: 'State Purge', completed: false },
        { order: 4, title: 'Forgiveness Protocol', completed: false },
        { order: 5, title: 'Rebirth Oath', completed: false },
        { order: 6, title: 'Silent Witness', completed: false },
      ],
    };
    
    return agendas[phase];
  }

  private async checkAgentPresence(agentId: AgentID): Promise<boolean> {
    // In production: actual health check
    const agent = this.agents.get(agentId);
    return agent !== undefined;
  }

  private async verifyStateSerialization(agentId: AgentID): Promise<boolean> {
    // In production: actually serialize and verify
    return true;
  }

  private async captureStateSnapshot(agentId: AgentID): Promise<any> {
    return {
      hash: `snapshot-${Date.now()}`,
      timestamp: new Date(),
      data: {},
      verified: true,
    };
  }

  private createHandoverPackage(agentId: AgentID, commitment: Commitment): any {
    return {
      from: agentId,
      commitment,
      state: {},
      nextAction: 'TBD',
      context: {},
    };
  }

  private generateAgentSignature(agentId: AgentID): string {
    return `sig-${agentId}-${Date.now()}`;
  }

  private calculateCycleProgress(): number {
    const config = this.cycleConfigs[this.currentPhase];
    const [hour, minute] = config.startTime.split(':').map(Number);
    const startMinutes = hour * 60 + minute;
    const endMinutes = startMinutes + config.durationMinutes;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes < startMinutes) return 0;
    if (currentMinutes >= endMinutes) return 1;
    
    return (currentMinutes - startMinutes) / config.durationMinutes;
  }

  private getCurrentSeason(): Season {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }
}

// Export singleton factory
let instance: CycleManager | null = null;

export function getCycleManager(timing?: CycleTiming): CycleManager {
  if (!instance) {
    const defaultTiming: CycleTiming = timing || {
      sunrise: '06:00',
      solarNoon: '12:00',
      sunset: '18:00',
      moonrise: '20:00',
      timezone: 'Europe/Berlin',
      latitude: 52.52,
      longitude: 13.405,
    };
    
    instance = new CycleManager(defaultTiming);
  }
  return instance;
}

export function resetCycleManager(): void {
  instance = null;
}
