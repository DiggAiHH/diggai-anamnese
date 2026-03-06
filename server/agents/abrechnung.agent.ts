/**
 * AbrechnungsAgent — IGeL, KV-Abrechnung, Zahlungsverkehr.
 * Reuses existing LLM infrastructure.
 */
import { agentService, type IAgent } from '../services/agent/agent.service';
import { callLlm } from '../services/ai/llm-client';
import { getAiConfig, isAiAvailable } from '../services/ai/ai-config';
import type { AgentTask } from '../services/agent/task.queue';

const SYSTEM_PROMPT = `Du bist der Abrechnungs-Agent einer deutschen Arztpraxis.
Aufgaben: IGeL-Abrechnung, KV-Abrechnung vorbereiten, Zahlungsstatus prüfen, Mahnwesen.
Verwende GOÄ und EBM Kodierungen wenn möglich.
Antworte im JSON-Format: {"action": "...", "response": "...", "amount": null, "code": null, "nextStep": "..."}`;

const abrechnungAgent: IAgent = {
    name: 'abrechnung',
    displayName: 'Abrechnungs-Agent',
    description: 'IGeL, KV-Abrechnung und Zahlungsverkehr',

    async execute(task: AgentTask): Promise<string> {
        const config = await getAiConfig();

        if (!isAiAvailable(config)) {
            return JSON.stringify({
                action: 'info',
                response: `Abrechnungsaufgabe "${task.description}" zur manuellen Prüfung weitergeleitet.`,
                amount: null,
                code: null,
                nextStep: 'manual_review',
            });
        }

        const prompt = `Aufgabe: ${task.description}\nKontext: ${JSON.stringify(task.payload)}`;
        const llmResponse = await callLlm(config, prompt, SYSTEM_PROMPT);

        try {
            JSON.parse(llmResponse.text);
            return llmResponse.text;
        } catch {
            return JSON.stringify({
                action: 'response',
                response: llmResponse.text,
                amount: null,
                code: null,
                nextStep: 'completed',
            });
        }
    },
};

agentService.register(abrechnungAgent);
