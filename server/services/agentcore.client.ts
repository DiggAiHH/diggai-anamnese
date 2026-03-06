/**
 * Agent-Core HTTP Client
 *
 * Express-Backend → Python FastAPI (localhost:8000) IPC.
 * Wird bevorzugt genutzt wenn der Agent-Core läuft.
 * Fällt graceful zurück auf In-Memory-Orchestrator.
 */

const AGENT_CORE_URL = process.env.AGENT_CORE_URL ?? 'http://localhost:8000';
const AGENT_CORE_SECRET = process.env.AGENT_CORE_SECRET ?? '';
const TIMEOUT_MS = 30_000;

export interface AgentCoreTaskRequest {
    taskId:      string;
    agentName:   string;
    taskType:    string;
    priority?:   string;
    payload:     Record<string, unknown>;
    sessionRef?: string;
    patientRef?: string;
    requestedBy?: string;
}

export interface AgentCoreTaskResponse {
    taskId:     string;
    agentName:  string;
    status:     string;
    result:     Record<string, unknown>;
    durationMs: number;
    timestamp:  string;
}

class AgentCoreClient {
    private _available: boolean | null = null;
    private _lastCheck = 0;
    private readonly CHECK_INTERVAL_MS = 30_000;

    /**
     * Prüft ob der Agent-Core erreichbar ist (gecacht für 30s).
     */
    isAvailable(): boolean {
        // Wenn Env-Variable nicht gesetzt ist, deaktiviert
        if (!process.env.AGENT_CORE_URL && process.env.NODE_ENV === 'production') {
            return false;
        }
        // Nutze gecachten Status
        if (this._available !== null && Date.now() - this._lastCheck < this.CHECK_INTERVAL_MS) {
            return this._available;
        }
        // Async-Check im Hintergrund (gibt aktuell bekannten Status zurück)
        this._checkHealth();
        return this._available ?? false;
    }

    private async _checkHealth(): Promise<void> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${AGENT_CORE_URL}/health`, {
                signal: controller.signal,
                headers: this._headers(),
            });
            clearTimeout(timer);
            this._available = res.ok;
        } catch {
            this._available = false;
        }
        this._lastCheck = Date.now();
    }

    /**
     * Sendet einen Task an den Python Agent-Core und wartet auf das Ergebnis (synchron).
     * Timeout: 30 Sekunden.
     */
    async executeTask(req: AgentCoreTaskRequest): Promise<Record<string, unknown>> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const res = await fetch(`${AGENT_CORE_URL}/tasks`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', ...this._headers() },
                body:    JSON.stringify({
                    taskId:      req.taskId,
                    agentName:   req.agentName,
                    taskType:    req.taskType,
                    priority:    req.priority ?? 'normal',
                    payload:     req.payload,
                    sessionRef:  req.sessionRef,
                    patientRef:  req.patientRef,
                    requestedBy: req.requestedBy,
                }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`Agent-Core Fehler ${res.status}: ${body}`);
            }

            const data: AgentCoreTaskResponse = await res.json();
            this._available = true;
            this._lastCheck = Date.now();
            return data.result;

        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                throw new Error(`Agent-Core Timeout nach ${TIMEOUT_MS / 1000}s`);
            }
            this._available = false;
            this._lastCheck = Date.now();
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Gibt die verfügbaren Agenten vom Python-Core zurück.
     */
    async listAgents(): Promise<unknown[]> {
        try {
            const res = await fetch(`${AGENT_CORE_URL}/agents`, {
                headers: this._headers(),
            });
            if (!res.ok) return [];
            const data = await res.json() as { agents: unknown[] };
            return data.agents ?? [];
        } catch {
            return [];
        }
    }

    private _headers(): Record<string, string> {
        const h: Record<string, string> = {};
        if (AGENT_CORE_SECRET) h['X-Agent-Secret'] = AGENT_CORE_SECRET;
        return h;
    }
}

export const agentCoreClient = new AgentCoreClient();
