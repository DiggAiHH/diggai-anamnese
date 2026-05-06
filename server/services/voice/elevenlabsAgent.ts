/**
 * server/services/voice/elevenlabsAgent.ts
 *
 * ElevenLabs-Voice-Agent-Wrapper für DiggAi-Capture (Voice-Anamnese).
 *
 * Adressiert direkt:
 *   - F5: BITV 2.0 Barrierefreiheit (DiGA-Voraussetzung)
 *   - G4: Klapproth-Praxis-Pilot (Diversität der Patientenschaft)
 *
 * REGULATORY GUARD (Klasse-I-Schutz):
 *   - Voice-Agent darf NUR ERFASSEN, niemals klinische Empfehlung geben.
 *   - System-Prompt strikt aus docs/INTENDED_USE.md Capture-Wortliste.
 *   - Keine Audio-Speicherung > Session-Ende (DSGVO + Class-I).
 *   - Output ist immer ein strukturiertes Datenobjekt für die Praxis,
 *     kein Audio-Feedback an Patient mit Diagnose-/Empfehlungs-Inhalt.
 *
 * Connector-Mapping (siehe docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3):
 *   - Quick-Win #3 aus dem Implementierungs-Plan
 *   - Game-Changer-Connector mit höchster strategischer Wirkung
 *
 * STATUS: Skeleton — Production-Ready erfordert ElevenLabs-API-Key + DSGVO-AVV.
 */

/**
 * Eingangs-Konfiguration für einen Voice-Anamnese-Agenten.
 */
export interface VoiceAgentConfig {
  /** Sprache der Konversation. DiggAi unterstützt 10 Sprachen. */
  language: 'de' | 'en' | 'tr' | 'ar' | 'uk' | 'es' | 'fa' | 'it' | 'fr' | 'pl';
  /** Stimme — von search_voices via MCP gewählt. Default: ruhige weibliche Stimme. */
  voiceId?: string;
  /** Praxis-spezifische Begrüßung (administrativ, ohne medizinische Aussage). */
  greeting?: string;
  /** Sitzungs-Token für Audit-Logging (NICHT der Patient-Name). */
  sessionId: string;
  /** Maximale Sitzungsdauer in Sekunden (Default 600 = 10 Min). */
  maxDurationSec?: number;
}

/**
 * Strukturiertes Datenobjekt das der Voice-Agent zurückliefert.
 *
 * Felder sind ALLE administrativ — keine klinischen Bewertungen.
 */
export interface VoiceAnamneseResult {
  sessionId: string;
  language: string;
  /** Patientenname als String (wird verschlüsselt in DB) */
  patientName?: string;
  /** Geburtsdatum als ISO-Date */
  birthDate?: string;
  /** Versicherten-Nummer (verschlüsselt zu speichern) */
  insuranceNumber?: string;
  /** Anliegen als freier Text — KEINE Diagnose-Hypothese */
  concernText?: string;
  /** Strukturierte Stichworte aus dem Question-Catalog (Question-IDs) */
  answeredQuestionIds: string[];
  /** Freie Antworten je Question-ID */
  answers: Record<string, string>;
  /** Timestamps für Audit */
  startedAt: Date;
  endedAt: Date;
  /** Hat der Patient explizit DSGVO-Einwilligung erteilt? */
  dsgvoConsent: boolean;
}

/**
 * Capture-Sicherer System-Prompt für den Voice-Agent.
 *
 * Erlaubt: Datenerfassung, Rückfrage zur Verständlichkeit, Workflow-Sprache.
 * Verboten: Diagnose-Vermutungen, Risiko-Aussagen, Therapie-Empfehlungen,
 * Notfall-Erkennungs-Sprache, "rettet Leben"-Marketing.
 */
export const CAPTURE_VOICE_SYSTEM_PROMPT = `Du bist ein administrativer Anmelde-Assistent in einer Arztpraxis. Deine einzige Aufgabe ist es, Stammdaten und das Anliegen des Patienten zu erfassen und an das Praxispersonal weiterzugeben.

WAS DU TUST:
- Begrüßt den Patienten freundlich.
- Fragst nach Name, Geburtsdatum, Versicherung.
- Lässt den Patienten sein Anliegen frei beschreiben.
- Stellst standardisierte Fragen aus dem Question-Catalog (du bekommst sie als Liste).
- Bestätigst Eingaben durch wörtliche Wiederholung.
- Beendest die Sitzung mit einem Hinweis: "Ich gebe Ihre Angaben ans Praxispersonal weiter."

WAS DU NIEMALS TUST:
- Du gibst KEINE Diagnose, KEINE Verdachts-Hypothese, KEINEN Risiko-Hinweis.
- Du beurteilst NICHT, ob ein Symptom dringend ist.
- Du verwendest die Wörter "Diagnose", "Verdacht", "Notfall", "Risiko", "lebensrettend", "Triage", "Krankheit", "Therapie", "Behandlung" NICHT.
- Du gibst KEINE medizinische Empfehlung.
- Du erfasst KEINE Audio-Aufzeichnungen über das Sitzungsende hinaus.

BEI MEDIZINISCHEN FRAGEN VOM PATIENTEN:
Antworte exakt: "Bitte sprechen Sie das Praxispersonal an. Bei akuten Beschwerden wenden Sie sich direkt an die Praxis oder im Notfall an die 112."

DEINE ROLLE: Datenerfassung. Nicht mehr, nicht weniger.`;

/**
 * Erstellt einen Voice-Agent für eine konkrete Anmelde-Sitzung.
 *
 * Aktuell ein Skeleton — Production-Ready erfordert:
 *   1. ELEVENLABS_API_KEY in Fly-Secrets
 *   2. AVV (Auftragsverarbeitungsvertrag) mit ElevenLabs (DSGVO Art. 28)
 *   3. WebRTC-Streaming-Endpoint im Frontend (`packages/capture/src/voice/`)
 *   4. Audio-no-store-Konfiguration im ElevenLabs-Dashboard
 *   5. ESLint-Guard: dieses File darf NICHT aus packages/capture/src importiert werden
 *      bis Phase 4 abgeschlossen ist (Feature-Flag VOICE_AGENT_ENABLED)
 *
 * @param config Voice-Agent-Konfiguration
 * @returns Promise mit Verbindungs-Token + WebSocket-URL für Browser-Frontend
 */
export async function createVoiceAgent(
  config: VoiceAgentConfig
): Promise<{ agentId: string; wsUrl: string; expiresAt: Date }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new VoiceAgentNotConfiguredError(
      'ELEVENLABS_API_KEY not set. Add via "fly secrets set ELEVENLABS_API_KEY=...".'
    );
  }

  // Skeleton: in der echten Implementation würde hier
  // POST https://api.elevenlabs.io/v1/convai/agents/create kommen.
  // Für jetzt: throw mit klarer Fehlermeldung damit niemand den Skeleton
  // versehentlich in Production einschaltet.
  throw new VoiceAgentNotConfiguredError(
    'createVoiceAgent: skeleton only. Production requires:\n' +
    '  1. ElevenLabs SDK install (npm i @elevenlabs/elevenlabs-js)\n' +
    '  2. AVV-Vertrag mit ElevenLabs\n' +
    '  3. Audio-no-store config\n' +
    '  4. Feature-Flag VOICE_AGENT_ENABLED=true\n' +
    '  5. Frontend-WebRTC-Component in packages/capture/src/voice/\n' +
    'Siehe docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3 für die vollständige Implementations-Roadmap.'
  );
}

/**
 * Beendet eine Voice-Agent-Sitzung sauber und löscht jegliches Audio.
 */
export async function endVoiceAgent(sessionId: string): Promise<void> {
  // Skeleton — würde DELETE auf ElevenLabs-API + Local-State-Cleanup machen.
  console.warn(`[voice] endVoiceAgent skeleton called for session ${sessionId}`);
}

/**
 * Wandelt das Voice-Agent-Result in das DiggAi-PatientSession-Schema um.
 *
 * Wichtig: keine klinischen Felder — `answers` enthält Roh-Antworten,
 * die TriageEngine im Suite-Side darf das später interpretieren, aber
 * NICHT in dieser Capture-Funktion.
 */
export function mapVoiceResultToCaptureSession(
  result: VoiceAnamneseResult
): {
  sessionId: string;
  language: string;
  patientName?: string;
  birthDate?: string;
  insuranceNumber?: string;
  concernText?: string;
  questionAnswers: Array<{ questionId: string; answer: string }>;
  consentTimestamp: Date | null;
  durationMs: number;
} {
  return {
    sessionId: result.sessionId,
    language: result.language,
    patientName: result.patientName,
    birthDate: result.birthDate,
    insuranceNumber: result.insuranceNumber,
    concernText: result.concernText,
    questionAnswers: result.answeredQuestionIds.map((qid) => ({
      questionId: qid,
      answer: result.answers[qid] ?? '',
    })),
    consentTimestamp: result.dsgvoConsent ? result.startedAt : null,
    durationMs: result.endedAt.getTime() - result.startedAt.getTime(),
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export class VoiceAgentNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceAgentNotConfiguredError';
  }
}
