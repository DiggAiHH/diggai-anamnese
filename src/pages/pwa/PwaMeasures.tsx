import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, Check, SkipForward, Clock, AlertTriangle, ChevronDown, Loader2, Activity, Droplets, Dumbbell } from 'lucide-react';
import { usePwaMeasures, usePwaMeasureTrackings, usePwaMeasureComplete, usePwaMeasureSkip } from '../../hooks/usePatientApi';

const TYPE_ICON: Record<string, React.ElementType> = {
  MEDICATION: Pill,
  EXERCISE: Dumbbell,
  INFUSION: Droplets,
};

const TYPE_COLOR: Record<string, string> = {
  MEDICATION: 'bg-violet-100 text-violet-600',
  EXERCISE: 'bg-emerald-100 text-emerald-600',
  INFUSION: 'bg-sky-100 text-sky-600',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktiv', cls: 'bg-green-50 text-green-600' },
  PAUSED: { label: 'Pausiert', cls: 'bg-amber-50 text-amber-600' },
  COMPLETED: { label: 'Abgeschlossen', cls: 'bg-gray-100 text-gray-500' },
};

export default function PwaMeasures() {
  const { t, i18n } = useTranslation();
  const measures = usePwaMeasures();
  const trackings = usePwaMeasureTrackings();
  const completeMutation = usePwaMeasureComplete();
  const skipMutation = usePwaMeasureSkip();

  const [skipDialogId, setSkipDialogId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measureList: any[] = (measures.data as any)?.data ?? (measures.data as any) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackingList: any[] = (trackings.data as any)?.data ?? (trackings.data as any) ?? [];

  const handleComplete = async (measureId: string) => {
    try {
      await completeMutation.mutateAsync(measureId);
    } catch {
      /* handled by react-query */
    }
  };

  const handleSkip = async () => {
    if (!skipDialogId) return;
    try {
      await skipMutation.mutateAsync({ measureId: skipDialogId, reason: skipReason || undefined });
      setSkipDialogId(null);
      setSkipReason('');
    } catch {
      /* handled by react-query */
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language || 'de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-violet-500" />
            {t('Medikamente / Rezepte')}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('Aktive Behandlung')}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* ── Loading ── */}
        {measures.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        )}

        {/* ── Empty ── */}
        {!measures.isLoading && measureList.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-10 text-center">
            <Activity className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">{t('Keine aktiven Maßnahmen vorhanden.')}</p>
          </div>
        )}

        {/* ── Measure Cards ── */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {measureList.map((m: any) => {
          const Icon = TYPE_ICON[m.type] ?? Pill;
          const colorCls = TYPE_COLOR[m.type] ?? 'bg-gray-100 text-gray-600';
          const status = STATUS_BADGE[m.status] ?? STATUS_BADGE.ACTIVE;
          const isExpanded = expandedId === m.id;

          // filter trackings for this measure
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const myTrackings = trackingList.filter((t: any) => t.measureId === m.id);

          return (
            <div key={m.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-4 py-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{m.name ?? m.title}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}>
                      {t(status.label)}
                    </span>
                  </div>
                  {m.dosage && (
                    <p className="text-xs text-gray-500 mt-0.5">{t('Dosierung')}: {m.dosage}</p>
                  )}
                  {(m.startDate || m.endDate) && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.startDate && formatDate(m.startDate)}
                      {m.endDate && ` – ${formatDate(m.endDate)}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {m.status === 'ACTIVE' && (
                <div className="px-4 pb-3 flex gap-2">
                  <button
                    onClick={() => handleComplete(m.id)}
                    disabled={completeMutation.isPending}
                    className="flex-1 rounded-xl bg-green-50 text-green-600 px-3 py-2.5 text-xs font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {t('Abgeschlossen')} ✓
                  </button>
                  <button
                    onClick={() => setSkipDialogId(m.id)}
                    disabled={skipMutation.isPending}
                    className="flex-1 rounded-xl bg-amber-50 text-amber-600 px-3 py-2.5 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    {t('Übersprungen')}
                  </button>
                </div>
              )}

              {/* Expand tracking history */}
              {myTrackings.length > 0 && (
                <>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    className="w-full px-4 py-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <span>{t('Verlauf')} ({myTrackings.length})</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {myTrackings.slice(0, 10).map((t: any, i: number) => (
                        <div
                          key={t.id ?? i}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0"
                        >
                          <span className="text-gray-500">
                            {t.date ? formatDate(t.date) : formatDate(t.createdAt)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                              t.completed ?? t.status === 'COMPLETED'
                                ? 'bg-green-50 text-green-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {t.completed ?? t.status === 'COMPLETED' ? (
                              <>
                                <Check className="w-3 h-3" /> {t('Abgeschlossen')}
                              </>
                            ) : (
                              <>
                                <SkipForward className="w-3 h-3" /> {t('Übersprungen')}
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* ── Error ── */}
        {measures.isError && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t('errorBoundary.title')}
          </div>
        )}
      </main>

      {/* ── Skip Dialog (bottom-sheet style) ── */}
      {skipDialogId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setSkipDialogId(null)}>
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-8 space-y-4 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />
            <h3 className="text-base font-semibold text-gray-800">{t('Übersprungen')}</h3>
            <p className="text-xs text-gray-400">
              {t('Grund der Absage (optional)')}
            </p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder={t('Grund der Absage (optional)')}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setSkipDialogId(null); setSkipReason(''); }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('Abbrechen & Home')}
              </button>
              <button
                onClick={handleSkip}
                disabled={skipMutation.isPending}
                className="flex-1 rounded-xl bg-amber-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {skipMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SkipForward className="w-4 h-4" />
                )}
                {t('Übersprungen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
