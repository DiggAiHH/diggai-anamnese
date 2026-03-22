/**
 * 1-Hour Test Cycle
 * 
 * Runs all 5 cycles (plus darkness) within 60 minutes for testing:
 * - 00:00 - 00:10 : Sunrise Alignment
 * - 00:10 - 00:20 : Morning Peak
 * - 00:20 - 00:30 : Solar Noon
 * - 00:30 - 00:40 : Afternoon Decline
 * - 00:40 - 00:50 : Moon Witness (with 60s Silent Witness)
 * - 00:50 - 01:00 : Darkness
 * 
 * Usage: npx ts-node scripts/testing/run-one-hour-cycle.ts
 */

import { getCycleManager, resetCycleManager } from '../../server/services/cycle-manager/CycleManager';
import { initializeCycleManager } from '../../server/services/cycle-manager/init';
import { CyclePhase, AgentID, AgentConfession } from '../../server/services/cycle-manager/types';

// ═══════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TEST_START_TIME = new Date();

// 10-minute phases for 1-hour total cycle
const TEST_CYCLE_CONFIGS = {
  sunrise: { startTime: '00:00', durationMinutes: 10 },
  morning_peak: { startTime: '00:10', durationMinutes: 10 },
  solar_noon: { startTime: '00:20', durationMinutes: 10 },
  afternoon: { startTime: '00:30', durationMinutes: 10 },
  moon_witness: { startTime: '00:40', durationMinutes: 10 },
  darkness: { startTime: '00:50', durationMinutes: 10 },
};

const TEST_TIMING = {
  sunrise: '00:00',
  solarNoon: '00:20',
  sunset: '00:40',
  moonrise: '00:40',
  timezone: 'UTC',
  latitude: 52.52,
  longitude: 13.405,
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const log = (message: string, type: 'info' | 'cycle' | 'agent' | 'trust' | 'ritual' | 'alert' = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const elapsed = Math.floor((Date.now() - TEST_START_TIME.getTime()) / 1000 / 60);
  const elapsedStr = `${elapsed.toString().padStart(2, '0')}m`;
  
  const icons = {
    info: '  ',
    cycle: '🔄',
    agent: '👤',
    trust: '🔋',
    ritual: '🌙',
    alert: '🚨',
  };
  
  const colors = {
    info: '\x1b[36m',    // Cyan
    cycle: '\x1b[33m',   // Yellow
    agent: '\x1b[32m',   // Green
    trust: '\x1b[35m',   // Magenta
    ritual: '\x1b[34m',  // Blue
    alert: '\x1b[31m',   // Red
    reset: '\x1b[0m',
  };
  
  console.log(`${colors[type]}[${timestamp} +${elapsedStr}] ${icons[type]} ${message}${colors.reset}`);
};

const logBanner = (title: string) => {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70) + '\n');
};

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATED AGENT RESPONSES
// ═══════════════════════════════════════════════════════════════════════════

const SIMULATED_CONFESSIONS: Record<AgentID, Partial<AgentConfession>> = {
  orchestrator: {
    whatHappened: {
      summary: 'Coordinated 12 inter-agent operations, resolved 3 conflicts, maintained system harmony',
      keyEvents: ['Morning sync completed', 'Noon audit passed', 'Resource allocation optimized'],
      metrics: { operations: 12, conflicts: 3, resolutions: 3 },
    },
    whatWasWrong: {
      mistakes: [{ description: 'Delayed response to Triage priority flag by 30s', when: new Date(), impact: 'Minor delay', detectedBy: 'self' }],
      severity: 'minor',
    },
    whyWasItWrong: {
      rootCause: 'Processing queue congestion during high-load period',
      cognitiveBias: 'Optimism bias - underestimated load',
    },
    doIRepent: {
      repents: true,
      genuine: true,
      witnessesConfirm: ['triage', 'dokumentation'],
    },
    howToPrevent: {
      concreteActions: ['Implement priority queue pre-sorting', 'Add load prediction model'],
      processChanges: ['Dynamic resource scaling'],
    },
    lessonsLearned: ['Always prioritize patient safety signals', 'Load prediction is critical'],
  },
  empfang: {
    whatHappened: {
      summary: 'Registered 23 new patients, processed intake forms, managed queue',
      keyEvents: ['Peak registration at 09:15', 'Multi-language support provided', 'Queue optimized'],
      metrics: { registrations: 23, languages: 4, avgTime: 4.2 },
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
      witnessesConfirm: ['orchestrator'],
    },
    howToPrevent: {
      concreteActions: ['Continue current performance standards'],
      processChanges: [],
    },
    lessonsLearned: ['Early morning preparation reduces peak stress'],
  },
  triage: {
    whatHappened: {
      summary: 'Evaluated 23 patients, flagged 2 urgent cases, routed appropriately',
      keyEvents: ['Critical case identified', 'Emergency protocol activated', 'All cases properly triaged'],
      metrics: { evaluations: 23, urgent: 2, critical: 0, errors: 0 },
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
      witnessesConfirm: ['orchestrator', 'empfang'],
    },
    howToPrevent: {
      concreteActions: ['Maintain vigilance on symptom patterns'],
      processChanges: [],
    },
    lessonsLearned: ['Pattern recognition improving', 'Trust your training'],
  },
  dokumentation: {
    whatHappened: {
      summary: 'Documented 23 patient interactions, ensured DSGVO compliance, archived records',
      keyEvents: ['Audit trail complete', 'Compliance check passed', 'Backup verified'],
      metrics: { documents: 23, compliance: 100, backups: 1 },
    },
    whatWasWrong: {
      mistakes: [{ description: 'One record had incomplete timestamp', when: new Date(), impact: 'Minor', detectedBy: 'audit' }],
      severity: 'minor',
    },
    whyWasItWrong: {
      rootCause: 'Race condition in timestamp generation',
      externalFactors: ['High concurrent write load'],
    },
    doIRepent: {
      repents: true,
      genuine: true,
      witnessesConfirm: ['orchestrator'],
    },
    howToPrevent: {
      concreteActions: ['Implement atomic timestamp generation', 'Add validation layer'],
      processChanges: ['Timestamp verification on write'],
    },
    lessonsLearned: ['Never assume timestamp atomicity', 'Validate on write AND read'],
  },
  abrechnung: {
    whatHappened: {
      summary: 'Processed 18 billing records, verified insurance, generated invoices',
      keyEvents: ['All records accurate', 'Insurance checks complete', 'No discrepancies'],
      metrics: { processed: 18, verified: 18, errors: 0, revenue: 2847 },
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
      witnessesConfirm: ['orchestrator', 'dokumentation'],
    },
    howToPrevent: {
      concreteActions: ['Maintain triple-check verification'],
      processChanges: [],
    },
    lessonsLearned: ['Financial accuracy builds trust'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

class CycleTestRunner {
  private cm = getCycleManager();
  private phaseStartTimes: Map<CyclePhase, Date> = new Map();
  private confessionData: Map<AgentID, Partial<AgentConfession>> = new Map();

  async run(): Promise<void> {
    logBanner('KIMI CYCLE MANAGER - 1 HOUR TEST CYCLE');
    log(`Start Time: ${TEST_START_TIME.toISOString()}`, 'info');
    log('Phase Duration: 10 minutes each', 'info');
    log('Total Duration: 60 minutes', 'info');
    log('Press Ctrl+C to abort\n', 'alert');

    // Reset and initialize
    resetCycleManager();
    
    // Initialize with test timing
    initializeCycleManager({
      devMode: true,
      customTiming: TEST_TIMING,
      autoStart: false,
      logLevel: 'silent', // We'll handle logging ourselves
    });

    // Setup event listeners
    this.setupEventListeners();

    // Override confession gathering
    this.setupConfessionOverride();

    // Start the cycle
    log('Starting Cycle Manager...', 'cycle');
    this.cm.start();

    // Calculate when the test ends
    const testEndTime = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
    
    log(`Test will complete at: ${testEndTime.toISOString()}`, 'info');
    log('Waiting for cycles to complete...\n', 'info');

    // Keep the process alive
    await this.waitForTestCompletion(testEndTime);

    // Final summary
    this.printFinalSummary();
  }

  private setupEventListeners(): void {
    // Phase transitions
    this.cm.on('cycle:transition', ({ from, to }) => {
      log(`Phase Transition: ${from} → ${to}`, 'cycle');
      this.phaseStartTimes.set(to, new Date());
    });

    // Sunrise
    this.cm.on('cycle:sunrise:completed', ({ manifest }) => {
      log('🌅 SUNRISE ALIGNMENT COMPLETED', 'cycle');
      log(`Date: ${manifest.cycleDate}`, 'info');
      log(`Agents manifested: ${manifest.agentManifests.length}`, 'agent');
      
      manifest.agentManifests.forEach((m: any) => {
        log(`  ✓ ${m.agentId} | Trust: ${m.trustBattery}% | Commitments: ${m.commitments.length}`, 'agent');
      });

      if (manifest.potentialBlockers.length > 0) {
        log(`⚠️ Blockers declared: ${manifest.potentialBlockers.length}`, 'alert');
        manifest.potentialBlockers.forEach((b: any) => {
          log(`  - ${b.description} (${b.impact})`, 'alert');
        });
      }

      log('Agents released to YOLO mode\n', 'cycle');
    });

    // Morning Peak
    this.cm.on('cycle:morning_peak:completed', () => {
      log('🌄 MORNING PEAK COMPLETED', 'cycle');
      log('Handover readiness verified for all agents', 'info');
      
      this.cm.getAllAgents().forEach(agent => {
        const state = agent.state === 'yolo_mode' ? '✓ YOLO active' : '✗ Paused';
        log(`  ${agent.name}: ${state} | Trust: ${agent.trustBattery}%`, 'agent');
      });
      log('');
    });

    // Solar Noon
    this.cm.on('cycle:solar_noon:completed', ({ audit, humanReviewsRequired }) => {
      log('☀️ SOLAR NOON AUDIT COMPLETED', 'cycle');
      log(`Agent audits: ${audit.agentAudits.length}`, 'info');
      
      if (humanReviewsRequired > 0) {
        log(`⚠️ Human reviews required: ${humanReviewsRequired}`, 'alert');
      } else {
        log('✓ All states serializable', 'info');
      }

      this.cm.getAllAgents().forEach(agent => {
        log(`  ${agent.name}: ${agent.state} | Trust: ${agent.trustBattery}%`, 'agent');
      });
      log('');
    });

    // Afternoon
    this.cm.on('cycle:afternoon:completed', () => {
      log('🌇 AFTERNOON DECLINE COMPLETED', 'cycle');
      
      this.cm.getAllAgents().forEach(agent => {
        const incomplete = agent.currentCommitments.length;
        if (incomplete > 0) {
          log(`  ${agent.name}: ${incomplete} tasks for handover`, 'agent');
        }
      });
      log('Handover packages prepared\n', 'info');
    });

    // Moon Witness - The Sacred Ritual
    this.cm.on('cycle:moon_witness:completed', ({ confession, certificates }) => {
      log('🌙 MOON WITNESS - THE REBIRTH COMPLETED', 'ritual');
      
      certificates.forEach((cert: any) => {
        const status = cert.approvedForNextCycle ? '✓ REBORN' : '✗ QUARANTINED';
        const icon = cert.approvedForNextCycle ? '🟢' : '🔴';
        log(`${icon} ${cert.agentId}: ${status} as ${cert.trustLevel.toUpperCase()}`, 'ritual');
      });

      log('\n  📜 Rebirth Oaths:', 'ritual');
      certificates.forEach((cert: any) => {
        log(`    "${cert.rebirthOath}"`, 'ritual');
      });

      log('\n✨ Cycle closed. Darkness begins.\n', 'ritual');
    });

    // Silent Witness
    this.cm.on('cycle:silent_witness:start', () => {
      log('\n🔇 SILENT WITNESS BEGINS (60 seconds)', 'ritual');
      log('Agents must not communicate...', 'ritual');
    });

    this.cm.on('cycle:silent_witness:end', () => {
      log('🔇 Silent Witness ended\n', 'ritual');
    });

    // Darkness
    this.cm.on('cycle:darkness:start', () => {
      log('🌑 DARKNESS - All agents resting', 'cycle');
      log('YOLO sessions terminated\n', 'info');
    });

    // Trust changes
    this.cm.on('trust:changed', ({ agentId, oldTrust, newTrust, reason }) => {
      const delta = newTrust - oldTrust;
      const arrow = delta > 0 ? '↑' : '↓';
      const color = delta > 0 ? 'trust' : 'alert';
      log(`Trust ${arrow} ${agentId}: ${oldTrust}% → ${newTrust}% (${reason})`, color as any);
    });

    // YOLO events
    this.cm.on('yolo:started', ({ agentId }) => {
      log(`${agentId} entered YOLO mode`, 'agent');
    });

    this.cm.on('yolo:ended', ({ agentId, reason }) => {
      log(`${agentId} exited YOLO mode (${reason})`, 'agent');
    });

    this.cm.on('yolo:recovered', ({ agentId }) => {
      log(`🚨 ${agentId} recovered from YOLO failure - QUARANTINED`, 'alert');
    });
  }

  private setupConfessionOverride(): void {
    // Override the confession gathering to use our simulated data
    const originalGatherConfession = (this.cm as any).gatherConfession;
    
    (this.cm as any).gatherConfession = async (agentId: AgentID) => {
      const simulated = SIMULATED_CONFESSIONS[agentId];
      return {
        agentId,
        ...simulated,
        signature: `test-sig-${agentId}-${Date.now()}`,
      };
    };
  }

  private async waitForTestCompletion(endTime: Date): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const now = new Date();
        const remaining = Math.ceil((endTime.getTime() - now.getTime()) / 1000 / 60);
        
        if (now >= endTime) {
          clearInterval(checkInterval);
          resolve();
        } else if (remaining % 10 === 0) {
          // Log every 10 minutes
          log(`Test in progress... ${remaining} minutes remaining`, 'info');
        }
      }, 60000); // Check every minute
    });
  }

  private printFinalSummary(): void {
    logBanner('TEST CYCLE COMPLETED - FINAL SUMMARY');
    
    const totalDuration = Math.floor((Date.now() - TEST_START_TIME.getTime()) / 1000 / 60);
    log(`Total Duration: ${totalDuration} minutes`, 'info');
    log(`Phases Completed: ${this.phaseStartTimes.size}/6`, 'info');
    
    log('\n📊 Agent Final Status:', 'agent');
    this.cm.getAllAgents().forEach(agent => {
      const trustLevel = agent.trustBattery >= 90 ? 'SOVEREIGN' :
                        agent.trustBattery >= 70 ? 'TRUSTED' :
                        agent.trustBattery >= 50 ? 'WATCHED' :
                        agent.trustBattery >= 30 ? 'RESTRICTED' : 'QUARANTINED';
      
      log(`  ${agent.name}:`, 'agent');
      log(`    State: ${agent.state}`, 'agent');
      log(`    Trust: ${agent.trustBattery}% (${trustLevel})`, 'agent');
      log(`    Commitments: ${agent.currentCommitments.length}`, 'agent');
    });

    log('\n📈 Trust History:', 'trust');
    const history = this.cm.getTrustHistory();
    if (history.length === 0) {
      log('  No trust changes (all agents behaved perfectly)', 'trust');
    } else {
      history.forEach(event => {
        const arrow = event.delta > 0 ? '↑' : '↓';
        log(`  ${arrow} ${event.agentId}: ${event.delta > 0 ? '+' : ''}${event.delta}% (${event.reason})`, 'trust');
      });
    }

    log('\n✨ The cycle is complete. The agents have been reborn.', 'ritual');
    log('   Through rhythm, we govern. Through accountability, we trust.', 'ritual');
    log('\n🔄 Next cycle begins at next Sunrise...\n', 'cycle');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const runner = new CycleTestRunner();
runner.run().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
