import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageSquare, Send, X, User, Bot, HelpCircle, ChevronRight } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useChatMessages } from '../hooks/usePatientApi';
import { SOCKET_BASE_URL } from '../api/client';
import { useTranslation } from 'react-i18next';

// ─── FAQ Bot Knowledge Base ────────────────────────────────
interface FaqEntry {
    keywords: string[];
    answer: string;
    category: string;
}

const FAQ_DB: FaqEntry[] = [
    {
        keywords: ['versicherung', 'versichert', 'gkv', 'pkv', 'kasse', 'insurance', 'التأمين', 'sigorta', 'страхування', 'seguro', 'aseguradora'],
        answer: 'chat.faq_insurance',
        category: 'botTopicInsurance',
    },
    {
        keywords: ['rezept', 'medikament', 'medication', 'دواء', 'ilaç', 'ліки', 'verordnung', 'prescription', 'medicamento', 'receta', 'folgerezept'],
        answer: 'chat.faq_medication',
        category: 'botTopicMedication',
    },
    {
        keywords: ['termin', 'appointment', 'موعد', 'randevu', 'запис', 'warten', 'wartezeit', 'dauer', 'cita', 'anamnese'],
        answer: 'chat.faq_appointment',
        category: 'botTopicAppointment',
    },
    {
        keywords: ['daten', 'datenschutz', 'dsgvo', 'privacy', 'gdpr', 'sicher', 'verschlüsselt', 'خصوصية', 'gizlilik', 'конфіденційність', 'privacidad', 'rgpd', 'datos'],
        answer: 'chat.faq_privacy',
        category: 'botTopicGeneral',
    },
    {
        keywords: ['hilfe', 'help', 'مساعدة', 'yardım', 'допомога', 'frage', 'problem', 'verstehe nicht', 'wie', 'how', 'ayuda', 'cómo', 'pregunta'],
        answer: 'chat.faq_help',
        category: 'botTopicGeneral',
    },
    {
        keywords: ['notfall', 'emergency', 'طوارئ', 'acil', 'невідкладна', 'brustschmerz', 'atemnot', 'chest pain', 'breathing', 'emergencia', '112', 'notruf'],
        answer: 'chat.faq_emergency',
        category: 'botTopicGeneral',
    },
    {
        keywords: ['kamera', 'scan', 'egk', 'karte', 'camera', 'card', 'بطاقة', 'kart', 'картка', 'cámara', 'tarjeta', 'escanear'],
        answer: 'chat.faq_camera',
        category: 'botTopicGeneral',
    },
    {
        keywords: ['au', 'krankschreibung', 'krank', 'sick', 'leave', 'مرض', 'hastalık', 'хвороба', 'baja', 'enfermedad', 'arbeitsunfähig'],
        answer: 'chat.faq_sick_leave',
        category: 'botTopicAppointment',
    },
    {
        keywords: ['überweisung', 'referral', 'إحالة', 'sevk', 'направлення', 'facharzt', 'specialist', 'derivación', 'especialista'],
        answer: 'chat.faq_referral',
        category: 'botTopicAppointment',
    },
    {
        keywords: ['dokument', 'befund', 'upload', 'hochladen', 'document', 'وثيقة', 'belge', 'документ', 'documento', 'subir', 'archivo'],
        answer: 'chat.faq_documents',
        category: 'botTopicGeneral',
    },
    // ─── NEW FAQ entries ───────────────────────────────
    {
        keywords: ['kosten', 'preis', 'geld', 'rechnung', 'abrechnung', 'igel', 'privat', 'goä', 'cost', 'price', 'billing', 'تكلفة', 'فاتورة', 'ücret', 'fiyat', 'вартість', 'ціна', 'costo', 'factura', 'precio'],
        answer: 'chat.faq_costs',
        category: 'botTopicCosts',
    },
    {
        keywords: ['wartezeit', 'wartezimmer', 'warten', 'wie lange', 'waiting', 'wait time', 'انتظار', 'bekleme', 'очікування', 'espera', 'cuánto tiempo', 'sala de espera'],
        answer: 'chat.faq_waiting',
        category: 'botTopicWaiting',
    },
    {
        keywords: ['labor', 'ergebnis', 'befund', 'bericht', 'result', 'report', 'lab', 'نتيجة', 'تقرير', 'sonuç', 'rapor', 'результат', 'звіт', 'resultado', 'informe', 'laboratorio'],
        answer: 'chat.faq_results',
        category: 'botTopicResults',
    },
    {
        keywords: ['barrierefrei', 'behindert', 'screenreader', 'rollstuhl', 'sehbehindert', 'accessibility', 'accessible', 'إمكانية الوصول', 'erişilebilirlik', 'доступність', 'accesibilidad', 'discapacidad'],
        answer: 'chat.faq_accessibility',
        category: 'botTopicAccessibility',
    },
    {
        keywords: ['parken', 'parkplatz', 'anfahrt', 'adresse', 'öpnv', 'bus', 'bahn', 'parking', 'directions', 'address', 'موقف', 'عنوان', 'park', 'adres', 'парковка', 'адреса', 'estacionamiento', 'dirección', 'cómo llegar'],
        answer: 'chat.faq_parking',
        category: 'botTopicParking',
    },
    {
        keywords: ['impfung', 'impfen', 'impfpass', 'stiko', 'grippe', 'vaccination', 'vaccine', 'flu', 'تطعيم', 'لقاح', 'aşı', 'вакцина', 'щеплення', 'vacuna', 'vacunación', 'gripe'],
        answer: 'chat.faq_vaccination',
        category: 'botTopicVaccination',
    },
    {
        keywords: ['folgerezept', 'wiederholung', 'nachbestellung', 'erezept', 'e-rezept', 'repeat prescription', 'refill', 'وصفة متكررة', 'tekrar reçete', 'повторний рецепт', 'receta repetida'],
        answer: 'chat.faq_prescriptions',
        category: 'botTopicPrescriptions',
    },
    {
        keywords: ['löschen', 'löschung', 'daten löschen', 'recht auf löschung', 'art 17', 'deletion', 'delete data', 'حذف', 'silme', 'видалення', 'eliminar', 'borrar', 'eliminación de datos'],
        answer: 'chat.faq_data_deletion',
        category: 'botTopicDataDeletion',
    },
];

function findBotAnswer(input: string): string | null {
    const lower = input.toLowerCase().trim();
    if (lower.length < 2) return null;

    let bestMatch: FaqEntry | null = null;
    let bestScore = 0;

    for (const entry of FAQ_DB) {
        let score = 0;
        for (const kw of entry.keywords) {
            if (lower.includes(kw)) score += kw.length;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    return bestScore >= 3 ? bestMatch!.answer : null;
}

// ─── Types ─────────────────────────────────────────────────
interface Message {
    text: string;
    from: string;
    timestamp: string;
    isBot?: boolean;
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
    { key: 'botTopicInsurance', query: 'versicherung' },
    { key: 'botTopicMedication', query: 'medikament' },
    { key: 'botTopicAppointment', query: 'termin' },
    { key: 'botTopicCosts', query: 'kosten' },
    { key: 'botTopicWaiting', query: 'wartezeit' },
    { key: 'botTopicVaccination', query: 'impfung' },
    { key: 'botTopicResults', query: 'labor ergebnis' },
    { key: 'botTopicPrescriptions', query: 'folgerezept' },
    { key: 'botTopicDataDeletion', query: 'daten löschen' },
    { key: 'botTopicParking', query: 'anfahrt parken' },
    { key: 'botTopicGeneral', query: 'hilfe' },
];

export const ChatBubble: React.FC<ChatBubbleProps> = ({ sessionId }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ChatTab>('bot');
    const hasSession = !!sessionId;
    const [liveMessages, setLiveMessages] = useState<Message[]>([]);
    const [botMessages, setBotMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [botTyping, setBotTyping] = useState(false);
    const [teamTyping, setTeamTyping] = useState(false);
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
        const socket = io(SOCKET_BASE_URL || window.location.origin);
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

        // Simulate typing delay
        setTimeout(() => {
            const answerKey = findBotAnswer(query);
            const botReply: Message = {
                text: answerKey ? t(answerKey) : t('chat.faq_fallback', 'Das konnte ich leider nicht zuordnen. Versuchen Sie eine andere Frage oder wechseln Sie zum Team-Chat für persönliche Hilfe.'),
                from: 'Bot',
                timestamp: new Date().toISOString(),
                isBot: true,
            };
            setBotMessages(prev => [...prev, botReply]);
            setBotTyping(false);
        }, 800 + Math.random() * 600);
    }, []);

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
                            : m.isBot
                                ? 'bg-indigo-500/15 text-white/90 rounded-tl-none border border-indigo-500/20'
                                : 'bg-white/10 text-white rounded-tl-none'
                            }`}>
                            {m.text}
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
