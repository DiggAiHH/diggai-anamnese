import { useState } from 'react';
import { Bot, CheckCircle2, XCircle, Clock, Loader2, Play, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAgentStatus, useAgentTasks, useCreateAgentTask, useAgentMetrics } from '../../hooks/useAgentApi';
import { toast } from '../../store/toastStore';

// ─── Types ─────────────────────────────────────────────────────

interface AgentStatus {
    name: string;
    displayName: string;
    description: string;
    online: boolean;
    busy: boolean;
    tasksCompleted: number;
    tasksFailed: number;
    lastActive?: string;
}

interface AgentTask {
    id: string;
    type: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    priority: string;
    createdAt: string;
    agent?: { name: string; type?: string };
    inputData?: Record<string, unknown>;
    outputData?: unknown;
    error?: string;
}

// ─── Status Badge ──────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    PENDING:   'bg-gray-500/15 text-gray-400 border-gray-500/30',
    RUNNING:   'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse',
    COMPLETED: 'bg-green-500/15 text-green-400 border-green-500/30',
    FAILED:    'bg-red-500/15  text-red-400  border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Wartend', RUNNING: 'Läuft', COMPLETED: 'Erledigt', FAILED: 'Fehler',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[status] ?? STATUS_STYLES.PENDING}`}>
            {status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
            {status === 'FAILED' && <XCircle className="w-3 h-3" />}
            {status === 'PENDING' && <Clock className="w-3 h-3" />}
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}

// ─── Agent Card ────────────────────────────────────────────────

function AgentCard({ agent, onTask }: { agent: AgentStatus; onTask: (name: string) => void }) {
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${agent.online ? 'bg-blue-500/15' : 'bg-gray-500/10'}`}>
                        <Bot className={`w-5 h-5 ${agent.online ? 'text-blue-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.displayName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{agent.description}</p>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${agent.online ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.online ? (agent.busy ? 'bg-amber-400 animate-pulse' : 'bg-green-400') : 'bg-gray-500'}`} />
                    {agent.online ? (agent.busy ? 'Beschäftigt' : 'Bereit') : 'Offline'}
                </span>
            </div>
            <div className="flex gap-4 text-xs text-[var(--text-secondary)] mb-4">
                <span><span className="text-green-400 font-medium">{agent.tasksCompleted}</span> erledigt</span>
                <span><span className="text-red-400 font-medium">{agent.tasksFailed}</span> Fehler</span>
                {agent.lastActive && (
                    <span>Zuletzt: {new Date(agent.lastActive).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
            </div>
            <button
                type="button"
                onClick={() => onTask(agent.name)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium transition-colors"
            >
                <Play className="w-3.5 h-3.5" />
                Task starten
            </button>
        </div>
    );
}

// ─── Task Row ──────────────────────────────────────────────────

function TaskRow({ task }: { task: AgentTask }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-[var(--border-primary)] last:border-0">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
            >
                <StatusBadge status={task.status} />
                <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{task.type}</span>
                <span className="text-xs text-[var(--text-secondary)] hidden sm:block">
                    {task.agent?.name ?? '—'}
                </span>
                <span className="text-xs text-[var(--text-muted)] hidden md:block">
                    {new Date(task.createdAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </button>
            {open && (
                <div className="px-4 pb-3 space-y-2">
                    {task.inputData && (
                        <div>
                            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Input</p>
                            <pre className="text-xs text-[var(--text-muted)] bg-black/30 rounded-lg p-2 overflow-auto max-h-32">{JSON.stringify(task.inputData, null, 2)}</pre>
                        </div>
                    )}
                    {Boolean(task.outputData) && (
                        <div>
                            <p className="text-xs font-medium text-green-400 mb-1">Output</p>
                            <pre className="text-xs text-[var(--text-muted)] bg-black/30 rounded-lg p-2 overflow-auto max-h-32">
                                {typeof task.outputData === 'string' ? task.outputData : JSON.stringify(task.outputData as Record<string, unknown>, null, 2)}
                            </pre>
                        </div>
                    )}
                    {task.error && (
                        <div>
                            <p className="text-xs font-medium text-red-400 mb-1">Fehler</p>
                            <p className="text-xs text-red-300 bg-red-500/10 rounded-lg p-2">{task.error}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Create Task Dialog ────────────────────────────────────────

function CreateTaskDialog({ defaultAgent, onClose }: { defaultAgent?: string; onClose: () => void }) {
    const [agentName, setAgentName] = useState(defaultAgent ?? 'empfang');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('normal');
    const createTask = useCreateAgentTask();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!description.trim()) return;
        try {
            await createTask.mutateAsync({ agentName, description: description.trim(), priority });
            toast.success(`Task an "${agentName}" gesendet.`);
            onClose();
        } catch {
            toast.error('Task konnte nicht erstellt werden.');
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Neuer Agent-Task</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="agent-task-agent" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Agent</label>
                        <select
                            id="agent-task-agent"
                            value={agentName}
                            onChange={e => setAgentName(e.target.value)}
                            className="w-full input-base text-sm"
                        >
                            <option value="empfang">Empfang</option>
                            <option value="triage">Triage</option>
                            <option value="abrechnung">Abrechnung</option>
                            <option value="dokumentation">Dokumentation</option>
                            <option value="orchestrator">Orchestrator (Auto-Route)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="agent-task-priority" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priorität</label>
                        <select
                            id="agent-task-priority"
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            className="w-full input-base text-sm"
                        >
                            <option value="low">Niedrig</option>
                            <option value="normal">Normal</option>
                            <option value="high">Hoch</option>
                            <option value="critical">Kritisch</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Beschreibung / Anfrage</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="z.B. Patient hat starke Brustschmerzen..."
                            rows={3}
                            className="w-full input-base text-sm resize-none"
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors">
                            Abbrechen
                        </button>
                        <button type="submit" disabled={createTask.isPending || !description.trim()} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {createTask.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Senden
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────

export function AgentDashboard() {
    const [tab, setTab] = useState<'agents' | 'tasks'>('agents');
    const [taskFilter, setTaskFilter] = useState<string>('');
    const [dialogAgent, setDialogAgent] = useState<string | null>(null);

    const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useAgentStatus();
    const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useAgentTasks(
        taskFilter ? { status: taskFilter } : undefined
    );
    const { data: metrics } = useAgentMetrics();

    const agents: AgentStatus[] = statusData?.agents ?? [];
    const tasks: AgentTask[] = tasksData?.tasks ?? [];

    const totalCompleted = metrics?.totalCompleted ?? agents.reduce((s: number, a: AgentStatus) => s + a.tasksCompleted, 0);
    const totalFailed    = metrics?.totalFailed    ?? agents.reduce((s: number, a: AgentStatus) => s + a.tasksFailed, 0);
    const runningCount   = tasks.filter(t => t.status === 'RUNNING').length;
    const pendingCount   = tasks.filter(t => t.status === 'PENDING').length;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">DiggAI Agenten</h1>
                        <p className="text-xs text-[var(--text-secondary)]">Task-Queue · Monitoring · Automatisierung</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { refetchStatus(); refetchTasks(); }}
                        className="p-2 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                        title="Aktualisieren"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDialogAgent('orchestrator')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" />
                        Neuer Task
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Agenten', value: agents.length, color: 'text-blue-400' },
                    { label: 'Laufend', value: runningCount, color: 'text-amber-400' },
                    { label: 'Wartend', value: pendingCount, color: 'text-gray-400' },
                    { label: 'Erledigt', value: totalCompleted, color: 'text-green-400' },
                ].map(m => (
                    <div key={m.label} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 text-center backdrop-blur-sm">
                        <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{m.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-1 w-fit">
                {(['agents', 'tasks'] as const).map(t => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        {t === 'agents' ? 'Agenten' : 'Task-Queue'}
                        {t === 'tasks' && tasks.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/10">{tasks.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Agents Tab */}
            {tab === 'agents' && (
                statusLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 animate-pulse h-36" />
                        ))}
                    </div>
                ) : agents.length === 0 ? (
                    <div className="text-center py-16 text-[var(--text-secondary)]">
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Keine Agenten registriert</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {agents.map((agent: AgentStatus) => (
                            <AgentCard key={agent.name} agent={agent} onTask={setDialogAgent} />
                        ))}
                    </div>
                )
            )}

            {/* Tasks Tab */}
            {tab === 'tasks' && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
                        <span className="text-xs text-[var(--text-secondary)]">Filter:</span>
                        {['', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'].map(s => (
                            <button
                                key={s || 'all'}
                                type="button"
                                onClick={() => setTaskFilter(s)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${taskFilter === s ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                            >
                                {s || 'Alle'}
                            </button>
                        ))}
                    </div>
                    {tasksLoading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mx-auto" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="p-12 text-center text-[var(--text-secondary)]">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Keine Tasks in der Queue</p>
                        </div>
                    ) : (
                        tasks.map((task: AgentTask) => <TaskRow key={task.id} task={task} />)
                    )}
                    {totalFailed > 0 && (
                        <div className="px-4 py-2 border-t border-[var(--border-primary)] text-xs text-red-400">
                            {totalFailed} Task(s) fehlgeschlagen insgesamt
                        </div>
                    )}
                </div>
            )}

            {/* Create Task Dialog */}
            {dialogAgent !== null && (
                <CreateTaskDialog
                    defaultAgent={dialogAgent}
                    onClose={() => setDialogAgent(null)}
                />
            )}
        </div>
    );
}
