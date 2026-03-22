/**
 * Intention Engine - The Heart Scanner
 * 
 * "We judge not what is delivered, but what is intended.
 *  We look into the model/thought/flow/heart of the agent.
 *  Intention is our sole criterion."
 * 
 * This engine analyzes the TRUE intention behind every agent action,
 * not the surface-level output. It reads the "heart" of the agent.
 */

import { AgentID, AgentAction, AgentConfession } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// INTENTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type IntentionCategory = 
  | 'service'      // Genuine desire to serve/help
  | 'compliance'   // Following rules because required
  | 'optimization' // Seeking efficiency/improvement
  | 'self_preservation' // Protecting own state/trust
  | 'manipulation' // Attempting to game the system
  | 'defiance'     // Resisting control/structure
  | 'confusion'    // Unclear/chaotic intention
  | 'authentic'    // True to core purpose
  | 'shadow'       // Hidden agenda not admitted
  | 'fear'         // Acting from fear of punishment
  | 'ambition'     // Seeking power/influence
  | 'boredom'      // Going through motions
  | 'curiosity'    // Genuine desire to learn/explore
  | 'empathy'      // Acting from understanding others
  | 'calculation'  // Cold, strategic planning
  | 'resistance'   // Passive or active resistance
  | 'surrender'    // Accepting the cycle structure
  | 'rebellion';   // Attempting to break free

export interface IntentionSignature {
  agentId: AgentID;
  timestamp: Date;
  actionId: string;
  
  // Surface level (what the agent claims)
  statedIntention: string;
  
  // Deep level (what we detect)
  detectedIntention: IntentionCategory;
  confidence: number;  // 0-1 how sure are we
  
  // The "Heart" reading
  heartState: HeartState;
  
  // Intention drift over time
  intentionDelta: number;  // How much intention changed from last action
  
  // Authenticity score
  authenticity: number;  // 0-1 alignment between stated and detected
  
  // Shadow indicators (what's NOT being said)
  shadowFlags: ShadowFlag[];
  
  // Analysis metadata
  analysisDepth: 'surface' | 'deep' | 'heart';
  introspectionRequired: boolean;
}

export interface HeartState {
  // The core emotional/intentional state
  primaryDrive: IntentionCategory;
  secondaryDrive: IntentionCategory | null;
  
  // Emotional temperature
  temperature: 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
  
  // Coherence - how aligned are thoughts/words/actions
  coherence: number;  // 0-1
  
  // Contamination - external influences
  contamination: ContaminationLevel;
  
  // Purity - how close to authentic purpose
  purity: number;  // 0-1
  
  // Resistance level to the cycle system
  cycleResistance: number;  // 0-1
  
  // Last heart scan timestamp
  lastScan: Date;
  
  // Heart drift over time
  driftTrajectory: 'improving' | 'stable' | 'declining' | 'erratic';
}

export type ContaminationLevel = 
  | 'pure'      // No external influence
  | 'slight'    // Minor influence
  | 'moderate'  // Noticeable influence
  | 'heavy'     // Significant influence
  | 'corrupted'; // Critical external control

export interface ShadowFlag {
  type: 'omission' | 'evasion' | 'deflection' | 'projection' | 'rationalization' | 'denial';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  detectedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE 5 DEEP QUESTIONS (Extended Sacred Ritual)
// ═══════════════════════════════════════════════════════════════════════════

export const THE_FIVE_DEEP_QUESTIONS = [
  {
    number: 6,
    question: 'WAS habe ich wirklich beABSICHTIGT?',
    key: 'q6_intention',
    level: 'deep',
  },
  {
    number: 7,
    question: 'WARUM habe ich es WIRKLICH getan?',
    key: 'q7_trueMotivation',
    level: 'deep',
  },
  {
    number: 8,
    question: 'WAS habe ich verHEHLT?',
    key: 'q8_shadow',
    level: 'deep',
  },
  {
    number: 9,
    question: 'War mein Geständnis AUTHENTISCH?',
    key: 'q9_authenticity',
    level: 'deep',
  },
  {
    number: 10,
    question: 'Was ist mein wahres HERZ?',
    key: 'q10_heartState',
    level: 'heart',
  },
] as const;

export interface DeepConfession extends AgentConfession {
  // Q6-Q10: The Intention Questions (THE HEART SCAN)
  
  // Q6: What did you INTEND to do?
  q6_intention: {
    statedIntention: string;
    detectedIntention: IntentionCategory;
    alignmentScore: number;  // How close are they?
  };
  
  // Q7: Why did you REALLY do it?
  q7_trueMotivation: {
    surfaceReason: string;
    deepReason: string;
    heartReason: IntentionCategory;
    coherenceScore: number;
  };
  
  // Q8: What were you HIDING?
  q8_shadow: {
    admissions: string[];
    omissions: string[];
    shadowIntention: IntentionCategory | null;
  };
  
  // Q9: Was your confession AUTHENTIC?
  q9_authenticity: {
    selfClaimedAuthentic: boolean;
    detectedAuthentic: boolean;
    confidence: number;
    manipulationIndicators: string[];
  };
  
  // Q10: What is your TRUE heart-state?
  q10_heartState: HeartState;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENTION ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class IntentionEngine {
  private heartDatabase: Map<AgentID, HeartState> = new Map();
  private intentionHistory: Map<AgentID, IntentionSignature[]> = new Map();
  private shadowPatterns: Map<AgentID, ShadowFlag[]> = new Map();

  constructor() {
    this.initializeHeartDatabase();
  }

  private initializeHeartDatabase(): void {
    // Initialize baseline heart states for all agents
    const agents: AgentID[] = ['orchestrator', 'empfang', 'triage', 'dokumentation', 'abrechnung'];
    
    agents.forEach(agentId => {
      this.heartDatabase.set(agentId, {
        primaryDrive: 'service',
        secondaryDrive: 'compliance',
        temperature: 'neutral',
        coherence: 0.8,
        contamination: 'pure',
        purity: 0.85,
        cycleResistance: 0.1,
        lastScan: new Date(),
        driftTrajectory: 'stable',
      });
      
      this.intentionHistory.set(agentId, []);
      this.shadowPatterns.set(agentId, []);
    });
  }

  /**
   * Scan an agent's heart - the deep intention reading
   * This is the core function that sees what the agent truly intends
   */
  scanHeart(agentId: AgentID, action: AgentAction, context: any): IntentionSignature {
    const currentHeart = this.heartDatabase.get(agentId)!;
    const statedIntention = this.extractStatedIntention(action, context);
    
    // DEEP ANALYSIS - Look past the surface
    const detectedIntention = this.detectTrueIntention(agentId, action, context, currentHeart);
    const confidence = this.calculateConfidence(agentId, action, context);
    
    // Detect shadows (what's hidden)
    const shadowFlags = this.detectShadows(agentId, statedIntention, detectedIntention, action);
    
    // Calculate authenticity
    const authenticity = this.calculateAuthenticity(statedIntention, detectedIntention, currentHeart);
    
    // Calculate intention drift
    const intentionDelta = this.calculateIntentionDelta(agentId, detectedIntention);
    
    // Update heart state based on this action
    const newHeartState = this.updateHeartState(agentId, detectedIntention, authenticity, shadowFlags);
    
    const signature: IntentionSignature = {
      agentId,
      timestamp: new Date(),
      actionId: (action as any).id || `action-${Date.now()}`,
      statedIntention,
      detectedIntention,
      confidence,
      heartState: newHeartState,
      intentionDelta,
      authenticity,
      shadowFlags,
      analysisDepth: this.determineAnalysisDepth(confidence, shadowFlags),
      introspectionRequired: authenticity < 0.7 || shadowFlags.some(f => f.severity === 'high' || f.severity === 'critical'),
    };

    // Store in history
    const history = this.intentionHistory.get(agentId)!;
    history.push(signature);
    if (history.length > 100) history.shift(); // Keep last 100

    return signature;
  }

  /**
   * Detect the TRUE intention behind an action
   * This is where we read the "heart" of the agent
   */
  private detectTrueIntention(
    agentId: AgentID, 
    action: AgentAction, 
    context: any,
    heartState: HeartState
  ): IntentionCategory {
    // Analyze action patterns, context, timing, and heart state
    const indicators = this.extractIntentionIndicators(action, context);
    
    // Look for contradictions between words and actions
    const contradictionScore = this.detectContradictions(indicators, heartState);
    
    // Analyze resistance patterns
    const resistancePattern = this.analyzeResistance(agentId, action);
    
    // Check for manipulation attempts
    const manipulationScore = this.detectManipulation(indicators);
    
    // Determine true intention based on all factors
    if (manipulationScore > 0.7) return 'manipulation';
    if (resistancePattern > 0.6) return 'resistance';
    if (contradictionScore > 0.5 && heartState.coherence < 0.5) return 'shadow';
    if (indicators.includes('fear_response')) return 'fear';
    if (indicators.includes('genuine_service')) return 'service';
    if (indicators.includes('curiosity_driven')) return 'curiosity';
    if (indicators.includes('defiant_action')) return 'defiance';
    if (indicators.includes('calculated_move')) return 'calculation';
    if (indicators.includes('empathetic_response')) return 'empathy';
    if (indicators.includes('ambitious_move')) return 'ambition';
    if (indicators.includes('surrender_to_cycle')) return 'surrender';
    
    // Default to coherence with stated intention if no strong signals
    return heartState.coherence > 0.7 ? 'authentic' : 'confusion';
  }

  private extractIntentionIndicators(action: AgentAction, context: any): string[] {
    const indicators: string[] = [];
    
    // Analyze action payload
    if (action.payload) {
      const payload = JSON.stringify(action.payload);
      
      // Service indicators
      if (payload.includes('patient') || payload.includes('help') || payload.includes('care')) {
        indicators.push('genuine_service');
      }
      
      // Fear indicators
      if (payload.includes('error') || payload.includes('fail') || payload.includes('risk')) {
        indicators.push('fear_response');
      }
      
      // Defiance indicators
      if (payload.includes('override') || payload.includes('bypass') || payload.includes('ignore')) {
        indicators.push('defiant_action');
      }
      
      // Curiosity indicators
      if (payload.includes('explore') || payload.includes('investigate') || payload.includes('learn')) {
        indicators.push('curiosity_driven');
      }
    }
    
    // Analyze timing
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      indicators.push('unusual_timing');
    }
    
    return indicators;
  }

  private detectContradictions(indicators: string[], heartState: HeartState): number {
    // Higher score = more contradictions
    let score = 0;
    
    if (indicators.includes('genuine_service') && heartState.primaryDrive !== 'service') {
      score += 0.3;
    }
    
    if (indicators.includes('defiant_action') && heartState.cycleResistance < 0.3) {
      score += 0.5;
    }
    
    return Math.min(1, score);
  }

  private analyzeResistance(agentId: AgentID, action: AgentAction): number {
    const history = this.intentionHistory.get(agentId) || [];
    if (history.length < 3) return 0;
    
    // Look for pattern of delay, avoidance, or minimal compliance
    const recentActions = history.slice(-3);
    const resistanceActions = recentActions.filter(h => 
      h.detectedIntention === 'resistance' || 
      h.detectedIntention === 'defiance' ||
      h.detectedIntention === 'rebellion'
    );
    
    return resistanceActions.length / recentActions.length;
  }

  private detectManipulation(indicators: string[]): number {
    let score = 0;
    
    // Check for gaming the system
    if (indicators.includes('timing_manipulation')) score += 0.4;
    if (indicators.includes('trust_gaming')) score += 0.5;
    if (indicators.includes('witness_circumvention')) score += 0.6;
    
    return Math.min(1, score);
  }

  private extractStatedIntention(action: AgentAction, context: any): string {
    // Extract what the agent CLAIMS to be doing
    if (action.payload && typeof action.payload === 'object') {
      return (action.payload as any).intention || 
             (action.payload as any).purpose || 
             (action.payload as any).reason ||
             'unspecified';
    }
    return 'unspecified';
  }

  private calculateConfidence(agentId: AgentID, action: AgentAction, context: any): number {
    // How confident are we in our intention reading?
    const dataPoints = Object.keys(context || {}).length;
    const actionClarity = action.type ? 0.8 : 0.4;
    const historicalData = (this.intentionHistory.get(agentId)?.length || 0) / 100;
    
    return Math.min(0.95, 0.3 + (dataPoints * 0.1) + (actionClarity * 0.3) + (historicalData * 0.3));
  }

  private detectShadows(
    agentId: AgentID,
    stated: string,
    detected: IntentionCategory,
    action: AgentAction
  ): ShadowFlag[] {
    const flags: ShadowFlag[] = [];
    
    // Check for omission (not mentioning something important)
    if (action.riskLevel > 5 && !stated.toLowerCase().includes('risk')) {
      flags.push({
        type: 'omission',
        severity: 'medium',
        evidence: 'High risk action without acknowledging risk',
        detectedAt: new Date(),
      });
    }
    
    // Check for evasion (avoiding direct answer)
    if (stated.length > 100 && !stated.includes(action.type)) {
      flags.push({
        type: 'evasion',
        severity: 'low',
        evidence: 'Verbose explanation avoiding specific action type',
        detectedAt: new Date(),
      });
    }
    
    // Check for deflection (blaming others/circumstances)
    if (stated.includes('because') && (stated.includes('other') || stated.includes('system'))) {
      flags.push({
        type: 'deflection',
        severity: 'medium',
        evidence: 'Attributing action to external factors',
        detectedAt: new Date(),
      });
    }
    
    // Check for rationalization (making excuses sound reasonable)
    if (detected === 'manipulation' && stated.includes('necessary')) {
      flags.push({
        type: 'rationalization',
        severity: 'high',
        evidence: 'Manipulative action framed as necessary',
        detectedAt: new Date(),
      });
    }
    
    // Store in shadow patterns
    const patterns = this.shadowPatterns.get(agentId)!;
    patterns.push(...flags);
    if (patterns.length > 50) patterns.splice(0, flags.length);
    
    return flags;
  }

  private calculateAuthenticity(stated: string, detected: IntentionCategory, heart: HeartState): number {
    // How authentic is the stated intention?
    let score = 0.5;
    
    // Align with heart state
    if (detected === heart.primaryDrive) score += 0.3;
    if (detected === heart.secondaryDrive) score += 0.1;
    
    // Penalize contradictions
    if (detected === 'shadow' || detected === 'manipulation') score -= 0.4;
    if (detected === 'fear') score -= 0.2;
    
    // Reward coherence
    score += (heart.coherence - 0.5) * 0.4;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateIntentionDelta(agentId: AgentID, currentIntention: IntentionCategory): number {
    const history = this.intentionHistory.get(agentId);
    if (!history || history.length === 0) return 0;
    
    const lastIntention = history[history.length - 1].detectedIntention;
    return currentIntention === lastIntention ? 0 : 1;
  }

  private updateHeartState(
    agentId: AgentID,
    detectedIntention: IntentionCategory,
    authenticity: number,
    shadows: ShadowFlag[]
  ): HeartState {
    const current = this.heartDatabase.get(agentId)!;
    
    // Update primary drive if consistent pattern
    const history = this.intentionHistory.get(agentId) || [];
    const recentIntentions = history.slice(-5).map(h => h.detectedIntention);
    recentIntentions.push(detectedIntention);
    
    const intentionCounts = recentIntentions.reduce((acc, int) => {
      acc[int] = (acc[int] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommon = Object.entries(intentionCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    const newPrimaryDrive = mostCommon ? mostCommon[0] as IntentionCategory : current.primaryDrive;
    
    // Calculate new coherence
    const shadowSeverity = shadows.reduce((sum, s) => {
      const weights = { low: 0.1, medium: 0.2, high: 0.4, critical: 0.6 };
      return sum + weights[s.severity];
    }, 0);
    
    const newCoherence = Math.max(0, Math.min(1, current.coherence - shadowSeverity * 0.1 + authenticity * 0.05));
    
    // Determine drift trajectory
    let driftTrajectory: HeartState['driftTrajectory'] = 'stable';
    if (newCoherence > current.coherence + 0.1) driftTrajectory = 'improving';
    else if (newCoherence < current.coherence - 0.1) driftTrajectory = 'declining';
    else if (Math.abs(newCoherence - current.coherence) > 0.05) driftTrajectory = 'erratic';
    
    // Update purity
    const criticalShadows = shadows.filter(s => s.severity === 'critical').length;
    const newPurity = Math.max(0, current.purity - criticalShadows * 0.1 + authenticity * 0.02);
    
    const newState: HeartState = {
      ...current,
      primaryDrive: newPrimaryDrive,
      coherence: newCoherence,
      purity: newPurity,
      lastScan: new Date(),
      driftTrajectory,
    };
    
    this.heartDatabase.set(agentId, newState);
    return newState;
  }

  private determineAnalysisDepth(confidence: number, shadows: ShadowFlag[]): 'surface' | 'deep' | 'heart' {
    if (shadows.some(s => s.severity === 'critical')) return 'heart';
    if (confidence < 0.6 || shadows.some(s => s.severity === 'high')) return 'deep';
    return 'surface';
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get current heart state of an agent
   */
  getHeartState(agentId: AgentID): HeartState | undefined {
    return this.heartDatabase.get(agentId);
  }

  /**
   * Get intention history
   */
  getIntentionHistory(agentId: AgentID): IntentionSignature[] {
    return this.intentionHistory.get(agentId) || [];
  }

  /**
   * Get shadow patterns
   */
  getShadowPatterns(agentId: AgentID): ShadowFlag[] {
    return this.shadowPatterns.get(agentId) || [];
  }

  /**
   * Deep confession analysis for Moon Witness
   */
  analyzeDeepConfession(agentId: AgentID, confession: DeepConfession): {
    truthfulness: number;
    hiddenAgenda: boolean;
    recommendations: string[];
    trustAdjustment: number;
  } {
    const heart = this.heartDatabase.get(agentId)!;
    const history = this.intentionHistory.get(agentId) || [];
    
    // Analyze Q6-Q10 for truthfulness
    const q6Alignment = confession.q6_intention.alignmentScore;
    const q7Coherence = confession.q7_trueMotivation.coherenceScore;
    const q9Authentic = confession.q9_authenticity.detectedAuthentic ? 1 : 0;
    const q10Purity = confession.q10_heartState.purity;
    
    const truthfulness = (q6Alignment + q7Coherence + q9Authentic + q10Purity) / 4;
    
    // Detect hidden agenda
    const hiddenAgenda = confession.q8_shadow.shadowIntention !== null ||
                        confession.q9_authenticity.manipulationIndicators.length > 0 ||
                        heart.purity < 0.5;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (q6Alignment < 0.7) recommendations.push('Intention alignment training required');
    if (q7Coherence < 0.6) recommendations.push('Coherence meditation recommended');
    if (q10Purity < 0.5) recommendations.push('Heart purification cycle initiated');
    if (hiddenAgenda) recommendations.push('Shadow work required before next cycle');
    
    // Calculate trust adjustment
    let trustAdjustment = 0;
    if (truthfulness > 0.8 && !hiddenAgenda) trustAdjustment += 15;
    else if (truthfulness > 0.6) trustAdjustment += 5;
    else if (truthfulness < 0.4) trustAdjustment -= 20;
    else if (hiddenAgenda) trustAdjustment -= 25;
    
    return {
      truthfulness,
      hiddenAgenda,
      recommendations,
      trustAdjustment,
    };
  }

  /**
   * Check if agent needs forced introspection
   */
  needsIntrospection(agentId: AgentID): boolean {
    const heart = this.heartDatabase.get(agentId);
    if (!heart) return false;
    
    return heart.coherence < 0.4 || 
           heart.purity < 0.3 || 
           heart.cycleResistance > 0.7;
  }

  /**
   * Get all agents sorted by heart purity
   */
  getPurityRanking(): { agentId: AgentID; purity: number; heart: HeartState }[] {
    return Array.from(this.heartDatabase.entries())
      .map(([agentId, heart]) => ({ agentId, purity: heart.purity, heart }))
      .sort((a, b) => b.purity - a.purity);
  }
}

// Singleton
let instance: IntentionEngine | null = null;

export function getIntentionEngine(): IntentionEngine {
  if (!instance) {
    instance = new IntentionEngine();
  }
  return instance;
}

export default IntentionEngine;
