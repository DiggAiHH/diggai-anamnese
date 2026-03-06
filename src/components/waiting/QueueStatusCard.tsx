import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Clock, Wifi, WifiOff } from 'lucide-react';

interface QueueStatusCardProps {
  position: number | null;
  estimatedMin: number | null;
  status: string;
  queueLength: number | null;
  connected?: boolean;
  elapsed?: number;
}

export const QueueStatusCard: React.FC<QueueStatusCardProps> = ({
  position,
  estimatedMin,
  status: _status,
  queueLength,
  connected = true,
  elapsed = 0,
}) => {
  const { t } = useTranslation();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress bar: (total queue - your position) / total queue
  const progressPct = position && queueLength && queueLength > 0
    ? Math.max(0, Math.min(100, ((queueLength - position + 1) / queueLength) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Connection indicator */}
      <div className="flex items-center justify-end">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          connected
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? t('wartezimmer.connected', 'Verbunden') : t('wartezimmer.disconnected', 'Getrennt')}
        </div>
      </div>

      {/* Queue number */}
      <div className="rounded-2xl border border-[var(--border-primary)] bg-gradient-to-b from-blue-600/10 to-violet-600/10 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
          {t('wartezimmer.yourNumber', 'Ihre Wartenummer')}
        </p>
        <div className="w-24 h-24 mx-auto rounded-2xl bg-[var(--bg-card)] border-2 border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
          <span className="text-4xl font-black text-blue-400">
            {position !== null ? position : '—'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 bg-[var(--bg-card)] rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {estimatedMin !== null
            ? t('waiting.estimatedWait', 'Geschätzte Wartezeit: ~{{min}} Min', { min: estimatedMin })
            : t('waiting.calculating', 'Berechne...')}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 text-center">
          <Clock className="w-4 h-4 mx-auto text-amber-400 mb-1.5" />
          <div className="text-base font-black text-[var(--text-primary)]">{formatTime(elapsed)}</div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('wartezimmer.waited', 'Gewartet')}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 text-center">
          <Users className="w-4 h-4 mx-auto text-blue-400 mb-1.5" />
          <div className="text-base font-black text-[var(--text-primary)]">
            {position !== null ? Math.max(0, position - 1) : '—'}
          </div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('wartezimmer.ahead', 'Vor Ihnen')}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 text-center">
          <Users className="w-4 h-4 mx-auto text-violet-400 mb-1.5" />
          <div className="text-base font-black text-[var(--text-primary)]">
            {queueLength ?? '—'}
          </div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {t('waiting.total', 'Gesamt')}
          </div>
        </div>
      </div>
    </div>
  );
};
