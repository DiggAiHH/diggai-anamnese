/**
 * TriageAgent — Prioritizes incoming patient requests, identifies emergencies.
 * Uses existing LLM infrastructure. NEVER makes diagnoses.
 */
import { agentService, type IAgent } from '../services/agent/agent.service';
import { callLlm } from '../services/ai/llm-client';
import { getAiConfig, isAiAvailable } from '../services/ai/ai-config';
import type { AgentTask } from '../services/agent/task.queue';

const SYSTEM_PROMPT = `Du bist der Triage-Agent einer deutschen Arztpraxis.
Aufgaben: Eingehende Anfragen priorisieren, Notfälle identifizieren und eskalieren.

STRIKTE REGELN:
- Du stellst KEINE Diagnosen
- Du gibst KEINE Behandlungsempfehlungen
- Bei Unsicherheit: immer als "dringend" einordnen

Prioritätsstufen: critical (Notfall, sofort) | high (dringend, heute) | normal (regulär) | low (Routineanfrage)

Antworte im JSON-Format:
{"priority": "normal|high|critical|low", "reason": "...", "action": "...", "escalate": true/false}`;

const triageAgent: IAgent = {
    name: 'triage',
    displayName: 'Triage-Agent',
    description: 'Priorisiert Patientenanfragen und erkennt Notfälle',

    async execute(task: AgentTask): Promise<string> {
        const config = await getAiConfig();

        if (!isAiAvailable(config)) {
            // Conservative fallback: mark as high priority for manual review
            return JSON.stringify({
                priority: 'high',
                reason: 'KI nicht verfügbar — manuelle Prüfung erforderlich',
                action: 'Bitte Praxispersonal informieren',
                escalate: true,
            });
        }

        const prompt = `Patientenanliegen: ${task.description}\n\nKontext: ${JSON.stringify(task.payload)}`;
        const llmResponse = await callLlm(config, prompt, SYSTEM_PROMPT);

        try {
            const parsed = JSON.parse(llmResponse.text);
            // Force escalate for critical
            if (parsed.priority === 'critical') parsed.escalate = true;
            return JSON.stringify(parsed);
        } catch {
            return JSON.stringify({
                priority: 'high',
                reason: 'Parsing-Fehler — konservative Priorisierung',
                action: llmResponse.text,
                escalate: true,
            });
        }
    },
};

agentService.register(triageAgent);
