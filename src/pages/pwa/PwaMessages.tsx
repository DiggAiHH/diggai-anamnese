import { useState } from 'react';
import { MessageSquare, Send, User, Bot, ChevronLeft, Plus, Mail, MailOpen, Loader2, AlertTriangle } from 'lucide-react';
import { usePwaMessages, usePwaMessageSend, usePwaUnreadCount } from '../../hooks/useApi';

type View = 'list' | 'detail' | 'compose';

export default function PwaMessages() {
  const [page] = useState(1);
  const messages = usePwaMessages({ page });
  const unread = usePwaUnreadCount();
  const sendMutation = usePwaMessageSend();

  const [view, setView] = useState<View>('list');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgList: any[] = (messages.data as any)?.data ?? (messages.data as any) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unreadCount = (unread.data as any)?.count ?? (unread.data as any)?.data?.count ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openDetail = (msg: any) => {
    setSelectedMsg(msg);
    setView('detail');
  };

  const openCompose = () => {
    setSubject('');
    setBody('');
    setView('compose');
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    try {
      await sendMutation.mutateAsync({ subject: subject.trim() || undefined, body: body.trim() });
      setView('list');
      setSubject('');
      setBody('');
    } catch {
      /* handled by react-query */
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  /* ─────────────── Compose View ─────────────── */
  if (view === 'compose') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => setView('list')}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Zurück"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Neue Nachricht</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-3">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff (optional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ihre Nachricht..."
              rows={6}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!body.trim() || sendMutation.isPending}
              className="w-full rounded-xl bg-sky-500 text-white px-4 py-3 text-sm font-semibold hover:bg-sky-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Nachricht senden
            </button>
            {sendMutation.isError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Senden fehlgeschlagen. Bitte erneut versuchen.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ─────────────── Detail View ─────────────── */
  if (view === 'detail' && selectedMsg) {
    const isDoctor = selectedMsg.senderType === 'DOCTOR' || selectedMsg.senderType === 'STAFF';
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => setView('list')}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Zurück"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {selectedMsg.subject || 'Nachricht'}
            </h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-5">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
            {/* Sender info */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isDoctor ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isDoctor ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedMsg.senderName ?? (isDoctor ? 'Praxis' : 'System')}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedMsg.createdAt ? formatDate(selectedMsg.createdAt) : ''}
                </p>
              </div>
            </div>

            {/* Subject */}
            {selectedMsg.subject && (
              <h2 className="text-base font-semibold text-gray-800">{selectedMsg.subject}</h2>
            )}

            {/* Body */}
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {selectedMsg.body ?? selectedMsg.content ?? ''}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ─────────────── List View ─────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-500" />
            <h1 className="text-lg font-bold text-gray-900">Nachrichten</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={openCompose}
            className="rounded-xl bg-sky-500 text-white px-3 py-2 text-xs font-semibold hover:bg-sky-600 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Nachricht
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-2">
        {/* Loading */}
        {messages.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        )}

        {/* Empty */}
        {!messages.isLoading && msgList.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-10 text-center">
            <Mail className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Keine Nachrichten vorhanden.</p>
          </div>
        )}

        {/* Message list */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {msgList.map((msg: any) => {
          const isDoctor = msg.senderType === 'DOCTOR' || msg.senderType === 'STAFF';
          const isRead = msg.read ?? msg.readAt != null;

          return (
            <button
              key={msg.id}
              onClick={() => openDetail(msg)}
              className={`w-full text-left rounded-2xl border shadow-sm px-4 py-3.5 flex items-start gap-3 hover:shadow-md transition-shadow ${
                isRead ? 'bg-white border-gray-100' : 'bg-sky-50 border-sky-100'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isDoctor ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isDoctor ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {msg.subject || (isDoctor ? 'Nachricht von der Praxis' : 'Systemnachricht')}
                  </p>
                  {/* Read indicator */}
                  {isRead ? (
                    <MailOpen className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {(msg.body ?? msg.content ?? '').slice(0, 80)}
                  {(msg.body ?? msg.content ?? '').length > 80 ? '…' : ''}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {msg.createdAt ? formatDate(msg.createdAt) : ''}
                </p>
              </div>
            </button>
          );
        })}

        {/* Error */}
        {messages.isError && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Nachrichten konnten nicht geladen werden.
          </div>
        )}
      </main>
    </div>
  );
}
