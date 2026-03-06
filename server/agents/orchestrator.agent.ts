/**
 * MasterOrchestrator — routes tasks to the correct sub-agent.
 * Reuses existing LLM infrastructure (llm-client + ai-config).
 */
import { agentService } from '../services/agent/agent.service';
import { taskQueue, type AgentTask, type TaskPriority } from '../services/agent/task.queue';

// Import sub-agents (side-effect: registers them)
import './empfang.agent';
import './triage.agent';
import './abrechnung.agent';
import './dokumentation.agent';

const AGENT_KEYWORDS: Record<string, string[]> = {
    triage: [
        'notfall', 'dringend', 'schmerz', 'blut', 'priorisier', 'emergency', 'triage',
        'ohnmacht', 'bewusstlos', 'atemnot', 'herzschmerz', 'kollaps', 'vergiftung',
    ],
    abrechnung: [
        'rechnung', 'igel', 'abrechnung', 'zahlung', 'kasse', 'privat', 'goa',
        'honorar', 'kassenleistung', 'selbstzahler', 'kostenvoranschlag', 'erstattung',
    ],
    dokumentation: [
        'doku', 'dokumentation', 'bericht', 'zusammenfassung', 'arztbrief',
        'entlassbrief', 'befund', 'protokoll', 'anamnese zusammenfassung',
    ],
    empfang: [
        'termin', 'appointment', 'checkin', 'anmeldung', 'buchung', 'warte',
        'faq', 'info', 'öffnungszeit', 'wartezeit', 'umbuchung', 'stornierung',
    ],
};

/** Score-based routing: picks the agent with the most keyword hits. Falls back to 'empfang'. */
function routeTask(description: string): string {
    const lower = description.toLowerCase();
    let bestAgent = 'empfang';
    let bestScore = 0;

    for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
        const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestAgent = agent;
        }
    }

    return bestAgent;
}

export function createTask(params: {
    type: string;
    description: string;
    payload?: Record<string, unknown>;
    priority?: TaskPriority;
}): AgentTask {
    const agentName = routeTask(params.description);
    const task = taskQueue.enqueue({
        type: params.type,
        agentName,
        description: params.description,
        payload: params.payload,
        priority: params.priority,
    });

    // Dispatch async — don't block caller
    agentService.dispatch(agentName, task).catch((err: unknown) => {
        console.error(`[Orchestrator] Dispatch error for task ${task.id}:`, err);
    });

    return task;
}

export function startAgentOrchestrator(): void {
    console.log('[Orchestrator] DiggAI Agent Orchestrator started');
    console.log(`[Orchestrator] Registered agents: ${agentService.listAgents().map(a => a.name).join(', ')}`);
}
