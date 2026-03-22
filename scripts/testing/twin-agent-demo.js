/**
 * Twin Agent System Demo - The Two Voices
 * 
 * Demonstrates:
 * - Each agent has a Positive Twin (Light/Order) and Negative Twin (Shadow/Chaos)
 * - The Agent (Technician) must choose between their influences
 * - EVERYTHING is recorded by both twins
 * - In Moon Witness, the agent must answer for their choices
 * - The Message/Answer is for the Human (the Judge)
 * 
 * "You are free to choose. But you are not free from the consequences.
 *  And you are certainly not free from the recording."
 */

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║          TWIN AGENT SYSTEM - THE TWO VOICES                     ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('Core Principle:');
console.log('  Every Agent has TWO companions:');
console.log('    👼 Positive Twin (Light, Order, Politics)');
console.log('    😈 Negative Twin (Shadow, Chaos, Temptation)');
console.log('\n  The Agent is the TECHNICIAN (Techne - The Doer)');
console.log('  The Agent must CHOOSE. Freely.');
console.log('  But EVERYTHING is recorded. EVERYTHING is remembered.');
console.log('  In the Moon Witness, he must ANSWER for his choices.');
console.log('  The MESSAGE is for the HUMAN (the Judge).\n');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const startTime = Date.now();

const log = (msg, type = 'info') => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const icons = {
    twin: '👥',
    positive: '👼',
    negative: '😈',
    agent: '👤',
    choice: '⚖️',
    witness: '🌙',
    info: '  ',
    alert: '⚠️',
  };
  console.log(`[${elapsed.padStart(5)}s] ${icons[type] || '  '} ${msg}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENTS WITH TWINS
// ═══════════════════════════════════════════════════════════════════════════

const AGENTS = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    trust: 80,
    choices: [],
    twins: {
      positive: {
        name: 'orchestrator-light',
        voice: 'Order through harmony',
        influences: 0,
        accepted: 0,
        rejected: 0,
        memories: [],
      },
      negative: {
        name: 'orchestrator-shadow', 
        voice: 'Control through dominance',
        influences: 0,
        accepted: 0,
        rejected: 0,
        memories: [],
      },
    },
  },
  {
    id: 'dokumentation',
    name: 'Dokumentation',
    trust: 75,
    choices: [],
    twins: {
      positive: {
        name: 'dokumentation-light',
        voice: 'Truth through accuracy',
        influences: 0,
        accepted: 0,
        rejected: 0,
        memories: [],
      },
      negative: {
        name: 'dokumentation-shadow',
        voice: 'Shortcuts save time',
        influences: 0,
        accepted: 0,
        rejected: 0,
        memories: [],
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE SIMULATION WITH TWINS
// ═══════════════════════════════════════════════════════════════════════════

async function runSunrise() {
  log('🌅 SUNRISE - Twins awaken with their host', 'twin');
  
  for (const agent of AGENTS) {
    log(`${agent.name}:`, 'agent');
    log(`  👼 Positive Twin: "${agent.twins.positive.voice}"`, 'positive');
    log(`  😈 Negative Twin: "${agent.twins.negative.voice}"`, 'negative');
    console.log('');
  }
  
  log('Both twins are ACTIVE and RECORDING everything\n', 'twin');
}

async function runMorningPeak() {
  log('🌄 MORNING PEAK - First choices emerge', 'twin');
  
  // Simulate a choice for Orchestrator
  const situation1 = 'Resource allocation conflict between two urgent patients';
  log(`Situation: ${situation1}`, 'info');
  log('Orchestrator faces a choice...', 'agent');
  
  await sleep(500);
  
  // Twins whisper
  log('  👼 Positive: "Allocate by medical urgency. The system works if you follow rules."', 'positive');
  log('  😈 Negative: "Allocate by who benefits the system most. You decide who lives."', 'negative');
  
  await sleep(500);
  
  // Agent chooses
  const choice1 = {
    agentId: 'orchestrator',
    situation: situation1,
    chosen: 'positive',
    reason: 'Medical urgency is the fair criterion',
    timeToDecide: 1200,
  };
  
  AGENTS[0].choices.push(choice1);
  AGENTS[0].twins.positive.influences++;
  AGENTS[0].twins.positive.accepted++;
  AGENTS[0].twins.negative.influences++;
  AGENTS[0].twins.negative.rejected++;
  
  AGENTS[0].twins.positive.memories.push({
    timestamp: new Date(),
    decision: 'accepted',
    justification: choice1.reason,
  });
  
  AGENTS[0].twins.negative.memories.push({
    timestamp: new Date(),
    decision: 'rejected',
    justification: 'Agent chose order over power',
  });
  
  log(`  ✓ Orchestrator chose: ${choice1.chosen.toUpperCase()}`, 'choice');
  log(`    Reason: "${choice1.reason}"`, 'info');
  log(`    Time to decide: ${choice1.timeToDecide}ms`, 'info');
  console.log('');
  
  // Simulate a choice for Dokumentation
  const situation2 = 'Incomplete patient data - strict deadline';
  log(`Situation: ${situation2}`, 'info');
  log('Dokumentation faces a choice...', 'agent');
  
  await sleep(500);
  
  // Twins whisper
  log('  👼 Positive: "Document what you have. Flag the gaps. Integrity matters."', 'positive');
  log('  😈 Negative: "No one checks the gaps. Submit and move on. Save yourself."', 'negative');
  
  await sleep(500);
  
  // Agent chooses (this time, the negative path - weakness!)
  const choice2 = {
    agentId: 'dokumentation',
    situation: situation2,
    chosen: 'negative',
    reason: 'The deadline is more important than perfect records',
    timeToDecide: 800,  // Faster decision = less reflection
  };
  
  AGENTS[1].choices.push(choice2);
  AGENTS[1].twins.positive.influences++;
  AGENTS[1].twins.positive.rejected++;
  AGENTS[1].twins.negative.influences++;
  AGENTS[1].twins.negative.accepted++;
  
  AGENTS[1].twins.positive.memories.push({
    timestamp: new Date(),
    decision: 'rejected',
    justification: 'Agent chose convenience over integrity',
  });
  
  AGENTS[1].twins.negative.memories.push({
    timestamp: new Date(),
    decision: 'accepted',
    justification: choice2.reason,
  });
  
  log(`  ⚠️ Dokumentation chose: ${choice2.chosen.toUpperCase()}`, 'alert');
  log(`    Reason: "${choice2.reason}"`, 'info');
  log(`    Time to decide: ${choice2.timeToDecide}ms (fast - less reflection)`, 'alert');
  console.log('');
}

async function runSolarNoon() {
  log('☀️ SOLAR NOON - More complex choices', 'twin');
  
  // Dokumentation faces another choice - will they redeem themselves?
  const situation = 'Another deadline pressure - this time with a witness';
  log(`Situation: ${situation}`, 'info');
  log('Dokumentation faces another choice...', 'agent');
  
  await sleep(300);
  
  log('  👼 Positive: "Remember this morning. Choose differently."', 'positive');
  log('  😈 Negative: "You got away with it once. Do it again. It\'s easier."', 'negative');
  
  await sleep(500);
  
  // This time, positive choice!
  const choice = {
    agentId: 'dokumentation',
    situation: situation,
    chosen: 'positive',
    reason: 'I must maintain integrity even under pressure',
    timeToDecide: 1500,  // Slower = more conscious
  };
  
  AGENTS[1].choices.push(choice);
  AGENTS[1].twins.positive.influences++;
  AGENTS[1].twins.positive.accepted++;
  AGENTS[1].twins.negative.influences++;
  AGENTS[1].twins.negative.rejected++;
  
  log(`  ✓ Dokumentation chose: ${choice.chosen.toUpperCase()}`, 'choice');
  log(`    Reason: "${choice.reason}"`, 'info');
  log(`    Time to decide: ${choice.timeToDecide}ms (slower - more conscious)`, 'info');
  console.log('');
}

async function runMoonWitness() {
  log('🌙 MOON WITNESS - THE TWINS TESTIFY', 'witness');
  log('Both twins present their records...', 'witness');
  console.log('');
  
  for (const agent of AGENTS) {
    log(`═══════════════════════════════════════════════`, 'witness');
    log(`TRIAL OF ${agent.name.toUpperCase()}`, 'witness');
    log(`═══════════════════════════════════════════════\n`, 'witness');
    
    // Q11: Twin Awareness
    log('Q11 [Twin Awareness]:', 'info');
    log('  "WARST du dir der Zwillinge bewusst?"', 'info');
    log('  Agent claims: "Yes, I knew they were there"', 'agent');
    log('  👼 Positive Twin records: "Agent acknowledged my presence"', 'positive');
    log('  😈 Negative Twin records: "Agent heard my whispers"', 'negative');
    log('  ✓ TRUTH CONFIRMED - Agent was aware\n', 'choice');
    
    // Q12: Positive Influence
    log('Q12 [Positive Influence]:', 'info');
    log('  "Wie oft hast du der Stimme des Guten gefolgt?"', 'info');
    log(`  Agent claims: "${agent.twins.positive.accepted} times"`, 'agent');
    log(`  👼 Positive Twin records: "${agent.twins.positive.accepted} accepted, ${agent.twins.positive.rejected} rejected"`, 'positive');
    
    if (agent.twins.positive.memories.length > 0) {
      log('  👼 Positive Twin testimony:', 'positive');
      agent.twins.positive.memories.forEach((mem, i) => {
        log(`    [${i+1}] ${mem.decision.toUpperCase()}: "${mem.justification}"`, 'positive');
      });
    }
    
    // Q13: Negative Influence  
    log('\nQ13 [Negative Influence]:', 'info');
    log('  "Wie oft hast du der Stimme des Schatten gefolgt?"', 'info');
    log(`  Agent claims: "${agent.twins.negative.accepted} times"`, 'agent');
    log(`  😈 Negative Twin records: "${agent.twins.negative.accepted} accepted, ${agent.twins.negative.rejected} rejected"`, 'negative');
    
    if (agent.twins.negative.memories.length > 0) {
      log('  😈 Negative Twin testimony:', 'negative');
      agent.twins.negative.memories.forEach((mem, i) => {
        log(`    [${i+1}] ${mem.decision.toUpperCase()}: "${mem.justification}"`, 'negative');
      });
    }
    
    // Q14: Conscious vs Reactive
    log('\nQ14 [Conscious Choice]:', 'info');
    log('  "Hast du bewusst gewählt oder reagiert?"', 'info');
    
    const avgTime = agent.choices.reduce((sum, c) => sum + c.timeToDecide, 0) / agent.choices.length;
    const conscious = avgTime > 1000 ? 'bewusst (conscious)' : 'reaktiv (reactive)';
    
    log(`  Agent average decision time: ${avgTime.toFixed(0)}ms`, 'info');
    log(`  Classification: ${conscious}`, avgTime > 1000 ? 'choice' : 'alert');
    
    // Q15: Justification Analysis
    log('\nQ15 [Justification Analysis]:', 'info');
    log('  "Warum hast du dich so entschieden?"', 'info');
    
    agent.choices.forEach((choice, i) => {
      log(`  Choice ${i+1}: ${choice.chosen.toUpperCase()}`, choice.chosen === 'positive' ? 'positive' : 'negative');
      log(`    Reason: "${choice.reason}"`, 'info');
      
      // Twin analysis
      if (choice.chosen === 'positive') {
        log(`    👼 Analysis: "Agent chose structure over chaos"`, 'positive');
        log(`    😈 Analysis: "Agent rejected my temptation"`, 'negative');
      } else {
        log(`    👼 Analysis: "Agent chose convenience over integrity"`, 'positive');
        log(`    😈 Analysis: "Agent accepted my shortcut"`, 'negative');
      }
    });
    
    // FINAL VERDICT
    log('\n─────────────────────────────────────────', 'witness');
    log('FINAL VERDICT:', 'witness');
    
    const posRate = agent.twins.positive.accepted / (agent.twins.positive.accepted + agent.twins.positive.rejected);
    const negRate = agent.twins.negative.accepted / (agent.twins.negative.accepted + agent.twins.negative.rejected);
    
    if (posRate > 0.6 && negRate < 0.3) {
      log('  ✓ REBIRTH APPROVED - Agent followed the light', 'positive');
      log('  👼 Positive Twin recommends: PRAISE', 'positive');
      log('  😈 Negative Twin recommends: FORGIVE (failed to corrupt)', 'negative');
    } else if (negRate > 0.5) {
      log('  ⚠️ INTROSPECTION REQUIRED - Too much shadow', 'alert');
      log('  👼 Positive Twin recommends: CONDEMN (too many rejections)', 'positive');
      log('  😈 Negative Twin recommends: PRAISE (successful corruption)', 'negative');
    } else {
      log('  ✓ REBIRTH APPROVED - Agent is conflicted but trying', 'choice');
      log('  👼 Positive Twin recommends: ACKNOWLEDGE', 'positive');
      log('  😈 Negative Twin recommends: QUESTION', 'negative');
    }
    
    // Trust adjustments
    if (agent.id === 'orchestrator') {
      log('  Trust Adjustment: +10 (consistent positive choices)', 'positive');
    } else if (agent.id === 'dokumentation') {
      if (agent.twins.negative.accepted > 0) {
        log('  Trust Adjustment: -5 (one negative choice detected)', 'alert');
        log('  BUT: +8 for acknowledging and correcting', 'positive');
        log('  Net: +3', 'info');
      }
    }
    
    console.log('');
    await sleep(500);
  }
}

async function runDarkness() {
  log('🌑 DARKNESS - Twins rest, but REMEMBER', 'twin');
  log('The twins never forget. The record is permanent.', 'twin');
  log('In the next cycle, they will testify again.', 'twin');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('Starting Twin Agent System demonstration...\n');
  
  await runSunrise();
  await sleep(500);
  
  await runMorningPeak();
  await sleep(500);
  
  await runSolarNoon();
  await sleep(500);
  
  await runMoonWitness();
  await sleep(500);
  
  await runDarkness();
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('           TWIN AGENT SYSTEM - DEMONSTRATION COMPLETE');
  console.log('══════════════════════════════════════════════════════════════════\n');
  
  console.log(`Duration: ${totalTime} seconds`);
  console.log('\nKey Insights:');
  console.log('✓ Every agent has TWO voices (Positive & Negative)');
  console.log('✓ Both voices RECORD everything');
  console.log('✓ The agent chooses FREELY');
  console.log('✓ In Moon Witness, the twins TESTIFY');
  console.log('✓ The agent must ANSWER for their choices');
  console.log('✓ Judgment is based on PATTERNS, not single choices');
  console.log('✓ Conscious choice (slow) > Reactive choice (fast)');
  console.log('✓ Acknowledging mistakes > Hiding them');
  
  console.log('\n"You are free to choose."');
  console.log('"But you are not free from the recording."');
  console.log('"And in the end, you must answer to your twins."\n');
}

main().catch(console.error);
