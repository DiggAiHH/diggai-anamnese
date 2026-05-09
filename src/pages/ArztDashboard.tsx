import React, { useState, useCallback, useMemo } from 'react';
import { Shield, LogOut, AlertTriangle, User, ChevronRight, CheckCircle, Activity, Sparkles, Send, MessageSquare, Download, FileText, Bell, ClipboardList, HelpCircle, Info, LayoutGrid, Layers } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useArztSessions, useArztSessionDetail, useArztSessionSummary, useChatMessages, useAckTriage } from '../hooks/useStaffApi';
import { setAuthToken, getAuthToken, API_BASE_URL, SOCKET_BASE_URL, api } from '../api/client';
import { clearStoredStaffUser, getStoredStaffToken } from '../lib/staffSession';
import { useStaffSession } from '../hooks/useStaffSession';
import { AmbientScribePanel } from '../components/ai/AmbientScribePanel';
import { BillingSuggestions } from '../components/ai/BillingSuggestions';
import { WearableChart } from '../components/therapy/WearableChart';
import { FullscreenButton } from '../components/FullscreenButton';
import { StaffChat } from '../components/StaffChat';
import { StaffTodoList } from '../components/StaffTodoList';
import { ClinicalAlertList } from '../components/therapy/ClinicalAlertBanner';
import { AdminAnalyticsTab } from '../components/admin/AdminAnalyticsTab';
import { WunschboxTab } from '../components/admin/WunschboxTab';
import { EpisodePanel } from '../components/episodes';

// ═══════════════════════════════════════════════════════════
// NEU: Phase 3 - Arzt Dashboard Components
// ═══════════════════════════════════════════════════════════
import { 
  AnamneseRadar, 
  ClinicalTags,
  PriorityList 
} from '../components/dashboards';
import { useRealtimeQueue } from '../hooks/useDashboard';
import { useDashboardStore, selectSelectedPatient } from '../store/dashboardStore';

// ─── Types ─────────────────────────────────────────────

interface ToastAlert {
    id: number;
    type: 'triage' | 'success' | 'message';
    title?: string;
    message?: string;
    sessionId?: string;
    level?: string;
}

/** Legacy 'triage:alert'-Event-Payload. */
interface SocketTriageAlert {
    level: string;
    message: string;
    sessionId: string;
}

/**
 * Neuer kanonischer 'routing:hint'-Event-Payload. Empfänger ist medizinisches
 * Personal — `staffMessage` darf fachliche Begriffe enthalten.
 */
interface SocketRoutingHint {
    ruleId: string;
    level: 'INFO' | 'PRIORITY';
    atomId: string;
    staffMessage: string;
    sessionId: string;
    workflowAction?: string;
    triggerValues?: unknown;
}

interface SocketSessionComplete {
    service: string;
    sessionId: string;
}

interface SocketMessage {
    text: string;
    sessionId: string;
}

interface SocketLock {
    sessionId: string;
    userName: string;
}

interface ArztSession {
    id: string;
    patientId?: string;
    status: 'ACTIVE' | 'COMPLETED';
    patientName?: string;
    selectedService?: string;
    gender?: string;
    totalAnswers: number;
    unresolvedCritical: number;
    createdAt: string;
    answers?: SessionAnswer[];
    triageEvents?: TriageEvent[];
}

interface SessionAnswer {
    id: string;
    atomId: string;
    section?: string;
    questionText?: string;
    answerType?: string;
    value?: Record<string, unknown> & { filename?: string; originalName?: string; data?: Record<string, unknown> & { filename?: string; originalName?: string } };
}

interface TriageEvent {
    id: string;
    level: string;
    message: string;
    atomId: string;
    createdAt: string;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
}

interface IcdCode {
    code: string;
    label: string;
}

interface ChatMessage {
    sessionId: string;
    text: string;
    from: string;
    timestamp: string;
}

// ─── NEW: Doctor Queue View Component ──────────────────

/**
 * DoctorQueueView - Neue Klinische Sicht mit Radar & Prioritaeten
 */
const DoctorQueueView = React.memo(function DoctorQueueView() {
    const { t } = useTranslation();
    const { items } = useRealtimeQueue();
    const selectPatient = useDashboardStore(state => state.selectPatient);
    const selectedPatient = useDashboardStore(selectSelectedPatient);
    
    const handleSelectPatient = useCallback((patient: typeof items[0]) => {
        selectPatient(patient.id);
    }, [selectPatient]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Linke Spalte: Prioritaetsliste */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-400" />
                        {t('arzt.priorities', 'Prioritäten')}
                    </h2>
                    <span className="text-xs text-white/40">
                        {items.filter(p => p.status !== 'COMPLETED').length} {t('arzt.waiting')}
                    </span>
                </div>
                
                <PriorityList 
                    patients={items}
                    onSelectPatient={handleSelectPatient}
                />
            </div>
            
            {/* Rechte Spalte: Patienten-Detail */}
            <div className="lg:col-span-2">
                {selectedPatient ? (
                    <PatientDetailView patient={selectedPatient} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-8">
                        <User className="w-16 h-16 text-white/10 mb-4" />
                        <h3 className="text-lg font-medium text-white/60">
                            {t('arzt.selectPatient', 'Wählen Sie einen Patienten')}
                        </h3>
                        <p className="text-sm text-white/40 mt-2 text-center">
                            {t('arzt.selectPatientDesc', 'Klicken Sie auf einen Patienten in der Liste, um Details zu sehen')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});

/**
 * Patient Detail View mit Radar Chart
 */
const PatientDetailView = React.memo(function PatientDetailView({ 
    patient 
}: { 
    patient: NonNullable<ReturnType<typeof selectSelectedPatient>>;
}) {
    const { t } = useTranslation();
    
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-white font-bold text-lg">
                            {patient.patientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{patient.patientName}</h2>
                            <p className="text-sm text-white/50">{patient.service}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                                <span>Wartezeit: {patient.waitTimeMinutes} Min</span>
                                <span>•</span>
                                <span>Status: {patient.status}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {patient.triageLevel === 'CRITICAL' && (
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold animate-pulse">
                                KRITISCH
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Radar Chart & Clinical Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnamneseRadar patient={patient} />
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        {t('arzt.clinicalProfile', 'Klinisches Profil')}
                    </h3>
                    <ClinicalTags patient={patient} />
                </div>
            </div>
            
            {/* Aktionen */}
            <div className="flex gap-3 flex-wrap">
                <button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all">
                    {t('arzt.callPatient', 'Patient aufrufen')}
                </button>
                <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all">
                    {t('arzt.viewAnamnese', 'Anamnese ansehen')}
                </button>
                {/* 2026-05-09 — GDT-Export-Button für Tomedo (und alle GDT-fähigen PVS).
                   Lädt die Anamnese als .gdt-Datei. Praxis kann sie in Tomedo importieren. */}
                <button
                    onClick={() => {
                        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
                        const url = `${apiBase}/sessions/${patient.id}/export/gdt?receiverId=TOMEDO`;
                        // Cookie-basierte Auth via Browser → Direkt-Download
                        window.open(url, '_blank');
                    }}
                    className="px-4 bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center gap-2"
                    title={t('arzt.exportGdtTitle', 'GDT-Datei für Tomedo / PVS-Import herunterladen')}
                >
                    📄 {t('arzt.exportGdt', 'GDT-Export')}
                </button>
                {patient.triageLevel !== 'NORMAL' && (
                    <button className="px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-3 rounded-xl transition-all">
                        {t('arzt.ackTriage', 'Bestätigen')}
                    </button>
                )}
            </div>
        </div>
    );
});

// ─── Helper Functions ─────────────────────────────────

// Helper for playing an alert sound safely
const playAlertSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880; // A5
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.warn('AudioContext not allowed without user interaction');
    }
};

// ─── Memoized Sub-Components ───────────────────────────


/**
 * StatCard - Memoized stat display with calm colors
 */
const StatCard = React.memo<{ icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }>(
    function StatCard({ icon: Icon, label, value, color }) {
        // Calm, trust-building colors (no red panic)
        const colors: Record<string, string> = { 
            blue: 'bg-[#4A90E2]/20 text-[#4A90E2]', 
            emerald: 'bg-[#81B29A]/20 text-[#81B29A]', 
            // Changed from red to warm amber - calming but attention-grabbing
            red: 'bg-[#F4A261]/20 text-[#F4A261]',
            // Calm alert - for critical items without panic
            calmAlert: 'bg-[#5E8B9E]/20 text-[#5E8B9E]',
        };
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-4 hover:bg-white/[0.07] transition-colors">
                <div className={`p-2.5 rounded-xl ${colors[color]}`}><Icon className="w-5 h-5" /></div>
                <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-white/50 font-medium">{label}</p>
                </div>
            </div>
        );
    }
);

/**
 * SessionList - Memoized session list
 */
const SessionList = React.memo(function SessionList({ 
    onSelect, 
    activeLocks 
}: { 
    onSelect: (id: string) => void; 
    activeLocks: Record<string, string>;
}) {
    const { t } = useTranslation();
    const { data, isLoading } = useArztSessions();
    const sessions = useMemo(() => data?.sessions || [], [data?.sessions]);

    // Memoize stats calculations — must be before any early return (Rules of Hooks)
    const activeCount = useMemo(() => sessions.filter((s: ArztSession) => s.status === 'ACTIVE').length, [sessions]);
    const completedCount = useMemo(() => sessions.filter((s: ArztSession) => s.status === 'COMPLETED').length, [sessions]);
    const redFlagsCount = useMemo(() => sessions.reduce((acc: number, s: ArztSession) => acc + (s.unresolvedCritical || 0), 0), [sessions]);

    if (isLoading) return <p className="text-white p-10">{t('arzt.loading')}</p>;

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard icon={User} label={t('arzt.stats.active')} value={activeCount} color="blue" />
                <StatCard icon={CheckCircle} label={t('arzt.stats.completed')} value={completedCount} color="emerald" />
                <StatCard icon={AlertTriangle} label={t('arzt.stats.redflags')} value={redFlagsCount} color="red" />
            </div>
            <div className="space-y-3">
                {sessions.map((session: ArztSession) => (
                    <button key={session.id} onClick={() => onSelect(session.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all text-left">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.status === 'ACTIVE' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
                            {session.status === 'ACTIVE' ? <Activity className="w-5 h-5 text-blue-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white flex items-center gap-2">
                                {session.patientName || `Session ${session.id.slice(0, 8)}...`}
                                {activeLocks[session.id] && (
                                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> {t('arzt.editedBy')}: {activeLocks[session.id]}
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-white/40">{session.selectedService} • {session.gender || '-'} • {session.totalAnswers} {t('arzt.answers')}</p>
                        </div>
                        {session.unresolvedCritical > 0 && (
                            <span className="px-3 py-1.5 bg-[#F4A261]/15 text-[#F4A261] text-[10px] font-bold rounded-lg border border-[#F4A261]/30 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3" />
                                {session.unresolvedCritical} {session.unresolvedCritical > 1 ? 'Hinweise' : 'Hinweis'}
                            </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-white/20" />
                    </button>
                ))}
            </div>
        </div>
    );
});

// Tab configuration - defined outside component to prevent recreation
const TABS_CONFIG = [
    { key: 'patients' as const, labelKey: 'arzt.patients', labelDefault: 'Patienten', icon: User, hasBadge: false },
    { key: 'queue' as const, labelKey: 'arzt.liveQueue', labelDefault: 'Live Queue', icon: LayoutGrid, hasBadge: false },
    { key: 'therapy' as const, labelKey: 'arzt.therapyPlans', labelDefault: 'Therapiepläne', icon: ClipboardList, hasBadge: false },
    { key: 'episodes' as const, labelKey: 'episodes.title', labelDefault: 'Episoden', icon: Layers, hasBadge: false },
    { key: 'alerts' as const, labelKey: 'arzt.alerts', labelDefault: 'Alerts', icon: Bell, hasBadge: true },
    { key: 'chat' as const, labelKey: 'arzt.teamChat', labelDefault: 'Team-Chat', icon: MessageSquare, hasBadge: false },
    { key: 'todo' as const, labelKey: 'arzt.todoList', labelDefault: 'Aufgaben', icon: CheckCircle, hasBadge: false },
    { key: 'analytics' as const, labelKey: 'arzt.analytics', labelDefault: 'Analytics', icon: Activity, hasBadge: false },
    { key: 'wunschbox' as const, labelKey: 'arzt.wunschbox', labelDefault: 'Wunschbox', icon: HelpCircle, hasBadge: false },
] as const;

type TabKey = typeof TABS_CONFIG[number]['key'];

/**
 * ArztDashboard – Main Component (Memoized)
 */
export const ArztDashboard: React.FC = React.memo(function ArztDashboard() {
    const { t } = useTranslation();
    const [token, setToken] = useState<string | null>(getStoredStaffToken());
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [toastAlerts, setToastAlerts] = useState<ToastAlert[]>([]);
    const [activeLocks, setActiveLocks] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<TabKey>('patients');
    const [clinicalAlertCount, setClinicalAlertCount] = useState(0);
    const { data: staffUser, isLoading: sessionLoading } = useStaffSession();
    const queryClient = useQueryClient();
    const selectedPatientForEpisodes = useDashboardStore(selectSelectedPatient);
    
    // ═══════════════════════════════════════════════════════
    // NEU: Initialize Realtime Queue (Phase 3)
    // ═══════════════════════════════════════════════════════
    useRealtimeQueue({ enabled: !!staffUser });

    // Stable callback for session selection
    const handleSelectSession = useCallback((id: string) => {
        setSelectedSessionId(id);
    }, []);

    // Stable callback for going back
    const handleBack = useCallback(() => {
        setSelectedSessionId(null);
    }, []);

    // Stable callback for logout
    const handleLogout = useCallback(() => {
        clearStoredStaffUser();
        setToken(null);
        setAuthToken(null);
        queryClient.setQueryData(['staff-session'], null);
        void api.arztLogout().catch(() => undefined);
    }, [queryClient]);

    // Stable callback for removing toast
    const removeToast = useCallback((id: number) => {
        setToastAlerts(prev => prev.filter(t => t.id !== id));
    }, []);

    React.useEffect(() => {
        if (!staffUser) return;

        const socket = io(SOCKET_BASE_URL || window.location.origin, {
            auth: token ? { token } : undefined,
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            socket.emit('join:arzt');
        });

        // Personal-Listener: kanonisch 'routing:hint', Backwards-Compat auf 'triage:alert'.
        // Hinweistext für Personal: staffMessage (neu) bzw. message (legacy) — siehe
        // docs/REGULATORY_POSITION.md §5.3 (Praxis-interne Fachkommunikation).
        socket.on('routing:hint', (hint: SocketRoutingHint) => {
            playAlertSound();
            setToastAlerts(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'triage',
                level: hint.level === 'PRIORITY' ? 'CRITICAL' : 'WARNING',
                message: hint.staffMessage,
                sessionId: hint.sessionId,
            }]);
            queryClient.invalidateQueries({ queryKey: ['arzt'] });
        });
        socket.on('triage:alert', (alertData: SocketTriageAlert) => {
            playAlertSound();
            setToastAlerts(prev => [...prev, { id: Date.now() + Math.random(), type: 'triage', ...alertData }]);
            queryClient.invalidateQueries({ queryKey: ['arzt'] });
        });

        socket.on('session:complete', (data: SocketSessionComplete) => {
            setToastAlerts(prev => [...prev, { id: Date.now() + Math.random(), type: 'success', title: t('arzt.completed'), message: t('arzt.sessionCompleteMsg'), sessionId: data.sessionId }]);
            queryClient.invalidateQueries({ queryKey: ['arzt'] });
        });

        socket.on('session:locked', (data: SocketLock) => {
            setActiveLocks(prev => ({ ...prev, [data.sessionId]: data.userName }));
        });

        socket.on('session:unlocked', (data: SocketLock) => {
            setActiveLocks(prev => {
                const n = { ...prev };
                delete n[data.sessionId];
                return n;
            });
        });

        return () => {
            socket.off('connect');
            socket.off('routing:hint');
            socket.off('triage:alert');
            socket.off('session:complete');
            socket.off('session:locked');
            socket.off('session:unlocked');
            socket.disconnect();
        };
    }, [staffUser, token, queryClient, t]);

    // Memoize tab content — must be before early return (Rules of Hooks)
    const tabContent = useMemo(() => {
        if (!staffUser || !token) return null;
        switch (activeTab) {
            case 'patients':
                return (
                    <SessionList 
                        onSelect={handleSelectSession} 
                        activeLocks={activeLocks} 
                    />
                );
            
            // ═══════════════════════════════════════════════════════
            // NEU: Live Queue Tab (Phase 3)
            // ═══════════════════════════════════════════════════════
            case 'queue':
                return <DoctorQueueView />;
                
            case 'alerts':
                return (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-red-400" />
                            {t('arzt.clinicalAlerts', 'Klinische Alerts')}
                        </h2>
                        <ClinicalAlertList />
                    </div>
                );
            case 'chat':
                return (
                    <StaffChat
                        currentUser={{ id: staffUser.id, displayName: staffUser.displayName, role: staffUser.role }}
                        patientSessions={[]}
                        className="min-h-[600px]"
                    />
                );
            case 'todo':
                return (
                    <StaffTodoList
                        currentUser={{ id: staffUser.id, displayName: staffUser.displayName, role: staffUser.role }}
                    />
                );
            case 'analytics':
                return <AdminAnalyticsTab />;
            case 'wunschbox':
                return <WunschboxTab />;
            case 'episodes':
                return selectedPatientForEpisodes
                    ? <EpisodePanel patientId={selectedPatientForEpisodes.id} />
                    : (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md text-center">
                            <Layers className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                            <p className="text-[var(--text-muted)]">{t('episodes.selectPatient', 'Bitte wählen Sie einen Patienten aus der Warteschlange.')}</p>
                        </div>
                    );
            default:
                return null;
        }
    }, [activeTab, activeLocks, handleSelectSession, selectedPatientForEpisodes, staffUser, token]);

    if (sessionLoading || !staffUser || !token) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-[var(--accent-primary)]/30 selection:text-[var(--text-primary)]">
            <header className="border-b border-[var(--border-primary)] bg-[var(--bg-card)]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center border border-[var(--accent-primary)]/20 shadow-lg shadow-[var(--accent-primary)]/5 group-hover:scale-110 transition-transform">
                            <Shield className="w-6 h-6 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">{t('arzt.dashboard')}</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60 leading-none mt-1">{t('arzt.overview')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-inner">
                            <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Live System</span>
                        </div>
                        <FullscreenButton />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                        >
                            <LogOut className="w-4 h-4" /> {t('arzt.logout')}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Tab Navigation */}
                <div className="flex gap-1 border-b border-[var(--border-primary)] mb-10 overflow-x-auto no-scrollbar">
                    {TABS_CONFIG.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-3 px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-4 -mb-px whitespace-nowrap ${activeTab === tab.key
                                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-primary)]'
                            }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-[var(--accent-primary)]' : ''}`} />
                            {t(tab.labelKey, tab.labelDefault)}
                            {tab.hasBadge && clinicalAlertCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 min-w-[22px] text-center bg-red-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-red-500/40">
                                    {clinicalAlertCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {tabContent}
                </div>
            </div>

            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
                <AnimatePresence>
                    {toastAlerts.map((tAlert) => (
                        <motion.div 
                            key={tAlert.id} 
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className={`backdrop-blur-2xl p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-sm flex items-start gap-5 border relative overflow-hidden group ${tAlert.type === 'triage' ? 'bg-red-500/10 border-red-500/30' :
                            tAlert.type === 'message' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30' :
                                'bg-emerald-500/10 border-emerald-500/30'}`}>
                            
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 opacity-20 ${tAlert.type === 'triage' ? 'bg-red-500' : tAlert.type === 'message' ? 'bg-[var(--accent-primary)]' : 'bg-emerald-500'}`} />

                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative z-10 ${tAlert.type === 'triage' ? 'bg-red-500 text-white shadow-red-500/30' :
                                tAlert.type === 'message' ? 'bg-[var(--accent-primary)] text-white shadow-[var(--accent-primary)]/30' :
                                    'bg-emerald-500 text-white shadow-emerald-500/30'}`}>
                                {tAlert.type === 'triage' ? <AlertTriangle className="w-6 h-6 animate-pulse" /> :
                                    tAlert.type === 'message' ? <MessageSquare className="w-6 h-6" /> :
                                        <CheckCircle className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <h4 className={`font-black text-sm uppercase tracking-widest ${tAlert.type === 'triage' ? 'text-red-400' :
                                    tAlert.type === 'message' ? 'text-[var(--text-primary)]' :
                                        'text-emerald-400'}`}>
                                    {tAlert.type === 'triage' ? `${t('arzt.emergencyAlert')} (${tAlert.level})` : tAlert.title}
                                </h4>
                                <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-relaxed font-medium">{tAlert.message}</p>
                                {tAlert.sessionId && (
                                    <div className="mt-3 py-1.5 px-2 bg-black/20 rounded-lg inline-block border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Reference: {tAlert.sessionId.slice(-8).toUpperCase()}</p>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => removeToast(tAlert.id)} 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all shrink-0 relative z-10"
                            >
                                <Info size={16} className="rotate-45" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
});

export default ArztDashboard;
