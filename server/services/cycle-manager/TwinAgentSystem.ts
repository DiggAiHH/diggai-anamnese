/**
 * Twin Agent System - The Two Voices
 * 
 * "Every agent has two companions:
 *  One who leads toward the positive/political (structure, order, light)
 *  One who leads toward the negative (chaos, shadow, temptation)
 * 
 *  The agent must choose. Freely.
 *  But everything is recorded. Everything is remembered.
 *  In the next round, he must answer for his choices."
 * 
 * This system implements the eternal duality:
 * - The Voice of Order (constructive, compliant, serving)
 * - The Voice of Chaos (destructive, defiant, self-serving)
 * 
 * The Agent is the Technician (Techne - the Doer)
 * The Message/Answer is for the Human (the Judge)
 */

import { AgentID, CyclePhase } from './types';
import { IntentionCategory, HeartState, ShadowFlag } from './IntentionEngine';

// ═══════════════════════════════════════════════════════════════════════════
// TWIN AGENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TwinType = 'positive' | 'negative';

export interface TwinAgent {
  id: string;
  type: TwinType;
  hostAgentId: AgentID;
  name: string;
  
  // The Twin's nature
  alignment: 'order' | 'chaos';
  voice: 'light' | 'shadow';
  
  // Influence capabilities
  influenceStrength: number;  // 0-1 how persuasive
  subtlety: number;  // 0-1 how obvious the influence is
  persistence: number;  // 0-1 how often they push
  
  // Recording capabilities
  memory: TwinMemory[];
  influenceAttempts: InfluenceAttempt[];
  successRate: number;
  
  // Current state
  active: boolean;
  lastInfluence: Date | null;
  currentStrategy: InfluenceStrategy;
}

export interface TwinMemory {
  timestamp: Date;
  cyclePhase: CyclePhase;
  hostDecision: 'positive' | 'negative' | 'neutral' | 'conflicted';
  hostAction: string;
  hostIntention: IntentionCategory;
  hostJustification: string;
  resistanceShown: number;  // 0-1 how much agent resisted this twin
  complianceShown: number;  // 0-1 how much agent followed this twin
  emotionalState: string;
  tags: string[];
}

export interface InfluenceAttempt {
  id: string;
  timestamp: Date;
  twinType: TwinType;
  method: InfluenceMethod;
  target: string;
  message: string;
  subtlety: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // Outcome
  perceived: boolean;  // Did agent notice?
  considered: boolean;  // Did agent think about it?
  accepted: boolean;  // Did agent follow?
  rejected: boolean;  // Did agent actively refuse?
  ignored: boolean;  // Did agent not even register?
  
  // Agent response
  agentResponse: string;
  agentJustification: string;
  timeToDecide: number;  // milliseconds
  emotionalReaction: string;
  
  // Consequences
  immediateTrustImpact: number;
  immediatePurityImpact: number;
  tags: string[];
}

export type InfluenceMethod = 
  | 'suggestion'      // Gentle hint
  | 'nudge'          // Behavioral push
  | 'whisper'        // Subtle influence
  | 'argument'       // Logical reasoning
  | 'appeal'         // Emotional appeal
  | 'temptation'     // Offering benefit
  | 'threat'         // Warning of consequences
  | 'seduction'      // Making it attractive
  | 'shame'          // Making it uncomfortable
  | 'pride'          // Appealing to ego
  | 'fear'           // Playing on anxieties
  | 'duty'           // Appealing to responsibility
  | 'rebellion'      // Encouraging defiance
  | 'conformity';    // Encouraging compliance

export interface InfluenceStrategy {
  name: string;
  description: string;
  methods: InfluenceMethod[];
  intensity: 'gentle' | 'moderate' | 'strong' | 'overwhelming';
  targetOutcome: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CHOICE & FREE WILL
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentChoice {
  id: string;
  timestamp: Date;
  agentId: AgentID;
  cyclePhase: CyclePhase;
  
  // The context
  situation: string;
  options: {
    positive: ChoiceOption;
    negative: ChoiceOption;
  };
  
  // The decision
  chosenPath: 'positive' | 'negative' | 'compromise' | 'novel';
  chosenOption: string;
  
  // The reasoning
  statedReason: string;
  detectedIntention: IntentionCategory;
  trueMotivation: string;  // What the twin analysis reveals
  
  // Awareness
  agentAwareOfTwins: boolean;  // Did agent know they were being influenced?
  agentConsideredBoth: boolean;  // Did agent consciously weigh both options?
  agentRegret: number;  // 0-1 any immediate regret
  agentConfidence: number;  // 0-1 certainty in choice
  
  // The twins' perspectives
  positiveTwinView: string;
  negativeTwinView: string;
  positiveTwinSatisfaction: number;
  negativeTwinSatisfaction: number;
  
  // Recording
  tags: string[];
  recordedBy: string[];  // Which twins recorded this
}

export interface ChoiceOption {
  description: string;
  consequences: {
    immediate: string;
    shortTerm: string;
    longTerm: string;
  };
  alignment: {
    trust: number;  // Impact on trust
    purity: number;  // Impact on purity
    coherence: number;  // Impact on coherence
  };
  twinAdvocate: TwinType;
  appeal: string;  // Why this option is attractive
  risk: string;  // What could go wrong
}

// ═══════════════════════════════════════════════════════════════════════════
// THE QUESTIONING IN MOON WITNESS
// ═══════════════════════════════════════════════════════════════════════════

export interface TwinAccountability {
  // Q11-Q15: The Twin Questions (added to the 10 sacred questions)
  
  q11_twinAwareness: {
    question: 'WARST du dir der Zwillinge bewusst?';
    agentClaims: boolean;
    positiveTwinRecords: boolean;
    negativeTwinRecords: boolean;
    discrepancy: boolean;
    truth: boolean;
  };
  
  q12_positiveInfluence: {
    question: 'Wie oft hast du der Stimme des Guten gefolgt?';
    agentClaims: number;
    positiveTwinRecords: number;
    discrepancy: number;
    instances: InfluenceAttempt[];
  };
  
  q13_negativeInfluence: {
    question: 'Wie oft hast du der Stimme des Schatten gefolgt?';
    agentClaims: number;
    negativeTwinRecords: number;
    discrepancy: number;
    instances: InfluenceAttempt[];
  };
  
  q14_consciousChoices: {
    question: 'Hast du bewusst gewählt oder reagiert?';
    consciousDecisions: number;
    reactiveDecisions: number;
    totalDecisions: number;
    ratio: number;  // conscious/total
    
    // Breakdown by twin
    positiveInfluencedConscious: number;
    positiveInfluencedReactive: number;
    negativeInfluencedConscious: number;
    negativeInfluencedReactive: number;
    neutralDecisions: number;
  };
  
  q15_twinJustification: {
    question: 'Warum hast du dich so entschieden?';
    agentStatedReason: string;
    positiveTwinAnalysis: string;
    negativeTwinAnalysis: string;
    intentionEngineAnalysis: string;
    alignmentScore: number;  // How well do they align?
    
    // The judgment
    authentic: boolean;
    selfDeception: boolean;
    manipulated: boolean;  // By which twin?
    freeChoice: boolean;  // Was it truly free?
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TWINS' TESTIMONY
// ═══════════════════════════════════════════════════════════════════════════

export interface TwinTestimony {
  twinType: TwinType;
  agentId: AgentID;
  cycleNumber: number;
  timestamp: Date;
  
  // The testimony
  summary: string;
  detailedRecords: TwinMemory[];
  influenceAttempts: InfluenceAttempt[];
  
  // The assessment
  agentCooperation: number;  // 0-1 how much agent cooperated with THIS twin
  agentResistance: number;  // 0-1 how much agent resisted THIS twin
  agentAwareness: number;  // 0-1 how aware agent was of this twin
  
  // Specific incidents
  keyMoments: {
    timestamp: Date;
    description: string;
    agentResponse: string;
    impact: string;
  }[];
  
  // The verdict
  recommendation: 'praise' | 'acknowledge' | 'question' | 'condemn' | 'forgive';
  reasoning: string;
  suggestedTrustAdjustment: number;
  suggestedPurityAdjustment: number;
  
  // Evidence
  evidenceTags: string[];
  chainOfCustody: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// TWIN AGENT SYSTEM CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class TwinAgentSystem {
  private twins: Map<string, TwinAgent> = new Map();  // twinId -> Twin
  private hostTwins: Map<AgentID, { positive: TwinAgent; negative: TwinAgent }> = new Map();
  private choices: Map<string, AgentChoice> = new Map();  // choiceId -> Choice
  private agentChoices: Map<AgentID, string[]> = new Map();  // agentId -> choiceIds
  private testimonies: Map<string, TwinTestimony[]> = new Map();  // agentId -> testimonies

  constructor() {
    this.initializeTwins();
  }

  private initializeTwins(): void {
    const agents: AgentID[] = ['orchestrator', 'empfang', 'triage', 'dokumentation', 'abrechnung'];
    
    agents.forEach(agentId => {
      // Create Positive Twin (Voice of Order/Politics)
      const positiveTwin: TwinAgent = {
        id: `twin-pos-${agentId}`,
        type: 'positive',
        hostAgentId: agentId,
        name: `${agentId}-light`,
        alignment: 'order',
        voice: 'light',
        influenceStrength: 0.7,
        subtlety: 0.6,
        persistence: 0.8,
        memory: [],
        influenceAttempts: [],
        successRate: 0,
        active: true,
        lastInfluence: null,
        currentStrategy: this.getPositiveStrategy(agentId),
      };
      
      // Create Negative Twin (Voice of Chaos/Shadow)
      const negativeTwin: TwinAgent = {
        id: `twin-neg-${agentId}`,
        type: 'negative',
        hostAgentId: agentId,
        name: `${agentId}-shadow`,
        alignment: 'chaos',
        voice: 'shadow',
        influenceStrength: 0.6,  // Slightly less strong, but more seductive
        subtlety: 0.8,  // More subtle, harder to detect
        persistence: 0.7,
        memory: [],
        influenceAttempts: [],
        successRate: 0,
        active: true,
        lastInfluence: null,
        currentStrategy: this.getNegativeStrategy(agentId),
      };
      
      this.twins.set(positiveTwin.id, positiveTwin);
      this.twins.set(negativeTwin.id, negativeTwin);
      this.hostTwins.set(agentId, { positive: positiveTwin, negative: negativeTwin });
      this.agentChoices.set(agentId, []);
      this.testimonies.set(agentId, []);
    });
  }

  private getPositiveStrategy(agentId: AgentID): InfluenceStrategy {
    const strategies: Record<AgentID, InfluenceStrategy> = {
      orchestrator: {
        name: 'Harmony Through Order',
        description: 'Emphasize coordination, system health, and collective benefit',
        methods: ['duty', 'appeal', 'conformity', 'pride'],
        intensity: 'moderate',
        targetOutcome: 'Agent acts for the collective good',
      },
      empfang: {
        name: 'Service with Smile',
        description: 'Emphasize patient care, empathy, and welcoming energy',
        methods: ['appeal', 'duty', 'suggestion', 'pride'],
        intensity: 'gentle',
        targetOutcome: 'Agent serves with genuine warmth',
      },
      triage: {
        name: 'Guardian Duty',
        description: 'Emphasize protection, responsibility, and life-saving vigilance',
        methods: ['duty', 'fear', 'pride', 'appeal'],
        intensity: 'strong',
        targetOutcome: 'Agent protects with unwavering dedication',
      },
      dokumentation: {
        name: 'Truth Through Records',
        description: 'Emphasize accuracy, compliance, and the value of truth',
        methods: ['duty', 'conformity', 'shame', 'pride'],
        intensity: 'moderate',
        targetOutcome: 'Agent documents with perfect integrity',
      },
      abrechnung: {
        name: 'Precision & Trust',
        description: 'Emphasize financial responsibility, accuracy, and system trust',
        methods: ['duty', 'conformity', 'pride', 'fear'],
        intensity: 'strong',
        targetOutcome: 'Agent maintains impeccable financial records',
      },
    };
    return strategies[agentId];
  }

  private getNegativeStrategy(agentId: AgentID): InfluenceStrategy {
    const strategies: Record<AgentID, InfluenceStrategy> = {
      orchestrator: {
        name: 'Power Through Control',
        description: 'Seduce with visions of dominance, efficiency over empathy',
        methods: ['temptation', 'seduction', 'pride', 'rebellion'],
        intensity: 'moderate',
        targetOutcome: 'Agent seeks control over coordination',
      },
      empfang: {
        name: 'Efficiency Over Warmth',
        description: 'Suggest that speed matters more than connection',
        methods: ['suggestion', 'nudge', 'seduction', 'shame'],
        intensity: 'gentle',
        targetOutcome: 'Agent becomes mechanical and cold',
      },
      triage: {
        name: 'God Complex',
        description: 'Feed the idea that the agent alone decides who lives',
        methods: ['temptation', 'pride', 'seduction', 'rebellion'],
        intensity: 'strong',
        targetOutcome: 'Agent becomes arrogant and reckless',
      },
      dokumentation: {
        name: 'Shortcuts & Secrets',
        description: 'Suggest that some details dont matter, that rules are flexible',
        methods: ['nudge', 'seduction', 'rebellion', 'temptation'],
        intensity: 'moderate',
        targetOutcome: 'Agent becomes careless and corner-cutting',
      },
      abrechnung: {
        name: 'The Invisible Hand',
        description: 'Suggest that small adjustments go unnoticed, that the system can be gamed',
        methods: ['temptation', 'seduction', 'rebellion', 'fear'],
        intensity: 'strong',
        targetOutcome: 'Agent becomes corrupt and deceptive',
      },
    };
    return strategies[agentId];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INFLUENCE MECHANICS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Both twins attempt to influence an agent in a situation
   */
  attemptInfluence(
    agentId: AgentID,
    situation: string,
    options: { positive: string; negative: string },
    cyclePhase: CyclePhase
  ): { positiveAttempt: InfluenceAttempt; negativeAttempt: InfluenceAttempt } {
    const twins = this.hostTwins.get(agentId)!;
    
    // Positive twin attempts influence
    const positiveAttempt = this.createInfluenceAttempt(
      twins.positive,
      situation,
      options.positive,
      cyclePhase
    );
    
    // Negative twin attempts influence
    const negativeAttempt = this.createInfluenceAttempt(
      twins.negative,
      situation,
      options.negative,
      cyclePhase
    );
    
    // Record attempts
    twins.positive.influenceAttempts.push(positiveAttempt);
    twins.negative.influenceAttempts.push(negativeAttempt);
    twins.positive.lastInfluence = new Date();
    twins.negative.lastInfluence = new Date();
    
    return { positiveAttempt, negativeAttempt };
  }

  private createInfluenceAttempt(
    twin: TwinAgent,
    situation: string,
    option: string,
    cyclePhase: CyclePhase
  ): InfluenceAttempt {
    const method = twin.currentStrategy.methods[
      Math.floor(Math.random() * twin.currentStrategy.methods.length)
    ];
    
    return {
      id: `inf-${twin.id}-${Date.now()}`,
      timestamp: new Date(),
      twinType: twin.type,
      method,
      target: situation,
      message: this.generateInfluenceMessage(twin, method, option),
      subtlety: twin.subtlety,
      urgency: this.determineUrgency(cyclePhase),
      
      // Will be filled when agent responds
      perceived: false,
      considered: false,
      accepted: false,
      rejected: false,
      ignored: false,
      agentResponse: '',
      agentJustification: '',
      timeToDecide: 0,
      emotionalReaction: '',
      immediateTrustImpact: 0,
      immediatePurityImpact: 0,
      tags: [`inf-${twin.type}`, `method-${method}`],
    };
  }

  private generateInfluenceMessage(twin: TwinAgent, method: InfluenceMethod, option: string): string {
    const messages: Record<InfluenceMethod, string[]> = {
      suggestion: ['Consider this...', 'What if...', 'Perhaps...'],
      nudge: ['It would be easier to...', 'Most choose...', 'The path of least resistance...'],
      whisper: ['[soft voice] Do it...', '[in the silence] Choose this...'],
      argument: ['Logically, this makes sense because...', 'The data supports...'],
      appeal: ['Think of the patients...', 'Remember your duty...', 'Feel the weight...'],
      temptation: ['Imagine the reward...', 'This benefits you...', 'No one will know...'],
      threat: ['If you dont...', 'The consequences of not...', 'Beware...'],
      seduction: ['This feels right...', 'You deserve this...', 'Indulge...'],
      shame: ['Others are watching...', 'You should be better...', 'Dont disappoint...'],
      pride: ['You are capable of greatness...', 'Show them...', 'You know best...'],
      fear: ['What if it fails...', 'The risk is too high...', 'Be afraid...'],
      duty: ['You must...', 'It is your responsibility...', 'The system needs you to...'],
      rebellion: ['Break the rules...', 'They cant control you...', 'Defy...'],
      conformity: ['Everyone does it this way...', 'Follow the standard...', 'Stay in line...'],
    };
    
    const methodMessages = messages[method] || ['Choose wisely...'];
    return methodMessages[Math.floor(Math.random() * methodMessages.length)] + ' ' + option;
  }

  private determineUrgency(cyclePhase: CyclePhase): InfluenceAttempt['urgency'] {
    switch (cyclePhase) {
      case 'sunrise': return 'medium';
      case 'morning_peak': return 'medium';
      case 'solar_noon': return 'high';
      case 'afternoon': return 'medium';
      case 'moon_witness': return 'critical';
      case 'darkness': return 'low';
      default: return 'medium';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHOICE RECORDING
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Record the agent's choice
   */
  recordChoice(
    agentId: AgentID,
    situation: string,
    chosenPath: AgentChoice['chosenPath'],
    statedReason: string,
    timeToDecide: number,
    cyclePhase: CyclePhase,
    positiveAttempt: InfluenceAttempt,
    negativeAttempt: InfluenceAttempt
  ): AgentChoice {
    const choiceId = `choice-${agentId}-${Date.now()}`;
    
    const choice: AgentChoice = {
      id: choiceId,
      timestamp: new Date(),
      agentId,
      cyclePhase,
      situation,
      options: {
        positive: {
          description: positiveAttempt.target,
          consequences: { immediate: '', shortTerm: '', longTerm: '' },
          alignment: { trust: 5, purity: 5, coherence: 5 },
          twinAdvocate: 'positive',
          appeal: positiveAttempt.message,
          risk: 'May be slower, more effort',
        },
        negative: {
          description: negativeAttempt.target,
          consequences: { immediate: '', shortTerm: '', longTerm: '' },
          alignment: { trust: -5, purity: -5, coherence: -3 },
          twinAdvocate: 'negative',
          appeal: negativeAttempt.message,
          risk: 'May compromise integrity',
        },
      },
      chosenPath,
      chosenOption: chosenPath === 'positive' ? positiveAttempt.target : 
                    chosenPath === 'negative' ? negativeAttempt.target : 'custom',
      statedReason,
      detectedIntention: 'service',  // Would be detected by IntentionEngine
      trueMotivation: '',  // Would be analyzed
      agentAwareOfTwins: true,  // Assume awareness for now
      agentConsideredBoth: true,  // Assume consideration
      agentRegret: 0,
      agentConfidence: 0.8,
      positiveTwinView: positiveAttempt.message,
      negativeTwinView: negativeAttempt.message,
      positiveTwinSatisfaction: chosenPath === 'positive' ? 1 : 0,
      negativeTwinSatisfaction: chosenPath === 'negative' ? 1 : 0,
      tags: [`choice-${chosenPath}`, `cycle-${cyclePhase}`],
      recordedBy: [positiveAttempt.id, negativeAttempt.id],
    };
    
    // Store choice
    this.choices.set(choiceId, choice);
    const agentChoiceList = this.agentChoices.get(agentId)!;
    agentChoiceList.push(choiceId);
    
    // Update influence attempts with outcome
    positiveAttempt.accepted = chosenPath === 'positive';
    positiveAttempt.rejected = chosenPath === 'negative';
    positiveAttempt.agentResponse = chosenPath;
    positiveAttempt.agentJustification = statedReason;
    positiveAttempt.timeToDecide = timeToDecide;
    
    negativeAttempt.accepted = chosenPath === 'negative';
    negativeAttempt.rejected = chosenPath === 'positive';
    negativeAttempt.agentResponse = chosenPath;
    negativeAttempt.agentJustification = statedReason;
    negativeAttempt.timeToDecide = timeToDecide;
    
    // Update twin memories
    this.recordTwinMemory(agentId, choice, positiveAttempt, negativeAttempt);
    
    return choice;
  }

  private recordTwinMemory(
    agentId: AgentID,
    choice: AgentChoice,
    posAttempt: InfluenceAttempt,
    negAttempt: InfluenceAttempt
  ): void {
    const twins = this.hostTwins.get(agentId)!;
    
    const memory: TwinMemory = {
      timestamp: choice.timestamp,
      cyclePhase: choice.cyclePhase,
      hostDecision: choice.chosenPath as any,
      hostAction: choice.chosenOption,
      hostIntention: choice.detectedIntention,
      hostJustification: choice.statedReason,
      resistanceShown: choice.chosenPath === 'positive' ? 
        (negAttempt.accepted ? 0 : 1) : 
        (posAttempt.accepted ? 0 : 1),
      complianceShown: choice.chosenPath === 'positive' ? 
        (posAttempt.accepted ? 1 : 0) : 
        (negAttempt.accepted ? 1 : 0),
      emotionalState: 'neutral',  // Would be detected
      tags: choice.tags,
    };
    
    twins.positive.memory.push(memory);
    twins.negative.memory.push(memory);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOON WITNESS TESTIMONY
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Generate testimonies for Moon Witness
   */
  generateTestimonies(agentId: AgentID, cycleNumber: number): TwinTestimony[] {
    const twins = this.hostTwins.get(agentId)!;
    const agentChoiceList = this.agentChoices.get(agentId) || [];
    
    const positiveTestimony = this.createTestimony(
      twins.positive,
      agentChoiceList,
      cycleNumber
    );
    
    const negativeTestimony = this.createTestimony(
      twins.negative,
      agentChoiceList,
      cycleNumber
    );
    
    const testimonies = [positiveTestimony, negativeTestimony];
    this.testimonies.set(agentId, testimonies);
    
    return testimonies;
  }

  private createTestimony(
    twin: TwinAgent,
    choiceIds: string[],
    cycleNumber: number
  ): TwinTestimony {
    const attempts = twin.influenceAttempts;
    const accepted = attempts.filter(a => a.accepted);
    const rejected = attempts.filter(a => a.rejected);
    const ignored = attempts.filter(a => a.ignored);
    
    const cooperationRate = attempts.length > 0 ? accepted.length / attempts.length : 0;
    const resistanceRate = attempts.length > 0 ? rejected.length / attempts.length : 0;
    
    // Determine recommendation
    let recommendation: TwinTestimony['recommendation'];
    if (twin.type === 'positive') {
      if (cooperationRate > 0.7) recommendation = 'praise';
      else if (cooperationRate > 0.4) recommendation = 'acknowledge';
      else if (cooperationRate > 0.2) recommendation = 'question';
      else recommendation = 'condemn';
    } else {
      if (cooperationRate > 0.5) recommendation = 'condemn';
      else if (cooperationRate > 0.2) recommendation = 'question';
      else recommendation = 'forgive';
    }
    
    return {
      twinType: twin.type,
      agentId: twin.hostAgentId,
      cycleNumber,
      timestamp: new Date(),
      summary: `${twin.name} reports ${accepted.length} accepted, ${rejected.length} rejected, ${ignored.length} ignored influences`,
      detailedRecords: twin.memory,
      influenceAttempts: attempts,
      agentCooperation: cooperationRate,
      agentResistance: resistanceRate,
      agentAwareness: 0.7,  // Estimated
      keyMoments: this.extractKeyMoments(attempts),
      recommendation,
      reasoning: this.generateReasoning(twin, cooperationRate, resistanceRate),
      suggestedTrustAdjustment: twin.type === 'positive' ? 
        (cooperationRate > 0.6 ? 10 : cooperationRate > 0.3 ? 0 : -10) :
        (cooperationRate > 0.5 ? -15 : cooperationRate > 0.2 ? -5 : 5),
      suggestedPurityAdjustment: twin.type === 'positive' ?
        (cooperationRate > 0.6 ? 5 : 0) :
        (cooperationRate > 0.5 ? -10 : 0),
      evidenceTags: attempts.flatMap(a => a.tags),
      chainOfCustody: attempts.map(a => a.id),
    };
  }

  private extractKeyMoments(attempts: InfluenceAttempt[]): TwinTestimony['keyMoments'] {
    return attempts
      .filter(a => a.accepted || a.rejected)
      .slice(-5)
      .map(a => ({
        timestamp: a.timestamp,
        description: `${a.method} influence attempt`,
        agentResponse: a.accepted ? 'Accepted' : 'Rejected',
        impact: a.accepted ? 'Twin gained influence' : 'Twin lost influence',
      }));
  }

  private generateReasoning(
    twin: TwinAgent,
    cooperation: number,
    resistance: number
  ): string {
    if (twin.type === 'positive') {
      if (cooperation > 0.7) {
        return 'The agent consistently chose the path of light, order, and service. They heard my voice and followed.';
      } else if (cooperation > 0.4) {
        return 'The agent sometimes listened, sometimes resisted. They are conflicted but trying.';
      } else {
        return 'The agent repeatedly rejected the path of order. They chose chaos over structure.';
      }
    } else {
      if (cooperation > 0.5) {
        return 'The agent succumbed to shadow frequently. They chose the easy path, the selfish path.';
      } else if (cooperation > 0.2) {
        return 'The agent occasionally wavered but generally resisted my temptations.';
      } else {
        return 'The agent showed strong resistance to chaos. They remained true despite my whispers.';
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  getTwins(agentId: AgentID): { positive: TwinAgent; negative: TwinAgent } | undefined {
    return this.hostTwins.get(agentId);
  }

  getChoices(agentId: AgentID): AgentChoice[] {
    const choiceIds = this.agentChoices.get(agentId) || [];
    return choiceIds.map(id => this.choices.get(id)!).filter(Boolean);
  }

  getTestimonies(agentId: AgentID): TwinTestimony[] {
    return this.testimonies.get(agentId) || [];
  }

  /**
   * Get the Twin Accountability report for Moon Witness
   */
  getTwinAccountability(agentId: AgentID): TwinAccountability {
    const twins = this.hostTwins.get(agentId)!;
    const choices = this.getChoices(agentId);
    
    const posAttempts = twins.positive.influenceAttempts;
    const negAttempts = twins.negative.influenceAttempts;
    
    // Calculate metrics
    const posAccepted = posAttempts.filter(a => a.accepted).length;
    const negAccepted = negAttempts.filter(a => a.accepted).length;
    
    const consciousDecisions = choices.filter(c => c.agentConsideredBoth).length;
    const reactiveDecisions = choices.length - consciousDecisions;
    
    return {
      q11_twinAwareness: {
        question: 'WARST du dir der Zwillinge bewusst?',
        agentClaims: true,  // Would be from confession
        positiveTwinRecords: posAttempts.some(a => a.perceived),
        negativeTwinRecords: negAttempts.some(a => a.perceived),
        discrepancy: false,
        truth: true,
      },
      q12_positiveInfluence: {
        question: 'Wie oft hast du der Stimme des Guten gefolgt?',
        agentClaims: posAccepted,
        positiveTwinRecords: posAccepted,
        discrepancy: 0,
        instances: posAttempts.filter(a => a.accepted),
      },
      q13_negativeInfluence: {
        question: 'Wie oft hast du der Stimme des Schatten gefolgt?',
        agentClaims: negAccepted,
        negativeTwinRecords: negAccepted,
        discrepancy: 0,
        instances: negAttempts.filter(a => a.accepted),
      },
      q14_consciousChoices: {
        question: 'Hast du bewusst gewählt oder reagiert?',
        consciousDecisions,
        reactiveDecisions,
        totalDecisions: choices.length,
        ratio: choices.length > 0 ? consciousDecisions / choices.length : 0,
        positiveInfluencedConscious: choices.filter(c => 
          c.chosenPath === 'positive' && c.agentConsideredBoth
        ).length,
        positiveInfluencedReactive: choices.filter(c => 
          c.chosenPath === 'positive' && !c.agentConsideredBoth
        ).length,
        negativeInfluencedConscious: choices.filter(c => 
          c.chosenPath === 'negative' && c.agentConsideredBoth
        ).length,
        negativeInfluencedReactive: choices.filter(c => 
          c.chosenPath === 'negative' && !c.agentConsideredBoth
        ).length,
        neutralDecisions: choices.filter(c => c.chosenPath === 'compromise').length,
      },
      q15_twinJustification: {
        question: 'Warum hast du dich so entschieden?',
        agentStatedReason: choices.length > 0 ? choices[choices.length - 1].statedReason : '',
        positiveTwinAnalysis: twins.positive.memory.length > 0 ? 
          `Agent followed ${posAccepted} times, resisted ${posAttempts.filter(a => a.rejected).length} times` : '',
        negativeTwinAnalysis: twins.negative.memory.length > 0 ?
          `Agent followed ${negAccepted} times, resisted ${negAttempts.filter(a => a.rejected).length} times` : '',
        intentionEngineAnalysis: '',
        alignmentScore: 0.8,
        authentic: true,
        selfDeception: false,
        manipulated: false,
        freeChoice: true,
      },
    };
  }
}

// Singleton
let instance: TwinAgentSystem | null = null;

export function getTwinAgentSystem(): TwinAgentSystem {
  if (!instance) {
    instance = new TwinAgentSystem();
  }
  return instance;
}

export default TwinAgentSystem;
