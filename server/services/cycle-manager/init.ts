/**
 * Cycle Manager Initialization
 * 
 * Sets up the Kimi Cycle Manager with the 5 DiggAI agents.
 * This is called during server startup.
 */

import { getCycleManager, resetCycleManager } from './CycleManager';
import { AgentID, CycleTiming, YOLOConstraints } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DIGGAI AGENT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

interface AgentConfig {
  id: AgentID;
  name: string;
  description: string;
  responsibilities: string[];
  yoloConstraints: Partial<YOLOConstraints>;
  initialTrust: number;
}

export const DIGGAI_AGENTS: AgentConfig[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'The conductor. Coordinates all agents, resolves conflicts, maintains system harmony.',
    responsibilities: [
      'Coordinate agent interactions',
      'Resolve dependency conflicts',
      'Monitor system health',
      'Escalate to humans when needed',
    ],
    yoloConstraints: {
      maxRiskScore: 3,  // Lower risk tolerance - orchestrator affects everyone
      forbiddenOperations: ['delete', 'deploy', 'payment', 'email', 'schema_change'],
    },
    initialTrust: 80,
  },
  {
    id: 'empfang',
    name: 'Empfang',
    description: 'The welcoming face. Handles patient intake, initial data collection, first impressions.',
    responsibilities: [
      'Patient registration',
      'Initial data collection',
      'Welcome messages',
      'Queue management',
    ],
    yoloConstraints: {
      maxRiskScore: 5,
      forbiddenOperations: ['delete', 'deploy', 'payment', 'schema_change'],
    },
    initialTrust: 70,
  },
  {
    id: 'triage',
    name: 'Triage',
    description: 'The guardian. Evaluates urgency, routes to appropriate care levels.',
    responsibilities: [
      'Evaluate patient urgency',
      'Apply triage rules',
      'Route to appropriate care',
      'Flag critical cases',
    ],
    yoloConstraints: {
      maxRiskScore: 2,  // Critical - affects patient safety
      forbiddenOperations: ['delete', 'deploy', 'payment', 'email', 'schema_change', 'external_api_write'],
    },
    initialTrust: 85,  // High trust - medical responsibility
  },
  {
    id: 'dokumentation',
    name: 'Dokumentation',
    description: 'The scribe. Records everything, ensures compliance, maintains the record.',
    responsibilities: [
      'Document patient interactions',
      'Ensure DSGVO compliance',
      'Generate reports',
      'Archive records',
    ],
    yoloConstraints: {
      maxRiskScore: 4,
      forbiddenOperations: ['delete', 'deploy', 'payment', 'schema_change'],
    },
    initialTrust: 75,
  },
  {
    id: 'abrechnung',
    name: 'Abrechnung',
    description: 'The accountant. Handles billing, insurance, financial records.',
    responsibilities: [
      'Process billing',
      'Insurance verification',
      'Financial reporting',
      'Invoice generation',
    ],
    yoloConstraints: {
      maxRiskScore: 1,  // Lowest - financial transactions
      forbiddenOperations: ['delete', 'deploy', 'payment', 'schema_change', 'permission_escalation'],
    },
    initialTrust: 90,  // Highest - financial responsibility requires sovereign trust
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE TIMING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const BERLIN_TIMING: CycleTiming = {
  sunrise: '06:00',
  solarNoon: '12:00',
  sunset: '18:00',
  moonrise: '20:00',
  timezone: 'Europe/Berlin',
  latitude: 52.52,
  longitude: 13.405,
};

// Alternative timing for development/testing (shortened cycles)
export const DEV_TIMING: CycleTiming = {
  sunrise: '00:00',
  solarNoon: '00:05',
  sunset: '00:10',
  moonrise: '00:15',
  timezone: 'UTC',
  latitude: 52.52,
  longitude: 13.405,
};

const DEV_CYCLE_CONFIGS = {
  sunrise: { startTime: '00:00', durationMinutes: 1 },
  morning_peak: { startTime: '00:02', durationMinutes: 1 },
  solar_noon: { startTime: '00:04', durationMinutes: 1 },
  afternoon: { startTime: '00:06', durationMinutes: 1 },
  moon_witness: { startTime: '00:08', durationMinutes: 1 },
  darkness: { startTime: '00:10', durationMinutes: 1 },
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export interface InitOptions {
  devMode?: boolean;
  customTiming?: CycleTiming;
  autoStart?: boolean;
  logLevel?: 'silent' | 'normal' | 'verbose';
}

export function initializeCycleManager(options: InitOptions = {}): void {
  const { 
    devMode = false, 
    customTiming, 
    autoStart = true,
    logLevel = 'normal' 
  } = options;
  
  // Reset any existing instance
  resetCycleManager();
  
  // Get fresh instance
  const timing = customTiming || (devMode ? DEV_TIMING : BERLIN_TIMING);
  const cm = getCycleManager(timing);
  
  if (logLevel !== 'silent') {
    console.log('[KCM] ╔════════════════════════════════════════════════════════╗');
    console.log('[KCM] ║     KIMI CYCLE MANAGER - INITIALIZATION                 ║');
    console.log('[KCM] ╚════════════════════════════════════════════════════════╝');
    console.log(`[KCM] Mode: ${devMode ? 'DEVELOPMENT (short cycles)' : 'PRODUCTION'}`);
    console.log(`[KCM] Location: ${timing.latitude}, ${timing.longitude} (${timing.timezone})`);
    console.log('[KCM]');
  }
  
  // Register all DiggAI agents
  for (const config of DIGGAI_AGENTS) {
    const agent = cm.registerAgent(config.id, config.name);
    
    // Set initial trust
    agent.trustBattery = config.initialTrust;
    
    // Apply custom YOLO constraints
    agent.yoloConstraints = {
      ...agent.yoloConstraints,
      ...config.yoloConstraints,
    };
    
    if (logLevel === 'verbose') {
      console.log(`[KCM] ✓ Registered agent: ${config.name}`);
      console.log(`[KCM]   Trust: ${config.initialTrust}% | Risk Threshold: ${config.yoloConstraints.maxRiskScore}`);
    }
  }
  
  // Set up event listeners for logging
  if (logLevel !== 'silent') {
    cm.on('cycle:transition', ({ from, to }) => {
      console.log(`[KCM] 🔄 Cycle transition: ${from} → ${to}`);
    });
    
    cm.on('cycle:sunrise:completed', () => {
      console.log('[KCM] 🌅 Sunrise Alignment completed - Agents released to YOLO mode');
    });
    
    cm.on('cycle:moon_witness:completed', ({ certificates }) => {
      console.log('[KCM] 🌙 Moon Witness completed - Rebirth certificates issued:');
      for (const cert of certificates) {
        const status = cert.approvedForNextCycle ? '✓ Approved' : '✗ Quarantined';
        console.log(`[KCM]   ${cert.agentId}: ${status} (${cert.trustLevel})`);
      }
    });
    
    cm.on('trust:changed', ({ agentId, oldTrust, newTrust, reason }) => {
      const delta = newTrust - oldTrust;
      const symbol = delta > 0 ? '↑' : '↓';
      console.log(`[KCM] 🔋 Trust ${symbol} ${agentId}: ${oldTrust}% → ${newTrust}% (${reason})`);
    });
    
    cm.on('yolo:recovered', ({ agentId }) => {
      console.log(`[KCM] 🚨 YOLO recovery: ${agentId} - Agent quarantined`);
    });
    
    cm.on('witness:blocked', ({ actor, witness }) => {
      console.log(`[KCM] 🛑 Action blocked: ${actor} by witness ${witness}`);
    });
  }
  
  // Start the cycle manager
  if (autoStart) {
    cm.start();
    if (logLevel !== 'silent') {
      console.log('[KCM]');
      console.log('[KCM] ✓ Cycle Manager initialized and running');
      console.log('[KCM] ──────────────────────────────────────────────────────────');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT INTERACTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get agent configuration by ID
 */
export function getAgentConfig(agentId: AgentID): AgentConfig | undefined {
  return DIGGAI_AGENTS.find(a => a.id === agentId);
}

/**
 * List all agent configurations
 */
export function listAgentConfigs(): AgentConfig[] {
  return [...DIGGAI_AGENTS];
}

/**
 * Check if an agent can perform an action based on trust level
 */
export function canAgentPerformAction(agentId: AgentID, actionRisk: number): boolean {
  const cm = getCycleManager();
  const agent = cm.getAgent(agentId);
  
  if (!agent) return false;
  
  const trustLevel = agent.trustBattery;
  
  // Risk thresholds by trust
  if (trustLevel >= 90) return actionRisk <= 7;  // Sovereign
  if (trustLevel >= 70) return actionRisk <= 5;  // Trusted
  if (trustLevel >= 50) return actionRisk <= 3;  // Watched
  if (trustLevel >= 30) return actionRisk <= 1;  // Restricted
  return false;  // Quarantined
}

/**
 * Request witness for an action
 */
export function requestActionWitness(
  actorId: AgentID,
  actionType: string,
  actionRisk: number
): { witnessRequired: boolean; witnessId?: AgentID } {
  const cm = getCycleManager();
  const agent = cm.getAgent(actorId);
  
  if (!agent) return { witnessRequired: true };
  
  // Sovereign agents with low-risk actions don't need witnesses
  if (agent.trustBattery >= 90 && actionRisk <= 3) {
    return { witnessRequired: false };
  }
  
  // Find a suitable witness (different agent, available)
  const witnesses = cm.getAllAgents().filter(a => 
    a.id !== actorId && 
    a.state !== 'dormant' && 
    a.trustBattery >= 50
  );
  
  if (witnesses.length === 0) {
    return { witnessRequired: true };
  }
  
  // Select witness with highest trust
  const witness = witnesses.reduce((highest, current) => 
    current.trustBattery > highest.trustBattery ? current : highest
  );
  
  return { witnessRequired: true, witnessId: witness.id };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  initializeCycleManager,
  getAgentConfig,
  listAgentConfigs,
  canAgentPerformAction,
  requestActionWitness,
  DIGGAI_AGENTS,
  BERLIN_TIMING,
  DEV_TIMING,
};
