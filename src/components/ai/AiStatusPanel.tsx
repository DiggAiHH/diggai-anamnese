import { Wifi, WifiOff, Cpu, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAiStatus } from '../../hooks/useOpsApi';

export function AiStatusPanel() {
    const { t } = useTranslation();
    const { data: status, isLoading, refetch, isRefetching } = useAiStatus();

    if (isLoading) return <div className="animate-pulse p-4 text-sm text-[var(--text-muted)]">{t('common.loading', 'Laden...')}</div>;

    const isOnline = status?.available && status?.online;

    return (
        <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {t('ai.status', 'KI-Engine Status')}
                </h3>
                <button type="button" onClick={() => refetch()} disabled={isRefetching} className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50">
                    {isRefetching ? <Loader2 className="w-3 h-3 animate-spin" /> : t('common.refresh', 'Aktualisieren')}
                </button>
            </div>

            <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isOnline ? 'bg-green-500/15' : 'bg-[var(--bg-secondary)]'}`}>
                    {isOnline
                        ? <Wifi    className="w-5 h-5 text-green-400" />
                        : <WifiOff className="w-5 h-5 text-[var(--text-muted)]" />
                    }
                </div>
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                        {isOnline ? t('ai.online', 'Online') : status?.available ? t('ai.offline', 'Offline') : t('ai.notConfigured', 'Nicht konfiguriert')}
                    </p>
                    {status?.provider && status.provider !== 'none' && (
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            {status.provider} / {status.model}
                        </p>
                    )}
                </div>
            </div>

            {status?.models && status.models.length > 0 && (
                <div className="mt-3 text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-secondary)]">{t('ai.availableModels', 'Verfügbare Modelle')}:</span>{' '}
                    {status.models.join(', ')}
                </div>
            )}
        </div>
    );
}
