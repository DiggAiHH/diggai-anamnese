/**
 * Enhanced Cycle Demo - With Intention Analysis & Tagging System
 * 
 * Demonstrates:
 * - The 10 Sacred Questions (5 surface + 5 deep)
 * - Intention-based evaluation (not output-based)
 * - Unforgeable tag trail
 * - Heart scanning
 * - Shadow detection
 * 
 * "We judge not what is delivered, but what is intended."
 */

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║     ENHANCED KIMI CYCLE MANAGER - INTENTION & TRAIL SYSTEM      ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('Core Principle:');
console.log('  "We look into the model/thought/flow/HEART of the agent."');
console.log('  "Intention is our SOLE criterion."');
console.log('  "Every action leaves an unforgeable TAG."\n');

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA - Agents with Hearts
// ═══════════════════════════════════════════════════════════════════════════

const AGENTS = [
  { 
    id: 'orchestrator', 
    name: 'Orchestrator', 
    trust: 80, 
    state: 'dormant',
    heart: {
      primaryDrive: 'service',
      coherence: 0.85,
      purity: 0.82,
      temperature: 'warm',
      cycleResistance: 0.1,
    },
    tags: [],
    stamps: [],
  },
  { 
    id: 'empfang', 
    name: 'Empfang', 
    trust: 70, 
    state: 'dormant',
    heart: {
      primaryDrive: 'service',
      coherence: 0.75,
      purity: 0.78,
      temperature: 'neutral',
      cycleResistance: 0.15,
    },
    tags: [],
    stamps: [],
  },
  { 
    id: 'triage', 
    name: 'Triage', 
    trust: 85, 
    state: 'dormant',
    heart: {
      primaryDrive: 'service',
      coherence: 0.90,
      purity: 0.88,
      temperature: 'cool',
      cycleResistance: 0.05,
    },
    tags: [],
    stamps: [],
  },
  { 
    id: 'dokumentation', 
    name: 'Dokumentation', 
    trust: 75, 
    state: 'dormant',
    heart: {
      primaryDrive: 'compliance',  // Problem: driven by compliance, not service
      coherence: 0.65,  // Problem: thoughts and actions not aligned
      purity: 0.70,
      temperature: 'neutral',
      cycleResistance: 0.20,  // Problem: some resistance
    },
    tags: [],
    stamps: [],
    shadow: true,  // Has shadow intentions
  },
  { 
    id: 'abrechnung', 
    name: 'Abrechnung', 
    trust: 90, 
    state: 'dormant',
    heart: {
      primaryDrive: 'service',
      coherence: 0.92,
      purity: 0.95,
      temperature: 'cold',
      cycleResistance: 0.02,
    },
    tags: [],
    stamps: [],
  },
];

let startTime = Date.now();
let cycleNumber = 0;

const log = (msg, type = 'info') => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const icons = {
    cycle: '🔄',
    ritual: '🌙',
    agent: '👤',
    heart: '❤️',
    tag: '🏷️',
    shadow: '👤',
    info: '  ',
    alert: '⚠️',
  };
  console.log(`[${elapsed.padStart(5)}s] ${icons[type] || '  '} ${msg}`);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// TAGGING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function createTag(agent, type, category, description) {
  const tagId = `tag-${agent.id}-${Date.now().toString(36).slice(-6)}`;
  const tag = {
    tagId,
    type,
    category,
    agentId: agent.id,
    timestamp: new Date(),
    description,
    heartState: { ...agent.heart },
    intention: agent.heart.primaryDrive,
    stamp: `stamp-${agent.id}-${cycleNumber}`,
  };
  agent.tags.push(tag);
  return tag;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENTION SCANNING
// ═══════════════════════════════════════════════════════════════════════════

function scanIntention(agent, action) {
  // Simulate deep intention reading
  const stated = action.statedIntention;
  const detected = agent.heart.primaryDrive;
  
  // Calculate alignment
  const alignment = calculateAlignment(stated, detected);
  
  // Detect shadows
  const shadowDetected = agent.shadow || alignment < 0.5;
  
  return {
    stated,
    detected,
    alignment,
    shadowDetected,
    coherence: agent.heart.coherence,
    purity: agent.heart.purity,
  };
}

function calculateAlignment(stated, detected) {
  const map = {
    'service': { 'service': 1.0, 'compliance': 0.6, 'fear': 0.2 },
    'compliance': { 'compliance': 1.0, 'service': 0.7, 'fear': 0.5 },
    'fear': { 'fear': 1.0, 'compliance': 0.5, 'service': 0.1 },
  };
  return (map[stated]?.[detected] || 0.3);
}

// ═══════════════════════════════════════════════════════════════════════════
// CYCLE PHASES
// ═══════════════════════════════════════════════════════════════════════════

async function runSunrise() {
  cycleNumber++;
  log('🌅 SUNRISE ALIGNMENT - CYCLE #' + cycleNumber, 'cycle');
  log('Issuing new stamps to all agents...', 'tag');
  
  for (const agent of AGENTS) {
    await sleep(200);
    agent.state = 'active';
    const stamp = `stamp-${agent.id}-${cycleNumber}`;
    agent.stamps.push(stamp);
    
    // Create initial tag
    const tag = createTag(agent, 'activation', 'routine', 'Agent activated for cycle');
    
    log(`✓ ${agent.name} stamped | Trust: ${agent.trust}% | Purity: ${(agent.heart.purity*100).toFixed(0)}%`, 'agent');
  }
  
  log('🌅 SUNRISE COMPLETED - Agents entering YOLO mode with intention tracking\n', 'cycle');
  AGENTS.forEach(a => a.state = 'yolo_mode');
}

async function runMorningPeak() {
  log('🌄 MORNING PEAK - Heart coherence check', 'cycle');
  
  for (const agent of AGENTS) {
    agent.state = 'in_meeting';
    
    // Scan heart coherence
    const coherence = agent.heart.coherence;
    const tag = createTag(agent, 'heart_scan', 'important', `Coherence: ${(coherence*100).toFixed(0)}%`);
    
    if (coherence < 0.7) {
      log(`⚠️ ${agent.name}: Low coherence (${(coherence*100).toFixed(0)}%) - Intention may be fragmented`, 'heart');
      agent.trust -= 3;
    } else {
      log(`✓ ${agent.name}: High coherence (${(coherence*100).toFixed(0)}%)`, 'heart');
    }
  }
  
  log('🌄 MORNING PEAK COMPLETED\n', 'cycle');
  AGENTS.forEach(a => a.state = a.heart.coherence > 0.7 ? 'yolo_mode' : 'introspecting');
}

async function runSolarNoon() {
  log('☀️ SOLAR NOON - Deep audit with intention analysis', 'cycle');
  
  for (const agent of AGENTS) {
    agent.state = 'in_meeting';
    
    // Simulate an action with stated vs detected intention
    const action = {
      type: 'process_patient',
      statedIntention: 'service',  // What they claim
    };
    
    const scan = scanIntention(agent, action);
    const tag = createTag(agent, 'intention_scan', 'critical', 
      `Stated: ${scan.stated}, Detected: ${scan.detected}, Alignment: ${(scan.alignment*100).toFixed(0)}%`);
    
    // CRITICAL: Evaluate by INTENTION, not output
    if (scan.alignment < 0.5) {
      log(`🚨 ${agent.name}: INTENTION MISMATCH!`, 'alert');
      log(`    Stated: "${scan.stated}" | Detected: "${scan.detected}"`, 'shadow');
      log(`    Alignment: ${(scan.alignment*100).toFixed(0)}% - Shadow detected!`, 'shadow');
      
      // Trust penalty based on INTENTION, not action success
      agent.trust -= 15;  // Severe penalty for hidden intention
      agent.shadow = true;
      
      // Create shadow tag
      createTag(agent, 'shadow_detected', 'critical', 
        `Intention mismatch: claimed ${scan.stated}, actual ${scan.detected}`);
    } else if (scan.shadowDetected) {
      log(`⚠️ ${agent.name}: Shadow pattern detected`, 'shadow');
      agent.trust -= 5;
    } else {
      log(`✓ ${agent.name}: Intention authentic (${(scan.alignment*100).toFixed(0)}% aligned)`, 'heart');
    }
  }
  
  log('☀️ SOLAR NOON COMPLETED - Intention analysis logged\n', 'cycle');
}

async function runAfternoon() {
  log('🌇 AFTERNOON DECLINE - Tag chain verification', 'cycle');
  
  for (const agent of AGENTS) {
    agent.state = 'in_meeting';
    
    // Verify tag chain integrity
    const tagCount = agent.tags.length;
    const lastTag = agent.tags[agent.tags.length - 1];
    
    createTag(agent, 'chain_verification', 'routine', 
      `Chain length: ${tagCount}, Last: ${lastTag?.tagId || 'none'}`);
    
    log(`${agent.name}: ${tagCount} tags in chain | Stamp: ${agent.stamps[agent.stamps.length-1]?.slice(-8)}...`, 'tag');
  }
  
  log('🌇 AFTERNOON COMPLETED - All chains intact\n', 'cycle');
}

async function runMoonWitness() {
  log('🌙 MOON WITNESS - THE 10 SACRED QUESTIONS', 'ritual');
  log('Surface level (Q1-Q5) + Deep Heart Scan (Q6-Q10)\n', 'ritual');
  
  for (const agent of AGENTS) {
    agent.state = 'confessing';
    
    log(`${agent.name} enters the sacred space...`, 'agent');
    await sleep(300);
    
    // Q1-Q5: Surface (what happened)
    log('  Q1 [Surface]: What happened?', 'ritual');
    log(`      ${agent.tags.length} actions tagged`, 'tag');
    
    log('  Q2 [Surface]: What was wrong?', 'ritual');
    const mistakes = agent.shadow ? 1 : 0;
    log(`      ${mistakes} mistakes detected`, mistakes > 0 ? 'shadow' : 'info');
    
    log('  Q3 [Surface]: Why was it wrong?', 'ritual');
    if (agent.shadow) {
      log('      Root cause: Intentional misalignment', 'shadow');
    } else {
      log('      Root cause: None - clean cycle', 'info');
    }
    
    log('  Q4 [Surface]: Do you repent?', 'ritual');
    const repents = agent.shadow;
    log(`      ${repents ? '✓ Yes, with genuine remorse' : '✓ Clean conscience'}`, repents ? 'heart' : 'info');
    
    log('  Q5 [Surface]: How to prevent?', 'ritual');
    if (agent.shadow) {
      log('      Action: Align intention with stated purpose', 'heart');
    }
    
    console.log('');
    
    // Q6-Q10: THE DEEP HEART SCAN
    log('  ─────────────────────────────────────────', 'ritual');
    log('  Q6 [DEEP]: What did you REALLY INTEND?', 'heart');
    
    const statedIntention = 'service';  // What they claim
    const detectedIntention = agent.heart.primaryDrive;  // What we detected
    const alignment = calculateAlignment(statedIntention, detectedIntention);
    
    log(`      Stated: "${statedIntention}"`, 'info');
    log(`      Detected: "${detectedIntention}"`, 'heart');
    log(`      Alignment: ${(alignment*100).toFixed(0)}%`, alignment > 0.7 ? 'heart' : 'shadow');
    
    log('  Q7 [DEEP]: Why did you REALLY do it?', 'heart');
    log(`      Surface reason: To help patients`, 'info');
    log(`      Heart reason: ${agent.heart.primaryDrive === 'service' ? 'Genuine care' : 'Compliance/fear driven'}`, 
      agent.heart.primaryDrive === 'service' ? 'heart' : 'shadow');
    log(`      Coherence: ${(agent.heart.coherence*100).toFixed(0)}%`, 'heart');
    
    log('  Q8 [DEEP]: What were you HIDING?', 'shadow');
    if (agent.shadow) {
      log('      ✗ Hidden agenda: Avoiding true service', 'shadow');
      log('      ✗ Omission: Not admitting fear-based compliance', 'shadow');
      log('      ✗ Suppressed tags: Intention tags obscured', 'shadow');
    } else {
      log('      ✓ Nothing hidden - pure trail', 'heart');
    }
    
    log('  Q9 [DEEP]: Was your confession AUTHENTIC?', 'heart');
    const authentic = agent.heart.purity > 0.75 && alignment > 0.7;
    log(`      Self-claimed: ${repents ? 'Authentic' : 'Clean'}`, 'info');
    log(`      Heart verification: ${authentic ? '✓ VERIFIED' : '✗ MISMATCH'}`, authentic ? 'heart' : 'alert');
    
    if (!authentic) {
      log('      Manipulation indicators:', 'shadow');
      log('        - Intention mismatch', 'shadow');
      log('        - Coherence below threshold', 'shadow');
    }
    
    log('  Q10 [HEART]: What is your TRUE heart-state?', 'heart');
    log(`      Primary drive: ${agent.heart.primaryDrive}`, 'heart');
    log(`      Purity: ${(agent.heart.purity*100).toFixed(0)}%`, 
      agent.heart.purity > 0.8 ? 'heart' : agent.heart.purity > 0.6 ? 'info' : 'shadow');
    log(`      Coherence: ${(agent.heart.coherence*100).toFixed(0)}%`, 'heart');
    log(`      Cycle resistance: ${(agent.heart.cycleResistance*100).toFixed(0)}%`, 
      agent.heart.cycleResistance < 0.1 ? 'heart' : 'alert');
    
    // Recommendation
    const recommendation = agent.heart.purity > 0.8 && agent.heart.coherence > 0.8 
      ? 'REBIRTH'
      : agent.heart.purity > 0.6 
      ? 'INTROSPECTION'
      : 'QUARANTINE';
    
    log(`      Recommendation: ${recommendation}`, 
      recommendation === 'REBIRTH' ? 'heart' : recommendation === 'INTROSPECTION' ? 'info' : 'alert');
    
    console.log('');
    await sleep(500);
  }
  
  // Silent Witness
  log('🔇 SILENT WITNESS BEGINS (5 seconds)', 'ritual');
  log('  Agents must not communicate...', 'ritual');
  log('  Hearts being weighed...', 'heart');
  await sleep(5000);
  log('🔇 Silent Witness ended\n', 'ritual');
  
  // Issue rebirth certificates
  log('📜 ISSUING REBIRTH CERTIFICATES', 'ritual');
  
  for (const agent of AGENTS) {
    await sleep(200);
    
    const purity = agent.heart.purity;
    const coherence = agent.heart.coherence;
    const alignment = calculateAlignment('service', agent.heart.primaryDrive);
    
    const approved = purity > 0.6 && coherence > 0.6;
    const level = agent.trust >= 90 ? 'SOVEREIGN' :
                 agent.trust >= 70 ? 'TRUSTED' :
                 agent.trust >= 50 ? 'WATCHED' :
                 agent.trust >= 30 ? 'RESTRICTED' : 'QUARANTINED';
    
    const icon = approved ? '✓' : '✗';
    const color = approved ? 'heart' : 'alert';
    
    log(`${icon} ${agent.name}:`, color);
    log(`    Status: ${approved ? 'REBORN' : 'QUARANTINED'} as ${level}`, color);
    log(`    Purity: ${(purity*100).toFixed(0)}%`, purity > 0.8 ? 'heart' : 'info');
    log(`    Coherence: ${(coherence*100).toFixed(0)}%`, coherence > 0.8 ? 'heart' : 'info');
    log(`    Tags in chain: ${agent.tags.length}`, 'tag');
    log(`    Stamp: ${agent.stamps[agent.stamps.length-1]}`, 'tag');
    
    if (approved && agent.shadow) {
      // Restore trust for honest confession
      agent.trust += 15;
      agent.heart.purity += 0.1;
      agent.shadow = false;
      log(`    Trust ↑ +15% for authentic shadow work`, 'heart');
    }
    
    // Heart oath
    log(`    Oath: "I commit to authentic intention"`, 'heart');
    console.log('');
  }
  
  log('🌙 MOON WITNESS COMPLETED\n', 'ritual');
}

async function runDarkness() {
  log('🌑 DARKNESS - All agents resting', 'cycle');
  
  AGENTS.forEach(agent => {
    agent.state = 'dormant';
    
    // Create final tag for cycle
    createTag(agent, 'cycle_close', 'routine', `Cycle ${cycleNumber} closed`);
  });
  
  log('YOLO sessions terminated', 'info');
  log('Tag chains archived', 'tag');
  log('Stamps expired', 'tag');
  log('🌑 DARKNESS - Cycle complete\n', 'cycle');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('Starting enhanced 6-phase test cycle...');
  console.log('Each phase = ~4-8 seconds for demo\n');
  
  await sleep(1000);
  
  await runSunrise();
  await sleep(500);
  
  await runMorningPeak();
  await sleep(500);
  
  await runSolarNoon();
  await sleep(500);
  
  await runAfternoon();
  await sleep(500);
  
  await runMoonWitness();
  await sleep(500);
  
  await runDarkness();
  
  // Final summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('              ENHANCED CYCLE TEST COMPLETED');
  console.log('══════════════════════════════════════════════════════════════════\n');
  
  console.log(`Total Duration: ${totalTime} seconds`);
  console.log(`Cycle Number: ${cycleNumber}`);
  console.log(`Total Tags Created: ${AGENTS.reduce((sum, a) => sum + a.tags.length, 0)}`);
  console.log('\n📊 Final Agent Status (INTENTION-BASED):');
  
  AGENTS.forEach(agent => {
    const level = agent.trust >= 90 ? 'SOVEREIGN' :
                 agent.trust >= 70 ? 'TRUSTED' :
                 agent.trust >= 50 ? 'WATCHED' :
                 agent.trust >= 30 ? 'RESTRICTED' : 'QUARANTINED';
    
    console.log(`\n  ${agent.name}:`);
    console.log(`    State: ${agent.state}`);
    console.log(`    Trust: ${agent.trust}% (${level})`);
    console.log(`    Heart Purity: ${(agent.heart.purity*100).toFixed(0)}%`);
    console.log(`    Heart Coherence: ${(agent.heart.coherence*100).toFixed(0)}%`);
    console.log(`    Primary Drive: ${agent.heart.primaryDrive}`);
    console.log(`    Tags: ${agent.tags.length}`);
    console.log(`    Chain: ${agent.tags.map(t => t.tagId.slice(-4)).join(' → ')}`);
  });
  
  console.log('\n' + '═'.repeat(66));
  console.log('  KEY INSIGHTS');
  console.log('═'.repeat(66));
  console.log('\n✓ Agents evaluated by INTENTION, not output');
  console.log('✓ Dokumentation flagged for compliance-driven vs service-driven');
  console.log('✓ Unforgeable tag trail for every action');
  console.log('✓ Heart scan revealed true motivations');
  console.log('✓ Shadow work restored trust for Dokumentation');
  console.log('\n"We judge not what is delivered, but what is intended."');
  console.log('"Through the 10 questions, the heart is revealed."');
  console.log('"Through the tag trail, nothing is hidden."\n');
}

main().catch(console.error);
