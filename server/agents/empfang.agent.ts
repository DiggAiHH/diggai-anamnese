/**
 * EmpfangsAgent — Handles reception tasks: appointments, check-in, FAQs.
 * Uses existing callLlm() + getAiConfig() infrastructure.
 */
import { agentService, type IAgent } from '../services/agent/agent.service';
import { callLlm } from '../services/ai/llm-client';
import { getAiConfig, isAiAvailable } from '../services/ai/ai-config';
import type { AgentTask } from '../services/agent/task.queue';

const SYSTEM_PROMPT = `Du bist der Empfangs-Agent einer deutschen Arztpraxis.
Aufgaben: Terminvereinbarung, Patienten-Check-In, Wartezimmer-Verwaltung, FAQ-Beantwortung.
Antworte immer auf Deutsch, präzise und freundlich.
WICHTIG: Du stellst keine Diagnosen und gibst keine medizinischen Ratschläge.
Antworte im JSON-Format: {"action": "...", "response": "...", "nextStep": "..."}`;

const empfangAgent: IAgent = {
    name: 'empfang',
    displayName: 'Empfangs-Agent',
    description: 'Verwaltet Termine, Check-In und Patientenanfragen',

    async execute(task: AgentTask): Promise<string> {
        const config = await getAiConfig();

        if (!isAiAvailable(config)) {
            // Rule-based fallback when no LLM configured
            return JSON.stringify({
                action: 'info',
                response: `Aufgabe "${task.description}" wurde entgegengenommen. Bitte wenden Sie sich an das Praxisteam.`,
                nextStep: 'manual_review',
            });
        }

        const prompt = `Aufgabe: ${task.description}\n\nZusatzdaten: ${JSON.stringify(task.payload)}`;
        const llmResponse = await callLlm(config, prompt, SYSTEM_PROMPT);

        // Validate JSON output
        try {
            JSON.parse(llmResponse.text);
            return llmResponse.text;
        } catch {
            return JSON.stringify({
                action: 'response',
                response: llmResponse.text,
                nextStep: 'completed',
            });
        }
    },
};

agentService.register(empfangAgent);
