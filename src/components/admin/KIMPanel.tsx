import { useState } from 'react';
import { Mail, Send, Inbox, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTIKimStatus } from '../../hooks/useApi';

type KimTab = 'status' | 'inbox' | 'compose';

export function KIMPanel() {
  const [tab, setTab] = useState<KimTab>('status');
  const { data: kimStatus, isLoading, refetch } = useTIKimStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" /> KIM – Kommunikation im Medizinwesen
        </h2>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {([
          { id: 'status', label: 'Status', icon: <CheckCircle className="w-4 h-4" /> },
          { id: 'inbox', label: 'Eingang', icon: <Inbox className="w-4 h-4" /> },
          { id: 'compose', label: 'Verfassen', icon: <Send className="w-4 h-4" /> },
        ] as Array<{ id: KimTab; label: string; icon: React.ReactNode }>).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Status tab */}
      {tab === 'status' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <>
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${(kimStatus as any)?.enabled ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
                {(kimStatus as any)?.enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{(kimStatus as any)?.enabled ? 'KIM aktiv' : 'KIM nicht konfiguriert'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(kimStatus as any)?.message ?? 'Kein Status verfügbar'}</p>
                </div>
              </div>

              {(kimStatus as any)?.fromAddress && (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">KIM-Adresse</p>
                  <p className="font-mono text-sm text-blue-600">{(kimStatus as any).fromAddress}</p>
                </div>
              )}

              {!(kimStatus as any)?.enabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Konfiguration erforderlich</p>
                  <p>Setzen Sie <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">KIM_ENABLED=true</code> und die zugehörigen SMTP/POP3-Variablen in Ihrer <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env</code>-Datei.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Inbox tab */}
      {tab === 'inbox' && (
        <div>
          {!(kimStatus as any)?.enabled ? (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>KIM nicht aktiviert</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <p className="font-medium text-sm">KIM-Posteingang</p>
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Abrufen
                </button>
              </div>
              <div className="p-8 text-center text-gray-400 text-sm">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Keine Nachrichten</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compose tab */}
      {tab === 'compose' && (
        <div className="space-y-4">
          {!(kimStatus as any)?.enabled ? (
            <div className="text-center py-12 text-gray-400">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>KIM nicht aktiviert</p>
            </div>
          ) : (
            <KIMComposeForm fromAddress={(kimStatus as any)?.fromAddress} />
          )}
        </div>
      )}
    </div>
  );
}

function KIMComposeForm({ fromAddress }: { fromAddress?: string }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!to || !subject || !body) return;
    setSending(true);
    try {
      // KIM send via API
      const res = await fetch('/api/ti/kim/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
        credentials: 'include',
      });
      if (res.ok) { setSent(true); setTo(''); setSubject(''); setBody(''); }
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8 space-y-2">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
        <p className="font-medium">Nachricht gesendet</p>
        <button onClick={() => setSent(false)} className="text-sm text-blue-600">Neue Nachricht</button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {fromAddress && (
        <div className="text-xs text-gray-400">Von: <span className="font-mono text-gray-600 dark:text-gray-300">{fromAddress}</span></div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Empfänger (KIM-Adresse)</label>
        <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="arzt@praxis.kim.telematik"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Betreff</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Befundbericht"
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Nachricht</label>
        <textarea rows={6} value={body} onChange={e => setBody(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm resize-none" />
      </div>
      <button onClick={handleSend} disabled={!to || !subject || !body || sending}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Senden
      </button>
    </div>
  );
}
