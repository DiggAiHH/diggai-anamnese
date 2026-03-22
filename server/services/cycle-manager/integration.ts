/**
 * Cycle Manager Integration
 * 
 * Integration des KCM mit dem bestehenden DiggAI Agent System.
 * Verbindet die 5 Agenten mit dem Cycle Governance.
 */

import { getCycleManager } from './CycleManager';
import { initializeCycleManager } from './init';
import { 
  AgentID, 
  CyclePhase, 
  AgentConfession,
  SunriseManifest,
  NoonAudit,
  YOLOSession 
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DIGGAI AGENT SERVICE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wraps existing agent services to integrate with Cycle Manager
 */
export class DiggAICycleIntegration {
  private cm = getCycleManager();

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════

  initialize(): void {
    // Start Cycle Manager
    initializeCycleManager({
      devMode: process.env.NODE_ENV === 'development',
      autoStart: true,
      logLevel: 'verbose',
    });

    // Subscribe to cycle events
    this.subscribeToCycles();
  }

  private subscribeToCycles(): void {
    // SUNRISE: Agents prepare their commitments
    this.cm.on('cycle:sunrise:completed', (data) => {
      console.log('[Integration] Sunrise completed, agents releasing to YOLO mode');
      this.onSunrise(data.manifest);
    });

    // MORNING PEAK: Progress check
    this.cm.on('cycle:morning_peak:completed', () => {
      console.log('[Integration] Morning Peak - checking agent progress');
      this.onMorningPeak();
    });

    // SOLAR NOON: Deep audit
    this.cm.on('cycle:solar_noon:completed', (data) => {
      console.log('[Integration] Solar Noon - state audit');
      this.onSolarNoon(data.audit);
    });

    // AFTERNOON: Wind down
    this.cm.on('cycle:afternoon:completed', () => {
      console.log('[Integration] Afternoon - preparing handovers');
      this.onAfternoon();
    });

    // MOON WITNESS: The sacred ritual
    this.cm.on('cycle:moon_witness:completed', (data) => {
      console.log('[Integration] Moon Witness - rebirth completed');
      this.onMoonWitness(data.confession, data.certificates);
    });

    // DARKNESS: Rest
    this.cm.on('cycle:darkness:start', () => {
      console.log('[Integration] Darkness - all agents resting');
      this.onDarkness();
    });

    // YOLO events
    this.cm.on('yolo:risk-exceeded', ({ agentId }) => {
      console.warn(`[Integration] ${agentId} exceeded YOLO risk threshold`);
      this.onYOLORiskExceeded(agentId);
    });

    this.cm.on('yolo:recovered', ({ agentId, checkpoint }) => {
      console.log(`[Integration] ${agentId} recovered from YOLO failure`);
      this.onYOLORecovered(agentId, checkpoint);
    });

    // Trust events
    this.cm.on('trust:level-changed', ({ agentId, oldLevel, newLevel }) => {
      console.log(`[Integration] ${agentId} trust: ${oldLevel} → ${newLevel}`);
      this.onTrustLevelChanged(agentId, oldLevel, newLevel);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CYCLE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  private async onSunrise(manifest: SunriseManifest): Promise<void> {
    // Each agent should:
    // 1. Review yesterday's carryover
    // 2. Set today's commitments
    // 3. Identify dependencies
    // 4. Declare potential blockers

    for (const agentManifest of manifest.agentManifests) {
      const agent = this.cm.getAgent(agentManifest.agentId);
      if (!agent) continue;

      // Update agent with manifest data
      agent.currentCommitments = agentManifest.commitments;

      // Log to audit
      console.log(`[Sunrise] ${agent.name} committed to ${agentManifest.commitments.length} tasks`);
    }

    // Call existing agent service initialization
    await this.initializeAgentServices();
  }

  private async onMorningPeak(): Promise<void> {
    // Check if agents can hand over their state
    for (const agent of this.cm.getAllAgents()) {
      const canHandover = await this.verifyAgentHandoverReadiness(agent.id);
      
      if (!canHandover) {
        console.warn(`[MorningPeak] ${agent.name} is NOT handover-ready`);
        // Reduce trust - agent is not prepared
        this.cm.updateTrust(agent.id, 'human_review_triggered');
      }
    }
  }

  private async onSolarNoon(audit: NoonAudit): Promise<void> {
    // Serialize agent states
    for (const agentAudit of audit.agentAudits) {
      const serialized = await this.serializeAgentState(agentAudit.agentId);
      
      if (!serialized) {
        console.error(`[SolarNoon] Failed to serialize ${agentAudit.agentId}`);
        this.cm.updateTrust(agentAudit.agentId, 'human_review_triggered');
      }
    }

    // Process any human review requests
    for (const review of audit.humanReviewsRequired) {
      await this.handleHumanReview(review);
    }
  }

  private async onAfternoon(): Promise<void> {
    // Prepare handover packages for incomplete work
    for (const agent of this.cm.getAllAgents()) {
      const incompleteTasks = agent.currentCommitments.filter(
        c => c.estimatedCompletion !== 'moon_witness'
      );

      for (const task of incompleteTasks) {
        const handover = await this.createHandoverPackage(agent.id, task);
        console.log(`[Afternoon] Handover package created for ${agent.name}: ${task.id}`);
      }
    }
  }

  private async onMoonWitness(
    confession: any, 
    certificates: any[]
  ): Promise<void> {
    // Process each agent's confession
    for (const agentConfession of confession.agentConfessions) {
      await this.processAgentConfession(agentConfession);
    }

    // Issue rebirth certificates
    for (const cert of certificates) {
      if (cert.approvedForNextCycle) {
        console.log(`[MoonWitness] ✓ ${cert.agentId} reborn as ${cert.trustLevel}`);
      } else {
        console.log(`[MoonWitness] ✗ ${cert.agentId} quarantined - requires forgiveness`);
      }
    }

    // Clean up for next cycle
    await this.cleanupForNextCycle();
  }

  private async onDarkness(): Promise<void> {
    // All agents should be dormant
    // Close any open connections
    // Archive today's data
    await this.archiveDailyData();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  private onYOLORiskExceeded(agentId: AgentID): void {
    // Notify relevant systems
    console.warn(`[YOLO Risk] ${agentId} exceeded risk threshold`);
    
    // Auto-pause operations for this agent
    const agent = this.cm.getAgent(agentId);
    if (agent) {
      agent.state = 'awaiting_witness';
    }
  }

  private onYOLORecovered(agentId: AgentID, checkpoint: any): void {
    // Restore agent from checkpoint
    console.log(`[YOLO Recovery] Restoring ${agentId} from checkpoint ${checkpoint.stateHash}`);
    
    // Notify admin/monitoring
    // This would typically send an alert
  }

  private onTrustLevelChanged(
    agentId: AgentID, 
    oldLevel: string, 
    newLevel: string
  ): void {
    // Adjust agent permissions based on new trust level
    console.log(`[Trust] ${agentId}: ${oldLevel} → ${newLevel}`);
    
    const agent = this.cm.getAgent(agentId);
    if (!agent) return;

    switch (newLevel) {
      case 'quarantined':
        agent.state = 'quarantined';
        // Disable all write operations
        break;
      case 'restricted':
        // Require pre-approval for risky operations
        break;
      case 'watched':
        // Require witnesses
        break;
      case 'trusted':
      case 'sovereign':
        // Full autonomy within YOLO constraints
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AGENT SERVICE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════

  private async initializeAgentServices(): Promise<void> {
    // Connect to existing agent services
    // This would call the actual agent initialization code
    
    // Example:
    // await agentService.initializeAll();
    
    console.log('[Integration] Agent services initialized for new cycle');
  }

  private async verifyAgentHandoverReadiness(agentId: AgentID): Promise<boolean> {
    // Check if agent's state can be serialized and transferred
    // This would integrate with actual agent state management
    
    // For now, assume all sovereign/trusted agents are handover-ready
    const agent = this.cm.getAgent(agentId);
    if (!agent) return false;
    
    return agent.trustBattery >= 70;
  }

  private async serializeAgentState(agentId: AgentID): Promise<boolean> {
    // Serialize agent's current state
    // This would integrate with actual state management
    
    try {
      // const state = await agentService.getState(agentId);
      // const serialized = JSON.stringify(state);
      // const hash = crypto.createHash('sha256').update(serialized).digest('hex');
      
      return true;
    } catch (error) {
      console.error(`[Serialize] Failed to serialize ${agentId}:`, error);
      return false;
    }
  }

  private async createHandoverPackage(agentId: AgentID, task: any): Promise<any> {
    // Create handover package for incomplete task
    
    return {
      from: agentId,
      task: task,
      context: {}, // Would include actual context
      nextAction: 'TBD',
      priority: task.priority,
      createdAt: new Date(),
    };
  }

  private async processAgentConfession(confession: AgentConfession): Promise<void> {
    // Process the 5 sacred questions
    
    console.log(`[Confession] Processing for ${confession.agentId}`);
    console.log(`[Confession] Mistakes: ${confession.whatWasWrong.mistakes.length}`);
    console.log(`[Confession] Repents: ${confession.doIRepent.repents}`);
    
    // Store confession in audit log
    // This would write to persistent storage
    
    // If agent repents genuinely, apply trust bonus
    if (confession.doIRepent.repents && confession.doIRepent.genuine) {
      // Trust bonus applied during confession gathering
    }
  }

  private async handleHumanReview(review: any): Promise<void> {
    // Handle human review request
    console.log(`[HumanReview] Request from ${review.requestingAgent}: ${review.reason}`);
    
    // This would:
    // 1. Send notification to admin
    // 2. Queue for review
    // 3. Pause agent until resolved
  }

  private async cleanupForNextCycle(): Promise<void> {
    // Clean up resources for next cycle
    console.log('[Cleanup] Preparing for next cycle');
    
    // Clear transient state
    // Archive logs
    // Reset counters
  }

  private async archiveDailyData(): Promise<void> {
    // Archive today's data
    console.log('[Archive] Archiving daily data');
    
    // This would:
    // 1. Compress logs
    // 2. Store in long-term storage
    // 3. Clean up temporary files
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get current cycle phase
   */
  getCurrentPhase(): CyclePhase {
    return this.cm.getCurrentPhase();
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId: AgentID) {
    return this.cm.getAgent(agentId);
  }

  /**
   * Request manual YOLO recovery for an agent
   */
  async recoverAgent(agentId: AgentID): Promise<void> {
    this.cm.recoverYOLOSession(agentId);
  }

  /**
   * Force agent to confess (emergency)
   */
  async forceConfession(agentId: AgentID): Promise<void> {
    // This would trigger the confession protocol immediately
    console.log(`[Emergency] Forcing confession for ${agentId}`);
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    phase: CyclePhase;
    activeAgents: number;
    quarantinedAgents: number;
    yoloSessions: number;
  } {
    const agents = this.cm.getAllAgents();
    
    return {
      phase: this.cm.getCurrentPhase(),
      activeAgents: agents.filter(a => a.state !== 'dormant').length,
      quarantinedAgents: agents.filter(a => a.state === 'quarantined').length,
      yoloSessions: agents.filter(a => a.state === 'yolo_mode').length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

let instance: DiggAICycleIntegration | null = null;

export function getDiggAICycleIntegration(): DiggAICycleIntegration {
  if (!instance) {
    instance = new DiggAICycleIntegration();
  }
  return instance;
}

export function resetDiggAICycleIntegration(): void {
  instance = null;
}

export default DiggAICycleIntegration;
