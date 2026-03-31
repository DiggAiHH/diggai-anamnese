import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare, Send, X, Users, User,
  Hash, Circle, ChevronDown, Search, Bell, BellOff
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL, getAuthToken } from '../api/client';
import { useChatMessages, useSendChatMessage } from '../hooks/useApi';

// ─── Types ──────────────────────────────────────────────────

interface ChatMessage {
  id?: string;
  text: string;
  from: string;
  fromRole: 'arzt' | 'mfa' | 'admin' | 'patient' | 'system';
  timestamp: string;
  channel: string;
}

interface OnlineUser {
  userId: string;
  displayName: string;
  role: string;
  status: 'online' | 'away' | 'busy';
}

interface PatientSession {
  sessionId: string;
  patientName: string;
  service: string;
  status: string;
}

type ChannelType = 'staff' | 'patient';

interface ChatChannel {
  id: string;
  type: ChannelType;
  name: string;
  icon: React.ReactNode;
  sessionId?: string;
  unread: number;
  lastMessage?: string;
  lastTimestamp?: string;
}

interface StaffChatProps {
  currentUser: { id: string; displayName: string; role: 'arzt' | 'mfa' | 'admin' };
  patientSessions?: PatientSession[];
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

export const StaffChat: React.FC<StaffChatProps> = ({ currentUser, patientSessions = [], className = '' }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string>('staff-general');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Channels ──────────────────────────────────────────

  const channels = useMemo<ChatChannel[]>(() => {
    const staffChannels: ChatChannel[] = [
      {
        id: 'staff-general',
        type: 'staff',
        name: t('staffChat.general', 'Team-Kanal'),
        icon: <Hash className="w-4 h-4" />,
        unread: 0,
      },
      {
        id: 'staff-urgent',
        type: 'staff',
        name: t('staffChat.urgent', 'Dringend'),
        icon: <Bell className="w-4 h-4" />,
        unread: 0,
      },
    ];

    const patientChannels: ChatChannel[] = patientSessions.map(s => ({
      id: `patient-${s.sessionId}`,
      type: 'patient' as ChannelType,
      name: s.patientName || `Patient ${s.sessionId.slice(0, 6)}`,
      icon: <User className="w-4 h-4" />,
      sessionId: s.sessionId,
      unread: 0,
    }));

    // Update unread counts from messages
    const allChannels = [...staffChannels, ...patientChannels];
    allChannels.forEach(ch => {
      const channelMsgs = messages[ch.id] || [];
      const lastMsg = channelMsgs[channelMsgs.length - 1];
      if (lastMsg) {
        ch.lastMessage = lastMsg.text.substring(0, 50);
        ch.lastTimestamp = lastMsg.timestamp;
      }
    });

    return allChannels;
  }, [patientSessions, messages, t]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(ch => ch.name.toLowerCase().includes(q));
  }, [channels, searchQuery]);

  const activeChannel = channels.find(ch => ch.id === activeChannelId);
  const activeMessages = useMemo(() => messages[activeChannelId] || [], [messages, activeChannelId]);
  const activePatientSessionId = activeChannel?.type === 'patient' ? activeChannel.sessionId ?? '' : '';
  const { data: patientHistory } = useChatMessages(activePatientSessionId);
  const sendChatMessage = useSendChatMessage();

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFj+a37nFdzANMIS/0LlkHgMvi7LVqFMFH3+q08RzAw==');
      audio.volume = 0.3;
      audio.play().catch(() => { });
    } catch { /* ignore */ }
  }, []);

  const normalizePatientMessage = useCallback((msg: Partial<ChatMessage> & {
    id?: string;
    text?: string;
    from?: string;
    fromName?: string;
    fromRole?: ChatMessage['fromRole'];
    senderType?: string;
    timestamp?: string;
    createdAt?: string;
    channel?: string;
  }, channelId: string): ChatMessage => ({
    id: msg.id,
    text: msg.text || '',
    from: msg.from ?? msg.fromName ?? 'Praxis-Team',
    fromRole: (msg.fromRole
      ?? (msg.senderType?.toLowerCase() === 'patient' ? 'patient' : 'arzt')) as ChatMessage['fromRole'],
    timestamp: msg.timestamp ?? msg.createdAt ?? new Date().toISOString(),
    channel: msg.channel ?? channelId,
  }), []);

  // ─── Socket.IO Connection ─────────────────────────────

  useEffect(() => {
    const token = getAuthToken();
    const socket = io(SOCKET_BASE_URL || window.location.origin, {
      auth: token ? { token } : undefined,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join staff room
      socket.emit('join:arzt');
      // Join staff chat room
      socket.emit('staff:join', {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        role: currentUser.role,
      });
    });

    // Staff-to-staff messages
    socket.on('staff:message', (msg: ChatMessage) => {
      setMessages(prev => ({
        ...prev,
        [msg.channel]: [...(prev[msg.channel] || []), msg]
      }));
      if (msg.from !== currentUser.displayName && (!isOpen || activeChannelId !== msg.channel)) {
        setTotalUnread(u => u + 1);
        if (!muteNotifications) {
          playNotificationSound();
        }
      }
    });

    // Patient messages relayed to staff
    socket.on('arzt:received_message', (msg: { sessionId: string; text: string; from: string; timestamp: string }) => {
      const channelId = `patient-${msg.sessionId}`;
      const chatMsg: ChatMessage = {
        text: msg.text,
        from: msg.from,
        fromRole: 'patient',
        timestamp: msg.timestamp,
        channel: channelId,
      };
      setMessages(prev => ({
        ...prev,
        [channelId]: [...(prev[channelId] || []), chatMsg]
      }));
      if (!isOpen || activeChannelId !== channelId) {
        setTotalUnread(u => u + 1);
      }
    });

    // Online presence
    socket.on('staff:presence', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    // Typing indicators
    socket.on('staff:typing', (data: { channel: string; userName: string }) => {
      if (data.userName === currentUser.displayName) return;
      setTypingUsers(prev => {
        const current = prev[data.channel] || [];
        if (!current.includes(data.userName)) {
          return { ...prev, [data.channel]: [...current, data.userName] };
        }
        return prev;
      });
      // Auto-clear typing after 3s
      const key = `${data.channel}-${data.userName}`;
      if (typingTimeoutRef.current[key]) clearTimeout(typingTimeoutRef.current[key]);
      typingTimeoutRef.current[key] = setTimeout(() => {
        setTypingUsers(prev => ({
          ...prev,
          [data.channel]: (prev[data.channel] || []).filter(u => u !== data.userName)
        }));
      }, 3000);
    });

    // Patient typing
    socket.on('patient:typing', (data: { sessionId: string }) => {
      const channelId = `patient-${data.sessionId}`;
      setTypingUsers(prev => {
        const current = prev[channelId] || [];
        if (!current.includes('Patient')) {
          return { ...prev, [channelId]: [...current, 'Patient'] };
        }
        return prev;
      });
      const key = `${channelId}-Patient`;
      if (typingTimeoutRef.current[key]) clearTimeout(typingTimeoutRef.current[key]);
      typingTimeoutRef.current[key] = setTimeout(() => {
        setTypingUsers(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || []).filter(u => u !== 'Patient')
        }));
      }, 3000);
    });

    return () => {
      // Memory Leak Fix: Clear all typing timeouts and remove socket listeners
      Object.values(typingTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current = {};
      socket.off('connect');
      socket.off('staff:message');
      socket.off('arzt:received_message');
      socket.off('staff:presence');
      socket.off('staff:typing');
      socket.off('patient:typing');
      socket.disconnect();
    };
  }, [currentUser, isOpen, activeChannelId, muteNotifications]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages]);

  useEffect(() => {
    if (!activeChannel || activeChannel.type !== 'patient' || !patientHistory?.messages) {
      return;
    }

    const normalizedMessages = patientHistory.messages.map((msg: Partial<ChatMessage>) =>
      normalizePatientMessage(msg, activeChannel.id),
    );

    setMessages(prev => {
      const existing = prev[activeChannel.id] || [];
      const merged = [...existing];

      for (const nextMessage of normalizedMessages) {
        const duplicate = merged.some((current) =>
          (nextMessage.id && current.id === nextMessage.id)
          || (
            current.text === nextMessage.text
            && current.timestamp === nextMessage.timestamp
            && current.from === nextMessage.from
          )
        );

        if (!duplicate) {
          merged.push(nextMessage);
        }
      }

      merged.sort((left, right) => +new Date(left.timestamp) - +new Date(right.timestamp));

      return {
        ...prev,
        [activeChannel.id]: merged,
      };
    });
  }, [activeChannel, normalizePatientMessage, patientHistory]);

  // ─── Send Message ──────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmedMessage = inputText.trim();
    if (!trimmedMessage) return;

    const channel = activeChannel;
    if (!channel) return;

    if (channel.type === 'staff') {
      if (!socketRef.current?.connected) return;

      // Staff-to-staff message
      socketRef.current.emit('staff:send_message', {
        channel: channel.id,
        message: trimmedMessage,
        userName: currentUser.displayName,
        userRole: currentUser.role,
      });
    } else if (channel.type === 'patient' && channel.sessionId) {
      const echo: ChatMessage = {
        text: trimmedMessage,
        from: currentUser.displayName,
        fromRole: currentUser.role,
        timestamp: new Date().toISOString(),
        channel: channel.id,
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit('arzt:message', {
          sessionId: channel.sessionId,
          message: trimmedMessage,
          userId: currentUser.id,
        });
      } else {
        const response = await sendChatMessage.mutateAsync({
          sessionId: channel.sessionId,
          text: trimmedMessage,
        });

        const persistedMessage = response?.message
          ? normalizePatientMessage(response.message as Partial<ChatMessage>, channel.id)
          : echo;

        echo.id = persistedMessage.id;
        echo.timestamp = persistedMessage.timestamp;
      }

      setMessages(prev => ({
        ...prev,
        [channel.id]: [...(prev[channel.id] || []), echo]
      }));
    }

    setInputText('');
  }, [activeChannel, currentUser, inputText, normalizePatientMessage, sendChatMessage]);

  // ─── Typing ─────────────────────────────────────────────

  const handleInputChange = useCallback((value: string) => {
    setInputText(value);
    if (socketRef.current && activeChannel) {
      if (activeChannel.type === 'staff') {
        socketRef.current.emit('staff:typing', {
          channel: activeChannel.id,
          userName: currentUser.displayName,
        });
      } else if (activeChannel.type === 'patient' && activeChannel.sessionId) {
        socketRef.current.emit('arzt:typing', { sessionId: activeChannel.sessionId });
      }
    }
  }, [activeChannel, currentUser]);

  // ─── Helpers ────────────────────────────────────────────

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'arzt': return 'text-blue-400';
      case 'mfa': return 'text-emerald-400';
      case 'admin': return 'text-violet-400';
      case 'patient': return 'text-amber-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'arzt': return 'Arzt';
      case 'mfa': return 'MFA';
      case 'admin': return 'Admin';
      case 'patient': return 'Patient';
      default: return role;
    }
  };

  // ─── Render: FAB Button ────────────────────────────────

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setTotalUnread(0); }}
        className={`fixed bottom-6 left-6 w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50 text-white ${className}`}
        aria-label={t('staffChat.open', 'Team-Chat öffnen')}
      >
        <Users className="w-6 h-6" />
        {totalUnread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold">
            {totalUnread}
          </div>
        )}
      </button>
    );
  }

  // ─── Render: Full Chat Panel ──────────────────────────

  const channelTyping = typingUsers[activeChannelId] || [];

  return (
    <div className="fixed bottom-6 left-6 w-[600px] h-[520px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl flex z-50 animate-fade-in overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-[200px] border-r border-[var(--border-primary)] flex flex-col bg-[var(--bg-card)]">
          {/* Header */}
          <div className="p-3 border-b border-[var(--border-primary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-[var(--text-primary)]">{t('staffChat.channels', 'Kanäle')}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                {onlineUsers.length} {t('staffChat.online', 'online')}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('staffChat.search', 'Suchen...')}
                className="w-full pl-7 pr-2 py-1.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-[10px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto py-1">
            {/* Staff Channels */}
            <div className="px-2 py-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2">
                {t('staffChat.team', 'Team')}
              </span>
            </div>
            {filteredChannels.filter(ch => ch.type === 'staff').map(ch => (
              <button
                key={ch.id}
                onClick={() => { setActiveChannelId(ch.id); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  activeChannelId === ch.id
                    ? 'bg-violet-500/10 text-violet-400 border-r-2 border-violet-400'
                    : 'text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                <span className="text-[var(--text-muted)]">{ch.icon}</span>
                <span className="truncate font-medium">{ch.name}</span>
                {ch.unread > 0 && (
                  <span className="ml-auto w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">
                    {ch.unread}
                  </span>
                )}
              </button>
            ))}

            {/* Patient Channels */}
            {filteredChannels.some(ch => ch.type === 'patient') && (
              <>
                <div className="px-2 py-1 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2">
                    {t('staffChat.patients', 'Patienten')}
                  </span>
                </div>
                {filteredChannels.filter(ch => ch.type === 'patient').map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => { setActiveChannelId(ch.id); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      activeChannelId === ch.id
                        ? 'bg-violet-500/10 text-violet-400 border-r-2 border-violet-400'
                        : 'text-[var(--text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    <span className="text-amber-400">{ch.icon}</span>
                    <span className="truncate font-medium">{ch.name}</span>
                    {ch.unread > 0 && (
                      <span className="ml-auto w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">
                        {ch.unread}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Online Users */}
            <div className="px-2 py-1 mt-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2">
                {t('staffChat.onlineUsers', 'Online')}
              </span>
            </div>
            {onlineUsers.map(u => (
              <div key={u.userId} className="flex items-center gap-2 px-3 py-1.5 text-[10px]">
                <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
                <span className={`font-medium ${getRoleColor(u.role)}`}>{u.displayName}</span>
                <span className="text-[var(--text-muted)] text-[8px]">({getRoleBadge(u.role)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-3 bg-[var(--bg-card)] border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title={showSidebar ? t('staffChat.hideSidebar', 'Seitenleiste ausblenden') : t('staffChat.showSidebar', 'Seitenleiste einblenden')}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showSidebar ? 'rotate-90' : '-rotate-90'}`} />
            </button>
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
              {activeChannel?.icon || <Hash className="w-3.5 h-3.5" />}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">{activeChannel?.name || 'Chat'}</p>
              <p className="text-[9px] text-[var(--text-muted)]">
                {activeChannel?.type === 'staff'
                  ? `${onlineUsers.length} ${t('staffChat.members', 'Mitglieder online')}`
                  : t('staffChat.patientChat', 'Patient-Kommunikation')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMuteNotifications(!muteNotifications)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title={muteNotifications ? t('staffChat.unmute', 'Ton aktivieren') : t('staffChat.mute', 'Stumm')}
            >
              {muteNotifications ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title={t('staffChat.close', 'Chat schließen')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {activeMessages.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs font-medium">
                {activeChannel?.type === 'staff'
                  ? t('staffChat.noStaffMsgs', 'Noch keine Nachrichten im Team-Kanal.')
                  : t('staffChat.noPatientMsgs', 'Noch keine Nachrichten mit diesem Patienten.')}
              </p>
            </div>
          )}

          {activeMessages.map((msg, i) => {
            const isOwn = msg.from === currentUser.displayName;
            return (
              <div key={i} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {/* Sender info */}
                {!isOwn && (
                  <div className="flex items-center gap-1.5 mb-0.5 px-1">
                    <span className={`text-[10px] font-bold ${getRoleColor(msg.fromRole)}`}>{msg.from}</span>
                    <span className="text-[8px] text-[var(--text-muted)]">({getRoleBadge(msg.fromRole)})</span>
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  isOwn
                    ? 'bg-violet-600 text-white rounded-tr-none'
                    : msg.fromRole === 'patient'
                    ? 'bg-amber-500/15 text-[var(--text-primary)] rounded-tl-none border border-amber-500/20'
                    : 'bg-white/10 text-[var(--text-primary)] rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[8px] text-[var(--text-muted)] mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {/* Typing indicator */}
          {channelTyping.length > 0 && (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-violet-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px]">
                {channelTyping.join(', ')} {channelTyping.length === 1 ? t('staffChat.isTyping', 'tippt...') : t('staffChat.areTyping', 'tippen...')}
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-primary)] flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t('staffChat.placeholder', 'Nachricht schreiben...')}
            className="flex-1 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-white transition-colors"
            aria-label={t('staffChat.send', 'Senden')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
