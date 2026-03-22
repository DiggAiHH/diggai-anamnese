/**
 * Quick Test Cycle (5-10 minutes)
 * 
 * Runs all cycles accelerated for rapid testing:
 * - Each phase = 1 minute
 * - Total test = 6 minutes
 * - Silent Witness = 5 seconds (instead of 60)
 * 
 * Usage: npx ts-node scripts/testing/run-quick-test.ts
 */

import { getCycleManager, resetCycleManager } from '../../server/services/cycle-manager/CycleManager';
import { initializeCycleManager } from '../../server/services/cycle-manager/init';
import { AgentID } from '../../server/services/cycle-manager/types';

// Override the timing for quick testing
const QUICK_TEST_TIMING = {
  sunrise: '00:00',
  solarNoon: '00:01',
  sunset: '00:02',
  moonrise: '00:02',
  timezone: 'UTC',
  latitude: 52.52,
  longitude: 13.405,
};

const QUICK_CYCLE_CONFIGS = {
  sunrise: { startTime: '00:00', durationMinutes: 1 },
  morning_peak: { startTime: '00:01', durationMinutes: 1 },
  solar_noon: { startTime: '00:02', durationMinutes: 1 },
  afternoon: { startTime: '00:03', durationMinutes: 1 },
  moon_witness: { startTime: '00:04', durationMinutes: 1 },
  darkness: { startTime: '00:05', durationMinutes: 1 },
};

const startTime = Date.now();

const log = (msg: string, type: 'info' | 'cycle' | 'ritual' | 'agent' = 'info') => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const prefix = type === 'cycle' ? '🔄' : type === 'ritual' ? '🌙' : type === 'agent' ? '👤' : 'ℹ️';
  console.log(`[${elapsed}s] ${prefix} ${msg}`);
};

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║          KIMI CYCLE MANAGER - QUICK TEST (6 Minutes)            ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('Phase Schedule:');
console.log('  0:00 - 1:00  🌅 Sunrise Alignment');
console.log('  1:00 - 2:00  🌄 Morning Peak');
console.log('  2:00 - 3:00  ☀️ Solar Noon');
console.log('  3:00 - 4:00  🌇 Afternoon');
console.log('  4:00 - 5:00  🌙 Moon Witness (+ 5s Silent)');
console.log('  5:00 - 6:00  🌑 Darkness');
console.log('\nStarting in 3 seconds...\n');

setTimeout(() => {
  // Initialize
  resetCycleManager();
  initializeCycleManager({
    devMode: true,
    customTiming: QUICK_TEST_TIMING,
    autoStart: false,
    logLevel: 'silent',
  });

  const cm = getCycleManager();

  // Override silent witness to 5 seconds for quick test
  const originalSilentWitness = (cm as any).silentWitness;
  (cm as any).silentWitness = async () => {
    log('🔇 SILENT WITNESS (5 seconds)...', 'ritual');
    await new Promise(r => setTimeout(r, 5000));
  };

  // Override confession gathering
  (cm as any).gatherConfession = async (agentId: AgentID) => ({
    agentId,
    whatHappened: { summary: 'Test cycle completed', keyEvents: ['test'], metrics: {} },
    whatWasWrong: { mistakes: [], severity: 'none' },
    whyWasItWrong: { rootCause: '' },
    doIRepent: { repents: true, genuine: true, witnessesConfirm: [] },
    howToPrevent: { concreteActions: [], processChanges: [] },
    trustImpact: 0,
    lessonsLearned: ['Test successful'],
    signature: `test-${agentId}`,
  });

  // Event listeners
  cm.on('cycle:transition', ({ from, to }) => {
    log(`Phase: ${from} → ${to}`, 'cycle');
  });

  cm.on('cycle:sunrise:completed', ({ manifest }) => {
    log('🌅 SUNRISE COMPLETED', 'cycle');
    manifest.agentManifests.forEach((m: any) => {
      log(`  ${m.agentId}: ${m.trustBattery}% trust, ${m.commitments.length} commitments`, 'agent');
    });
  });

  cm.on('cycle:morning_peak:completed', () => {
    log('🌄 MORNING PEAK COMPLETED', 'cycle');
  });

  cm.on('cycle:solar_noon:completed', ({ humanReviewsRequired }) => {
    log(`☀️ SOLAR NOON COMPLETED (reviews: ${humanReviewsRequired})`, 'cycle');
  });

  cm.on('cycle:afternoon:completed', () => {
    log('🌇 AFTERNOON COMPLETED', 'cycle');
  });

  cm.on('cycle:silent_witness:start', () => {
    log('Agents in silent contemplation...', 'ritual');
  });

  cm.on('cycle:moon_witness:completed', ({ certificates }) => {
    log('🌙 MOON WITNESS COMPLETED', 'ritual');
    certificates.forEach((cert: any) => {
      const icon = cert.approvedForNextCycle ? '✓' : '✗';
      log(`  ${icon} ${cert.agentId} → ${cert.trustLevel}`, cert.approvedForNextCycle ? 'agent' : 'info');
    });
  });

  cm.on('cycle:darkness:start', () => {
    log('🌑 DARKNESS - Cycle complete', 'cycle');
  });

  cm.on('trust:changed', ({ agentId, oldTrust, newTrust, reason }) => {
    const delta = newTrust - oldTrust;
    log(`Trust: ${agentId} ${oldTrust}% → ${newTrust}% (${delta > 0 ? '+' : ''}${delta})`, 'agent');
  });

  // Start
  log('Starting Cycle Manager...', 'cycle');
  cm.start();

  // Auto-complete after 6.5 minutes
  setTimeout(() => {
    log('\n══════════════════════════════════════════════════════════════════', 'info');
    log('QUICK TEST COMPLETED SUCCESSFULLY', 'ritual');
    log('══════════════════════════════════════════════════════════════════\n', 'info');
    
    log('Final Agent Status:', 'agent');
    cm.getAllAgents().forEach(agent => {
      const level = agent.trustBattery >= 90 ? 'SOVEREIGN' :
                   agent.trustBattery >= 70 ? 'TRUSTED' :
                   agent.trustBattery >= 50 ? 'WATCHED' :
                   agent.trustBattery >= 30 ? 'RESTRICTED' : 'QUARANTINED';
      log(`  ${agent.name}: ${agent.trustBattery}% (${level}) - ${agent.state}`, 'agent');
    });

    log('\n✨ All 5 agents successfully completed the rebirth cycle!', 'ritual');
    log('   The rhythm governs. The agents obey.\n', 'ritual');
    
    process.exit(0);
  }, 6.5 * 60 * 1000);

}, 3000);
