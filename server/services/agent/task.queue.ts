import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { getRedisClient, isRedisReady } from '../../redis';

/**
 * A1 (Arzt-Feedback 2026-05-03): Persistent task queue.
 *
 * Bisher: in-memory only — Tasks waren bei jedem Restart weg.
 * Jetzt: Redis als Persistence-Layer (write-through), in-memory als Cache.
 * Fallback: wenn Redis nicht verfuegbar, weiter in-memory wie bisher.
 *
 * Storage-Layout:
 *   diggai:agent:task:<id>           -> JSON-Snapshot des Tasks
 *   diggai:agent:tasks:active        -> Set aller Task-IDs (queued|running|failed)
 *
 * Boot-Recovery: hydrateFromRedis() laedt alle aktiven Tasks beim Start.
 */
const TASK_KEY_PREFIX = 'diggai:agent:task:';
const ACTIVE_SET_KEY = 'diggai:agent:tasks:active';
const TASK_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AgentTask {
    id: string;
    type: string;
    agentName: string;
    description: string;
    payload: Record<string, unknown>;
    priority: TaskPriority;
    status: TaskStatus;
    result?: string;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    retryCount: number;
    maxRetries: number;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1,
};

function serializeTask(task: AgentTask): string {
    return JSON.stringify({
        ...task,
        createdAt: task.createdAt.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
    });
}

function deserializeTask(raw: string): AgentTask | null {
    try {
        const parsed = JSON.parse(raw);
        return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            startedAt: parsed.startedAt ? new Date(parsed.startedAt) : undefined,
            completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
        };
    } catch {
        return null;
    }
}

class TaskQueue extends EventEmitter {
    private tasks = new Map<string, AgentTask>();
    private hydrated = false;

    /**
     * Persist task to Redis (best-effort, non-blocking errors).
     * Idempotent: same task-id overwrites same key.
     */
    private async persist(task: AgentTask): Promise<void> {
        const redis = getRedisClient();
        if (!redis || !isRedisReady()) return;
        try {
            const isTerminal = task.status === 'completed';
            await redis.set(TASK_KEY_PREFIX + task.id, serializeTask(task), 'EX', TASK_TTL_SECONDS);
            if (isTerminal) {
                await redis.srem(ACTIVE_SET_KEY, task.id);
            } else {
                await redis.sadd(ACTIVE_SET_KEY, task.id);
            }
        } catch (err) {
            console.warn('[TaskQueue] Redis persist failed:', (err as Error).message);
        }
    }

    /**
     * Boot-recovery: hydrate active tasks from Redis into memory.
     * Idempotent — safe to call multiple times. Only runs once per process.
     */
    async hydrateFromRedis(): Promise<number> {
        if (this.hydrated) return 0;
        this.hydrated = true;
        const redis = getRedisClient();
        if (!redis || !isRedisReady()) return 0;
        try {
            const ids = await redis.smembers(ACTIVE_SET_KEY);
            if (!ids.length) return 0;
            const raws = await redis.mget(...ids.map(id => TASK_KEY_PREFIX + id));
            let hydrated = 0;
            for (let i = 0; i < ids.length; i++) {
                const raw = raws[i];
                if (!raw) {
                    await redis.srem(ACTIVE_SET_KEY, ids[i]);
                    continue;
                }
                const task = deserializeTask(raw);
                if (task && !this.tasks.has(task.id)) {
                    // Crashed mid-run -> re-queue
                    if (task.status === 'running') {
                        task.status = 'queued';
                        task.startedAt = undefined;
                    }
                    this.tasks.set(task.id, task);
                    hydrated++;
                }
            }
            console.log(`[TaskQueue] Hydrated ${hydrated} tasks from Redis`);
            return hydrated;
        } catch (err) {
            console.warn('[TaskQueue] Hydrate failed:', (err as Error).message);
            return 0;
        }
    }

    enqueue(params: {
        type: string;
        agentName: string;
        description: string;
        payload?: Record<string, unknown>;
        priority?: TaskPriority;
        maxRetries?: number;
        idempotencyKey?: string;
    }): AgentTask {
        // Idempotency: re-using a key returns the existing task instead of creating a duplicate.
        if (params.idempotencyKey) {
            for (const t of this.tasks.values()) {
                if ((t.payload as { _idempotencyKey?: string })?._idempotencyKey === params.idempotencyKey) {
                    return t;
                }
            }
        }
        const payload = params.idempotencyKey
            ? { ...(params.payload ?? {}), _idempotencyKey: params.idempotencyKey }
            : (params.payload ?? {});

        const task: AgentTask = {
            id: randomUUID(),
            type: params.type,
            agentName: params.agentName,
            description: params.description,
            payload,
            priority: params.priority ?? 'normal',
            status: 'queued',
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: params.maxRetries ?? 2,
        };
        this.tasks.set(task.id, task);
        void this.persist(task);
        this.emit('task:created', task);
        return task;
    }

    get(id: string): AgentTask | undefined {
        return this.tasks.get(id);
    }

    list(filter?: { status?: TaskStatus; agentName?: string }): AgentTask[] {
        const all = Array.from(this.tasks.values());
        let result = all;
        if (filter?.status) result = result.filter(t => t.status === filter.status);
        if (filter?.agentName) result = result.filter(t => t.agentName === filter.agentName);
        return result.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
    }

    markRunning(id: string): void {
        const task = this.tasks.get(id);
        if (!task) return;
        task.status = 'running';
        task.startedAt = new Date();
        void this.persist(task);
        this.emit('task:started', task);
    }

    markCompleted(id: string, result: string): void {
        const task = this.tasks.get(id);
        if (!task) return;
        task.status = 'completed';
        task.result = result;
        task.completedAt = new Date();
        void this.persist(task);
        this.emit('task:completed', task);
    }

    markFailed(id: string, error: string): void {
        const task = this.tasks.get(id);
        if (!task) return;
        task.status = 'failed';
        task.error = error;
        task.completedAt = new Date();
        void this.persist(task);
        this.emit('task:failed', task);
    }

    /** Resets a failed task back to queued for retry. Returns false if max retries exceeded. */
    markForRetry(id: string): boolean {
        const task = this.tasks.get(id);
        if (!task || task.retryCount >= task.maxRetries) return false;
        task.retryCount++;
        task.status = 'queued';
        task.error = undefined;
        task.startedAt = undefined;
        task.completedAt = undefined;
        void this.persist(task);
        this.emit('task:retry', task);
        return true;
    }

    metrics() {
        const all = Array.from(this.tasks.values());
        return {
            total: all.length,
            queued: all.filter(t => t.status === 'queued').length,
            running: all.filter(t => t.status === 'running').length,
            completed: all.filter(t => t.status === 'completed').length,
            failed: all.filter(t => t.status === 'failed').length,
        };
    }
}

export const taskQueue = new TaskQueue();
