import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  ClipboardList, 
  Search, 
  Filter, 
  LogOut, 
  QrCode, 
  X, 
  MessageSquare, 
  Send, 
  Shield, 
  Activity, 
  UserPlus, 
  LayoutDashboard, 
  CheckCircle,
  FileText,
  LayoutGrid,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useMfaSessions, 
  useMfaDoctors, 
  useMfaAssignDoctor, 
  useChatMessages
} from '../hooks/useStaffApi';
import { useGenerateQrToken } from '../hooks/useStaffApi';
import { SOCKET_BASE_URL, api } from '../api/client';
import { WartezimmerPanel } from '../components/WartezimmerPanel';
import { StaffChat } from '../components/StaffChat';
import { StaffTodoList } from '../components/StaffTodoList';
import { CertificationModal } from '../components/CertificationModal';
import { FullscreenButton } from '../components/FullscreenButton';
import { MfaImportVersandPanel } from '../components/mfa/MfaImportVersandPanel';
import { clearStoredStaffUser, getStoredStaffToken } from '../lib/staffSession';
import { STAFF_SESSION_QUERY_KEY, useStaffSession } from '../hooks/useStaffSession';

// ═══════════════════════════════════════════════════════════
// NEU: Dashboard Components (Phase 2)
// ═══════════════════════════════════════════════════════════
import { 
  MfaKanbanBoard, 
  TriageAlertPanel, 
  LongestWaiters 
} from '../components/dashboards';
import { useRealtimeQueue, useQueueStats } from '../hooks/useDashboard';
import { useDashboardStore } from '../store/dashboardStore';

// ─── Types ─────────────────────────────────────────────

type TabKey = 'sessions' | 'liveboard' | 'certify' | 'imports' | 'chat' | 'todo';

interface MfaSession {
    id: string;
    createdAt: string;
    status: string;
    selectedService: string;
    unresolvedCritical: number;
    assignedArztId?: string;
    assignedArzt?: { id: string; displayName: string };
}

interface MfaSessionsResponse {
    sessions: MfaSession[];
    stats: {
        unassignedCount: number;
        criticalCount: number;
        activeCount: number;
    };
}

interface MfaDoctor {
    id: string;
    displayName: string;
}

interface MfaDoctorsResponse {
    doctors: MfaDoctor[];
}

interface DbChatMessage {
    text: string;
    fromName: string;
    timestamp: string;
}

interface DashboardChatMessage {
    text: string;
    from: string;
    timestamp: string;
}

interface IncomingChatMessage {
    sessionId: string;
    text: string;
    from: string;
    timestamp: string;
}

// ─── NEW: Live Queue Stats Component ───────────────────

/**
 * LiveQueueStats - Real-time stats from dashboard store
 */
const LiveQueueStats = React.memo(function LiveQueueStats() {
    const { t } = useTranslation();
    const stats = useQueueStats();
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-white/40 uppercase">{t('mfa.totalToday')}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stats.totalToday}</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white/40 uppercase">{t('mfa.active')}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stats.activeCount}</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-white/40 uppercase">{t('mfa.avgWait')}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stats.averageWaitTime}m</p>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400/70 uppercase">{t('mfa.critical')}</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{stats.criticalCount}</p>
            </div>
        </div>
    );
});

// ─── NEW: Live Queue View Component ────────────────────

/**
 * LiveQueueView - New Kanban Board with side panels
 */
const LiveQueueView = React.memo(function LiveQueueView() {
    const { t } = useTranslation();
    const [showAlerts, setShowAlerts] = useState(true);
    
    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <LiveQueueStats />
            
            {/* Main Content: Kanban + Side Panels */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left: Kanban Board */}
                <div className="xl:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-purple-400" />
                            {t('mfa.liveQueue')}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-white/40">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {t('mfa.realtime')}
                            </span>
                        </div>
                    </div>
                    
                    <MfaKanbanBoard />
                </div>
                
                {/* Right: Side Panels */}
                <div className="space-y-4">
                    {/* Triage Alerts */}
                    <TriageAlertPanel 
                        enableSound={showAlerts}
                    />
                    
                    {/* Longest Waiters */}
                    <LongestWaiters 
                        limit={5}
                        warningThreshold={30}
                        criticalThreshold={45}
                    />
                </div>
            </div>
        </div>
    );
});

// ─── Memoized Sub-Components ───────────────────────────

/**
 * MfaStats - Memoized stats display
 */
const MfaStats = React.memo<{ stats: MfaSessionsResponse['stats'] }>(function MfaStats({ stats }) {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-3xl -mr-12 -mt-12 group-hover:bg-purple-500/20 transition-all" />
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{t('mfa.unassigned')}</p>
                        <h3 className="text-3xl font-black text-white">{stats.unassignedCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                        <UserPlus className="w-6 h-6 text-purple-400" />
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-white/30">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">Priority View</span>
                    {t('mfa.needAssignment')}
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl -mr-12 -mt-12 group-hover:bg-red-500/20 transition-all" />
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{t('mfa.redFlags', 'Red Flags')}</p>
                        <h3 className="text-3xl font-black text-red-500">{stats.criticalCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/20">
                        <Activity className="w-6 h-6 text-red-500" />
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-white/30">
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">Urgent</span>
                    {t('mfa.criticalSymptoms')}
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all" />
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">{t('mfa.inFlow')}</p>
                        <h3 className="text-3xl font-black text-blue-400">{stats.activeCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-purple-500/20">
                        <LayoutDashboard className="w-6 h-6 text-blue-400" />
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-white/30">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Real-time</span>
                    {t('mfa.patientsAnswering')}
                </div>
            </div>
        </div>
    );
});

/**
 * SessionManagementList - Memoized session list with assignment
 */
const SessionManagementList = React.memo(function SessionManagementList({ 
    onOpenChat 
}: { 
    onOpenChat: (id: string) => void;
}) {
    const { t } = useTranslation();
    const { data: sessionData, isLoading: sessionsLoading } = useMfaSessions();
    const { data: doctorData } = useMfaDoctors();
    const assignMutation = useMfaAssignDoctor();
    const [assigningId, setAssigningId] = useState<string | null>(null);

    // Memoize data arrays
    const sessions = useMemo(() => ((sessionData as MfaSessionsResponse | undefined)?.sessions ?? []), [sessionData]);
    const doctors = useMemo(() => ((doctorData as MfaDoctorsResponse | undefined)?.doctors ?? []), [doctorData]);

    const handleAssign = useCallback(async (sessionId: string, arztId: string) => {
        try {
            await assignMutation.mutateAsync({ sessionId, arztId });
            setAssigningId(null);
        } catch (e) {
            console.error('Assignment error', e);
        }
    }, [assignMutation]);

    if (sessionsLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-white/40 text-sm font-bold">{t('mfa.loadingData')}</p>
        </div>
    );

    return (
        <div className="overflow-hidden bg-white/5 border border-white/10 rounded-2xl">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Patient / Session</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Anliegen</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Triage</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Zuweisung</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Aktion</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-[10px] font-mono border border-white/5">
                                        Ref
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold font-mono">{session.id.slice(0, 13)}...</span>
                                        <span className="text-[10px] text-white/30">{new Date(session.createdAt).toLocaleString(navigator.language)}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                    {session.selectedService}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {session.status === 'COMPLETED' ? (
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">{t('mfa.completed', 'Abgeschlossen')}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-blue-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        <span className="text-[10px] font-bold">{t('mfa.active', 'Aktiv')}</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {session.unresolvedCritical > 0 ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-red-400 w-fit">
                                        <Activity className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black">{session.unresolvedCritical} {t('mfa.redFlags', 'Red Flags')}</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-white/20">{t('mfa.noFindings', 'Keine Auffälligkeiten')}</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {assigningId === session.id ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            aria-label="Arzt zuweisen"
                                            className="bg-gray-900 border border-purple-500/50 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none ring-2 ring-purple-500/20"
                                            onChange={(e) => handleAssign(session.id, e.target.value)}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>{t('mfa.selectDoctor', 'Arzt wählen...')}</option>
                                            {doctors.map((dr) => (
                                                <option key={dr.id} value={dr.id}>{dr.displayName}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => setAssigningId(null)} className="text-[8px] text-white/40 uppercase hover:text-white">Abbrechen</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {session.assignedArzt ? (
                                                <div className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                                                    <div className="w-4 h-4 rounded-full bg-purple-500/40 flex items-center justify-center text-[8px]">
                                                        Dr
                                                    </div>
                                                    <span className="text-xs text-white/80 font-medium">{session.assignedArzt.displayName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-white/20 italic">{t('mfa.notAssigned', 'Nicht zugewiesen')}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setAssigningId(session.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all text-purple-400"
                                            title="Neu zuweisen"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <button
                                    onClick={() => onOpenChat(session.id)}
                                    aria-label="Chat öffnen"
                                    className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-purple-500/20 hover:border-purple-500/30 transition-all text-white/60 hover:text-purple-400 group/btn"
                                >
                                    <MessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {sessions.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                    <FileText className="w-12 h-12 text-white/5" />
                    <p className="text-white/40 text-sm">{t('mfa.noSessions')}</p>
                </div>
            )}
        </div>
    );
});

/**
 * MfaQrModal - Memoized QR code modal
 */
const MfaQrModal = React.memo(function MfaQrModal({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const { mutate: generateQrToken, data, isPending, reset } = useGenerateQrToken();
    const [selectedService, setSelectedService] = useState('Termin / Anamnese');

    // Default to the frontend URL
    const qrUrl = useMemo(() => 
        data?.token ? `${window.location.origin}/?token=${data.token}` : '',
        [data?.token]
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{t('mfa.qrTitle', 'QR-Code Scanner')}</h3>
                            <p className="text-[10px] text-white/40 font-mono">{t('mfa.qrSubtitle', 'Direkter Patienten-Zugang')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Schließen" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-white/40" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {!data?.token ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{t('mfa.selectConcern', 'Anliegen vorwählen (Optional)')}</label>
                                <select
                                    value={selectedService}
                                    onChange={(e) => setSelectedService(e.target.value)}
                                    aria-label="Anliegen vorwählen"
                                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 ring-purple-500/50 transition-all appearance-none"
                                >
                                    <option value="Termin / Anamnese">Termin / Anamnese</option>
                                    <option value="Medikamente / Rezepte">Rezeptanfrage</option>
                                    <option value="Unfallmeldung (BG)">BG-Unfallmeldung</option>
                                    <option value="Dateien / Befunde">Befund-Upload</option>
                                </select>
                            </div>

                            <button
                                onClick={() => generateQrToken(selectedService)}
                                disabled={isPending}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2"
                            >
                                {isPending ? t('mfa.generating', 'Generiere...') : t('mfa.createQr', 'QR-Code erstellen')}
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-6 py-4">
                            <div className="bg-white p-4 rounded-2xl">
                                <QRCodeSVG value={qrUrl} size={250} level="H" includeMargin />
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-bold text-white mb-1">{t('mfa.scanWithPhone', 'Bitte mit dem Smartphone scannen')}</p>
                                <p className="text-[10px] text-white/40">{t('mfa.validFor24h', 'Gültig für 24 Stunden')}</p>
                            </div>

                            <button
                                onClick={() => reset()}
                                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10 text-sm"
                            >
                                {t('mfa.newCode', 'Neuen Code generieren')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

/**
 * MFAChatModal - Memoized chat modal
 */
const MFAChatModal = React.memo(function MFAChatModal({ 
    sessionId, 
    onClose 
}: { 
    sessionId: string; 
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { data: dbMessages } = useChatMessages(sessionId);
    const [liveMessages, setLiveMessages] = useState<DashboardChatMessage[]>([]);
    const [chatMsg, setChatMsg] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    // Memoize persisted messages
    const persistedMessages = useMemo<DashboardChatMessage[]>(
        () =>
            (dbMessages?.messages ?? []).map((m: DbChatMessage) => ({
                text: m.text,
                from: m.fromName,
                timestamp: m.timestamp,
            })),
        [dbMessages?.messages]
    );
    
    // Memoize combined messages
    const messages = useMemo(
        () => [...persistedMessages, ...liveMessages],
        [persistedMessages, liveMessages]
    );

    useEffect(() => {
        const token = getStoredStaffToken();
        const socket = io(SOCKET_BASE_URL || window.location.origin, {
            auth: token ? { token } : undefined,
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join:arzt');
        });

        socket.on('arzt:received_message', (msg: IncomingChatMessage) => {
            if (msg.sessionId === sessionId) {
                setLiveMessages(prev => [...prev, msg]);
            }
        });

        return () => {
            socket.off('connect');
            socket.off('arzt:received_message');
            socket.disconnect();
        };
    }, [sessionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = useCallback(() => {
        if (!chatMsg.trim()) return;
        const myMsg = {
            sessionId,
            text: chatMsg,
            from: 'Praxis-Team (MFA)',
            timestamp: new Date().toISOString()
        };
        socketRef.current?.emit('arzt:message', { sessionId, message: chatMsg });
        setLiveMessages(prev => [...prev, myMsg]);
        setChatMsg('');
    }, [chatMsg, sessionId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg h-[600px] bg-slate-900 border border-purple-500/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{t('mfa.patientChat', 'Patienten-Chat')}</h3>
                            <p className="text-[10px] text-white/40 font-mono">ID: {sessionId.slice(0, 16)}...</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Schließen" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-white/40" />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.from === 'Patient' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.from === 'Patient'
                                ? 'bg-white/5 text-white rounded-tl-none'
                                : 'bg-purple-600 text-white rounded-tr-none'}`}>
                                {m.text}
                                <p className="text-[10px] opacity-40 mt-1">{new Date(m.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-6 bg-black/20 border-t border-white/10 flex gap-3">
                    <input
                        type="text"
                        value={chatMsg}
                        onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Nachricht senden..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-purple-500/50"
                    />
                    <button onClick={handleSend} aria-label="Nachricht senden" className="p-4 bg-purple-600 hover:bg-purple-500 rounded-2xl transition-all shadow-lg shadow-purple-500/20">
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

// ─── Main Component ────────────────────────────────────

// Tab configuration
const TABS_CONFIG = [
    { key: 'sessions' as const, labelKey: 'mfa.currentRequests', labelDefault: 'Anfragen', icon: ClipboardList },
    { key: 'liveboard' as const, labelKey: 'mfa.liveBoard', labelDefault: 'Live Board', icon: LayoutGrid },
    { key: 'certify' as const, labelKey: 'mfa.certify', labelDefault: 'Zertifizierung', icon: Shield },
    { key: 'imports' as const, labelKey: 'mfa.importVersand', labelDefault: 'Import / Versand', icon: FileText },
    { key: 'chat' as const, labelKey: 'mfa.teamChat', labelDefault: 'Team-Chat', icon: MessageSquare },
    { key: 'todo' as const, labelKey: 'mfa.todoList', labelDefault: 'Aufgaben', icon: CheckCircle },
] as const;

/**
 * MFA-Dashboard – Main Component
 */
export const MFADashboard: React.FC = React.memo(function MFADashboard() {
    const { t } = useTranslation();
    const { data: staffUser, isLoading: sessionLoading } = useStaffSession();
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('sessions');
    const [certifySession, setCertifySession] = useState<{ sessionId: string; patientName: string; gender?: string; birthDate?: string } | null>(null);
    const queryClient = useQueryClient();
    
    // ═══════════════════════════════════════════════════════
    // NEU: Initialize Realtime Queue (Phase 2)
    // ═══════════════════════════════════════════════════════
    useRealtimeQueue({ enabled: !!staffUser });

    // Stable callbacks
    const handleLogout = useCallback(() => {
        clearStoredStaffUser();
        queryClient.setQueryData(STAFF_SESSION_QUERY_KEY, null);
        void api.arztLogout().catch(() => undefined);
    }, [queryClient]);

    const handleOpenChat = useCallback((id: string) => {
        setActiveChatId(id);
    }, []);

    const handleCloseChat = useCallback(() => {
        setActiveChatId(null);
    }, []);

    const handleCloseQR = useCallback(() => {
        setShowQRModal(false);
    }, []);

    const handleCloseCertify = useCallback(() => {
        setCertifySession(null);
    }, []);

    const handleCertified = useCallback((data: unknown) => {
        console.log('Patient certified:', data);
        setCertifySession(null);
        queryClient.invalidateQueries({ queryKey: ['mfa'] });
    }, [queryClient]);

    useEffect(() => {
        if (!staffUser) return;

        const token = getStoredStaffToken();
        const socket = io(SOCKET_BASE_URL || window.location.origin, { 
            auth: token ? { token } : undefined,
            withCredentials: true,
            transports: ['websocket', 'polling'] 
        });

        socket.on('connect', () => {
            socket.emit('join:arzt');
        });

        socket.on('triage:alert', () => {
            queryClient.invalidateQueries({ queryKey: ['mfa'] });
        });

        socket.on('session:complete', () => {
            queryClient.invalidateQueries({ queryKey: ['mfa'] });
        });

        return () => {
            socket.off('connect');
            socket.off('triage:alert');
            socket.off('session:complete');
            socket.disconnect();
        };
    }, [staffUser, queryClient]);

    // Memoize tab content — must be before early return (Rules of Hooks)
    const tabContent = useMemo(() => {
        if (!staffUser) return null;
        switch (activeTab) {
            case 'sessions':
                return (
                    <>
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <ClipboardList className="w-6 h-6 text-purple-400" />
                                    {t('mfa.currentRequests')}
                                </h2>
                                <div className="flex gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input aria-label="Sitzungen suchen" placeholder="Suchen..." className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 ring-purple-500/50 w-64" />
                                    </div>
                                    <button aria-label="Filter" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                        <Filter className="w-5 h-5 text-white/60" />
                                    </button>
                                </div>
                            </div>

                            <SessionManagementList onOpenChat={handleOpenChat} />
                        </div>
                        <WartezimmerPanel />
                    </>
                );
            
            // ═══════════════════════════════════════════════════════
            // NEU: Live Board Tab (Phase 2)
            // ═══════════════════════════════════════════════════════
            case 'liveboard':
                return (
                    <div className="animate-fade-in">
                        <LiveQueueView />
                    </div>
                );
                
            case 'certify':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold">{t('mfa.certifyTitle', 'Patienten-Zertifizierung')}</h2>
                        </div>
                        <p className="text-sm text-white/50">
                            {t('mfa.certifyDesc', 'Hier können neue Patienten nach Ausweisprüfung zertifiziert werden.')}
                        </p>
                        <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center space-y-4">
                            <Shield className="w-16 h-16 text-purple-500/30 mx-auto" />
                            <p className="text-white/40 text-sm">
                                {t('mfa.certifyHint', 'Wählen Sie eine Sitzung in der Anfragen-Tab, um die Zertifizierung zu starten.')}
                            </p>
                            <button
                                onClick={() => setActiveTab('sessions')}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                            >
                                {t('mfa.goToSessions', 'Zu den Anfragen')}
                            </button>
                        </div>
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
            case 'imports':
                return <MfaImportVersandPanel />;
            case 'todo':
                return (
                    <StaffTodoList
                        currentUser={{ id: staffUser.id, displayName: staffUser.displayName, role: staffUser.role }}
                    />
                );
            default:
                return null;
        }
    }, [activeTab, t, handleOpenChat, staffUser]);

    if (sessionLoading || !staffUser) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <header className="border-b border-[var(--border-primary)] bg-[var(--bg-card)]/40 backdrop-blur-2xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">{t('mfa.portal')}</h1>
                            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Medical Front-Office</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowQRModal(true)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20"
                        >
                            <QrCode className="w-4 h-4" />
                            {t('mfa.checkinQr', 'Patienten Check-in')}
                        </button>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        <FullscreenButton />
                        <button
                            onClick={handleLogout}
                            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 hover:border-red-500/30 transition-all text-white/40 hover:text-red-400"
                            title={t('mfa.logout')}
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="space-y-10">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {TABS_CONFIG.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                                    activeTab === tab.key 
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {t(tab.labelKey, tab.labelDefault)}
                            </button>
                        ))}
                    </div>

                    {tabContent}
                </div>
            </main>

            {activeChatId && (
                <MFAChatModal sessionId={activeChatId} onClose={handleCloseChat} />
            )}

            {showQRModal && (
                <MfaQrModal onClose={handleCloseQR} />
            )}

            {certifySession && (
                <CertificationModal
                    sessionId={certifySession.sessionId}
                    patientName={certifySession.patientName}
                    patientGender={certifySession.gender}
                    patientBirthDate={certifySession.birthDate}
                    onClose={handleCloseCertify}
                    onCertified={handleCertified}
                />
            )}
        </div>
    );
});
