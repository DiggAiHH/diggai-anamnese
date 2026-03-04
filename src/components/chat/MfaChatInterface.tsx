// ─── MFA Chat Interface ────────────────────────────────────
// Modul 7/8: Real-time chat between MFA/Arzt and Patient

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mic, MicOff, Paperclip, MessageSquare,
  CheckCheck, Check, Megaphone, FileText, X
} from 'lucide-react';

type SenderType = 'PATIENT' | 'MFA' | 'ARZT' | 'SYSTEM';

interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: SenderType;
  senderId?: string;
  contentType: string;
  content: string;
  isTemplate: boolean;
  readAt?: string;
  createdAt: string;
}

interface ChatTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
}

interface MfaChatInterfaceProps {
  sessionId: string;
  currentUserId: string;
  currentUserType: SenderType;
  patientName?: string;
  messages?: ChatMessage[];
  templates?: ChatTemplate[];
  onSendMessage?: (content: string, contentType?: string) => void;
  onBroadcast?: (content: string, target: 'waiting' | 'all') => void;
  onMarkRead?: () => void;
}

const SENDER_COLORS: Record<SenderType, { bg: string; text: string; label: string }> = {
  PATIENT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Patient' },
  MFA: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'MFA' },
  ARZT: { bg: 'bg-green-100', text: 'text-green-800', label: 'Arzt' },
  SYSTEM: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'System' },
};

export function MfaChatInterface({
  sessionId,
  currentUserId,
  currentUserType,
  patientName = 'Patient',
  messages = [],
  templates = [],
  onSendMessage,
  onBroadcast,
  onMarkRead,
}: MfaChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<'waiting' | 'all'>('waiting');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when component is visible
  useEffect(() => {
    onMarkRead?.();
  }, [messages.length, onMarkRead]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSendMessage?.(input.trim());
    setInput('');
    inputRef.current?.focus();
  }, [input, onSendMessage]);

  const handleTemplateSelect = useCallback((template: ChatTemplate) => {
    if (template.variables.length === 0) {
      onSendMessage?.(template.content);
    } else {
      setInput(template.content);
    }
    setShowTemplates(false);
    inputRef.current?.focus();
  }, [onSendMessage]);

  const handleBroadcast = useCallback(() => {
    if (!broadcastMsg.trim()) return;
    onBroadcast?.(broadcastMsg.trim(), broadcastTarget);
    setBroadcastMsg('');
    setShowBroadcast(false);
  }, [broadcastMsg, broadcastTarget, onBroadcast]);

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
    // In production: start/stop voice recording via MediaRecorder API
  }, []);

  const isOwnMessage = (msg: ChatMessage) =>
    msg.senderType === currentUserType && msg.senderId === currentUserId;

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{patientName}</p>
            <p className="text-xs text-gray-400">{sessionId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBroadcast(!showBroadcast)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Broadcast"
          >
            <Megaphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
            title="Vorlagen"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Broadcast Panel */}
      {showBroadcast && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800 flex items-center gap-1">
              <Megaphone className="w-4 h-4" /> Broadcast-Nachricht
            </span>
            <button onClick={() => setShowBroadcast(false)} className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={broadcastTarget}
              onChange={e => setBroadcastTarget(e.target.value as 'waiting' | 'all')}
              className="px-2 py-1.5 text-xs border border-amber-300 rounded-lg bg-white"
            >
              <option value="waiting">Wartende Patienten</option>
              <option value="all">Alle Patienten</option>
            </select>
            <input
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="Nachricht an alle..."
              className="flex-1 px-3 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-400 outline-none"
            />
            <button
              onClick={handleBroadcast}
              disabled={!broadcastMsg.trim()}
              className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-40"
            >
              Senden
            </button>
          </div>
        </div>
      )}

      {/* Templates Panel */}
      {showTemplates && templates.length > 0 && (
        <div className="p-3 bg-green-50 border-b border-green-200 space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">Vorlagen</span>
            <button onClick={() => setShowTemplates(false)} className="text-green-400 hover:text-green-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleTemplateSelect(tpl)}
                className="text-left p-2 bg-white border border-green-200 rounded-lg hover:border-green-400 transition-all"
              >
                <p className="text-xs font-medium text-green-800">{tpl.name}</p>
                <p className="text-xs text-green-600 truncate mt-0.5">{tpl.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">Noch keine Nachrichten</p>
          </div>
        )}

        {messages.map(msg => {
          const own = isOwnMessage(msg);
          const sender = SENDER_COLORS[msg.senderType as SenderType] || SENDER_COLORS.SYSTEM;

          if (msg.senderType === 'SYSTEM') {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-xs text-amber-600">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${own ? 'order-1' : 'order-2'}`}>
                {!own && (
                  <span className={`text-xs font-medium ${sender.text} mb-0.5 block`}>
                    {sender.label}
                  </span>
                )}
                <div className={`px-3 py-2 rounded-xl ${
                  own
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : `${sender.bg} ${sender.text} rounded-bl-md`
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${own ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                  {own && (
                    msg.readAt
                      ? <CheckCheck className="w-3 h-3 text-blue-400" />
                      : <Check className="w-3 h-3 text-gray-300" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-lg ${
              isRecording
                ? 'text-red-600 bg-red-50 animate-pulse'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Nachricht eingeben..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MfaChatInterface;
