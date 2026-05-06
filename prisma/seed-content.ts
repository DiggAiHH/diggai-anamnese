/**
 * Seed: WaitingContent — 50+ Einträge für Wartezeit-Engagement
 * Run via: npx tsx prisma/seed-content.ts
 * Or imported from prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WAITING_CONTENT = [
    // ─── HEALTH_TIP — allgemein ────────────────────────────────
    { type: 'HEALTH_TIP', category: 'allgemein', title: 'Trinken Sie genug Wasser', body: 'Erwachsene sollten täglich **1,5–2 Liter** Wasser trinken. Ausreichend Flüssigkeit fördert die Konzentration, unterstützt den Stoffwechsel und hält Haut und Schleimhäute gesund.', priority: 5 },
    { type: 'HEALTH_TIP', category: 'allgemein', title: 'Händewaschen schützt', body: 'Gründliches Händewaschen mit Seife für mindestens **20 Sekunden** reduziert das Infektionsrisiko um bis zu 50%. Besonders vor dem Essen und nach dem Toilettengang wichtig.', priority: 5 },
    { type: 'HEALTH_TIP', category: 'allgemein', title: 'Regelmäßige Vorsorge', body: 'Ab 35 Jahren haben Sie alle 3 Jahre Anspruch auf einen **Gesundheits-Check-up**. Nutzen Sie dieses kostenlose Angebot Ihrer Krankenkasse!', priority: 4 },
    { type: 'HEALTH_TIP', category: 'allgemein', title: 'Impfstatus prüfen', body: 'Denken Sie daran, Ihren **Impfpass** regelmäßig checken zu lassen. Viele Auffrischungen (z.B. Tetanus alle 10 Jahre) werden vergessen.', priority: 3 },
    { type: 'HEALTH_TIP', category: 'allgemein', title: 'Sonnenschutz auch im Winter', body: 'UV-Strahlung wirkt auch bei Bewölkung. Im Winter ist besonders in den Bergen Sonnenschutz für das Gesicht wichtig, da Schnee bis zu 80% der UV-Strahlen reflektiert.', priority: 2 },

    // ─── HEALTH_TIP — ernaehrung ───────────────────────────────
    { type: 'HEALTH_TIP', category: 'ernaehrung', title: '5 Portionen am Tag', body: 'Die Deutsche Gesellschaft für Ernährung empfiehlt **5 Portionen Obst und Gemüse** pro Tag. Eine Portion entspricht etwa einer Handvoll.', priority: 5 },
    { type: 'HEALTH_TIP', category: 'ernaehrung', title: 'Zucker reduzieren', body: 'Die WHO empfiehlt maximal **25g Zucker** pro Tag (ca. 6 Teelöffel). Ein Glas Orangensaft enthält bereits 20g! Achten Sie auf versteckten Zucker in Fertigprodukten.', priority: 4 },
    { type: 'HEALTH_TIP', category: 'ernaehrung', title: 'Ballaststoffe für die Verdauung', body: 'Vollkornprodukte, Hülsenfrüchte und Gemüse liefern wichtige **Ballaststoffe**. Mindestens 30g pro Tag unterstützen eine gesunde Verdauung und machen langanhaltend satt.', priority: 3 },
    { type: 'HEALTH_TIP', category: 'ernaehrung', title: 'Omega-3 Fettsäuren', body: 'Fetter Fisch wie Lachs, Makrele oder Hering ist reich an **Omega-3-Fettsäuren**, die entzündungshemmend wirken und das Herz schützen. 1-2 Portionen pro Woche sind ideal.', priority: 3 },
    { type: 'HEALTH_TIP', category: 'ernaehrung', title: 'Frühstück nicht auslassen', body: 'Ein ausgewogenes Frühstück mit Vollkorn, Eiweiß und Obst stabilisiert den **Blutzuckerspiegel** und verbessert die Konzentration am Vormittag.', priority: 2 },

    // ─── HEALTH_TIP — bewegung ─────────────────────────────────
    { type: 'HEALTH_TIP', category: 'bewegung', title: '10.000 Schritte', body: 'Studien zeigen: Bereits **7.000–8.000 Schritte** pro Tag senken das Sterberisiko signifikant. Jeder Schritt zählt — nehmen Sie öfter die Treppe!', priority: 5 },
    { type: 'HEALTH_TIP', category: 'bewegung', title: 'Sitzen ist das neue Rauchen', body: 'Langes Sitzen erhöht das Risiko für Herz-Kreislauf-Erkrankungen. Stehen Sie **alle 30 Minuten** kurz auf und bewegen Sie sich. Auch kleine Streckübungen helfen.', priority: 4 },
    { type: 'HEALTH_TIP', category: 'bewegung', title: 'Dehnübungen gegen Verspannungen', body: 'Regelmäßiges Dehnen von Nacken, Schultern und Rücken beugt Verspannungen vor. Schon **5 Minuten morgens** kann einen Unterschied machen.', priority: 3 },

    // ─── HEALTH_TIP — psyche ───────────────────────────────────
    { type: 'HEALTH_TIP', category: 'psyche', title: 'Stressabbau durch Atmung', body: 'Die **4-7-8 Methode** hilft bei Stress: 4 Sek. einatmen, 7 Sek. halten, 8 Sek. ausatmen. Wiederholen Sie dies 3-4 Mal für sofortige Entspannung.', priority: 5, minWaitMin: 10 },
    { type: 'HEALTH_TIP', category: 'psyche', title: 'Schlafhygiene verbessern', body: 'Für besseren Schlaf: Kein Bildschirm **30 Minuten vor dem Schlafen**, regelmäßige Schlafzeiten, Raumtemperatur 16-18°C und kein Koffein nach 14 Uhr.', priority: 4 },
    { type: 'HEALTH_TIP', category: 'psyche', title: 'Soziale Kontakte pflegen', body: 'Regelmäßiger Kontakt mit Freunden und Familie ist nachweislich so wichtig für die Gesundheit wie Nichtrauchen und Sport. **Einsamkeit** erhöht das Risiko für Depressionen.', priority: 3 },

    // ─── FUN_FACT ──────────────────────────────────────────────
    { type: 'FUN_FACT', category: 'allgemein', title: 'Wussten Sie?', body: 'Das menschliche Herz schlägt im Laufe eines Lebens etwa **3 Milliarden Mal** und pumpt dabei rund 200 Millionen Liter Blut durch den Körper.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Erstaunliches Gehirn', body: 'Ihr Gehirn verbraucht etwa **20% Ihrer gesamten Energie**, obwohl es nur 2% des Körpergewichts ausmacht. Es verarbeitet etwa 70.000 Gedanken pro Tag.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Knochenstärke', body: 'Ein menschlicher Knochen ist **4x stärker als Beton** — bezogen auf das gleiche Gewicht. Das menschliche Skelett erneuert sich etwa alle 10 Jahre vollständig.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Bakterien im Körper', body: 'In Ihrem Körper leben etwa **38 Billionen Bakterien** — leicht mehr als Sie Körperzellen haben. Die meisten davon sind nützlich und unterstützen Ihre Verdauung.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Lunge und Tennis', body: 'Die innere Oberfläche Ihrer Lunge beträgt ausgebreitet etwa **70 Quadratmeter** — ungefähr so groß wie ein Tennisplatz.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Die Nase erinnert sich', body: 'Ihre Nase kann über **1 Billion verschiedene Düfte** unterscheiden. Düfte sind eng mit Erinnerungen verknüpft — ein Geruch kann Kindheitserinnerungen sofort zurückbringen.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Rote Blutkörperchen', body: 'Ein einzelnes rotes Blutkörperchen braucht nur **60 Sekunden**, um den gesamten Körperkreislauf einmal zu durchlaufen.' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'DNA-Länge', body: 'Wenn Sie die gesamte DNA aus einer einzigen Zelle ausrollen würden, wäre sie etwa **2 Meter** lang. Die DNA aus allen Ihren Zellen zusammen reicht bis zur Sonne und zurück — mehrfach!' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Lächeln macht glücklich', body: 'Selbst ein erzwungenes Lächeln sendet Signale an Ihr Gehirn und kann die Ausschüttung von **Endorphinen** anregen. Probieren Sie es aus! 😊' },
    { type: 'FUN_FACT', category: 'allgemein', title: 'Augen-Superkraft', body: 'Das menschliche Auge kann etwa **10 Millionen verschiedene Farben** unterscheiden. In völliger Dunkelheit könnte es theoretisch eine Kerzenflamme in 48 km Entfernung sehen.' },

    // ─── MINI_QUIZ ─────────────────────────────────────────────
    { type: 'MINI_QUIZ', category: 'allgemein', title: 'Medizin-Quiz: Herz', body: 'Testen Sie Ihr Wissen!', quizData: JSON.stringify({ question: 'Wie oft schlägt ein gesundes Herz pro Minute in Ruhe?', options: [{ text: '40–60 Mal', correct: false }, { text: '60–100 Mal', correct: true }, { text: '100–140 Mal', correct: false }, { text: '140–180 Mal', correct: false }], explanation: 'Ein normaler Ruhepuls liegt zwischen 60 und 100 Schlägen pro Minute. Sportler können einen Ruhepuls von unter 60 haben.' }) },
    { type: 'MINI_QUIZ', category: 'allgemein', title: 'Medizin-Quiz: Blut', body: 'Testen Sie Ihr Wissen!', quizData: JSON.stringify({ question: 'Wie viel Liter Blut hat ein erwachsener Mensch?', options: [{ text: '2–3 Liter', correct: false }, { text: '3–4 Liter', correct: false }, { text: '4–6 Liter', correct: true }, { text: '7–9 Liter', correct: false }], explanation: 'Ein Erwachsener hat durchschnittlich 4-6 Liter Blut, das entspricht etwa 7-8% des Körpergewichts.' }) },
    { type: 'MINI_QUIZ', category: 'ernaehrung', title: 'Ernährungs-Quiz: Vitamin C', body: 'Welches Lebensmittel wählen Sie?', quizData: JSON.stringify({ question: 'Welches Lebensmittel enthält pro 100g am meisten Vitamin C?', options: [{ text: 'Orange', correct: false }, { text: 'Paprika (rot)', correct: true }, { text: 'Zitrone', correct: false }, { text: 'Erdbeere', correct: false }], explanation: 'Rote Paprika enthält mit ~140mg/100g deutlich mehr Vitamin C als Orangen (~50mg) oder Zitronen (~53mg).' }) },
    { type: 'MINI_QUIZ', category: 'allgemein', title: 'Medizin-Quiz: Knochen', body: 'Wie viele sind es?', quizData: JSON.stringify({ question: 'Wie viele Knochen hat ein erwachsener Mensch?', options: [{ text: 'Etwa 106', correct: false }, { text: 'Etwa 206', correct: true }, { text: 'Etwa 306', correct: false }, { text: 'Etwa 406', correct: false }], explanation: 'Ein Erwachsener hat 206 Knochen. Babys werden mit etwa 300 Knochen geboren, von denen viele im Wachstum zusammenwachsen.' }) },
    { type: 'MINI_QUIZ', category: 'allgemein', title: 'Medizin-Quiz: Muskeln', body: 'Kennen Sie sich aus?', quizData: JSON.stringify({ question: 'Welcher ist der stärkste Muskel im menschlichen Körper?', options: [{ text: 'Bizeps', correct: false }, { text: 'Herz', correct: false }, { text: 'Kaumuskel (Masseter)', correct: true }, { text: 'Oberschenkel (Quadrizeps)', correct: false }], explanation: 'Bezogen auf sein Gewicht ist der Kaumuskel (Masseter) der stärkste Muskel. Er kann eine Beißkraft von bis zu 80 kg aufbringen.' }) },
    { type: 'MINI_QUIZ', category: 'bewegung', title: 'Sport-Quiz: Kalorien', body: 'Schätzen Sie richtig?', quizData: JSON.stringify({ question: 'Wie viele Kalorien verbrennt man durchschnittlich bei 30 Min. zügigem Spazierengehen?', options: [{ text: '50–80 kcal', correct: false }, { text: '100–150 kcal', correct: true }, { text: '200–250 kcal', correct: false }, { text: '300–350 kcal', correct: false }], explanation: '30 Minuten zügiges Gehen verbrennt etwa 100-150 kcal, je nach Gewicht und Tempo. Das entspricht ungefähr einer Banane.' }) },

    // ─── BREATHING_EXERCISE ────────────────────────────────────
    { type: 'BREATHING_EXERCISE', category: 'psyche', title: '4-7-8 Atemübung', body: '**Anleitung:**\n\n1. Atmen Sie durch die Nase ein und zählen Sie bis **4**\n2. Halten Sie den Atem und zählen Sie bis **7**\n3. Atmen Sie langsam durch den Mund aus und zählen Sie bis **8**\n4. Wiederholen Sie 3-4 Mal\n\n*Diese Technik aktiviert den Parasympathikus und hilft bei Stress und Nervosität.*', priority: 5, minWaitMin: 10, displayDurationSec: 60 },
    { type: 'BREATHING_EXERCISE', category: 'psyche', title: 'Box-Breathing (4-4-4-4)', body: '**Anleitung:**\n\n1. Atmen Sie ein: **4 Sekunden**\n2. Halten: **4 Sekunden**\n3. Ausatmen: **4 Sekunden**\n4. Halten: **4 Sekunden**\n5. Wiederholen Sie 4-5 Mal\n\n*Diese Technik wird sogar von Navy SEALs zur Stressbewältigung genutzt.*', priority: 4, minWaitMin: 15, displayDurationSec: 60 },
    { type: 'BREATHING_EXERCISE', category: 'psyche', title: 'Progressive Muskelentspannung (kurz)', body: '**Schnelle Variante (2 Min):**\n\n1. Ballen Sie beide Fäuste fest für **5 Sek.** — dann loslassen\n2. Ziehen Sie die Schultern hoch für **5 Sek.** — fallen lassen\n3. Spannen Sie die Bauchmuskeln an für **5 Sek.** — entspannen\n4. Drücken Sie die Füße fest auf den Boden für **5 Sek.** — loslassen\n\n*Spüren Sie den Unterschied zwischen Anspannung und Entspannung!*', priority: 3, minWaitMin: 15, displayDurationSec: 120 },

    // ─── SEASONAL_INFO — Spring ────────────────────────────────
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Pollenflug im Frühling', body: 'Im Frühling fliegen besonders **Birke, Hasel und Erle**. Bei Heuschnupfen helfen: Fenster nachts schließen, Haare vor dem Schlafen waschen, Pollenschutzgitter verwenden.', seasonal: 'SPRING', priority: 4 },
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Frühjahrsmüdigkeit überwinden', body: 'Gegen Frühjahrsmüdigkeit hilft: **Viel Tageslicht**, leichte Bewegung an der frischen Luft, vitaminreiche Ernährung und ausreichend Schlaf.', seasonal: 'SPRING', priority: 3 },

    // ─── SEASONAL_INFO — Summer ────────────────────────────────
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Hitzeschutz im Sommer', body: 'Bei Hitze: Mindestens **2-3 Liter** trinken, direkte Sonne zwischen 12-15 Uhr meiden, helle Kleidung tragen, kühle Tücher auf Handgelenke und Nacken legen.', seasonal: 'SUMMER', priority: 5 },
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Zeckenschutz', body: 'Zecken übertragen **FSME und Borreliose**. Schützen Sie sich: Lange Kleidung in Wald und Wiese, Zeckenschutzmittel verwenden, nach Aufenthalt im Grünen den Körper absuchen.', seasonal: 'SUMMER', priority: 4 },

    // ─── SEASONAL_INFO — Autumn ────────────────────────────────
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Grippeimpfung', body: 'Der Herbst ist die ideale Zeit für die **Grippeimpfung**. Besonders empfohlen für: über 60-Jährige, chronisch Kranke, Schwangere und medizinisches Personal.', seasonal: 'AUTUMN', priority: 5 },
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Vitamin D im Herbst', body: 'Ab Oktober bildet die Haut in Deutschland kaum noch **Vitamin D**. Besprechen Sie mit Ihrem Arzt, ob eine Supplementierung sinnvoll ist (800-1000 IE/Tag als Richtwert).', seasonal: 'AUTUMN', priority: 4 },

    // ─── SEASONAL_INFO — Winter ────────────────────────────────
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Erkältung vs. Grippe', body: '**Erkältung:** langsamer Beginn, leichte Symptome\n**Grippe:** plötzliches hohes Fieber, starkes Krankheitsgefühl\n\nBei Grippe-Verdacht: Arzt kontaktieren, Bettruhe halten, viel trinken!', seasonal: 'WINTER', priority: 5 },
    { type: 'SEASONAL_INFO', category: 'saisonal', title: 'Winterblues vermeiden', body: 'Gegen den Winterblues helfen: **Tageslichtlampe** (10.000 Lux), tägliche Spaziergänge bei Tageslicht, soziale Aktivitäten und Omega-3 reiche Ernährung.', seasonal: 'WINTER', priority: 4 },

    // ─── PRAXIS_NEWS (Beispiel-Content) ────────────────────────
    { type: 'PRAXIS_NEWS', category: 'praxis', title: 'Willkommen bei DiggAI', body: 'Unsere Praxis nutzt **DiggAI** für eine komfortable digitale Anamnese. Bitte beantworten Sie die Fragen in Ruhe — Ihre Daten werden verschlüsselt und sicher verarbeitet.', priority: 10 },
    { type: 'PRAXIS_NEWS', category: 'praxis', title: 'Online-Terminbuchung', body: 'Sie können Termine jetzt auch **online** über unsere Webseite buchen. Weniger Wartezeit, mehr Flexibilität!', priority: 3 },
    { type: 'PRAXIS_NEWS', category: 'praxis', title: 'E-Rezept verfügbar', body: 'Wir stellen ab sofort **E-Rezepte** aus. Sie können Ihr Rezept direkt in der Apotheke mit Ihrer Gesundheitskarte einlösen.', priority: 3 },
    { type: 'PRAXIS_NEWS', category: 'praxis', title: 'Telefonische Sprechstunde', body: 'Montag bis Freitag von **12:00–13:00 Uhr** bieten wir eine telefonische Sprechstunde an. Ideal für Rückfragen und Befundmitteilungen.', priority: 2 },
    { type: 'PRAXIS_NEWS', category: 'praxis', title: 'Ihr Feedback ist wichtig', body: 'Helfen Sie uns, besser zu werden! Nach Ihrem Besuch können Sie uns eine anonyme **Bewertung** hinterlassen. Vielen Dank!', priority: 2 },
];

export async function seedWaitingContent() {
    console.log('[Seed] Seeding WaitingContent...');

    // Delete existing entries
    await prisma.waitingContent.deleteMany();

    // Create all entries
    let created = 0;
    for (const item of WAITING_CONTENT) {
        await prisma.waitingContent.create({
            data: {
                type: item.type,
                category: item.category,
                title: item.title,
                body: item.body,
                imageUrl: null,
                quizData: item.quizData || null,
                priority: item.priority || 0,
                isActive: true,
                seasonal: item.seasonal || null,
                language: 'de',
                minWaitMin: item.minWaitMin || 0,
                maxWaitMin: null,
                displayDurationSec: item.displayDurationSec || 30,
            },
        });
        created++;
    }

    console.log(`[Seed] Created ${created} WaitingContent entries.`);
    return created;
}

// Run standalone — ESM-kompatibel: nur via direktem CLI-Aufruf prüfen.
// Node 24 ESM hat kein `require.main` mehr. Dieser Block wird nur ausgeführt,
// wenn die Datei DIREKT als Hauptmodul gestartet wird (z.B. `tsx prisma/seed-content.ts`).
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    seedWaitingContent()
        .then(() => prisma.$disconnect())
        .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
}
