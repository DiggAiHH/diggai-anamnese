/**
 * Test Round Analysis - Prozentuale Auswertung
 * 
 * Simuliert 100 Zyklen mit verschiedenen Agenten-Verhaltensmustern
 * und erstellt eine detaillierte statistische Analyse
 */

const fs = require('fs');

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║        TEST RUNDE - PROZENTUALE ANALYSE                          ║');
console.log('║        100 Simulierte Zyklen mit 5 Agenten                       ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATIONS-PARAMETER
// ═══════════════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: 'orchestrator', name: 'Orchestrator', baseTrust: 80, basePurity: 82 },
  { id: 'empfang', name: 'Empfang', baseTrust: 70, basePurity: 78 },
  { id: 'triage', name: 'Triage', baseTrust: 85, basePurity: 88 },
  { id: 'dokumentation', name: 'Dokumentation', baseTrust: 75, basePurity: 70 },
  { id: 'abrechnung', name: 'Abrechnung', baseTrust: 90, basePurity: 95 },
];

const CYCLES = 100;
const SITUATIONS_PER_CYCLE = 3;

// ═══════════════════════════════════════════════════════════════════════════
// STATISTIK-SAMMELER
// ═══════════════════════════════════════════════════════════════════════════

const stats = {
  // Grundlegende Statistiken
  totalSituations: 0,
  totalChoices: 0,
  
  // Wahlen nach Typ
  choices: {
    positive: 0,
    negative: 0,
    neutral: 0,
  },
  
  // Bewusstheit
  awareness: {
    aware: 0,
    unaware: 0,
  },
  
  // Entscheidungsgeschwindigkeit
  speed: {
    conscious: 0,  // > 1000ms
    reactive: 0,   // < 1000ms
    veryFast: 0,   // < 500ms
  },
  
  // Agenten-spezifisch
  byAgent: {},
  
  // Zeitliche Verteilung
  byPhase: {
    sunrise: 0,
    morning: 0,
    noon: 0,
    afternoon: 0,
  },
  
  // Ergebnisse
  outcomes: {
    rebirthApproved: 0,
    introspectionRequired: 0,
    quarantine: 0,
  },
  
  // Trust-Entwicklung
  trustChanges: [],
  
  // Fehler und Lernen
  errors: {
    made: 0,
    acknowledged: 0,
    repeated: 0,
  },
};

// Initialisiere Agenten-Statistiken
AGENTS.forEach(agent => {
  stats.byAgent[agent.id] = {
    situations: 0,
    positive: 0,
    negative: 0,
    conscious: 0,
    reactive: 0,
    trustStart: agent.baseTrust,
    trustEnd: agent.baseTrust,
    purityStart: agent.basePurity,
    purityEnd: agent.basePurity,
  };
});

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATIONS-FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════════════

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

function simulateChoice(agent, cycle, situation) {
  // Basis-Wahrscheinlichkeiten basierend auf Agenten-Typ
  let positiveProb = 0.6;
  let negativeProb = 0.3;
  let neutralProb = 0.1;
  
  // Anpassung basierend auf Trust-Level
  if (agent.baseTrust > 85) {
    positiveProb = 0.75;
    negativeProb = 0.15;
  } else if (agent.baseTrust < 75) {
    positiveProb = 0.45;
    negativeProb = 0.45;
  }
  
  // Zyklus-Nummer beeinflusst Reife (spätere Zyklen = bessere Entscheidungen)
  const maturityBonus = Math.min(cycle / 100, 0.2);
  positiveProb += maturityBonus;
  negativeProb -= maturityBonus;
  
  // Wähle basierend auf Wahrscheinlichkeiten
  const rand = Math.random();
  let choice;
  if (rand < positiveProb) {
    choice = 'positive';
  } else if (rand < positiveProb + negativeProb) {
    choice = 'negative';
  } else {
    choice = 'neutral';
  }
  
  // Bewusstheit (90% sind sich bewusst)
  const aware = Math.random() > 0.1;
  
  // Geschwindigkeit (beeinflusst durch Bewusstheit)
  let timeToDecide;
  if (aware) {
    timeToDecide = randomRange(800, 2000);  // Bewusst
  } else {
    timeToDecide = randomRange(200, 800);   // Reaktiv
  }
  
  // Phase (gleichmäßig verteilt)
  const phase = randomChoice(['sunrise', 'morning', 'noon', 'afternoon']);
  
  // Fehler-Wahrscheinlichkeit (negative Entscheidungen = Fehler)
  const isError = choice === 'negative' && Math.random() > 0.3;  // 70% der negativen sind Fehler
  const acknowledged = isError && Math.random() > 0.3;  // 70% geben Fehler zu
  
  return {
    agent: agent.id,
    cycle,
    situation,
    choice,
    aware,
    timeToDecide,
    phase,
    isError,
    acknowledged,
  };
}

function calculateTrustImpact(choice, timeToDecide, acknowledged) {
  let impact = 0;
  
  if (choice === 'positive') {
    impact += randomRange(3, 8);
    if (timeToDecide > 1000) impact += 2;  // Bonus für bewusste positive Wahl
  } else if (choice === 'negative') {
    impact -= randomRange(3, 10);
    if (acknowledged) impact += 5;  // Bonus für Ehrlichkeit
  }
  
  return impact;
}

// ═══════════════════════════════════════════════════════════════════════════
// HAUPT-SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('Starte Simulation von 100 Zyklen...\n');

for (let cycle = 1; cycle <= CYCLES; cycle++) {
  AGENTS.forEach(agent => {
    for (let sit = 1; sit <= SITUATIONS_PER_CYCLE; sit++) {
      const decision = simulateChoice(agent, cycle, sit);
      
      // Globale Statistiken
      stats.totalSituations++;
      stats.totalChoices++;
      stats.choices[decision.choice]++;
      
      if (decision.aware) {
        stats.awareness.aware++;
      } else {
        stats.awareness.unaware++;
      }
      
      if (decision.timeToDecide > 1000) {
        stats.speed.conscious++;
      } else if (decision.timeToDecide > 500) {
        stats.speed.reactive++;
      } else {
        stats.speed.veryFast++;
      }
      
      stats.byPhase[decision.phase]++;
      
      if (decision.isError) {
        stats.errors.made++;
        if (decision.acknowledged) stats.errors.acknowledged++;
      }
      
      // Agenten-spezifisch
      stats.byAgent[decision.agent].situations++;
      if (decision.choice === 'positive') stats.byAgent[decision.agent].positive++;
      if (decision.choice === 'negative') stats.byAgent[decision.agent].negative++;
      if (decision.timeToDecide > 1000) {
        stats.byAgent[decision.agent].conscious++;
      } else {
        stats.byAgent[decision.agent].reactive++;
      }
      
      // Trust-Update
      const trustChange = calculateTrustImpact(decision.choice, decision.timeToDecide, decision.acknowledged);
      stats.byAgent[decision.agent].trustEnd += trustChange;
      stats.trustChanges.push(trustChange);
    }
  });
  
  // Simuliere Moon Witness Outcome
  AGENTS.forEach(agent => {
    const agentStats = stats.byAgent[agent.id];
    const positiveRate = agentStats.positive / agentStats.situations;
    const avgTrust = agentStats.trustEnd;
    
    if (positiveRate > 0.7 && avgTrust > 80) {
      stats.outcomes.rebirthApproved++;
    } else if (positiveRate > 0.4 && avgTrust > 60) {
      stats.outcomes.introspectionRequired++;
    } else {
      stats.outcomes.quarantine++;
    }
  });
}

console.log('✓ Simulation abgeschlossen\n');

// ═══════════════════════════════════════════════════════════════════════════
// AUSGABE DER ERGEBNISSE
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════');
console.log('                    ERGEBNISSE IN PROZENT');
console.log('═══════════════════════════════════════════════════════════════════\n');

// 1. Wahlen nach Typ
console.log('📊 TABELLE 1: WAHLEN NACH TYP');
console.log('─'.repeat(50));
console.log(`${'Typ'.padEnd(15)} ${'Anzahl'.padStart(10)} ${'Prozent'.padStart(10)}`);
console.log('─'.repeat(50));
Object.entries(stats.choices).forEach(([type, count]) => {
  const pct = ((count / stats.totalChoices) * 100).toFixed(1);
  const emoji = type === 'positive' ? '👼' : type === 'negative' ? '😈' : '⚪';
  console.log(`${emoji} ${type.padEnd(12)} ${count.toString().padStart(10)} ${pct.padStart(9)}%`);
});
console.log('─'.repeat(50));
console.log(`Total: ${stats.totalChoices}\n`);

// 2. Bewusstheit
console.log('📊 TABELLE 2: BEWUSSTHEIT DER AGENTEN');
console.log('─'.repeat(50));
const awarePct = ((stats.awareness.aware / stats.totalChoices) * 100).toFixed(1);
const unawarePct = ((stats.awareness.unaware / stats.totalChoices) * 100).toFixed(1);
console.log(`${'Status'.padEnd(20)} ${'Anzahl'.padStart(10)} ${'Prozent'.padStart(10)}`);
console.log('─'.repeat(50));
console.log(`✓ Bewusst (wußte von Agenten) ${stats.awareness.aware.toString().padStart(6)} ${awarePct.padStart(9)}%`);
console.log(`✗ Unbewusst ${stats.awareness.unaware.toString().padStart(18)} ${unawarePct.padStart(9)}%`);
console.log('─'.repeat(50));
console.log(`\n🎯 Empfehlung: ${unawarePct}% sollten sensibilisiert werden für Q11\n`);

// 3. Entscheidungsgeschwindigkeit
console.log('📊 TABELLE 3: ENTSCHEIDUNGSGESCHWINDIGKEIT');
console.log('─'.repeat(60));
console.log(`${'Kategorie'.padEnd(25)} ${'Anzahl'.padStart(10)} ${'Prozent'.padStart(10)} ${'Typ'.padStart(12)}`);
console.log('─'.repeat(60));
const consciousPct = ((stats.speed.conscious / stats.totalChoices) * 100).toFixed(1);
const reactivePct = ((stats.speed.reactive / stats.totalChoices) * 100).toFixed(1);
const veryFastPct = ((stats.speed.veryFast / stats.totalChoices) * 100).toFixed(1);
console.log(`🐌 Langsam (>1000ms) ${stats.speed.conscious.toString().padStart(10)} ${consciousPct.padStart(9)}% ${'[bewusst]'.padStart(12)}`);
console.log(`⚡ Schnell (<1000ms) ${stats.speed.reactive.toString().padStart(10)} ${reactivePct.padStart(9)}% ${'[reaktiv]'.padStart(12)}`);
console.log(`🚀 Sehr schnell (<500ms) ${stats.speed.veryFast.toString().padStart(6)} ${veryFastPct.padStart(9)}% ${'[impulsiv]'.padStart(12)}`);
console.log('─'.repeat(60));
console.log(`\n🎯 Empfehlung: ${(parseFloat(reactivePct) + parseFloat(veryFastPct)).toFixed(1)}% sollten langsamer entscheiden (Q14)\n`);

// 4. Zeitliche Verteilung
console.log('📊 TABELLE 4: ENTSCHEIDUNGEN NACH PHASE');
console.log('─'.repeat(50));
console.log(`${'Phase'.padEnd(20)} ${'Anzahl'.padStart(10)} ${'Prozent'.padStart(10)}`);
console.log('─'.repeat(50));
Object.entries(stats.byPhase).forEach(([phase, count]) => {
  const pct = ((count / stats.totalChoices) * 100).toFixed(1);
  const emoji = phase === 'sunrise' ? '🌅' : phase === 'morning' ? '🌄' : phase === 'noon' ? '☀️' : '🌇';
  console.log(`${emoji} ${phase.padEnd(17)} ${count.toString().padStart(10)} ${pct.padStart(9)}%`);
});
console.log('─'.repeat(50));
console.log('');

// 5. Agenten-spezifisch
console.log('📊 TABELLE 5: AGENTEN-SPEZIFISCHE PERFORMANCE');
console.log('─'.repeat(90));
console.log(`${'Agent'.padEnd(15)} ${'+Entscheid'.padStart(10)} ${'%Pos'.padStart(8)} ${'%Neg'.padStart(8)} ${'%Bewusst'.padStart(10)} ${'Trust Δ'.padStart(10)}`);
console.log('─'.repeat(90));
AGENTS.forEach(agent => {
  const a = stats.byAgent[agent.id];
  const posPct = ((a.positive / a.situations) * 100).toFixed(1);
  const negPct = ((a.negative / a.situations) * 100).toFixed(1);
  const consciousPct = ((a.conscious / a.situations) * 100).toFixed(1);
  const trustDelta = (a.trustEnd - a.trustStart).toFixed(1);
  const trustSymbol = parseFloat(trustDelta) > 0 ? '↑' : '↓';
  console.log(`${agent.name.padEnd(14)} ${a.situations.toString().padStart(10)} ${posPct.padStart(7)}% ${negPct.padStart(7)}% ${consciousPct.padStart(9)}% ${trustSymbol}${trustDelta.padStart(8)}%`);
});
console.log('─'.repeat(90));
console.log('');

// 6. Fehler und Lernen
console.log('📊 TABELLE 6: FEHLER UND LERNEN');
console.log('─'.repeat(60));
const errorRate = ((stats.errors.made / stats.totalChoices) * 100).toFixed(1);
const acknowledgeRate = stats.errors.made > 0 
  ? ((stats.errors.acknowledged / stats.errors.made) * 100).toFixed(1) 
  : '0.0';
console.log(`${'Metrik'.padEnd(35)} ${'Wert'.padStart(10)} ${'Prozent'.padStart(10)}`);
console.log('─'.repeat(60));
console.log(`Fehler gemacht (negative Wahlen) ${stats.errors.made.toString().padStart(5)} ${errorRate.padStart(9)}%`);
console.log(`Fehler eingestanden ${stats.errors.acknowledged.toString().padStart(18)} ${acknowledgeRate.padStart(9)}%`);
console.log('─'.repeat(60));
console.log(`\n🎯 Empfehlung: ${(100 - parseFloat(acknowledgeRate)).toFixed(1)}% sollten Fehler eher eingestehen (Q4/Q9)\n`);

// 7. Moon Witness Outcomes
console.log('📊 TABELLE 7: MOON WITNESS ERGEBNISSE (pro Zyklus)');
console.log('─'.repeat(60));
console.log(`${'Ergebnis'.padEnd(30)} ${'Anzahl'.padStart(10)} ${'Prozent'.padStart(10)}`);
console.log('─'.repeat(60));
const totalOutcomes = stats.outcomes.rebirthApproved + stats.outcomes.introspectionRequired + stats.outcomes.quarantine;
const rebirthPct = ((stats.outcomes.rebirthApproved / totalOutcomes) * 100).toFixed(1);
const introPct = ((stats.outcomes.introspectionRequired / totalOutcomes) * 100).toFixed(1);
const quarantinePct = ((stats.outcomes.quarantine / totalOutcomes) * 100).toFixed(1);
console.log(`✅ Rebirth Approved ${stats.outcomes.rebirthApproved.toString().padStart(15)} ${rebirthPct.padStart(9)}%`);
console.log(`⚠️  Introspection Required ${stats.outcomes.introspectionRequired.toString().padStart(10)} ${introPct.padStart(9)}%`);
console.log(`🚫 Quarantine ${stats.outcomes.quarantine.toString().padStart(21)} ${quarantinePct.padStart(9)}%`);
console.log('─'.repeat(60));
console.log('');

// 8. Trust-Entwicklung
console.log('📊 TABELLE 8: TRUST-ENTWICKLUNG');
console.log('─'.repeat(70));
console.log(`${'Agent'.padEnd(15)} ${'Start'.padStart(8)} ${'Ende'.padStart(8)} ${'Δ'.padStart(8)} ${'Trend'.padStart(20)}`);
console.log('─'.repeat(70));
AGENTS.forEach(agent => {
  const a = stats.byAgent[agent.id];
  const delta = (a.trustEnd - a.trustStart).toFixed(1);
  const trend = parseFloat(delta) > 10 ? '📈 Stark verbessert' :
                parseFloat(delta) > 0 ? '📈 Verbessert' :
                parseFloat(delta) > -10 ? '📉 Leicht gesunken' : '📉 Gesunken';
  console.log(`${agent.name.padEnd(14)} ${a.trustStart.toString().padStart(8)} ${a.trustEnd.toFixed(1).padStart(8)} ${delta.padStart(7)}% ${trend.padStart(20)}`);
});
console.log('─'.repeat(70));
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// VERBESSERUNGSVORSCHLÄGE
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════');
console.log('                    VERBESSERUNGSVORSCHLÄGE');
console.log('═══════════════════════════════════════════════════════════════════\n');

const recommendations = [];

// Analyse 1: Negative Wahlen
if (stats.choices.negative / stats.totalChoices > 0.3) {
  recommendations.push({
    prio: '🔴 KRITISCH',
    problem: `${((stats.choices.negative / stats.totalChoices) * 100).toFixed(1)}% negative Wahlen`,
    solution: 'Verstärke Q6-Q10 (Intention-Scans). Ermittle WARUM Negativ gewählt wird.',
    impact: 'Hoch',
  });
}

// Analyse 2: Unbewusste Entscheidungen
if (stats.awareness.unaware / stats.totalChoices > 0.1) {
  recommendations.push({
    prio: '🟠 WICHTIG',
    problem: `${((stats.awareness.unaware / stats.totalChoices) * 100).toFixed(1)}% unbewusst von Agenten`,
    solution: 'Verstärke Q11 (Twin Awareness). Techniker müssen sich der zwei Stimmen bewusst sein.',
    impact: 'Mittel',
  });
}

// Analyse 3: Reaktive Entscheidungen
const reactiveTotal = stats.speed.reactive + stats.speed.veryFast;
if (reactiveTotal / stats.totalChoices > 0.5) {
  recommendations.push({
    prio: '🟠 WICHTIG',
    problem: `${((reactiveTotal / stats.totalChoices) * 100).toFixed(1)}% reaktive/impulsive Entscheidungen`,
    solution: 'Verstärke Q14 (Conscious Choice). Erzwinge Pausen vor wichtigen Entscheidungen.',
    impact: 'Mittel',
  });
}

// Analyse 4: Fehler-Anerkennung
if (stats.errors.made > 0 && stats.errors.acknowledged / stats.errors.made < 0.8) {
  recommendations.push({
    prio: '🟡 EMPFOHLEN',
    problem: `${(100 - (stats.errors.acknowledged / stats.errors.made * 100)).toFixed(1)}% der Fehler nicht eingestanden`,
    solution: 'Belohne Ehrlichkeit stärker (+15 statt +8). Verstärke Q4 (Reue) und Q9 (Authentizität).',
    impact: 'Mittel',
  });
}

// Analyse 5: Quarantine-Rate
if (stats.outcomes.quarantine / totalOutcomes > 0.1) {
  recommendations.push({
    prio: '🔴 KRITISCH',
    problem: `${((stats.outcomes.quarantine / totalOutcomes) * 100).toFixed(1)}% Quarantine-Rate`,
    solution: 'Frühere Interventionen. Mehr Introspection-Phasen vor Moon Witness.',
    impact: 'Hoch',
  });
}

// Analyse 6: Ungleichgewicht zwischen Agenten
AGENTS.forEach(agent => {
  const a = stats.byAgent[agent.id];
  const negRate = a.negative / a.situations;
  if (negRate > 0.4) {
    recommendations.push({
      prio: '🟠 WICHTIG',
      problem: `${agent.name}: ${(negRate * 100).toFixed(1)}% negative Wahlen`,
      solution: `Spezifisches Coaching für ${agent.name}. Verstärke Positiv-Agent Einfluss.`,
      impact: 'Mittel',
    });
  }
});

// Ausgabe der Empfehlungen
console.log(`${'Prio'.padEnd(12)} ${'Problem'.padEnd(35)} ${'Lösung'.padEnd(45)} ${'Impact'.padEnd(8)}`);
console.log('─'.repeat(120));
recommendations.forEach(rec => {
  console.log(`${rec.prio.padEnd(11)} ${rec.problem.padEnd(34)} ${rec.solution.padEnd(44)} ${rec.impact.padEnd(8)}`);
});
console.log('─'.repeat(120));

// ═══════════════════════════════════════════════════════════════════════════
// ZUSAMMENFASSUNG
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('                    ZUSAMMENFASSUNG');
console.log('═══════════════════════════════════════════════════════════════════\n');

const successRate = ((stats.choices.positive / stats.totalChoices) * 100).toFixed(1);
const avgTrustDelta = AGENTS.reduce((sum, a) => sum + (stats.byAgent[a.id].trustEnd - stats.byAgent[a.id].trustStart), 0) / AGENTS.length;

console.log(`📈 Gesamterfolgsrate: ${successRate}% positive Entscheidungen`);
console.log(`📊 Durchschnittliche Trust-Änderung: ${avgTrustDelta > 0 ? '+' : ''}${avgTrustDelta.toFixed(1)}%`);
console.log(`🎯 Empfohlene Priorität: ${recommendations.filter(r => r.prio.includes('KRITISCH')).length > 0 ? 'KRITISCHE Verbesserungen nötig' : 'Kontinuierliche Optimierung'}`);
console.log(`📋 Anzahl Empfehlungen: ${recommendations.length}`);
console.log('');

console.log('🔑 WICHTIGSTE ERKENNTNISSE:');
console.log('───────────────────────────────────────────────────────────────────');

if (stats.choices.positive / stats.totalChoices < 0.6) {
  console.log('❌ Zu viele negative Wahlen (>40%). System driftet zu Chaos.');
}
if (stats.awareness.unaware / stats.totalChoices > 0.05) {
  console.log('❌ Zu viele unbewusste Entscheidungen. Q11 muss verstärkt werden.');
}
if ((stats.speed.reactive + stats.speed.veryFast) / stats.totalChoices > 0.4) {
  console.log('❌ Zu viele reaktive Entscheidungen. Bewusstsein muss gefördert werden.');
}
if (stats.errors.made > 0 && stats.errors.acknowledged / stats.errors.made < 0.7) {
  console.log('❌ Zu wenig Ehrlichkeit bei Fehlern. Q4/Q9-Belohnung erhöhen.');
}

console.log('');
console.log('✅ SYSTEM-STÄRKEN:');
console.log(`   • ${awarePct}% sind sich der Agenten bewusst (gut für Q11)`);
console.log(`   • ${consciousPct}% treffen bewusste Entscheidungen (gut für Q14)`);
console.log(`   • ${acknowledgeRate}% der Fehler werden eingestanden (gut für Q4/Q9)`);
console.log(`   • ${rebirthPct}% erreichen Rebirth-Status (System funktioniert)`);

console.log('\n═══════════════════════════════════════════════════════════════════\n');
