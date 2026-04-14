import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageSquare, Send, X, User, Bot, HelpCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useChatMessages } from '../hooks/usePatientApi';
import { SOCKET_BASE_URL } from '../api/client';
import { useTranslation } from 'react-i18next';
import { matchIntent } from '../utils/chatNLU';
import type { IntentId } from '../utils/chatNLU';
import { useThemeStore } from '../store/themeStore';

// ─── Intent → i18n key mapping (uses existing locale keys where available) ─
const INTENT_I18N_MAP: Partial<Record<IntentId, string>> = {
    INFO_NOTFALL:              'chat.faq_emergency',
    SYS_HILFE:                 'chat.faq_help',
    ACTION_TERMIN:             'chat.faq_appointment',
    ACTION_REZEPT_BESTELLEN:   'chat.faq_prescriptions',
    NAV_REZEPT:                'chat.faq_medication',
    NAV_AU:                    'chat.faq_sick_leave',
    ACTION_AU_ANFRAGEN:        'chat.faq_sick_leave',
    NAV_UEBERWEISUNG:          'chat.faq_referral',
    ACTION_BEFUND:             'chat.faq_results',
    ACTION_DATEIEN_HOCHLADEN:  'chat.faq_documents',
    NAV_DATENSCHUTZ:           'chat.faq_privacy',
    INFO_VERSICHERUNG:         'chat.faq_insurance',
    INFO_KOSTEN:               'chat.faq_costs',
    INFO_WARTEZEIT:            'chat.faq_waiting',
    INFO_IMPFUNG:              'chat.faq_vaccination',
    INFO_DATENLOESUNG:         'chat.faq_data_deletion',
};

// ─── Types ─────────────────────────────────────────────────
interface Message {
    text: string;
    from: string;
    timestamp: string;
    isBot?: boolean;
    actionRoute?: string;   // navigation route or 'SWITCH_TEAM'
    actionLabel?: string;   // label for the action chip button
    isEscalation?: boolean; // highlights the escalation message
}

interface DbMessage {
    text: string;
    fromName: string;
    timestamp: string;
}

interface ChatBubbleProps {
    sessionId?: string;
}

type ChatTab = 'bot' | 'team';

// ─── Topic Quick-Reply Buttons ─────────────────────────────
const TOPIC_BUTTONS = [
    { key: 'botTopicAppointment',  query: 'termin vorbereiten' },
    { key: 'botTopicMedication',   query: 'rezept medikament' },
    { key: 'botTopicWaiting',      query: 'krankschreibung' },
    { key: 'botTopicResults',      query: 'befund ergebnis' },
    { key: 'botTopicVaccination',  query: 'impfung' },
    { key: 'botTopicCosts',        query: 'kosten' },
    { key: 'botTopicInsurance',    query: 'versicherung' },
    { key: 'botTopicParking',      query: 'anfahrt parken' },
    { key: 'botTopicGeneral',      query: 'hilfe' },
];

export const ChatBubble: React.FC<ChatBubbleProps> = ({ sessionId }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setTheme } = useThemeStore();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ChatTab>('bot');
    const hasSession = !!sessionId;
    const [liveMessages, setLiveMessages] = useState<Message[]>([]);
    const [botMessages, setBotMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [botTyping, setBotTyping] = useState(false);
    const [teamTyping, setTeamTyping] = useState(false);
    const [unknownCount, setUnknownCount] = useState(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const botScrollRef = useRef<HTMLDivElement>(null);

    const { data: dbMessages } = useChatMessages(sessionId || '');
    const persistedMessages = useMemo<Message[]>(
        () =>
            hasSession
                ? (dbMessages?.messages ?? []).map((m: DbMessage) => ({
                    text: m.text,
                    from: m.fromName,
                    timestamp: m.timestamp,
                }))
                : [],
        [dbMessages?.messages, hasSession]
    );
    const teamMessages = useMemo(
        () => [...persistedMessages, ...liveMessages],
        [persistedMessages, liveMessages]
    );

    // Initialize bot with greeting
    useEffect(() => {
        if (botMessages.length === 0) {
            setBotMessages([
                {
                    text: t('botGreeting', 'Hallo! Ich bin Ihr digitaler Assistent. Wie kann ich Ihnen helfen?'),
                    from: 'Bot',
                    timestamp: new Date().toISOString(),
                    isBot: true,
                },
                {
                    text: t('botHelpPrompt', 'Brauchen Sie Hilfe bei einer Frage? Tippen Sie z.B. "hilfe" oder wählen Sie ein Thema:'),
                    from: 'Bot',
                    timestamp: new Date().toISOString(),
                    isBot: true,
                },
            ]);
        }
    }, [t]);

    useEffect(() => {
        if (!hasSession) return;
        const socket = io(SOCKET_BASE_URL || window.location.origin, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;
        socket.emit('join:session', sessionId);
        
        // Define handlers as named functions so we can remove them properly
        const handlePatientMessage = (msg: Message) => {
            setLiveMessages(prev => [...prev, msg]);
            if (!isOpen || activeTab !== 'team') setUnreadCount(c => c + 1);
        };
        
        const handleArztTyping = () => {
            setTeamTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTeamTyping(false), 3000);
        };
        
        socket.on('patient:message', handlePatientMessage);
        socket.on('arzt:typing', handleArztTyping);
        
        return () => {
            // Memory Leak Fix: Remove specific event listeners before disconnect
            socket.off('patient:message', handlePatientMessage);
            socket.off('arzt:typing', handleArztTyping);
            socket.disconnect();
        };
    }, [sessionId, isOpen, activeTab, hasSession]);
    
    // Memory Leak Fix: Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const ref = activeTab === 'bot' ? botScrollRef.current : scrollRef.current;
        if (ref) ref.scrollTop = ref.scrollHeight;
    }, [teamMessages, botMessages, activeTab]);

    const handleBotQuery = useCallback((query: string) => {
        const userMsg: Message = {
            text: query,
            from: 'Patient',
            timestamp: new Date().toISOString(),
        };
        setBotMessages(prev => [...prev, userMsg]);
        setBotTyping(true);

        setTimeout(() => {
            const result = matchIntent(query);

            // ── Handle system actions immediately ──────────────
            if (result.action === 'SET_THEME_DARK') setTheme('dark');
            if (result.action === 'SET_THEME_LIGHT') setTheme('light');
            if (result.intent === 'CHITCHAT_TSCHUESS') {
                setTimeout(() => setIsOpen(false), 2000);
            }

            // ── Escalation tracking ────────────────────────────
            const newUnknownCount = result.intent === 'UNKNOWN'
                ? unknownCount + 1
                : 0;
            setUnknownCount(newUnknownCount);

            // ── Resolve response text (prefer i18n key) ────────
            const i18nKey = INTENT_I18N_MAP[result.intent];
            const responseText = i18nKey
                ? t(i18nKey)
                : result.response;

            // ── Build action chip for navigable intents ────────
            const hasRoute = !!result.route;
            const actionLabel = hasRoute
                ? t('chat.actionOpen', '→ Jetzt öffnen')
                : undefined;

            const botReply: Message = {
                text: responseText,
                from: 'Bot',
                timestamp: new Date().toISOString(),
                isBot: true,
                ...(hasRoute && {
                    actionRoute: result.route,
                    actionLabel,
                }),
            };
            setBotMessages(prev => [...prev, botReply]);

            // ── Escalation prompt after 2+ unsuccessful matches ─
            if (newUnknownCount >= 2) {
                const escalationMsg: Message = {
                    text: t('chat.escalation_suggest', 'Ich konnte Ihre Anfrage leider nicht zuordnen. Möchten Sie direkt mit unserem Praxis-Team chatten?'),
                    from: 'Bot',
                    timestamp: new Date().toISOString(),
                    isBot: true,
                    isEscalation: true,
                    ...(hasSession && {
                        actionRoute: 'SWITCH_TEAM',
                        actionLabel: t('chat.switchToTeam', 'Team-Chat öffnen'),
                    }),
                };
                setBotMessages(prev => [...prev, escalationMsg]);
                setUnknownCount(0);
            }

            setBotTyping(false);
        }, 800 + Math.random() * 600);
    }, [t, unknownCount, hasSession, setTheme]);

    const handleSend = useCallback(() => {
        if (!inputText.trim()) return;

        if (activeTab === 'bot') {
            handleBotQuery(inputText);
        } else {
            const myMsg: Message = {
                text: inputText,
                from: 'Patient',
                timestamp: new Date().toISOString(),
            };
            setLiveMessages(prev => [...prev, myMsg]);
            socketRef.current?.emit('patient:send_message', { sessionId, message: inputText });
        }
        setInputText('');
    }, [inputText, activeTab, handleBotQuery, sessionId]);

    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); setUnreadCount(0); }}
                aria-label={t('chatBubbleOpen', 'Chat öffnen')}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50 text-white"
            >
                <MessageSquare className="w-6 h-6" />
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold">
                        {unreadCount}
                    </div>
                )}
            </button>
        );
    }

    const currentMessages = activeTab === 'bot' ? botMessages : teamMessages;
    const currentScrollRef = activeTab === 'bot' ? botScrollRef : scrollRef;

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[480px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="p-3 bg-[var(--bg-card)] border-b border-[var(--border-primary)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        {activeTab === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                            {activeTab === 'bot' ? t('chat.assistant', 'Assistent') : t('chat.praxis_chat', 'Praxis-Chat')}
                        </p>
                        <p className="text-[10px] text-green-400">{t('Online', 'Online')}</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} aria-label={t('chatBubbleClose', 'Chat schließen')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-[var(--border-primary)]">
                <button
                    onClick={() => setActiveTab('bot')}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5
                        ${activeTab === 'bot' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-white/40 hover:text-white/60'}`}
                >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {t('chat.tab_faq', 'FAQ & Hilfe')}
                </button>
                <button
                    onClick={() => { setActiveTab('team'); setUnreadCount(0); }}
                    disabled={!hasSession}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5
                        ${!hasSession ? 'opacity-30 cursor-not-allowed text-[var(--text-muted)]' : activeTab === 'team' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                    <User className="w-3.5 h-3.5" />
                    {t('chat.tab_team', 'Team-Chat')}
                    {unreadCount > 0 && activeTab !== 'team' && (
                        <span className="ml-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white">{unreadCount}</span>
                    )}
                </button>
            </div>

            {/* Chat explanation bar */}
            {activeTab === 'team' && teamMessages.length === 0 && (
                <div className="px-4 py-3 bg-blue-500/5 border-b border-white/5">
                    <p className="text-[10px] text-white/40 leading-relaxed">
                        {t('chatExplanation', 'Hier können Sie direkt mit unserem Praxis-Team kommunizieren. Bei Rückfragen oder wenn Sie Hilfe benötigen, schreiben Sie uns einfach eine Nachricht.')}
                    </p>
                </div>
            )}

            {/* Content */}
            <div ref={currentScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {currentMessages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.from === 'Patient' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${m.from === 'Patient'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : m.isEscalation
                                ? 'bg-amber-500/15 text-amber-200 rounded-tl-none border border-amber-500/30'
                                : m.isBot
                                    ? 'bg-indigo-500/15 text-white/90 rounded-tl-none border border-indigo-500/20'
                                    : 'bg-white/10 text-white rounded-tl-none'
                            }`}>
                            {m.isEscalation && (
                                <div className="flex items-center gap-1.5 mb-1.5 text-amber-400">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                                        {t('chat.escalation_label', 'Weiterhilfe')}
                                    </span>
                                </div>
                            )}
                            <span className="whitespace-pre-line">{m.text}</span>
                            {m.actionRoute && m.actionLabel && (
                                <button
                                    onClick={() => {
                                        if (m.actionRoute === 'SWITCH_TEAM') {
                                            setActiveTab('team');
                                            setUnreadCount(0);
                                        } else {
                                            navigate(m.actionRoute!);
                                        }
                                    }}
                                    className="mt-2 flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200 font-medium underline underline-offset-2 transition-colors"
                                >
                                    {m.actionLabel}
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <span className="text-[8px] text-white/30 mt-1 px-1">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {/* Bot typing indicator */}
                {botTyping && activeTab === 'bot' && (
                    <div className="flex items-center gap-2 text-white/40">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-[10px]">{t('botTyping', 'Assistent tippt...')}</span>
                    </div>
                )}

                {/* Team typing indicator */}
                {teamTyping && activeTab === 'team' && (
                    <div className="flex items-center gap-2 text-white/40">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-[10px]">{t('chat.teamTyping', 'Praxis-Team tippt...')}</span>
                    </div>
                )}

                {/* Topic quick-reply buttons (for bot tab, shown after greeting or after each bot reply) */}
                {activeTab === 'bot' && !botTyping && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {TOPIC_BUTTONS.map(tb => (
                            <button
                                key={tb.key}
                                onClick={() => handleBotQuery(tb.query)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] text-white/70 hover:text-white transition-colors"
                            >
                                {t(tb.key)}
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-primary)] flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value);
                        if (activeTab === 'team' && socketRef.current && sessionId) {
                            socketRef.current.emit('patient:typing', { sessionId });
                        }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('Nachricht...', 'Nachricht...')}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50"
                />
                <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || botTyping}
                    aria-label={t('Nachricht senden', 'Nachricht senden')}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
