/**
 * MasterOrchestrator — routes tasks to the correct sub-agent.
 * Reuses existing LLM infrastructure (llm-client + ai-config).
 *
 * BSI/EU AI Act Art. 12: All routing decisions are logged via evidence-logger.cjs.
 * Model selection is driven by model-router.cjs (reads model-policy.json + agent-registry.json).
 */
import { createRequire } from 'module';
import { agentService } from '../services/agent/agent.service';
import { taskQueue, type AgentTask, type TaskPriority } from '../services/agent/task.queue';

// Import sub-agents (side-effect: registers them)
import './empfang.agent';
import './triage.agent';
import './abrechnung.agent';
import './dokumentation.agent';
import './tomedo-bridge.agent'; // Multi-Agent Bridge (9 Subagenten)

// Load CommonJS runtime modules (BSI: bin/lib/ is CJS)
const _require = createRequire(import.meta.url);
let _modelRouter: ReturnType<typeof _require> | null = null;
let _evidenceLogger: ReturnType<typeof _require> | null = null;

try {
    _modelRouter = _require('../../../bin/lib/model-router.cjs');
    _evidenceLogger = _require('../../../bin/lib/evidence-logger.cjs');
} catch {
    console.warn('[Orchestrator] bin/lib modules not found — running without model routing + traceability');
}

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

/** Determines whether this task involves PHI (patient health information). */
function containsPhi(payload?: Record<string, unknown>): boolean {
    if (!payload) return false;
    const phiKeys = ['patientId', 'patientName', 'dob', 'ssn', 'diagnose', 'medikamente', 'befund'];
    return phiKeys.some((k) => k in payload);
}

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
    const phiInvolved = containsPhi(params.payload);

    // EU AI Act Art. 12 — traceability: log routing decision before dispatch
    let traceId: string | undefined;
    let selectedModel: string | undefined;
    if (_evidenceLogger && _modelRouter) {
        traceId = _evidenceLogger.newTraceId();
        try {
            const routing = _modelRouter.route({
                agentId: agentName,
                taskDescription: params.description,
                phase: 'execution',
                phiInvolved,
            });
            selectedModel = routing.selectedModel;
            _evidenceLogger.logEvent({
                traceId,
                agentId: agentName,
                sourceDefinition: `agents/${agentName}.md`,
                routingDecision: 'keyword-score',
                selectedModel,
                complianceClass: routing.complianceClass ?? 'eu-hosted',
                inputRef: `task:${params.type}`,
                status: 'dispatched',
                metadata: { taskType: params.type, phiInvolved },
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[Orchestrator] Model routing failed: ${msg}`);
        }
    }

    const task = taskQueue.enqueue({
        type: params.type,
        agentName,
        description: params.description,
        payload: { ...params.payload, _traceId: traceId, _selectedModel: selectedModel },
        priority: params.priority,
    });

    // Dispatch async — don't block caller
    agentService.dispatch(agentName, task).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Orchestrator] Dispatch error for task ${task.id}:`, msg);

        // Log failure for EU AI Act audit trail
        if (_evidenceLogger && traceId) {
            _evidenceLogger.logEvent({
                traceId,
                agentId: agentName,
                sourceDefinition: `agents/${agentName}.md`,
                routingDecision: 'keyword-score',
                selectedModel,
                complianceClass: 'eu-hosted',
                inputRef: `task:${task.id}`,
                status: 'failed',
                errorRef: msg,
            });
        }
    });

    return task;
}

export function startAgentOrchestrator(): void {
    console.log('[Orchestrator] DiggAI Agent Orchestrator started');
    console.log(`[Orchestrator] Registered agents: ${agentService.listAgents().map(a => a.name).join(', ')}`);
    console.log(`[Orchestrator] Model routing: ${_modelRouter ? 'enabled (model-router.cjs)' : 'disabled'}`);
    console.log(`[Orchestrator] Traceability: ${_evidenceLogger ? 'enabled (evidence-logger.cjs)' : 'disabled'}`);
}

