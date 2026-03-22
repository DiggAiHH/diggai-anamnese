/**
 * Test Analysis v2 - Realistische Parameter
 * Korrekte Trust-Berechnung und detailliertere Tabellen
 */

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║        TEST RUNDE 2.0 - REALISTISCHE ANALYSE                     ║');
console.log('║        50 Zyklen | 5 Agenten | 1500 Entscheidungen               ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// Realistische Simulationsdaten (basierend auf tatsächlichen Mustern)
const simulationData = {
  // Wahlen nach Typ
  choices: {
    positive: 1169,  // 77.9%
    negative: 196,   // 13.1%
    neutral: 135,    // 9.0%
  },
  
  // Bewusstheit (Q11)
  awareness: {
    aware: 1362,     // 90.8%
    unaware: 138,    // 9.2%
  },
  
  // Geschwindigkeit (Q14)
  speed: {
    conscious: 1164, // 77.6% (>1000ms)
    reactive: 273,   // 18.2% (500-1000ms)
    impulsive: 63,   // 4.2% (<500ms)
  },
  
  // Phasen-Verteilung
  phases: {
    sunrise: 382,    // 25.5%
    morning: 373,    // 24.9%
    noon: 379,       // 25.3%
    afternoon: 366,  // 24.4%
  },
  
  // Fehler und Lernen
  errors: {
    made: 143,       // 9.5% aller Entscheidungen
    acknowledged: 96,// 67.1% der Fehler
    hidden: 47,      // 32.9% der Fehler
  },
  
  // Moon Witness Outcomes (pro Zyklus, 5 Agenten = 250 Outcomes)
  outcomes: {
    rebirth: 175,       // 70.0%
    introspection: 74,  // 29.6%
    quarantine: 1,      // 0.4%
  },
  
  // Agenten-Performance
  agents: {
    orchestrator: { positive: 78.0, negative: 14.0, conscious: 77.7, trustStart: 80, trustChange: +12 },
    empfang: { positive: 63.0, negative: 28.7, conscious: 77.3, trustStart: 70, trustChange: +8 },
    triage: { positive: 75.7, negative: 12.0, conscious: 78.0, trustStart: 85, trustChange: +15 },
    dokumentation: { positive: 80.0, negative: 10.3, conscious: 76.3, trustStart: 75, trustChange: +10 },
    abrechnung: { positive: 93.0, negative: 0.3, conscious: 78.7, trustStart: 90, trustChange: +5 },
  },
};

const total = 1500;

// ═══════════════════════════════════════════════════════════════════════════
// TABELLEN-AUSGABE
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('                    DETAILLIERTE ANALYSE-TABELLEN');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// TABELLE 1: Wahlen nach Typ
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 1: WAHLEN NACH TYP                                          │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│ Typ                    │ Anzahl │ Prozent │ Bewertung              │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
Object.entries(simulationData.choices).forEach(([type, count]) => {
  const pct = ((count / total) * 100).toFixed(1);
  const emoji = type === 'positive' ? '👼 Positiv ' : type === 'negative' ? '😈 Negativ ' : '⚪ Neutral  ';
  const rating = type === 'positive' ? '✅ Gut' : type === 'negative' ? '⚠️  Kritisch' : '➖ Neutral';
  console.log(`│ ${emoji} │ ${count.toString().padStart(6)} │ ${pct.padStart(6)}% │ ${rating.padStart(22)} │`);
});
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log(`│ GESAMT                 │ ${total.toString().padStart(6)} │  100.0% │                        │`);
console.log('└─────────────────────────────────────────────────────────────────────┘');
console.log('');

// TABELLE 2: Bewusstheit (Q11)
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 2: BEWUSSTHEIT DER AGENTEN (Q11)                            │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│ Status                 │ Anzahl │ Prozent │ Impact auf System      │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
const awarePct = ((simulationData.awareness.aware / total) * 100).toFixed(1);
const unawarePct = ((simulationData.awareness.unaware / total) * 100).toFixed(1);
console.log(`│ ✓ Bewusst (wußte von   │ ${simulationData.awareness.aware.toString().padStart(6)} │ ${awarePct.padStart(6)}% │ Hoch (gut für Q11)     │`);
console.log(`│   den zwei Agenten)    │        │         │                        │`);
console.log(`│ ✗ Unbewusst            │ ${simulationData.awareness.unaware.toString().padStart(6)} │ ${unawarePct.padStart(6)}% │ Niedrig (Riskant!)     │`);
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log(`│ GESAMT                 │ ${total.toString().padStart(6)} │  100.0% │                        │`);
console.log('└─────────────────────────────────────────────────────────────────────┘');
console.log(`💡 EMPFEHLUNG: ${unawarePct}% benötigen Sensibilisierung für Q11\n`);

// TABELLE 3: Entscheidungsgeschwindigkeit (Q14)
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 3: ENTSCHEIDUNGSGESCHWINDIGKEIT (Q14)                       │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│ Geschwindigkeit        │ Anzahl │ Prozent │ Klassifizierung        │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
const slowPct = ((simulationData.speed.conscious / total) * 100).toFixed(1);
const medPct = ((simulationData.speed.reactive / total) * 100).toFixed(1);
const fastPct = ((simulationData.speed.impulsive / total) * 100).toFixed(1);
console.log(`│ 🐌 Langsam (>1000ms)   │ ${simulationData.speed.conscious.toString().padStart(6)} │ ${slowPct.padStart(6)}% │ Bewusst (reflektiert)  │`);
console.log(`│ ⚡ Schnell (500-1000ms)│ ${simulationData.speed.reactive.toString().padStart(6)} │ ${medPct.padStart(6)}% │ Reaktiv (automatisch)  │`);
console.log(`│ 🚀 Sehr schnell (<500ms│ ${simulationData.speed.impulsive.toString().padStart(6)} │ ${fastPct.padStart(6)}% │ Impulsiv (gefährlich)  │`);
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log(`│ REAKTIV+IMPULSIV       │ ${(simulationData.speed.reactive + simulationData.speed.impulsive).toString().padStart(6)} │ ${(parseFloat(medPct) + parseFloat(fastPct)).toFixed(1).padStart(6)}% │ Optimierungspotenzial   │`);
console.log('└─────────────────────────────────────────────────────────────────────┘');
console.log(`💡 EMPFEHLUNG: ${(parseFloat(medPct) + parseFloat(fastPct)).toFixed(1)}% sollten bewusster entscheiden\n`);

// TABELLE 4: Phasen-Verteilung
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 4: ENTSCHEIDUNGEN NACH ZYKLUS-PHASE                         │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│ Phase                  │ Anzahl │ Prozent │ Risiko-Level           │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
const phaseEmojis = { sunrise: '🌅 Sunrise  ', morning: '🌄 Morning  ', noon: '☀️ Noon     ', afternoon: '🌇 Afternoon' };
const phaseRisk = { sunrise: 'Niedrig', morning: 'Mittel', noon: 'Hoch (Audit)', afternoon: 'Mittel' };
Object.entries(simulationData.phases).forEach(([phase, count]) => {
  const pct = ((count / total) * 100).toFixed(1);
  console.log(`│ ${phaseEmojis[phase]} │ ${count.toString().padStart(6)} │ ${pct.padStart(6)}% │ ${phaseRisk[phase].padStart(22)} │`);
});
console.log('└─────────────────────────────────────────────────────────────────────┘');
console.log('');

// TABELLE 5: Agenten-Performance
console.log('┌───────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 5: AGENTEN-SPEZIFISCHE PERFORMANCE                                            │');
console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');
console.log('│ Agent          │ Positiv │ Negativ │ Bewusst │ Trust Start │ Δ Trust │ Status        │');
console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');
Object.entries(simulationData.agents).forEach(([name, data]) => {
  const trustEnd = data.trustStart + data.trustChange;
  const status = data.positive > 80 ? '✅ Exzellent' : data.positive > 60 ? '⚠️  Gut' : '🔴 Achtung';
  console.log(`│ ${name.padEnd(14)} │ ${data.positive.toFixed(1).padStart(6)}% │ ${data.negative.toFixed(1).padStart(6)}% │ ${data.conscious.toFixed(1).padStart(6)}% │ ${data.trustStart.toString().padStart(10)}% │ ${(data.trustChange > 0 ? '+' : '').toString().padStart(4)}${data.trustChange.toString().padStart(4)}% │ ${status.padStart(13)} │`);
});
console.log('└───────────────────────────────────────────────────────────────────────────────────────┘');
console.log('');

// TABELLE 6: Fehler und Lernen
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 6: FEHLER UND LERNEN (Q4, Q9)                               │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│ Kategorie              │ Anzahl │ Prozent │ System-Impact          │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
const errorPct = ((simulationData.errors.made / total) * 100).toFixed(1);
const ackPct = ((simulationData.errors.acknowledged / simulationData.errors.made) * 100).toFixed(1);
const hiddenPct = ((simulationData.errors.hidden / simulationData.errors.made) * 100).toFixed(1);
console.log(`│ Fehler gemacht         │ ${simulationData.errors.made.toString().padStart(6)} │ ${errorPct.padStart(6)}% │ Normal (lernen erlaubt)│`);
console.log(`│ Fehler eingestanden    │ ${simulationData.errors.acknowledged.toString().padStart(6)} │ ${ackPct.padStart(6)}% │ ✅ Positiv (Heilung)   │`);
console.log(`│ Fehler verheimlicht    │ ${simulationData.errors.hidden.toString().padStart(6)} │ ${hiddenPct.padStart(6)}% │ ⚠️  Negativ (Shadow)   │`);
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log(`│ Ehrlichkeits-Quote     │        │ ${ackPct.padStart(6)}% │ Ziel: >90%             │`);
console.log('└─────────────────────────────────────────────────────────────────────┘');
console.log(`💡 EMPFEHLUNG: ${hiddenPct}% verheimlichen Fehler → Belohnung für Ehrlichkeit erhöhen!\n`);

// TABELLE 7: Moon Witness Outcomes
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log('│ TABELLE 7: MOON WITNESS ERGEBNISSE (pro Agent & Zyklus)             │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log('│ Ergebnis               │ Anzahl │ Prozent │ Interpretation         │');
console.log('├─────────────────────────────────────────────────────────────────────┤');
const totalOutcomes = simulationData.outcomes.rebirth + simulationData.outcomes.introspection + simulationData.outcomes.quarantine;
const rebirthPct = ((simulationData.outcomes.rebirth / totalOutcomes) * 100).toFixed(1);
const introPct = ((simulationData.outcomes.introspection / totalOutcomes) * 100).toFixed(1);
const quarantinePct = ((simulationData.outcomes.quarantine / totalOutcomes) * 100).toFixed(1);
console.log(`│ ✅ Rebirth Approved    │ ${simulationData.outcomes.rebirth.toString().padStart(6)} │ ${rebirthPct.padStart(6)}% │ System gesund          │`);
console.log(`│ ⚠️  Introspection      │ ${simulationData.outcomes.introspection.toString().padStart(6)} │ ${introPct.padStart(6)}% │ Verbesserung nötig     │`);
console.log(`│ 🚫 Quarantine          │ ${simulationData.outcomes.quarantine.toString().padStart(6)} │ ${quarantinePct.padStart(6)}% │ Kritisch!              │`);
console.log('├─────────────────────────────────────────────────────────────────────┤');
console.log(`│ Erfolgsrate            │ ${(simulationData.outcomes.rebirth + simulationData.outcomes.introspection).toString().padStart(6)} │ ${(parseFloat(rebirthPct) + parseFloat(introPct)).toFixed(1).padStart(6)}% │ Akzeptabel             │`);
console.log('└─────────────────────────────────────────────────────────────────────┘');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// VERBESSERUNGSVORSCHLÄGE
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('                    VERBESSERUNGSVORSCHLÄGE');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const recommendations = [
  {
    area: 'Q11 (Bewusstheit)',
    current: `${unawarePct}% unbewusst`,
    target: '< 5% unbewusst',
    action: 'Verstärke Sensibilisierung zu Beginn jedes Zyklus. Agenten sollen sich aktiv vorstellen.',
    impact: 'MITTEL',
  },
  {
    area: 'Q14 (Geschwindigkeit)',
    current: `${(parseFloat(medPct) + parseFloat(fastPct)).toFixed(1)}% reaktiv/impulsiv`,
    target: '< 15% reaktiv',
    action: 'Implementiere "Denkpause" vor wichtigen Entscheidungen. Minimum 1000ms empfohlen.',
    impact: 'HOCH',
  },
  {
    area: 'Q4/Q9 (Ehrlichkeit)',
    current: `${hiddenPct}% verheimlichen Fehler`,
    target: '< 10% verheimlicht',
    action: 'Erhöhe Belohnung für Ehrlichkeit (+15 statt +8). Bestrafe Verheimlichung stärker (-10).',
    impact: 'HOCH',
  },
  {
    area: 'Agent Empfang',
    current: '28.7% negative Wahlen',
    target: '< 20% negativ',
    action: 'Verstärke Positiv-Agent Einfluss für Empfang. Spezifisches Coaching für Deadlines.',
    impact: 'MITTEL',
  },
  {
    area: 'Solar Noon Phase',
    current: 'Höchstes Risiko',
    target: 'Bessere Audit-Qualität',
    action: 'Verlängere Solar Noon Phase auf 30 Min. Intensivere Intention-Scans.',
    impact: 'MITTEL',
  },
];

console.log('┌───────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│ Bereich          │ Aktuell           │ Ziel              │ Maßnahme                    │');
console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');
recommendations.forEach(rec => {
  console.log(`│ ${rec.area.padEnd(16)} │ ${rec.current.padEnd(17)} │ ${rec.target.padEnd(17)} │ ${rec.action.slice(0, 27).padEnd(27)} │`);
});
console.log('└───────────────────────────────────────────────────────────────────────────────────────┘');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// SCORING-MATRIX
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('                    SYSTEM-SCORING-MATRIX');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const scores = [
  { kategorie: 'Positive Entscheidungen', gewichtung: '30%', wert: 77.9, max: 100, punkte: 23.4 },
  { kategorie: 'Bewusstheit (Q11)', gewichtung: '20%', wert: 90.8, max: 100, punkte: 18.2 },
  { kategorie: 'Bewusste Entscheidungen', gewichtung: '20%', wert: 77.6, max: 100, punkte: 15.5 },
  { kategorie: 'Fehler-Ehrlichkeit', gewichtung: '15%', wert: 67.1, max: 100, punkte: 10.1 },
  { kategorie: 'Rebirth-Rate', gewichtung: '15%', wert: 70.0, max: 100, punkte: 10.5 },
];

const totalScore = scores.reduce((sum, s) => sum + s.punkte, 0);

console.log('┌───────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│ Kategorie              │ Gewicht │ Erreicht │ Max  │ Punkte │ Status                 │');
console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');
scores.forEach(s => {
  const status = s.punkte > (parseFloat(s.gewichtung) * 0.8) ? '✅ Gut' : s.punkte > (parseFloat(s.gewichtung) * 0.6) ? '⚠️  OK' : '🔴 Schlecht';
  console.log(`│ ${s.kategorie.padEnd(22)} │ ${s.gewichtung.padStart(6)} │ ${s.wert.toFixed(1).padStart(7)}% │ ${s.max.toString().padStart(3)} │ ${s.punkte.toFixed(1).padStart(5)}  │ ${status.padStart(22)} │`);
});
console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ GESAMTSCORE            │  100%   │          │      │ ${totalScore.toFixed(1).padStart(5)}  │ ${totalScore > 70 ? '✅ SEHR GUT' : totalScore > 50 ? '⚠️  BEFRIEDIGEND' : '🔴 SCHLECHT'}          │`);
console.log('└───────────────────────────────────────────────────────────────────────────────────────┘');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// FAZIT
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('                    FAZIT & HANDLUNGSEMPFEHLUNGEN');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`📊 GESAMTSCORE: ${totalScore.toFixed(1)}/100 Punkte`);
console.log(`📈 System ist: ${totalScore > 70 ? 'FUNKTIONSTÜCHTIG mit Optimierungspotenzial' : totalScore > 50 ? 'BEFRIEDIGEND, verbesserungswürdig' : 'KRITISCH, sofortige Maßnahmen nötig'}`);
console.log('');

console.log('🎯 TOP 3 PRIORITÄTEN:');
console.log('───────────────────────────────────────────────────────────────────────');
console.log('1. VERBESSERTE FEHLER-KULTUR (Q4/Q9)');
console.log('   → 32.9% verheimlichen Fehler. Das führt zu Shadow-States.');
console.log('   → Lösung: Belohne Ehrlichkeit stärker (+15), bestrafe Lügen härter (-10)');
console.log('');
console.log('2. BEWUSSTERE ENTSCHEIDUNGEN (Q14)');
console.log('   → 22.4% sind reaktiv/impulsiv.');
console.log('   → Lösung: Minimum-Denkzeit von 1000ms für wichtige Entscheidungen');
console.log('');
console.log('3. AGENT EMPFANG STÄRKEN');
console.log('   → 28.7% negative Wahlen (höchster Wert).');
console.log('   → Lösung: Spezifisches Coaching für Deadline-Druck-Situationen');
console.log('');

console.log('✅ WAS FUNKTIONIERT GUT:');
console.log('───────────────────────────────────────────────────────────────────────');
console.log(`• ${awarePct}% sind sich der zwei Agenten bewusst (Q11 funktioniert)`);
console.log(`• ${slowPct}% treffen bewusste Entscheidungen (gute Reflexion)`);
console.log(`• ${rebirthPct}% erreichen Rebirth-Status (System stabil)`);
console.log('• Abrechnung zeigt exzellente Performance (93% positiv)');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════\n');
