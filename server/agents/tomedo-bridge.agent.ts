/**
 * Tomedo Bridge Agent
 * 
 * Multi-Agent Orchestrator für die DiggAi-Tomedo-Integration.
 * Koordiniert 9 Subagenten in 3 parallelen Clustern.
 * 
 * Usage:
 *   import { tomedoBridgeAgent } from './tomedo-bridge.agent';
 *   const result = await tomedoBridgeAgent.execute({ patientSessionId, ... });
 */

import { agentService } from '../services/agent/agent.service.js';
import { taskQueue } from '../services/agent/task.queue.js';
import { createLogger } from '../logger.js';
import { emitAgentTaskUpdate } from '../socket.js';
import type { AgentTask } from '../services/agent/task.queue.js';

import { tomedoBridgeOrchestrator } from './tomedo-bridge/orchestrator.js';
import type { BridgeInput, BridgeExecutionResult } from './tomedo-bridge/types.js';

const logger = createLogger('TomedoBridgeAgent');

const AGENT_NAME = 'tomedo-bridge';
const AGENT_TIMEOUT_MS = 120_000; // 2 minutes total timeout

/**
 * Execute the Tomedo Bridge for a patient session
 * This is the main entry point for the bridge
 */
export async function executeTomedoBridge(
    input: BridgeInput,
    options?: {
        waitForCompletion?: boolean;
        onProgress?: (status: string) => void;
    }
): Promise<{ taskId: string; result?: BridgeExecutionResult }> {
    
    logger.info('[TomedoBridge] Enqueuing bridge execution', {
        patientSessionId: input.patientSessionId,
        tenantId: input.tenantId,
    });

    // Create task
    const task = taskQueue.enqueue({
        type: 'tomedo-bridge',
        agentName: AGENT_NAME,
        description: `Tomedo Bridge für Session ${input.patientSessionId}`,
        payload: input as unknown as Record<string, unknown>,
        priority: input.anamneseData.triageResult?.level === 'CRITICAL' ? 'critical' : 'high',
    });

    // Emit initial status (pending is not in the type, so we skip or use running)
    // Task starts in pending state in queue, first emit is when running

    if (options?.waitForCompletion) {
        // Execute synchronously
        const result = await executeBridgeTask(task, input);
        return { taskId: task.id, result };
    }

    // Execute asynchronously
    executeBridgeTask(task, input).catch(error => {
        logger.error('[TomedoBridge] Async execution failed', { error, taskId: task.id });
    });

    return { taskId: task.id };
}

/**
 * Internal execution function
 */
async function executeBridgeTask(
    task: AgentTask,
    input: BridgeInput
): Promise<BridgeExecutionResult> {
    taskQueue.markRunning(task.id);
    emitAgentTaskUpdate({
        taskId: task.id,
        agentName: AGENT_NAME,
        status: 'running',
    });

    try {
        // Execute the orchestrator
        const result = await tomedoBridgeOrchestrator.execute(input, task);

        // Mark task completed
        const resultSummary = {
            success: result.success,
            protocolLength: result.protocol.length,
            totalDurationMs: result.timing.totalDurationMs,
            errorCount: result.errors.length,
        };

        taskQueue.markCompleted(task.id, JSON.stringify(resultSummary));
        emitAgentTaskUpdate({
            taskId: task.id,
            agentName: AGENT_NAME,
            status: 'completed',
            result: JSON.stringify(resultSummary),
        });

        logger.info('[TomedoBridge] Bridge execution completed', {
            taskId: task.id,
            patientSessionId: input.patientSessionId,
            success: result.success,
            durationMs: result.timing.totalDurationMs,
        });

        return result;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        taskQueue.markFailed(task.id, errorMsg);
        emitAgentTaskUpdate({
            taskId: task.id,
            agentName: AGENT_NAME,
            status: 'failed',
            error: errorMsg,
        });

        logger.error('[TomedoBridge] Bridge execution failed', {
            taskId: task.id,
            patientSessionId: input.patientSessionId,
            error: errorMsg,
        });

        throw error;
    }
}

/**
 * Register the agent with the agent service
 */
export function registerTomedoBridgeAgent(): void {
    agentService.register({
        name: AGENT_NAME,
        displayName: 'Tomedo Bridge',
        description: 'Multi-Agent Bridge für DiggAi-Tomedo Integration (9 Subagenten, 3 parallele Cluster)',
        async execute(task: AgentTask): Promise<string> {
            const input = task.payload as unknown as BridgeInput;
            const result = await executeBridgeTask(task, input);
            return result.protocol;
        },
    });

    logger.info('[TomedoBridge] Agent registered');
}

// 2026-05-09 — Tomedo-Bridge dauerhaft entfernt (CK-Entscheidung).
// Tomedo importiert Daten via GDT-Datei-Export (siehe `/api/sessions/:id/export/gdt`).
// Kein in-app-Bridge mehr → weniger Memory, klare Service-Trennung.
// Die alte Auto-Registrierung ist deaktiviert; der Agent wird NICHT mehr beim Boot
// registriert. Falls jemand den Agent doch noch braucht, manueller Aufruf von
// registerTomedoBridgeAgent() ist möglich (Export bleibt erhalten für Tests).
//
// if (process.env.LOW_MEM_MODE !== '1' && process.env.LOW_MEM_MODE !== 'true') {
//     registerTomedoBridgeAgent();
// }

// Export types for consumers
export type { BridgeInput, BridgeExecutionResult } from './tomedo-bridge/types.js';
