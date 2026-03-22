import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { agentService } from '../services/agent/agent.service';
import { taskQueue } from '../services/agent/task.queue';
import { messageBroker, type BrokerMessage } from '../services/messagebroker.service';
import { auditService } from '../services/audit.service';
import { agentCoreClient } from '../services/agentcore.client';
import { createTask } from '../agents/orchestrator.agent';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All agent routes require authentication + admin or arzt role
router.use(requireAuth, requireRole('admin', 'arzt'));

/** Extract a route param as a guaranteed string (Express 5 compat) */
function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

/**
 * @swagger
 * /agents:
 *   get:
 *     tags: [Agents]
 *     summary: Listet alle DiggAI-Agenten
 *     description: Gibt In-Memory-Agenten-Registry und DB-Agenten-Status zurück.
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: Agenten-Liste
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string, example: "orchestrator" }
 *                       online: { type: boolean }
 *                       busy: { type: boolean }
 *                 dbAgents:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Nicht authentifiziert
 */
// ─── GET /api/agents ─────────────────────────────────────────
// Listet alle Agenten (in-memory Registry + DB-Agenten)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const [inMemory, dbAgents] = await Promise.all([
            Promise.resolve(agentService.listAgents()),
            prisma.agent.findMany({
                where: { enabled: true },
                select: {
                    id: true, name: true, type: true, description: true,
                    status: true, totalTasks: true, successTasks: true,
                    failedTasks: true, lastActiveAt: true,
                },
            }),
        ]);
        res.json({ agents: inMemory, dbAgents });
    } catch {
        res.json({ agents: agentService.listAgents(), dbAgents: [] });
    }
});

// ─── GET /api/agents/metrics ──────────────────────────────────
router.get('/metrics', async (_req: Request, res: Response) => {
    const [queueMetrics, brokerStatus, auditStats] = await Promise.all([
        Promise.resolve(taskQueue.metrics()),
        Promise.resolve({ connected: messageBroker.isConnected }),
        auditService.getStats(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Letzte 24h
    ]);

    res.json({
        queue:   queueMetrics,
        broker:  brokerStatus,
        audit:   auditStats,
        agents:  agentService.listAgents().map(a => ({
            name:           a.name,
            busy:           a.busy,
            tasksCompleted: a.tasksCompleted,
            tasksFailed:    a.tasksFailed,
        })),
    });
});

// ─── GET /api/agents/tasks ────────────────────────────────────
router.get('/tasks', async (req: Request, res: Response) => {
    const status    = req.query.status as string | undefined;
    const agentName = req.query.agent  as string | undefined;
    const limit     = Math.min(Number(req.query.limit ?? 50), 200);

    // DB-Tasks (persistiert)
    try {
        const dbTasks = await prisma.agentTask.findMany({
            where: {
                ...(status    ? { status: status.toUpperCase() as any } : {}),
                ...(agentName ? { agent: { name: agentName } }         : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { agent: { select: { name: true, type: true } } },
        });
        res.json({ tasks: dbTasks });
    } catch {
        // Fallback: In-Memory Queue
        const tasks = taskQueue.list({ status: status as any, agentName });
        res.json({ tasks });
    }
});

// ─── GET /api/agents/tasks/:id ───────────────────────────────
router.get('/tasks/:id', async (req: Request, res: Response) => {
    const id = param(req, 'id');

    try {
        const dbTask = await prisma.agentTask.findUnique({
            where: { id },
            include: {
                agent:     { select: { name: true, type: true } },
                auditLogs: { orderBy: { createdAt: 'asc' }, take: 50 },
            },
        });
        if (dbTask) {
            res.json({ task: dbTask });
            return;
        }
    } catch { /* ignore, fallback below */ }

    // Fallback: In-Memory
    const task = taskQueue.get(id);
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    res.json({ task });
});

// ─── POST /api/agents/task ───────────────────────────────────
// Erstellt einen Task und sendet ihn an Agent-Core (Python) oder
// fällt auf In-Memory-Orchestrator zurück wenn Agent-Core offline ist.
router.post('/task', async (req: Request, res: Response) => {
    const {
        type = 'general',
        taskType,
        description,
        payload = {},
        priority = 'normal',
        agentName = 'orchestrator',
        sessionRef,
        patientRef,
    } = req.body as {
        type?:        string;
        taskType?:    string;
        description?: string;
        payload?:     Record<string, unknown>;
        priority?:    string;
        agentName?:   string;
        sessionRef?:  string;
        patientRef?:  string;
    };

    const resolvedTaskType = taskType ?? type;

    // Validierung
    if (!resolvedTaskType && !description) {
        res.status(400).json({ error: 'taskType oder description ist erforderlich' });
        return;
    }

    const taskId    = randomUUID();
    const messageId = randomUUID();
    const userId    = (req as any).user?.id ?? 'system';

    // 1. In Prisma-DB persistieren
    let dbAgent: { id: string; name: string } | null = null;
    try {
        dbAgent = await prisma.agent.findUnique({
            where: { name: agentName },
            select: { id: true, name: true },
        });

        if (dbAgent) {
            await prisma.agentTask.create({
                data: {
                    id:          taskId,
                    agentId:     dbAgent.id,
                    type:        resolvedTaskType,
                    status:      'PENDING',
                    priority:    priority.toUpperCase() as any,
                    inputData:   { description, ...payload },
                    messageId,
                    sessionRef,
                    patientRef,
                    requestedBy: userId,
                    queuedAt:    new Date(),
                },
            });

            await auditService.log({
                agentId:  dbAgent.id,
                taskId,
                action:   'task_created',
                details:  `Task-Typ: ${resolvedTaskType}, Priorität: ${priority}`,
                ipAddress: req.ip,
            });
        }
    } catch (dbErr) {
        console.warn('[AgentRoute] DB-Persistierung fehlgeschlagen:', dbErr);
    }

    // 2a. Versuche Python Agent-Core (bevorzugt)
    if (agentCoreClient.isAvailable()) {
        try {
            const coreResult = await agentCoreClient.executeTask({
                taskId,
                agentName,
                taskType:    resolvedTaskType,
                priority,
                payload:     { description, ...payload },
                sessionRef,
                patientRef,
                requestedBy: userId,
            });

            res.status(202).json({
                taskId,
                agentName,
                status:  'completed',
                result:  coreResult,
                source:  'agent-core',
            });
            return;
        } catch (coreErr) {
            console.warn('[AgentRoute] Agent-Core nicht erreichbar, Fallback auf RabbitMQ/In-Memory');
        }
    }

    // 2b. Versuche RabbitMQ (asynchron)
    if (messageBroker.isConnected) {
        const msg: BrokerMessage = {
            messageId,
            timestamp:   new Date().toISOString(),
            taskId,
            agentName,
            taskType:    resolvedTaskType,
            priority:    priority as any,
            payload:     { description, ...payload },
            sessionRef,
            patientRef,
            requestedBy: userId,
        };
        await messageBroker.publishTask(msg);

        res.status(202).json({
            taskId,
            agentName,
            status:  'queued',
            message: `Task in RabbitMQ-Queue (Agent: ${agentName})`,
            source:  'rabbitmq',
        });
        return;
    }

    // 2c. Fallback: In-Memory-Orchestrator
    const inMemoryTask = createTask({
        type:        resolvedTaskType,
        description: description ?? resolvedTaskType,
        payload,
        priority:    priority as any,
    });

    res.status(202).json({
        taskId:    inMemoryTask.id,
        agentName: inMemoryTask.agentName,
        status:    inMemoryTask.status,
        message:   `Task im In-Memory-Orchestrator (kein Agent-Core/RabbitMQ verfügbar)`,
        source:    'in-memory',
    });
});

// ─── POST /api/agents/:name/execute ──────────────────────────
// Direktaufruf eines bestimmten Agenten
router.post('/:name/execute', async (req: Request, res: Response) => {
    const name = param(req, 'name');
    const {
        taskType = name,
        description,
        payload = {},
        priority = 'normal',
    } = req.body as {
        taskType?:    string;
        description?: string;
        payload?:     Record<string, unknown>;
        priority?:    string;
    };

    if (!description && !payload.question) {
        res.status(400).json({ error: 'description oder payload.question ist erforderlich' });
        return;
    }

    // Python Agent-Core bevorzugen
    if (agentCoreClient.isAvailable()) {
        try {
            const result = await agentCoreClient.executeTask({
                taskId:    randomUUID(),
                agentName: name,
                taskType,
                priority,
                payload:   { description, ...payload },
            });
            res.json({ status: 'completed', result, source: 'agent-core' });
            return;
        } catch { /* Fallback */ }
    }

    // In-Memory Fallback
    const agent = agentService.get(name);
    if (!agent) {
        res.status(404).json({ error: `Agent "${name}" not found` });
        return;
    }

    const task = taskQueue.enqueue({
        type:        taskType,
        agentName:   name,
        description: description ?? taskType,
        payload,
        priority:    priority as any,
    });

    agentService.dispatch(name, task).catch((err: unknown) => {
        console.error(`[AgentRoute] Dispatch-Fehler für Task ${task.id}:`, err);
    });

    res.status(202).json({
        taskId:    task.id,
        agentName: task.agentName,
        status:    task.status,
        source:    'in-memory',
    });
});

// ─── GET /api/agents/metrics ─────────────────────────────────
router.get('/metrics', (_req: Request, res: Response) => {
    const queueMetrics = taskQueue.metrics();
    const agents = agentService.listAgents();

    const totalCompleted = agents.reduce((s, a) => s + a.tasksCompleted, 0);
    const totalFailed    = agents.reduce((s, a) => s + a.tasksFailed, 0);
    const busyAgents     = agents.filter(a => a.busy).length;

    res.json({
        queue: queueMetrics,
        agents: {
            total:     agents.length,
            online:    agents.filter(a => a.online).length,
            busy:      busyAgents,
            completed: totalCompleted,
            failed:    totalFailed,
            errorRate: totalCompleted + totalFailed > 0
                ? Math.round((totalFailed / (totalCompleted + totalFailed)) * 100)
                : 0,
        },
        generatedAt: new Date().toISOString(),
    });
});

// ─── GET /api/agents/audit/:agentId ──────────────────────────
router.get('/audit/:agentId', async (req: Request, res: Response) => {
    const limit  = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    try {
        const logs = await auditService.getLogsForAgent(param(req, 'agentId'), limit, offset);
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: 'Audit-Log-Abfrage fehlgeschlagen' });
    }
});

export default router;
