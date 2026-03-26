import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Pill,
  MessageSquare,
  Settings,
  Activity,
  RefreshCw,
  CheckCircle,
  Wifi,
  WifiOff,
  Loader2,
  ChevronRight,
  Play,
  Users,
  ShieldAlert,
  CalendarCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePwaDashboard, usePwaUnreadCount, usePwaMeasureComplete } from '../../hooks/usePatientApi';
import { usePwaStore } from '../../store/pwaStore';

const QUICK_ACTIONS = [
  { key: 'pwa.nav.diary', icon: BookOpen, to: '/pwa/diary', color: 'bg-emerald-100 text-emerald-600' },
  { key: 'pwa.nav.measures', icon: Pill, to: '/pwa/measures', color: 'bg-violet-100 text-violet-600' },
  { key: 'pwa.nav.messages', icon: MessageSquare, to: '/pwa/messages', color: 'bg-amber-100 text-amber-600' },
  { key: 'Reels', icon: Play, to: '/pwa/reels', color: 'bg-pink-100 text-pink-600' },
  { key: 'Community', icon: Users, to: '/pwa/community', color: 'bg-blue-100 text-blue-600' },
  { key: 'pwa.nav.settings', icon: Settings, to: '/pwa/settings', color: 'bg-gray-100 text-gray-600' },
] as const;

const MOOD_MAP: Record<string, string> = {
  VERY_GOOD: '😊',
  GOOD: '🙂',
  NEUTRAL: '😐',
  BAD: '😕',
  VERY_BAD: '😣',
};

export default function PwaDashboard() {
  const { t, i18n } = useTranslation();
  const patientId = usePwaStore((s) => s.patientId);
  const dashboard = usePwaDashboard();
  const unread = usePwaUnreadCount();
  const completeMutation = usePwaMeasureComplete();

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (dashboard.data ?? (dashboard as any).data?.data) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measures: any[] = data?.activeMeasures ?? data?.measures ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentDiary: any[] = data?.recentDiary ?? data?.diaryEntries ?? [];
  const patientName: string = data?.patientName ?? data?.name ?? '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unreadCount = (unread.data as any)?.count ?? (unread.data as any)?.data?.count ?? 0;

  const handleComplete = async (measureId: string) => {
    try {
      await completeMutation.mutateAsync(measureId);
    } catch {
      /* swallow – UI shows error via react-query */
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('Willkommen')}</p>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {patientName || `Patient ${patientId ?? ''}`}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync indicator */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                online ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
              }`}
            >
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? t('Online') : t('autosave.offline')}
            </span>
            {/* Refresh */}
            <button
              onClick={() => { dashboard.refetch(); unread.refetch(); }}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label={t('Kontrolle (z.B. Blutzucker, Labor)')}
            >
              <RefreshCw className={`w-4 h-4 ${dashboard.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* ── Quick Actions ── */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ key, icon: Icon, to, color }) => {
              const isMessages = key === 'pwa.nav.messages';
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t(key)}</span>
                  {isMessages && unreadCount > 0 && (
                    <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Persönlicher Bereich (Personal Area) ── */}
        <section className="space-y-3 mt-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" /> {t('Persönlicher Bereich')}
            </h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <button className="flex items-center justify-between text-left hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Activity className="w-4 h-4" /></div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">ePA & Gesundheitsakte</p>
                            <p className="text-xs text-gray-500">Gematik gesichert</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
                <div className="h-px bg-gray-100 w-full" />
                <button className="flex items-center justify-between text-left hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CalendarCheck className="w-4 h-4" /></div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Voruntersuchungen</p>
                            <p className="text-xs text-gray-500">Nächster Checkup empfohlen</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
            </div>
        </section>

        {/* ── Active Measures ── */}
        {measures.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-500" /> {t('Aktive Maßnahmen')}
              </h2>
              <Link to="/pwa/measures" className="text-xs text-sky-600 hover:underline">
                {t('Verlauf anzeigen')}
              </Link>
            </div>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {measures.map((m: any) => (
                <div
                  key={m.id}
                  className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name ?? m.title}</p>
                    {m.scheduledTime && (
                      <p className="text-xs text-gray-400 mt-0.5">{m.scheduledTime}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleComplete(m.id)}
                    disabled={completeMutation.isPending}
                    className="flex-shrink-0 rounded-xl bg-green-50 text-green-600 px-3 py-2 text-xs font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    {t('Abgeschlossen')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recent Diary Entries ── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-500" /> {t('Letzte Tagebucheinträge')}
            </h2>
            <Link to="/pwa/diary" className="text-xs text-sky-600 hover:underline">
              {t('Verlauf anzeigen')}
            </Link>
          </div>

          {dashboard.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : recentDiary.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-6 text-center text-sm text-gray-400">
              {t('Noch keine Einträge vorhanden.')}
            </div>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentDiary.slice(0, 3).map((entry: any) => (
                <Link
                  key={entry.id}
                  to={`/pwa/diary?entry=${entry.id}`}
                  className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="text-2xl" role="img" aria-label="Stimmung">
                    {MOOD_MAP[entry.mood] ?? '😐'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {new Date(entry.date ?? entry.createdAt).toLocaleDateString(i18n.language || 'de-DE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{entry.notes}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
