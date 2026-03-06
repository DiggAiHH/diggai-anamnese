import React, { useState } from 'react';
import { Shield, LogOut, AlertTriangle, User, ChevronRight, CheckCircle, Activity, Sparkles, Send, MessageSquare, Download, FileText, Bell, ClipboardList } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { useArztLogin, useArztSessions, useArztSessionDetail, useArztSessionSummary, useChatMessages, useAckTriage } from '../hooks/useApi';
import { setAuthToken, getAuthToken, API_BASE_URL, SOCKET_BASE_URL, api } from '../api/client';
import { StaffChat } from '../components/StaffChat';
import { StaffTodoList } from '../components/StaffTodoList';
import { FullscreenButton } from '../components/FullscreenButton';
import { ClinicalAlertList } from '../components/therapy/ClinicalAlertBanner';

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

/**
 * Arzt-Dashboard – Route /arzt
 */
interface ToastAlert {
    id: number;
    type: 'triage' | 'success' | 'message';
    title?: string;
    message?: string;
    sessionId?: string;
    level?: string;
}

interface SocketTriageAlert {
    level: string;
    message: string;
    sessionId: string;
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

export const ArztDashboard: React.FC = () => {
    const { t } = useTranslation();
    const [token, setToken] = useState<string | null>(localStorage.getItem('arzt_token'));
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [toastAlerts, setToastAlerts] = useState<ToastAlert[]>([]);
    const [activeLocks, setActiveLocks] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'patients' | 'chat' | 'todo' | 'therapy' | 'alerts'>('patients');
    const [clinicalAlertCount, setClinicalAlertCount] = useState(0);
    const queryClient = useQueryClient();

    React.useEffect(() => {
        if (!token) return;

        const socket = io(SOCKET_BASE_URL || window.location.origin, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            socket.emit('join:arzt');
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

        socket.on('arzt:received_message', (data: SocketMessage) => {
            playAlertSound();
            setToastAlerts(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'message',
                title: t('arzt.newMessage'),
                message: `Patient: ${data.text.slice(0, 50)}${data.text.length > 50 ? '...' : ''}`,
                sessionId: data.sessionId
            }]);
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

        // ─── Modul 3+4: PVS & Therapy Events ───────────────
        socket.on('therapy:alert-new', (data: { severity: string; title: string; message: string; patientId: string }) => {
            playAlertSound();
            setClinicalAlertCount(prev => prev + 1);
            setToastAlerts(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'triage',
                title: data.title,
                message: data.message,
                level: data.severity,
            }]);
            queryClient.invalidateQueries({ queryKey: ['therapy'] });
        });

        socket.on('therapy:alert-critical', () => {
            playAlertSound();
            queryClient.invalidateQueries({ queryKey: ['therapy'] });
        });

        socket.on('pvs:export-completed', (data: { sessionId: string; pvsType: string }) => {
            setToastAlerts(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'success',
                title: t('arzt.pvsExportSuccess', 'PVS-Export erfolgreich'),
                message: `${data.pvsType}`,
                sessionId: data.sessionId,
            }]);
        });

        socket.on('pvs:export-failed', (data: { sessionId: string; error: string }) => {
            setToastAlerts(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'triage',
                title: t('arzt.pvsExportFailed', 'PVS-Export fehlgeschlagen'),
                message: data.error,
                sessionId: data.sessionId,
                level: 'WARNING',
            }]);
        });

        socket.on('pvs:patient-imported', () => {
            queryClient.invalidateQueries({ queryKey: ['arzt'] });
        });

        socket.on('therapy:plan-updated', () => {
            queryClient.invalidateQueries({ queryKey: ['therapy'] });
        });

        socket.on('therapy:measure-due', (data: { title: string; planId: string }) => {
            setToastAlerts(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'message',
                title: t('arzt.measureDue', 'Maßnahme fällig'),
                message: data.title,
            }]);
        });

        return () => {
            socket.disconnect();
        };
    }, [token, queryClient]);

    if (!token) {
        return <ArztLogin onLogin={(t) => { setToken(t); setAuthToken(t); }} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">{t('arzt.dashboard')}</h1>
                            <p className="text-xs text-white/40">{t('arzt.overview')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <FullscreenButton />
                        <button
                            onClick={() => { setToken(null); localStorage.removeItem('arzt_token'); setAuthToken(null); }}
                            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                        >
                            <LogOut className="w-4 h-4" /> {t('arzt.logout')}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-white/10 pb-0 mb-8">
                    {([
                        { key: 'patients' as const, label: t('arzt.patients', 'Patienten'), icon: User },
                        { key: 'therapy' as const, label: t('arzt.therapyPlans', 'Therapiepläne'), icon: ClipboardList },
                        { key: 'alerts' as const, label: t('arzt.alerts', 'Alerts'), icon: Bell, badge: clinicalAlertCount },
                        { key: 'chat' as const, label: t('arzt.teamChat', 'Team-Chat'), icon: MessageSquare },
                        { key: 'todo' as const, label: t('arzt.todoList', 'Aufgaben'), icon: CheckCircle },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${activeTab === tab.key
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-white/40 hover:text-white/70'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {'badge' in tab && (tab as any).badge > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 min-w-[20px] text-center bg-red-500 text-white text-[10px] font-black rounded-full">
                                    {(tab as any).badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {activeTab === 'patients' && (
                    selectedSessionId ? (
                        <SessionDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />
                    ) : (
                        <SessionList onSelect={setSelectedSessionId} activeLocks={activeLocks} />
                    )
                )}

                {activeTab === 'therapy' && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-blue-400" />
                            {t('arzt.therapyPlans', 'Therapiepläne')}
                        </h2>
                        <p className="text-white/50 text-sm">{t('arzt.therapySelectPatient', 'Wählen Sie einen Patienten in der Patientenliste, um einen Therapieplan zu erstellen.')}</p>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-red-400" />
                            {t('arzt.clinicalAlerts', 'Klinische Alerts')}
                        </h2>
                        <ClinicalAlertList />
                    </div>
                )}

                {activeTab === 'chat' && (
                    <StaffChat
                        currentUser={{ id: 'arzt-user', displayName: 'Dr. Arzt', role: 'arzt' }}
                        patientSessions={[]}
                        className="min-h-[600px]"
                    />
                )}

                {activeTab === 'todo' && (
                    <StaffTodoList
                        currentUser={{ id: 'arzt-user', displayName: 'Dr. Arzt', role: 'arzt' }}
                    />
                )}
            </div>

            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
                {toastAlerts.map((tAlert) => (
                    <div key={tAlert.id} className={`animate-in slide-in-from-right-8 backdrop-blur-xl p-4 rounded-xl shadow-2xl max-w-sm flex items-start gap-4 border ${tAlert.type === 'triage' ? 'bg-red-500/10 border-red-500/50 shadow-red-500/20' :
                        tAlert.type === 'message' ? 'bg-purple-500/10 border-purple-500/50 shadow-purple-500/20' :
                            'bg-emerald-500/10 border-emerald-500/50 shadow-emerald-500/20'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tAlert.type === 'triage' ? 'bg-red-500/20' :
                            tAlert.type === 'message' ? 'bg-purple-500/20' :
                                'bg-emerald-500/20'}`}>
                            {tAlert.type === 'triage' ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
                                tAlert.type === 'message' ? <MessageSquare className="w-5 h-5 text-purple-500" /> :
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm ${tAlert.type === 'triage' ? 'text-red-400' :
                                tAlert.type === 'message' ? 'text-purple-400' :
                                    'text-emerald-400'}`}>
                                {tAlert.type === 'triage' ? `${t('arzt.emergencyAlert')} (${tAlert.level})` : tAlert.title}
                            </h4>
                            <p className="text-white/80 text-xs mt-1 leading-relaxed">{tAlert.message}</p>
                            <p className={`text-[10px] mt-2 font-mono truncate ${tAlert.type === 'triage' ? 'text-red-400/60' :
                                tAlert.type === 'message' ? 'text-purple-400/60' :
                                    'text-emerald-400/60'}`}>Ref: {tAlert.sessionId}</p>
                        </div>
                        <button onClick={() => setToastAlerts(prev => prev.filter(t => t.id !== tAlert.id))} className="text-white/30 hover:text-white shrink-0">
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ArztLogin: React.FC<{ onLogin: (token: string) => void }> = ({ onLogin }) => {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const loginMutation = useArztLogin();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await loginMutation.mutateAsync({ username, password });
            localStorage.setItem('arzt_token', result.token);
            localStorage.setItem('arzt_user', JSON.stringify(result.user));
            onLogin(result.token);
        } catch {
            // Error state is handled by loginMutation.isError below
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">{t('arzt.login.title')}</h1>
                    <p className="text-sm text-white/50 mt-2">{t('arzt.login.subtitle')}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('arzt.login.username')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('arzt.login.password')} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" />
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all">{t('arzt.login.submit')}</button>
                    {loginMutation.isError && <p className="text-sm text-red-400">{t('arzt.login.error')}</p>}
                </form>
            </div>
        </div>
    );
};

const SessionList: React.FC<{ onSelect: (id: string) => void, activeLocks: Record<string, string> }> = ({ onSelect, activeLocks }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useArztSessions();
    const sessions = data?.sessions || [];

    if (isLoading) return <p className="text-white p-10">{t('arzt.loading')}</p>;

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard icon={User} label={t('arzt.stats.active')} value={sessions.filter((s: ArztSession) => s.status === 'ACTIVE').length} color="blue" />
                <StatCard icon={CheckCircle} label={t('arzt.stats.completed')} value={sessions.filter((s: ArztSession) => s.status === 'COMPLETED').length} color="emerald" />
                <StatCard icon={AlertTriangle} label={t('arzt.stats.redflags')} value={sessions.reduce((acc: number, s: ArztSession) => acc + (s.unresolvedCritical || 0), 0)} color="red" />
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
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-black rounded-lg border border-red-500/30 animate-pulse">
                                {session.unresolvedCritical} ALERT{session.unresolvedCritical > 1 ? 'S' : ''}
                            </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-white/20" />
                    </button>
                ))}
            </div>
        </div>
    );
};

const SessionDetail: React.FC<{ sessionId: string; onBack: () => void }> = ({ sessionId, onBack }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useArztSessionDetail(sessionId);
    const { data: summary, isLoading: infoLoading } = useArztSessionSummary(sessionId);
    const { data: dbMessages } = useChatMessages(sessionId);
    const ackTriage = useAckTriage();
    const [chatMsg, setChatMsg] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [patientTyping, setPatientTyping] = useState(false);
    const patientTypingTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const socketRef = React.useRef<ReturnType<typeof io> | null>(null);
    const queryClient = useQueryClient();

    const completeMutation = useMutation({
        mutationFn: () => api.updateSessionStatus(sessionId, 'COMPLETED'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arzt_session_detail', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['arzt_sessions'] });
        }
    });

    // Initial load from DB
    React.useEffect(() => {
        if (dbMessages?.messages) {
            const formatted = dbMessages.messages.map((m: { sessionId?: string; text: string; fromName: string; timestamp: string }) => ({
                sessionId: m.sessionId,
                text: m.text,
                from: m.fromName,
                timestamp: m.timestamp
            }));
            setMessages(formatted);
        }
    }, [dbMessages]);

    React.useEffect(() => {
        const socket = io(SOCKET_BASE_URL || window.location.origin);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join:arzt');
            // Lock die Session
            const userStr = localStorage.getItem('arzt_user');
            let userName = t('arzt.colleague', 'Ein Kollege');
            if (userStr) { try { userName = JSON.parse(userStr).displayName || t('arzt.doctor', 'Arzt'); } catch { } }
            socket.emit('view:session', { sessionId, userName });
        });

        socket.on('arzt:received_message', (msg: ChatMessage) => {
            if (msg.sessionId === sessionId) {
                setMessages(prev => [...prev, msg]);
            }
        });

        socket.on('patient:typing', (data: { sessionId: string }) => {
            if (data.sessionId === sessionId) {
                setPatientTyping(true);
                if (patientTypingTimeout.current) clearTimeout(patientTypingTimeout.current);
                patientTypingTimeout.current = setTimeout(() => setPatientTyping(false), 3000);
            }
        });

        return () => {
            socket.emit('unview:session', { sessionId });
            socket.disconnect();
        };
    }, [sessionId]);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendChat = () => {
        if (!chatMsg.trim()) return;

        const myMsg = {
            sessionId,
            text: chatMsg,
            from: 'Praxis-Team',
            timestamp: new Date().toISOString()
        };

        socketRef.current?.emit('arzt:message', { sessionId, message: chatMsg });
        setMessages(prev => [...prev, myMsg]);
        setChatMsg('');
    };

    if (isLoading || !data) return <p className="text-white p-10">{t('arzt.loadingDetail')}</p>;

    const session = data.session;

    return (
        <div className="animate-fade-in pb-20">
            <button onClick={onBack} className="text-sm text-white/50 hover:text-white mb-6 flex items-center gap-1 group transition-all">
                <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" /> {t('arzt.backToOverview')}
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Linke Spalte: Daten & KI */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">{t('arzt.patientData')}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {session.patientName && (
                                <div className="space-y-1 col-span-2">
                                    <p className="text-[10px] text-white/30 uppercase">{t('arzt.patient')}</p>
                                    <p className="text-lg text-white font-bold">{session.patientName}</p>
                                </div>
                            )}
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/30 uppercase">{t('arzt.sessionId')}</p>
                                <p className="text-sm text-white font-mono">{session.id.slice(0, 16)}...</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/30 uppercase">{t('arzt.selectedService')}</p>
                                <p className="text-sm text-blue-400 font-bold">{session.selectedService || 'Allgemein'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/30 uppercase">{t('arzt.status')}</p>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${session.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {session.status}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/30 uppercase">{t('arzt.createdAt')}</p>
                                <p className="text-sm text-white/70">{new Date(session.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                        {/* Export Buttons */}
                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/10 flex-wrap">
                            <button
                                onClick={() => api.exportSessionPDF(sessionId)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-500/30"
                            >
                                <FileText className="w-4 h-4" />
                                {t('arzt.pdfReport')}
                            </button>
                            <button
                                onClick={() => api.exportSessionCSV(sessionId)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/30"
                            >
                                <Download className="w-4 h-4" />
                                {t('arzt.csvExport')}
                            </button>

                            {session.status !== 'COMPLETED' && (
                                <button
                                    onClick={() => {
                                        if (window.confirm(t('arzt.confirmComplete'))) {
                                            completeMutation.mutate();
                                        }
                                    }}
                                    disabled={completeMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-xs font-bold transition-all border border-purple-500/30 ml-auto"
                                >
                                    {completeMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    {t('arzt.completeCase')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                        <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" /> {t('arzt.aiAnalysis')}
                        </h2>
                        {infoLoading ? (
                            <div className="flex items-center gap-3 text-blue-400/50 py-4">
                                <Activity className="w-5 h-5 animate-pulse" />
                                <p className="text-sm animate-pulse">{t('arzt.analyzing')}</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative">
                                    <div className="absolute -left-2 top-0 bottom-0 w-1 bg-blue-500/40 rounded-full" />
                                    <p className="text-sm text-white/90 leading-relaxed pl-4 italic">"{summary?.summary}"</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase mb-2 font-bold tracking-widest">{t('arzt.icdCodes')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {summary?.icdCodes?.map((icd: IcdCode) => (
                                            <div key={icd.code} className="group relative">
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg border border-blue-500/30 font-bold hover:bg-blue-500/40 transition-all cursor-help">
                                                    {icd.code}
                                                </span>
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    {icd.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Triage Alerts */}
                    {session.triageEvents?.length > 0 && (
                        <div className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 p-6 backdrop-blur-md">
                            <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> {t('arzt.triageAlarms')} ({session.triageEvents.length})
                            </h2>
                            <div className="space-y-2">
                                {session.triageEvents.map((te: TriageEvent) => (
                                    <div key={te.id} className={`flex items-start gap-3 p-3 rounded-xl border ${te.acknowledgedAt ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase ${te.level === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-yellow-500/30 text-yellow-300'}`}>
                                            {te.level}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white font-medium">{te.message}</p>
                                            <p className="text-[10px] text-white/30 mt-1">{t('arzt.question')}: {te.atomId} • {new Date(te.createdAt).toLocaleString(navigator.language)}</p>
                                            {te.acknowledgedAt && (
                                                <p className="text-[10px] text-green-400/70 mt-1 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> {t('arzt.triageAckedBy', { by: te.acknowledgedBy, at: new Date(te.acknowledgedAt).toLocaleString(navigator.language) })}
                                                </p>
                                            )}
                                        </div>
                                        {!te.acknowledgedAt && (
                                            <button
                                                onClick={() => ackTriage.mutate(te.id)}
                                                disabled={ackTriage.isPending}
                                                className="shrink-0 px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3 h-3" /> {t('arzt.triageAck')}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                        <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">{t('arzt.answersBySection')}</h2>
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {(() => {
                                // Group answers by section
                                const sectionLabels: Record<string, string> = {
                                    'basis': '👤 Personalien', 'versicherung': '🏥 Versicherung', 'adresse': '📍 Adresse',
                                    'kontakt': '📞 Kontaktdaten', 'beschwerden': '🩺 Aktuelle Beschwerden',
                                    'koerpermasse': '📏 Körpermaße', 'rauchen': '🚬 Raucherstatus',
                                    'impfungen': '💉 Impfstatus', 'familie': '👨‍👩‍👧 Familienanamnese',
                                    'beruf': '💼 Beruf & Lebensstil', 'diabetes': '🩸 Diabetes',
                                    'beeintraechtigung': '♿ Beeinträchtigungen', 'implantate': '🔩 Implantate',
                                    'blutverduenner': '💊 Blutverdünner', 'allergien': '⚠️ Allergien',
                                    'gesundheitsstoerungen': '🏥 Gesundheitsstörungen',
                                    'vorerkrankungen': '📋 Vorerkrankungen', 'medikamente-freitext': '💊 Medikamente',
                                    'schwangerschaft': '🤰 Schwangerschaft', 'rezepte': '📝 Rezeptanfrage',
                                    'au-anfrage': '📄 AU-Anfrage', 'ueberweisung': '🔄 Überweisungsanfrage',
                                    'absage': '❌ Terminabsage', 'telefon': '📱 Telefonanfrage',
                                    'nachricht': '✉️ Nachricht', 'abschluss': '✅ Abschluss',
                                    'bg-unfall': '🚧 BG-Unfall',
                                };
                                const sections = new Map<string, SessionAnswer[]>();
                                for (const a of (session.answers || [])) {
                                    const key = a.section || 'sonstige';
                                    if (!sections.has(key)) sections.set(key, []);
                                    sections.get(key)!.push(a);
                                }
                                return Array.from(sections.entries()).map(([sectionKey, answers]) => (
                                    <div key={sectionKey} className="border-l-2 border-blue-500/30 pl-4">
                                        <h3 className="text-xs font-bold text-blue-400 mb-2">
                                            {sectionLabels[sectionKey] || sectionKey}
                                        </h3>
                                        <div className="space-y-2">
                                            {answers.map((a: SessionAnswer) => (
                                                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] text-white/50">
                                                            {a.questionText || `Frage ${a.atomId}`}
                                                        </p>
                                                        {a.answerType === 'file' && (a.value?.filename || a.value?.data?.filename) ? (
                                                            <div className="mt-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const res = await fetch(`${API_BASE_URL}/upload/${a.value?.filename || a.value?.data?.filename}`, {
                                                                                headers: { Authorization: `Bearer ${getAuthToken()}` }
                                                                            });
                                                                            const blob = await res.blob();
                                                                            const url = URL.createObjectURL(blob);
                                                                            window.open(url, '_blank');
                                                                            setTimeout(() => URL.revokeObjectURL(url), 60000);
                                                                        } catch (err) { console.warn('Download failed:', err); }
                                                                    }}
                                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/40 cursor-pointer"
                                                                >
                                                                    <FileText className="w-3 h-3" />
                                                                    {(a.value?.originalName || a.value?.data?.originalName) || t('arzt.viewDocument')}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-white font-medium mt-0.5">
                                                                {Array.isArray(a.value?.data) ? a.value.data.join(', ') :
                                                                    typeof a.value?.data === 'object' ? JSON.stringify(a.value.data) :
                                                                        String(a.value?.data ?? a.value ?? '-')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* Rechte Spalte: Live Chat */}
                <div className="flex flex-col h-[600px] sm:h-[800px] lg:h-auto">
                    <div className="flex-1 flex flex-col rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-md overflow-hidden shadow-2xl shadow-purple-500/5">
                        <div className="p-4 border-b border-purple-500/20 bg-purple-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">{t('arzt.liveChat')}</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] text-emerald-400 font-medium">{t('arzt.patientConnected')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                        <MessageSquare className="w-8 h-8 text-white/10" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/40 font-medium">{t('arzt.noMessages')}</p>
                                        <p className="text-[11px] text-white/20 mt-1">{t('arzt.sendHint')}</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.from === 'Patient' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] group`}>
                                        <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-lg ${m.from === 'Patient'
                                            ? 'bg-gray-800 border border-white/10 text-white rounded-tl-none'
                                            : 'bg-purple-600 text-white rounded-tr-none'
                                            }`}>
                                            {m.text}
                                        </div>
                                        <p className={`text-[9px] text-white/20 mt-1.5 px-1 flex items-center gap-2 ${m.from === 'Patient' ? 'justify-start' : 'justify-end'}`}>
                                            <span className="font-bold uppercase tracking-tighter">{m.from === 'Patient' ? t('arzt.incoming') : t('arzt.sent')}</span>
                                            <span>•</span>
                                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Patient typing indicator */}
                        {patientTyping && (
                            <div className="px-4 py-2 flex items-center gap-2 text-white/40">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                                <span className="text-[10px]">{t('arzt.patientTyping')}</span>
                            </div>
                        )}

                        <div className="p-4 bg-gray-950/50 border-t border-purple-500/20">
                            <div className="relative flex items-end gap-2 bg-white/5 rounded-2xl p-1 px-3 border border-white/10 focus-within:border-purple-500/50 transition-all">
                                <textarea
                                    rows={1}
                                    value={chatMsg}
                                    onChange={e => {
                                        setChatMsg(e.target.value);
                                        socketRef.current?.emit('arzt:typing', { sessionId });
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendChat();
                                        }
                                    }}
                                    placeholder={t('arzt.messagePlaceholder')}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-white/20 py-3 resize-none max-h-32"
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={!chatMsg.trim()}
                                    aria-label={t('arzt.sendMessage')}
                                    className="mb-1.5 p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[9px] text-white/20 mt-2 text-center">{t('arzt.pushInfo')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

const StatCard = React.memo<{ icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }>(({ icon: Icon, label, value, color }) => {
    const colors: Record<string, string> = { blue: 'bg-blue-500/20 text-blue-400', emerald: 'bg-emerald-500/20 text-emerald-400', red: 'bg-red-500/20 text-red-400' };
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${colors[color]}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xl font-bold text-white">{value}</p><p className="text-xs text-white/50">{label}</p></div>
        </div>
    );
});
