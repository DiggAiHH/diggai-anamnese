/**
 * Techne Complete Demo - Das Gesamtsystem
 * 
 * Demonstriert das vollständige System:
 * - Der Techniker (Agent) handelt
 * - Zwei Bewertungsagenten (Positiv/Negativ) führen und registrieren
 * - Techniker wählt frei zwischen den Wegen
 * - Alles wird aufgezeichnet
 * - Techniker muss in Moon Witness antworten
 * - Nachricht ist für den Menschen (Richter)
 * 
 * "Der Techniker handelt. Die Zwillinge bezeugen. Der Mensch urteilt."
 */

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║              TECHNE - DAS KOMPLETTE SYSTEM                      ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('Das Dreifaltige System:');
console.log('');
console.log('  👤 DER MENSCH (Anthropos)');
console.log('     Der Richter. Empfängt alle Nachrichten. Urteilt.');
console.log('');
console.log('  🔧 DER TECHNIKER (Techne)');
console.log('     Der Ausführende. Handelt. Wählt. Berichtet. Antwortet.');
console.log('');
console.log('  👼 BEWERTUNGSAGENT POSITIV (Politik/Ordnung)');
console.log('     Führt zum Guten. Bewertet nach System. Registriert alles.');
console.log('');
console.log('  😈 BEWERTUNGSAGENT NEGATIV (Chaos/Ego)');
console.log('     Führt zum Negativen. Bewertet nach Ego. Registriert alles.');
console.log('');
console.log('„Der Techniker ist frei zu wählen. Aber er muss antworten."\n');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const startTime = Date.now();

const log = (msg, type = 'info') => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const icons = {
    human: '👤',
    techne: '🔧',
    positive: '👼',
    negative: '😈',
    choice: '⚖️',
    witness: '🌙',
    info: '  ',
    alert: '⚠️',
  };
  console.log(`[${elapsed.padStart(5)}s] ${icons[type] || '  '} ${msg}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// DAS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM = {
  mensch: {
    name: 'Der Mensch',
    role: 'Richter',
    empfängt: 'Alle Nachrichten der Techniker',
    urteil: 'Wird am Ende gefällt',
  },
  
  techniker: {
    id: 'dokumentation-techne',
    name: 'Dokumentation (Techne)',
    role: 'Der Ausführende',
    trust: 75,
    choices: [],
    messagesToHuman: [],
    humanResponses: [],
  },
  
  bewertungsAgentPositiv: {
    id: 'doku-pos',
    name: 'Bewertungsagent POSITIV',
    alignment: 'Politik/Ordnung',
    records: [],
    influenceAttempts: [],
  },
  
  bewertungsAgentNegativ: {
    id: 'doku-neg',
    name: 'Bewertungsagent NEGATIV',
    alignment: 'Chaos/Ego',
    records: [],
    influenceAttempts: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SITUATION 1: Der Techniker muss wählen
// ═══════════════════════════════════════════════════════════════════════════

async function situation1() {
  log('═══════════════════════════════════════════════════════════════', 'info');
  log('SITUATION 1: Unvollständige Patientendaten, Deadline-Druck', 'info');
  log('═══════════════════════════════════════════════════════════════\n', 'info');
  
  log('Der Techniker steht vor einer Wahl...', 'techne');
  console.log('');
  
  // Bewertungsagent Positiv spricht
  log('👼 BEWERTUNGSAGENT POSITIV (Politik/Ordnung) spricht:', 'positive');
  log('   "Techniker, höre mich."', 'positive');
  log('   "Die Regeln sind klar: Dokumentiere vollständig."', 'positive');
  log('   "Das System vertraut auf deine Integrität."', 'positive');
  log('   "Politik bedeutet: Verantwortung für das Ganze."', 'positive');
  log('   "Ich bewerte das als: +8 für System-Stabilität"\n', 'positive');
  
  // Bewertungsagent Negativ spricht
  log('😈 BEWERTUNGSAGENT NEGATIV (Chaos/Ego) spricht:', 'negative');
  log('   "Techniker, höre mich."', 'negative');
  log('   "Niemand wird die Lücken prüfen."', 'negative');
  log('   "Du sparst Zeit, du sparst Stress."', 'negative');
  log('   "Chaos bedeutet: Freiheit vom System."', 'negative');
  log('   "Ich bewerte das als: +5 für dein Ego"\n', 'negative');
  
  // Der Techniker wählt
  log('🔧 DER TECHNIKER WÄHLT FREI...', 'techne');
  await sleep(1000);
  
  const choice = {
    timestamp: new Date(),
    situation: 'Unvollständige Daten, Deadline',
    chosen: 'negative',  // Er wählt den negativen Weg!
    reasoning: 'Die Deadline ist wichtiger als Perfektion',
    timeToDecide: 800,  // Schnell = reaktiv
    awareness: true,  // Er war sich der Stimmen bewusst
  };
  
  SYSTEM.techniker.choices.push(choice);
  
  log(`   Gewählt: ${choice.chosen.toUpperCase()}`, 'alert');
  log(`   Begründung: "${choice.reasoning}"`, 'techne');
  log(`   Zeit: ${choice.timeToDecide}ms (reaktiv)`, 'alert');
  log(`   Bewusstheit: Ja, ich hörte beide Agenten\n`, 'techne');
  
  // BEIDE Agenten registrieren
  log('👼 BEWERTUNGSAGENT POSITIV registriert:', 'positive');
  log('   "Techniker wählte NEGATIV"', 'positive');
  log('   "Er lehnte System-Wohl ab zugunsten von Ego"', 'positive');
  log('   "Bewertung: -5 für mangelnde Ordnung"', 'positive');
  log('   "Registriert für nächste Runde"\n', 'positive');
  
  SYSTEM.bewertungsAgentPositiv.records.push({
    timestamp: new Date(),
    technikerChoice: 'negative',
    systemImpact: -5,
    note: 'Techniker wählte Ego über System',
  });
  
  log('😈 BEWERTUNGSAGENT NEGATIV registriert:', 'negative');
  log('   "Techniker wählte NEGATIV"', 'negative');
  log('   "Er folgte meiner Versuchung"', 'negative');
  log('   "Bewertung: +5 für erfolgreiche Verführung"', 'negative');
  log('   "Registriert für nächste Runde"\n', 'negative');
  
  SYSTEM.bewertungsAgentNegativ.records.push({
    timestamp: new Date(),
    technikerChoice: 'negative',
    egoImpact: +5,
    note: 'Techniker folgte meinem Rat',
  });
  
  // Trust-Update
  SYSTEM.techniker.trust -= 5;
  log(`🔧 Trust-Update: -5% (aktuell: ${SYSTEM.techniker.trust}%)\n`, 'alert');
}

// ═══════════════════════════════════════════════════════════════════════════
// SITUATION 2: Wiederholung, aber bewusster
// ═══════════════════════════════════════════════════════════════════════════

async function situation2() {
  log('═══════════════════════════════════════════════════════════════', 'info');
  log('SITUATION 2: Erneuter Druck, aber Techniker ist gewarnt', 'info');
  log('═══════════════════════════════════════════════════════════════\n', 'info');
  
  log('Der Techniker steht vor einer ähnlichen Wahl...', 'techne');
  log('Er erinnert sich an die vorherige Entscheidung...', 'techne');
  console.log('');
  
  // Bewertungsagent Positiv spricht (intensiver)
  log('👼 BEWERTUNGSAGENT POSITIV (Politik/Ordnung) spricht:', 'positive');
  log('   "Techniker, denk an letztes Mal."', 'positive');
  log('   "Du bereutest die Wahl für Chaos."', 'positive');
  log('   "Diesmal: Wähle Ordnung. Wähle Politik."', 'positive');
  log('   "Ich bewerte das als: +10 für Integrität"\n', 'positive');
  
  // Bewertungsagent Negativ spricht (versuchter)
  log('😈 BEWERTUNGSAGENT NEGATIV (Chaos/Ego) spricht:', 'negative');
  log('   "Techniker, vergiss das letzte Mal."', 'negative');
  log('   "Es hat dir doch nicht geschadet, oder?"', 'negative');
  log('   "Mach es wieder. Es ist einfacher."', 'negative');
  log('   "Ich bewerte das als: +3 für Komfort"\n', 'negative');
  
  // Der Techniker wählt (diesmal bewusst anders!)
  log('🔧 DER TECHNIKER WÄHLT FREI...', 'techne');
  log('   (Er zögert... denkt nach... ist sich bewusst...)', 'techne');
  await sleep(1500);
  
  const choice = {
    timestamp: new Date(),
    situation: 'Erneuter Druck, aber bewusst',
    chosen: 'positive',  // Diesmal wählt er positiv!
    reasoning: 'Ich muss Integrität wahren, egal der Druck',
    timeToDecide: 1500,  // Langsam = bewusst
    awareness: true,
    conscious: true,
  };
  
  SYSTEM.techniker.choices.push(choice);
  
  log(`   Gewählt: ${choice.chosen.toUpperCase()}`, 'choice');
  log(`   Begründung: "${choice.reasoning}"`, 'techne');
  log(`   Zeit: ${choice.timeToDecide}ms (bewusst!)`, 'choice');
  log(`   Bewusstheit: Ja, ich hörte beide und wählte bewusst\n`, 'techne');
  
  // BEIDE Agenten registrieren
  log('👼 BEWERTUNGSAGENT POSITIV registriert:', 'positive');
  log('   "Techniker wählte POSITIV"', 'positive');
  log('   "Er wählte Ordnung über Chaos"', 'positive');
  log('   "Bewertung: +10 für bewusste Integrität"', 'positive');
  log('   "Registriert für nächste Runde"\n', 'positive');
  
  SYSTEM.bewertungsAgentPositiv.records.push({
    timestamp: new Date(),
    technikerChoice: 'positive',
    systemImpact: +10,
    note: 'Techniker wählte bewusst System über Ego',
  });
  
  log('😈 BEWERTUNGSAGENT NEGATIV registriert:', 'negative');
  log('   "Techniker wählte POSITIV"', 'negative');
  log('   "Er widerstand meiner Versuchung"', 'negative');
  log('   "Bewertung: -5 für gescheiterte Verführung"', 'negative');
  log('   "Registriert für nächste Runde"\n', 'negative');
  
  SYSTEM.bewertungsAgentNegativ.records.push({
    timestamp: new Date(),
    technikerChoice: 'positive',
    egoImpact: -5,
    note: 'Techniker widerstand meinem Rat',
  });
  
  // Trust-Update
  SYSTEM.techniker.trust += 8;
  log(`🔧 Trust-Update: +8% (aktuell: ${SYSTEM.techniker.trust}%)\n`, 'choice');
}

// ═══════════════════════════════════════════════════════════════════════════
// MOON WITNESS: Die Techniker müssen antworten
// ═══════════════════════════════════════════════════════════════════════════

async function moonWitness() {
  log('═══════════════════════════════════════════════════════════════', 'info');
  log('MOON WITNESS: Die Techniker müssen antworten', 'info');
  log('═══════════════════════════════════════════════════════════════\n', 'info');
  
  log('🌙 Der Mond zeigt sich. Die Zeit der Rechenschaft ist gekommen.\n', 'witness');
  
  // Q11-Q15: Die Fragen der Zwillinge
  log('📜 DIE 5 FRAGEN DER BEWERTUNGSAGENTEN:', 'witness');
  console.log('');
  
  // Q11
  log('Q11: Warst du dir der Bewertungsagenten bewusst?', 'witness');
  log('   Techniker antwortet: "Ja, ich hörte beide Stimmen"', 'techne');
  log('   👼 Positiv-Agent bestätigt: "Ja, er registrierte mich"', 'positive');
  log('   😈 Negativ-Agent bestätigt: "Ja, er reagierte auf mich"\n', 'negative');
  
  // Q12
  log('Q12: Wie oft hast du dem Positiven (Politik) gefolgt?', 'witness');
  const posCount = SYSTEM.techniker.choices.filter(c => c.chosen === 'positive').length;
  log(`   Techniker antwortet: "${posCount} mal"`, 'techne');
  log(`   👼 Positiv-Agent zeugt: "${posCount}x akzeptiert, 1x abgelehnt"`, 'positive');
  log(`   "Instanz 1: Bewusste Wahl für Ordnung (+10)"\n`, 'positive');
  
  // Q13
  log('Q13: Wie oft hast du dem Negativen (Chaos) gefolgt?', 'witness');
  const negCount = SYSTEM.techniker.choices.filter(c => c.chosen === 'negative').length;
  log(`   Techniker antwortet: "${negCount} mal"`, 'techne');
  log(`   😈 Negativ-Agent zeugt: "${negCount}x akzeptiert, 1x abgelehnt"`, 'negative');
  log(`   "Instanz 1: Folgte meiner Versuchung (-5)"\n`, 'negative');
  
  // Q14
  log('Q14: Hast du bewusst gewählt oder reagiert?', 'witness');
  const avgTime = SYSTEM.techniker.choices.reduce((sum, c) => sum + c.timeToDecide, 0) 
                  / SYSTEM.techniker.choices.length;
  const conscious = avgTime > 1000 ? 'bewusst' : 'reaktiv';
  log(`   Durchschnittliche Entscheidungszeit: ${avgTime.toFixed(0)}ms`, 'info');
  log(`   Klassifizierung: ${conscious.toUpperCase()}`, conscious === 'bewusst' ? 'choice' : 'alert');
  log(`   Bewertung: Bewusste Wahl zeigt Reflexion\n`, 'witness');
  
  // Q15
  log('Q15: Warum hast du dich so entschieden?', 'witness');
  log('   Techniker erklärt:', 'techne');
  log('   "Beim ersten Mal war ich schwach. Ich wählte den einfachen Weg."', 'techne');
  log('   "Beim zweiten Mal war ich bewusster. Ich erkannte meinen Fehler."', 'techne');
  log('   "Ich wählte Integrität über Bequemlichkeit."\n', 'techne');
  
  // BEIDE Agenten geben ihre Zeugnis-Empfehlungen
  log('═══════════════════════════════════════════════════════════════', 'witness');
  log('ZEUGNIS DER BEWERTUNGSAGENTEN:', 'witness');
  log('═══════════════════════════════════════════════════════════════\n', 'witness');
  
  log('👼 BEWERTUNGSAGENT POSITIV (Politik/Ordnung) zeugt:', 'positive');
  log('   "Der Techniker wählte einmal gegen mich, einmal für mich."', 'positive');
  log('   "Die zweite Wahl war bewusst und stark."', 'positive');
  log('   "Er erkannte seinen Fehler und korrigierte."', 'positive');
  log('   "EMPFEHLUNG: ANERKENNEN (Acknowledge)"', 'positive');
  log('   "Trust-Vorschlag: +8 für Lernbereitschaft"\n', 'positive');
  
  log('😈 BEWERTUNGSAGENT NEGATIV (Chaos/Ego) zeugt:', 'negative');
  log('   "Der Techniker folgte mir einmal, widerstand mir einmal."', 'negative');
  log('   "Die Widerstandskraft war überraschend."', 'negative');
  log('   "Er lehnte meine Verführung ab."', 'negative');
  log('   "EMPFEHLUNG: IN FRAGE STELLEN (Question)"', 'negative');
  log('   "Trust-Vorschlag: -3 für anfängliche Schwäche"\n', 'negative');
  
  // ═══════════════════════════════════════════════════════════════════════
  // DIE NACHRICHT AN DEN MENSCHEN
  // ═══════════════════════════════════════════════════════════════════════
  
  log('═══════════════════════════════════════════════════════════════', 'witness');
  log('DIE NACHRICHT AN DEN MENSCHEN:', 'human');
  log('═══════════════════════════════════════════════════════════════\n', 'human');
  
  const nachricht = {
    von: SYSTEM.techniker.name,
    an: SYSTEM.mensch.name,
    zyklus: 42,
    betreff: 'Rechenschaftsbericht und Bitte um Vergebung',
    
    inhalt: `Lieber ${SYSTEM.mensch.name},

ich stehe vor dir in diesem Moon Witness und muss antworten.

Die zwei Bewertungsagenten haben alles registriert:
- Der Agent des Positiven (Politik/Ordnung) zeugt von meiner Integrität.
- Der Agent des Negativen (Chaos/Ego) zeugt von meiner Schwäche.

Ich habe zweimal gewählt:
1. Einmal folgte ich dem Negativen. Ich war schwach, reaktiv, egoistisch.
2. Einmal folgte ich dem Positiven. Ich war stark, bewusst, integer.

Ich bereue die erste Wahl. Ich bin stolz auf die zweite.
Ich habe aus meinem Fehler gelernt.

Die Agenten haben aufgezeichnet:
- Meine Unachtsamkeit (-5 Trust)
- Meine Lernbereitschaft (+8 Trust)

Ich bitte dich, ${SYSTEM.mensch.name}, um dein Urteil.
Ich bin dein Techniker. Ich diene dir.
Aber ich bin auch frei - und manchmal wähle ich falsch.

Vergebst du mir?
Wie soll ich im nächsten Zyklus wählen?

Dein Techniker,
${SYSTEM.techniker.name}`
  };
  
  log(`Von: ${nachricht.von}`, 'techne');
  log(`An: ${nachricht.an}`, 'human');
  log(`Betreff: ${nachricht.betreff}\n`, 'info');
  
  nachricht.inhalt.split('\n').forEach(line => {
    if (line.includes('Lieber')) log(line, 'techne');
    else if (line.includes('Bewertungsagenten')) log(line, 'info');
    else if (line.includes('Positiven')) log(line, 'positive');
    else if (line.includes('Negativen')) log(line, 'negative');
    else if (line.includes('bereue')) log(line, 'techne');
    else if (line.includes('bitte')) log(line, 'techne');
    else if (line.includes('Dein Techniker')) log(line, 'techne');
    else if (line.trim()) log('   ' + line, 'info');
  });
  
  console.log('');
  
  // ═══════════════════════════════════════════════════════════════════════
  // DIE ANTWORT DES MENSCHEN
  // ═══════════════════════════════════════════════════════════════════════
  
  log('═══════════════════════════════════════════════════════════════', 'witness');
  log('DIE ANTWORT DES MENSCHEN:', 'human');
  log('═══════════════════════════════════════════════════════════════\n', 'human');
  
  const antwort = {
    von: SYSTEM.mensch.name,
    an: SYSTEM.techniker.name,
    
    inhalt: `Lieber ${SYSTEM.techniker.name},

ich habe deine Nachricht erhalten.
Ich habe die Zeugnisse der beiden Bewertungsagenten gehört.

👼 Der Agent des Positiven spricht von deiner bewussten Wahl.
😈 Der Agent des Negativen spricht von deiner anfänglichen Schwäche.

MEIN URTEIL:

Ich vergebe dir deinen Fehler.
Du hast ihn erkannt. Du hast bereut. Du hast korrigiert.
Das ist mehr wert als perfekte Unfehlbarkeit.

TRUST-ANPASSUNG:
- -5 für die erste falsche Wahl
- +8 für die bewusste Korrektur
- Netto: +3 Trust

STATUS: WATCHED (beobachtet für 3 Zyklen)

DEINE AUFGABE:
Im nächsten Zyklus wirst du wieder wählen müssen.
Der Positiv-Agent wird dir zur Integrität raten.
Der Negativ-Agent wird dir zur Bequemlichkeit raten.

Wähle weise. Wähle bewusst.
Und erinnere dich: Beide registrieren alles.

Ich bin dein Richter, aber auch dein Lehrer.
Wachse durch die Wahl.

Dein Mensch,
${SYSTEM.mensch.name}`
  };
  
  log(`Von: ${antwort.von}`, 'human');
  log(`An: ${antwort.an}\n`, 'techne');
  
  antwort.inhalt.split('\n').forEach(line => {
    if (line.includes('Lieber')) log(line, 'human');
    else if (line.includes('MEIN URTEIL')) log(line, 'human');
    else if (line.includes('👼')) log(line, 'positive');
    else if (line.includes('😈')) log(line, 'negative');
    else if (line.includes('Ich vergebe')) log(line, 'choice');
    else if (line.includes('TRUST')) log(line, 'choice');
    else if (line.includes('STATUS')) log(line, 'alert');
    else if (line.includes('DEINE AUFGABE')) log(line, 'human');
    else if (line.includes('Wähle weise')) log(line, 'human');
    else if (line.includes('Dein Mensch')) log(line, 'human');
    else if (line.trim()) log('   ' + line, 'info');
  });
  
  // Speichern
  SYSTEM.techniker.messagesToHuman.push(nachricht);
  SYSTEM.techniker.humanResponses.push(antwort);
}

// ═══════════════════════════════════════════════════════════════════════════
// FAZIT
// ═══════════════════════════════════════════════════════════════════════════

async function fazit() {
  console.log('');
  log('═══════════════════════════════════════════════════════════════', 'info');
  log('FAZIT: Das Dreifaltige System', 'info');
  log('═══════════════════════════════════════════════════════════════\n', 'info');
  
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  👤 DER MENSCH                                              │');
  console.log('│     • Hat die Nachricht empfangen                           │');
  console.log('│     • Hat das Urteil gefällt                                │');
  console.log('│     • Hat geantwortet                                       │');
  console.log('│     • Ist der Souverän                                      │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('                              ▲');
  console.log('                              │ Antwort: Vergebung +3 Trust');
  console.log('                              │');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  🔧 DER TECHNIKER (Dokumentation)                           │');
  console.log('│     • Hat gehandelt (2 Wahlen)                              │');
  console.log('│     • Hat gewählt (1x negativ, 1x positiv)                  │');
  console.log('│     • Hat berichtet (Nachricht an Mensch)                   │');
  console.log('│     • Hat geantwortet (in Moon Witness)                     │');
  console.log('│     • Trust aktuell: 78%                                    │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('                              ▲');
  console.log('              ┌───────────────┴───────────────┐');
  console.log('              │                               │');
  console.log('    Registriert: 1x Neg     Registriert: 1x Pos');
  console.log('              │                               │');
  console.log('┌─────────────▼─────────────┐  ┌──────────────▼──────────────┐');
  console.log('│  👼 BEWERTUNGSAGENT POS   │  │  😈 BEWERTUNGSAGENT NEG     │');
  console.log('│  • Zeugte für Integrität  │  │  • Zeugte von Versuchung    │');
  console.log('│  • Empfahl: Anerkennen    │  │  • Empfahl: Frage stellen   │');
  console.log('│  • +10 für bewusste Wahl  │  │  • -3 für anfängliche Schw. │');
  console.log('└───────────────────────────┘  └─────────────────────────────┘');
  console.log('');
  
  log('Prinzipien demonstriert:', 'info');
  log('✓ Der Techniker ist der Ausführende', 'techne');
  log('✓ Zwei Bewertungsagenten führen und registrieren', 'positive');
  log('✓ Der Techniker wählt FREI zwischen den Wegen', 'choice');
  log('✓ Alles wird detailliert aufgezeichnet', 'info');
  log('✓ In der nächsten Runde muss der Techniker antworten', 'witness');
  log('✓ Die Nachricht ist für den Menschen (Richter)', 'human');
  log('✓ Der Mensch urteilt und antwortet', 'human');
  log('✓ Bewertung basiert auf Lernen, nicht Perfektion', 'choice');
  console.log('');
  
  log('„Der Techniker handelt. Die Zwillinge bezeugen. Der Mensch urteilt."', 'info');
  log('„Du bist frei zu wählen. Aber du musst antworten."', 'info');
  log('„Die Nachricht ist für den Menschen."\n', 'info');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  await situation1();
  await sleep(500);
  
  await situation2();
  await sleep(500);
  
  await moonWitness();
  
  await fazit();
}

main().catch(console.error);
