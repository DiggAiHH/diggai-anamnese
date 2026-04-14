/**
 * chatNLU — Rule-Based Natural Language Understanding Engine
 * 
 * Kein echtes LLM — rein regelbasiertes Intent-Matching mit:
 * - Levenshtein-Distanz für Tippfehler-Toleranz
 * - N-Gram-Matching für partielle Treffer
 * - Synonym-Expansion für natürliche Sprache
 * - 25+ Intents für Praxis-Workflows
 * - Multi-language Support (DE, EN, TR, RU, AR, PL)
 * 
 * DSGVO-konform: Alle Verarbeitung findet lokal statt.
 */

// ─── Levenshtein Distance ───────────────────────────────

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // delete
        dp[i][j - 1] + 1,       // insert
        dp[i - 1][j - 1] + cost // substitute
      );
    }
  }
  return dp[m][n];
}

/**
 * Normalized similarity (0..1)
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

// ─── N-Gram Generation ──────────────────────────────────

export function ngrams(text: string, n: number = 2): string[] {
  const cleaned = text.toLowerCase().replace(/[^a-zäöüß\s]/g, '');
  const words = cleaned.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    result.push(words.slice(i, i + n).join(' '));
  }
  return result;
}

// ─── Intent Types ───────────────────────────────────────

export type IntentId =
  // Navigation
  | 'NAV_START'
  | 'NAV_ANAMNESE'
  | 'NAV_REZEPT'
  | 'NAV_AU'
  | 'NAV_UNFALL'
  | 'NAV_UEBERWEISUNG'
  | 'NAV_DATENSCHUTZ'
  | 'NAV_IMPRESSUM'
  | 'NAV_DOCS'
  | 'NAV_ARZT'
  | 'NAV_MFA'
  // Information
  | 'INFO_OEFFNUNGSZEITEN'
  | 'INFO_ADRESSE'
  | 'INFO_TELEFON'
  | 'INFO_NOTFALL'
  | 'INFO_LEISTUNGEN'
  | 'INFO_TEAM'
  | 'INFO_ANFAHRT'
  | 'INFO_VERSICHERUNG'
  | 'INFO_KOSTEN'
  | 'INFO_WARTEZEIT'
  | 'INFO_IMPFUNG'
  | 'INFO_DATENLOESUNG'
  | 'INFO_ANFRAGE_STATUS'
  // Actions
  | 'ACTION_TERMIN'
  | 'ACTION_REZEPT_BESTELLEN'
  | 'ACTION_BEFUND'
  | 'ACTION_AU_ANFRAGEN'
  | 'ACTION_DATEIEN_HOCHLADEN'
  | 'ACTION_NACHRICHT'
  // System
  | 'SYS_HILFE'
  | 'SYS_SPRACHE'
  | 'SYS_DUNKEL'
  | 'SYS_HELL'
  | 'SYS_SCHRIFTGROESSE'
  // Chitchat
  | 'CHITCHAT_GRUSS'
  | 'CHITCHAT_DANKE'
  | 'CHITCHAT_TSCHUESS'
  | 'CHITCHAT_WIE_GEHTS'
  // Fallback
  | 'UNKNOWN';

export interface IntentMatch {
  intent: IntentId;
  confidence: number;
  response: string;
  action?: string;
  route?: string;
}

// ─── Intent Definitions ─────────────────────────────────

interface IntentDef {
  id: IntentId;
  keywords: string[];
  synonyms?: string[];
  patterns?: RegExp[];
  response: string;
  action?: string;
  route?: string;
}

const INTENTS: IntentDef[] = [
  // ─── Navigation ──────────────────
  {
    id: 'NAV_START',
    keywords: ['startseite', 'start', 'anfang', 'home', 'hauptmenü', 'zurück zum start'],
    response: 'Ich bringe Sie zurück zur Startseite.',
    route: '/',
  },
  {
    id: 'NAV_ANAMNESE',
    keywords: ['anamnese', 'fragebogen', 'gesundheitsfragebogen', 'vorbereitung', 'termin vorbereiten'],
    synonyms: ['checkup', 'untersuchung', 'vorsorge'],
    response: 'Ich starte den Anamnese-Fragebogen für Sie.',
    route: '/patient',
    action: 'START_ANAMNESE',
  },
  {
    id: 'NAV_REZEPT',
    keywords: ['rezept', 'medikament', 'medikamente', 'folgerezept', 'verschreibung'],
    synonyms: ['pille', 'tabletten', 'arznei'],
    response: 'Ich öffne die Rezeptanforderung für Sie.',
    route: '/patient',
    action: 'START_REZEPT',
  },
  {
    id: 'NAV_AU',
    keywords: ['krankschreibung', 'au', 'arbeitsunfähigkeit', 'krank', 'krankmeldung'],
    synonyms: ['krankenschein', 'attest'],
    response: 'Ich öffne die AU-Anfrage für Sie.',
    route: '/patient',
    action: 'START_AU',
  },
  {
    id: 'NAV_UNFALL',
    keywords: ['unfall', 'unfallmeldung', 'arbeitsunfall', 'bg', 'berufsgenossenschaft', 'wegeunfall'],
    response: 'Ich öffne die Unfallmeldung für Sie.',
    route: '/patient',
    action: 'START_UNFALL',
  },
  {
    id: 'NAV_UEBERWEISUNG',
    keywords: ['überweisung', 'facharzt', 'weiterleitung', 'specialist'],
    response: 'Ich öffne die Überweisungsanfrage für Sie.',
    route: '/patient',
    action: 'START_UEBERWEISUNG',
  },
  {
    id: 'NAV_DATENSCHUTZ',
    keywords: ['datenschutz', 'dsgvo', 'privacy', 'datenschutzerklärung'],
    response: 'Hier finden Sie unsere Datenschutzerklärung.',
    route: '/datenschutz',
  },
  {
    id: 'NAV_IMPRESSUM',
    keywords: ['impressum', 'kontakt', 'betreiber', 'verantwortlich'],
    response: 'Hier ist unser Impressum.',
    route: '/impressum',
  },
  {
    id: 'NAV_DOCS',
    keywords: ['dokumentation', 'handbuch', 'anleitung', 'bedienungsanleitung', 'hilfe seite'],
    response: 'Ich öffne die Dokumentation für Sie.',
    route: '/docs',
  },
  {
    id: 'NAV_ARZT',
    keywords: ['arzt dashboard', 'arzt login', 'arzt zugang', 'doktor'],
    response: 'Ich öffne das Arzt-Dashboard.',
    route: '/arzt',
  },
  {
    id: 'NAV_MFA',
    keywords: ['mfa dashboard', 'mfa login', 'mfa zugang', 'empfang', 'rezeption'],
    response: 'Ich öffne das MFA-Dashboard.',
    route: '/mfa',
  },

  // ─── Information ─────────────────
  {
    id: 'INFO_OEFFNUNGSZEITEN',
    keywords: ['öffnungszeiten', 'offen', 'geöffnet', 'sprechzeiten', 'sprechstunde', 'wann'],
    patterns: [/wann.*offen/i, /wann.*auf/i, /haben.*offen/i],
    response: 'Unsere Sprechzeiten:\nMo–Fr: 8:00–12:00 Uhr\nMo, Di, Do: 15:00–18:00 Uhr\nMi + Fr Nachmittag: geschlossen\nTermine nach Vereinbarung.',
  },
  {
    id: 'INFO_ADRESSE',
    keywords: ['adresse', 'wo', 'standort', 'anschrift', 'praxis finden'],
    patterns: [/wo.*praxis/i, /wo.*sind.*sie/i],
    response: 'Praxis Dr. Klaproth\nMusterstraße 42\n20095 Hamburg\n(Nähe Hauptbahnhof)',
  },
  {
    id: 'INFO_TELEFON',
    keywords: ['telefon', 'telefonnummer', 'anrufen', 'nummer', 'fax'],
    response: 'Telefon: 040 / 123 456 78\nFax: 040 / 123 456 79\nE-Mail: praxis@dr-klaproth.de',
  },
  {
    id: 'INFO_NOTFALL',
    keywords: ['notfall', 'notarzt', 'rettungsdienst', 'emergency', '112', 'lebensbedroh'],
    patterns: [/brauche.*hilfe.*sofort/i, /sterb/i, /atemnot/i, /bewusstlos/i],
    response: '🚨 NOTFALL: Bitte rufen Sie sofort 112 an!\nBei lebensbedrohlichen Notfällen wählen Sie den Rettungsdienst: 112\nÄrztlicher Bereitschaftsdienst: 116 117',
  },
  {
    id: 'INFO_LEISTUNGEN',
    keywords: ['leistungen', 'services', 'angebot', 'was bieten', 'was machen'],
    response: 'Unsere Leistungen:\n• Allgemeinmedizin\n• Vorsorgeuntersuchungen\n• Arbeitsmedizin / BG-Unfälle\n• DMP (Diabetes, COPD, KHK)\n• Impfungen\n• Reisemedizin\n• Hautkrebsscreening',
  },
  {
    id: 'INFO_TEAM',
    keywords: ['team', 'ärzte', 'mitarbeiter', 'wer arbeitet', 'praxisteam'],
    response: 'Unser Team:\n• Dr. Klaproth — Facharzt für Allgemeinmedizin\n• Sandra Meier — Medizinische Fachangestellte\n• Dr. Fischer — Assistenzarzt',
  },
  {
    id: 'INFO_ANFAHRT',
    keywords: ['anfahrt', 'parken', 'parkplatz', 'bus', 'bahn', 'öpnv', 'route'],
    response: 'Anfahrt:\n🚇 U-Bahn: Hauptbahnhof (5 Min. Fußweg)\n🚌 Bus: Linie 6, Haltestelle Musterstraße\n🅿️ Parkhaus am Hauptbahnhof (5 Min.)\n♿ Barrierefrei zugänglich',
  },

  {
    id: 'INFO_VERSICHERUNG',
    keywords: ['versicherung', 'versichert', 'gkv', 'pkv', 'krankenkasse', 'kasse', 'karte', 'versichertenkarte', 'chipkarte', 'selbstzahler', 'privatpatient', 'kassenpatient'],
    synonyms: ['insurance', 'krankenversicherung'],
    patterns: [/bin.*privat.*versichert/i, /akzeptieren.*sie.*pkv/i, /nehmen.*sie.*kasse/i],
    response: 'Wir akzeptieren gesetzlich (GKV) und privat (PKV) versicherte Patienten sowie Selbstzahler. Bitte halten Sie Ihre Versichertenkarte bereit.',
  },
  {
    id: 'INFO_KOSTEN',
    keywords: ['kosten', 'preis', 'was kostet', 'rechnung', 'abrechnung', 'igel', 'privatleistung', 'goä', 'selbstbeteiligung', 'zuzahlung', 'bezahlen', 'gebühr'],
    synonyms: ['billing', 'cost', 'price', 'fee'],
    patterns: [/was.*kostet/i, /muss.*ich.*zahlen/i, /igel.*leistung/i],
    response: 'Kassenärztliche Leistungen werden direkt über Ihre Versichertenkarte abgerechnet. Privatleistungen (IGeL) werden nach GOÄ berechnet. Sie werden vor der Behandlung über eventuelle Kosten informiert.',
  },
  {
    id: 'INFO_WARTEZEIT',
    keywords: ['wartezeit', 'wartezimmer', 'warte', 'wie lange', 'warteschlange', 'position', 'queue', 'an der reihe', 'wann dran'],
    patterns: [/wie lange.*warten/i, /wie viel.*warten/i, /bin ich.*dran/i, /wartezimmer.*voll/i],
    response: 'Ihre aktuelle Warteposition können Sie in der App jederzeit einsehen. Notfälle werden immer priorisiert. Die Durchschnittswartezeit beträgt 15–30 Minuten.',
  },
  {
    id: 'INFO_IMPFUNG',
    keywords: ['impfung', 'impfen', 'impfpass', 'stiko', 'grippe', 'grippeschutz', 'corona', 'covid', 'reiseimpfung', 'tetanus', 'masern', 'hepatitis'],
    synonyms: ['vaccination', 'vaccine', 'flu shot'],
    patterns: [/brauche.*impfung/i, /impf.*status/i, /ist.*impfung.*fällig/i],
    response: 'Wir bieten alle STIKO-empfohlenen Impfungen an:\n• Grippe (saisonal)\n• COVID-19\n• Tetanus, Diphtherie, Pertussis\n• Masern-Mumps-Röteln\n• Reiseimpfungen\nBitte bringen Sie Ihren Impfpass mit.',
  },
  {
    id: 'INFO_DATENLOESUNG',
    keywords: ['daten löschen', 'löschung', 'recht auf löschung', 'art 17', 'dsgvo löschung', 'datenlöschung', 'daten entfernen', 'vergessen werden'],
    patterns: [/möchte.*daten.*löschen/i, /recht.*löschung/i, /daten.*entfernen/i],
    response: 'Ihre Daten werden 24 Stunden nach Sitzungsende automatisch gelöscht. Sie können jederzeit eine sofortige Löschung gemäß DSGVO Art. 17 beantragen – sprechen Sie dazu unser Praxisteam an.',
    route: '/datenschutz',
  },
  {
    id: 'INFO_ANFRAGE_STATUS',
    keywords: ['anfrage status', 'status meiner anfrage', 'bearbeitungsstand', 'rückmeldung', 'rueckmeldung', 'wann antwort', 'email von praxis'],
    patterns: [/wurde.*anfrage.*bearbeitet/i, /status.*anfrage/i, /wann.*antwort/i, /bekomme.*mail/i],
    response: 'Sobald Ihre Anfrage bearbeitet wurde, erhalten Sie eine strukturierte Rückmeldung per E-Mail oder direkt im Praxis-Chat. Wenn keine E-Mail hinterlegt ist, meldet sich das Praxisteam telefonisch oder vor Ort.',
  },

  // ─── Actions ─────────────────────
  {
    id: 'ACTION_TERMIN',
    keywords: ['termin', 'termin machen', 'termin buchen', 'termin vereinbaren', 'appointment'],
    patterns: [/möchte.*termin/i, /brauche.*termin/i, /termin.*frei/i],
    response: 'Termine können Sie online über unseren Fragebogen vorbereiten, oder rufen Sie uns an:\n📞 040 / 123 456 78',
    action: 'SUGGEST_ANAMNESE',
  },
  {
    id: 'ACTION_REZEPT_BESTELLEN',
    keywords: ['rezept bestellen', 'rezept anfragen', 'medikament nachbestellen', 'folgerezept anfragen'],
    patterns: [/brauche.*rezept/i, /möchte.*rezept/i, /rezept.*bestellen/i],
    response: 'Ich starte die Rezeptanforderung. Bitte halten Sie Ihre Versichertenkarte bereit.',
    route: '/patient',
    action: 'START_REZEPT',
  },
  {
    id: 'ACTION_BEFUND',
    keywords: ['befund', 'ergebnis', 'laborwerte', 'blutbild', 'labor'],
    patterns: [/meine.*ergebnisse/i, /mein.*befund/i, /labor.*ergebnis/i],
    response: 'Befundanfragen können Sie über "Nachricht" an das Praxisteam senden. Bitte beachten Sie, dass Befunde aus Datenschutzgründen nur nach Identifikation herausgegeben werden.',
    action: 'START_BEFUND',
  },
  {
    id: 'ACTION_AU_ANFRAGEN',
    keywords: ['krankschreibung anfragen', 'au anfragen', 'krank melden'],
    patterns: [/bin.*krank/i, /brauche.*krankschreibung/i, /kann.*nicht.*arbeit/i],
    response: 'Ich starte die Krankmeldung für Sie.',
    route: '/patient',
    action: 'START_AU',
  },
  {
    id: 'ACTION_DATEIEN_HOCHLADEN',
    keywords: ['datei hochladen', 'dokument hochladen', 'befund hochladen', 'upload', 'bild hochladen'],
    response: 'Sie können Dateien über den "Dateien"-Service hochladen.',
    route: '/patient',
    action: 'START_DATEIEN',
  },
  {
    id: 'ACTION_NACHRICHT',
    keywords: ['nachricht', 'nachricht senden', 'message', 'frage an arzt', 'dem arzt schreiben', 'postfach', 'kontakt zur praxis', 'frage an praxis', 'email an praxis'],
    patterns: [/möchte.*arzt.*schreiben/i, /nachricht.*arzt/i, /anliegen.*senden/i, /praxis.*kontaktieren/i],
    response: 'Ich öffne das Nachrichtenformular. Dort können Sie Ihr Anliegen sicher an das Praxisteam senden und später eine strukturierte Rückmeldung erhalten.',
    route: '/patient',
    action: 'START_NACHRICHT',
  },

  // ─── System ──────────────────────
  {
    id: 'SYS_HILFE',
    keywords: ['hilfe', 'help', 'was kann ich', 'was kannst du', 'funktionen', 'befehle'],
    patterns: [/was.*kannst.*du/i, /wie.*funktioniert/i],
    response: 'Ich kann Ihnen helfen mit:\n• Anamnese starten\n• Rezepte anfragen\n• Krankschreibungen\n• Unfallmeldungen\n• Öffnungszeiten & Kontakt\n• Datenschutz-Informationen\n\nFragen Sie einfach – ich helfe gerne!',
  },
  {
    id: 'SYS_SPRACHE',
    keywords: ['sprache', 'language', 'english', 'türkçe', 'русский', 'polski', 'عربی', 'français'],
    patterns: [/sprache.*ändern/i, /andere.*sprache/i, /speak.*english/i],
    response: 'Sie können die Sprache oben rechts über den Sprachschalter ändern. Wir unterstützen: Deutsch, English, Türkçe, Русский, العربية, Polski, فارسی, Українська, Français, Español.',
    action: 'SHOW_LANGUAGE_SELECTOR',
  },
  {
    id: 'SYS_DUNKEL',
    keywords: ['dark mode', 'dunkler modus', 'nachtmodus', 'dunkel'],
    patterns: [/mach.*dunkel/i, /dunkles.*design/i],
    response: 'Ich schalte auf den dunklen Modus um.',
    action: 'SET_THEME_DARK',
  },
  {
    id: 'SYS_HELL',
    keywords: ['light mode', 'heller modus', 'tagmodus', 'hell'],
    patterns: [/mach.*hell/i, /helles.*design/i],
    response: 'Ich schalte auf den hellen Modus um.',
    action: 'SET_THEME_LIGHT',
  },
  {
    id: 'SYS_SCHRIFTGROESSE',
    keywords: ['schriftgröße', 'font size', 'größer', 'kleiner', 'text größe'],
    patterns: [/schrift.*größer/i, /schrift.*kleiner/i, /text.*größer/i],
    response: 'Sie können die Schriftgröße über die Barrierefreiheits-Einstellungen anpassen (A+ / A- Schalter).',
    action: 'SHOW_FONT_SIZE',
  },

  // ─── Chitchat ────────────────────
  {
    id: 'CHITCHAT_GRUSS',
    keywords: ['hallo', 'hi', 'guten tag', 'guten morgen', 'guten abend', 'moin', 'servus', 'hello'],
    response: 'Hallo! 👋 Willkommen in der Praxis Dr. Klaproth. Wie kann ich Ihnen helfen?',
  },
  {
    id: 'CHITCHAT_DANKE',
    keywords: ['danke', 'vielen dank', 'dankeschön', 'thanks', 'thank you', 'merci'],
    response: 'Gerne! Kann ich noch etwas für Sie tun?',
  },
  {
    id: 'CHITCHAT_TSCHUESS',
    keywords: ['tschüss', 'auf wiedersehen', 'bye', 'ciao', 'bis dann', 'goodbye'],
    response: 'Auf Wiedersehen! Wir wünschen Ihnen alles Gute. 👋',
  },
  {
    id: 'CHITCHAT_WIE_GEHTS',
    keywords: ['wie geht es', 'wie gehts', 'alles gut', 'how are you'],
    patterns: [/wie.*geht.*dir/i, /wie.*geht.*ihnen/i],
    response: 'Mir geht es gut, danke der Nachfrage! 😊 Wie kann ich Ihnen helfen?',
  },
];

// ─── Core NLU Engine ────────────────────────────────────

export function matchIntent(userInput: string): IntentMatch {
  const input = userInput.trim().toLowerCase();
  if (!input) {
    return { intent: 'UNKNOWN', confidence: 0, response: '' };
  }

  let bestMatch: IntentMatch = {
    intent: 'UNKNOWN',
    confidence: 0,
    response: 'Tut mir leid, das habe ich nicht verstanden. Versuchen Sie z.B. "Termin", "Rezept", "Öffnungszeiten" oder "Hilfe".',
  };

  for (const def of INTENTS) {
    let score = 0;

    // 1. Exact keyword match
    for (const kw of def.keywords) {
      if (input === kw) {
        score = Math.max(score, 1.0);
      } else if (input.includes(kw)) {
        score = Math.max(score, 0.85);
      }
    }

    // 2. Synonym match
    if (def.synonyms) {
      for (const syn of def.synonyms) {
        if (input.includes(syn)) {
          score = Math.max(score, 0.75);
        }
      }
    }

    // 3. Regex pattern match
    if (def.patterns) {
      for (const pattern of def.patterns) {
        if (pattern.test(input)) {
          score = Math.max(score, 0.9);
        }
      }
    }

    // 4. Fuzzy keyword matching (Levenshtein)
    if (score < 0.7) {
      const inputWords = input.split(/\s+/);
      for (const kw of def.keywords) {
        const kwWords = kw.split(/\s+/);
        for (const iw of inputWords) {
          for (const kw2 of kwWords) {
            const sim = similarity(iw, kw2);
            if (sim >= 0.75) {
              score = Math.max(score, sim * 0.7); // Scaled down since it's fuzzy
            }
          }
        }
      }
    }

    // 5. N-gram match (bigrams)
    if (score < 0.6) {
      const inputBigrams = ngrams(input, 2);
      for (const kw of def.keywords) {
        const kwBigrams = ngrams(kw, 2);
        const overlap = inputBigrams.filter(b => kwBigrams.includes(b)).length;
        if (overlap > 0 && kwBigrams.length > 0) {
          const ngramScore = overlap / kwBigrams.length;
          score = Math.max(score, ngramScore * 0.65);
        }
      }
    }

    if (score > bestMatch.confidence) {
      bestMatch = {
        intent: def.id,
        confidence: score,
        response: def.response,
        action: def.action,
        route: def.route,
      };
    }
  }

  // Confidence threshold
  if (bestMatch.confidence < 0.4) {
    return {
      intent: 'UNKNOWN',
      confidence: bestMatch.confidence,
      response: 'Tut mir leid, das habe ich nicht ganz verstanden. Probieren Sie:\n• "Termin" — Termin vorbereiten\n• "Rezept" — Rezeptanforderung\n• "Nachricht" — Anliegen an die Praxis senden\n• "Status meiner Anfrage" — Rückmeldung prüfen\n• "Hilfe" — Alle Funktionen',
    };
  }

  return bestMatch;
}

// ─── Multi-Intent Detection ─────────────────────────────

export function matchMultipleIntents(userInput: string, maxResults: number = 3): IntentMatch[] {
  const input = userInput.trim().toLowerCase();
  if (!input) return [];

  const results: IntentMatch[] = [];

  for (const def of INTENTS) {
    let score = 0;

    for (const kw of def.keywords) {
      if (input === kw) score = Math.max(score, 1.0);
      else if (input.includes(kw)) score = Math.max(score, 0.85);
    }

    if (def.synonyms) {
      for (const syn of def.synonyms) {
        if (input.includes(syn)) score = Math.max(score, 0.75);
      }
    }

    if (def.patterns) {
      for (const pattern of def.patterns) {
        if (pattern.test(input)) score = Math.max(score, 0.9);
      }
    }

    if (score >= 0.4) {
      results.push({
        intent: def.id,
        confidence: score,
        response: def.response,
        action: def.action,
        route: def.route,
      });
    }
  }

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

// ─── Quick Suggestions ──────────────────────────────────

export function getQuickSuggestions(): { label: string; query: string }[] {
  return [
    { label: '📋 Termin vorbereiten', query: 'anamnese' },
    { label: '💊 Rezept anfragen', query: 'rezept bestellen' },
    { label: '🏥 Krankschreibung', query: 'krankschreibung' },
    { label: '✉️ Nachricht an Praxis', query: 'nachricht an praxis' },
    { label: '🕐 Öffnungszeiten', query: 'öffnungszeiten' },
    { label: '📍 Anfahrt', query: 'anfahrt' },
    { label: '📞 Kontakt', query: 'telefon' },
    { label: '🚨 Notfall', query: 'notfall' },
    { label: '❓ Hilfe', query: 'hilfe' },
  ];
}
