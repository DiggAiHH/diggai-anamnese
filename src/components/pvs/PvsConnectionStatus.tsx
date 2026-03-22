import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePvsConnections } from '../../hooks/useOpsApi';

export function PvsConnectionStatus({ connectionId }: { connectionId?: string }) {
    const { t } = useTranslation();
    const { data: connections, isLoading, refetch } = usePvsConnections();

    if (isLoading) return <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded" />;

    const conn = connectionId
        ? connections?.find((c: any) => c.id === connectionId)
        : connections?.[0];

    if (!conn) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-500">
                <WifiOff className="w-4 h-4" />
                {t('pvs.noConnection', 'Keine PVS-Verbindung')}
            </div>
        );
    }

    const isActive = conn.isActive;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            isActive
                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
        }`}>
            {isActive ? <Wifi className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="font-medium">{conn.pvsType}</span>
            <span className="text-xs opacity-70">
                {isActive ? t('pvs.connected', 'Verbunden') : t('pvs.disconnected', 'Getrennt')}
            </span>
            <button
                onClick={() => refetch()}
                className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
                title={t('pvs.refresh', 'Aktualisieren')}
            >
                <RefreshCw className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
