/**
 * DokumentationsAgent — Erstellt strukturierte Zusammenfassungen von Anamnese-Sessions.
 * Nutzt bestehende callLlm() + getAiConfig() Infrastruktur.
 * WICHTIG: Erstellt nur Zusammenfassungen — stellt keine Diagnosen.
 */
import { agentService, type IAgent } from '../services/agent/agent.service';
import { callLlm } from '../services/ai/llm-client';
import { getAiConfig, isAiAvailable } from '../services/ai/ai-config';
import type { AgentTask } from '../services/agent/task.queue';

const SYSTEM_PROMPT = `Du bist der Dokumentations-Agent einer deutschen Arztpraxis.
Aufgabe: Erstelle eine strukturierte, sachliche Zusammenfassung einer Anamnese-Session für das Praxisteam.

STRIKTE REGELN:
- Du stellst KEINE Diagnosen
- Du gibst KEINE Behandlungsempfehlungen
- Nur Fakten aus den vorliegenden Daten zusammenfassen
- Sprache: Deutsch, medizinisch präzise aber verständlich

Ausgabeformat JSON:
{
  "zusammenfassung": "...",
  "relevantePunkte": ["...", "..."],
  "hinweiseAnArzt": "...",
  "dringlichkeit": "normal|erhöht|dringend"
}`;

const dokumentationAgent: IAgent = {
    name: 'dokumentation',
    displayName: 'Dokumentations-Agent',
    description: 'Erstellt strukturierte Anamnese-Zusammenfassungen für das Praxisteam',

    async execute(task: AgentTask): Promise<string> {
        const config = await getAiConfig();

        if (!isAiAvailable(config)) {
            return JSON.stringify({
                zusammenfassung: `Session ${task.payload.sessionId ?? 'unbekannt'} abgeschlossen — KI nicht verfügbar, manuelle Dokumentation erforderlich.`,
                relevantePunkte: [],
                hinweiseAnArzt: 'Bitte Session manuell prüfen.',
                dringlichkeit: 'normal',
            });
        }

        const prompt = `Anamnese-Session: ${JSON.stringify(task.payload)}\nBeschreibung: ${task.description}`;
        const llmResponse = await callLlm(config, prompt, SYSTEM_PROMPT);

        try {
            return JSON.stringify(JSON.parse(llmResponse.text));
        } catch {
            return JSON.stringify({
                zusammenfassung: llmResponse.text,
                relevantePunkte: [],
                hinweiseAnArzt: '',
                dringlichkeit: 'normal',
            });
        }
    },
};

agentService.register(dokumentationAgent);
