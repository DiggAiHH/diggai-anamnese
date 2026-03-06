import { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTherapyExportPvs } from '../../hooks/useApi';

interface TherapyExportButtonProps {
    planId: string;
    disabled?: boolean;
}

export function TherapyExportButton({ planId, disabled }: TherapyExportButtonProps) {
    const { t } = useTranslation();
    const exportMutation = useTherapyExportPvs();
    const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);

    const handleExport = () => {
        setLastResult(null);
        exportMutation.mutate(
            planId,
            {
                onSuccess: () => {
                    setLastResult('success');
                    setTimeout(() => setLastResult(null), 3000);
                },
                onError: () => {
                    setLastResult('error');
                    setTimeout(() => setLastResult(null), 5000);
                },
            }
        );
    };

    return (
        <div className="inline-flex items-center gap-2">
            <button
                onClick={handleExport}
                disabled={disabled || exportMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {exportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                {t('therapy.exportPvs', 'An PVS senden')}
            </button>
            {lastResult === 'success' && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('therapy.exportSuccess', 'Exportiert')}
                </span>
            )}
            {lastResult === 'error' && (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('therapy.exportError', 'Export fehlgeschlagen')}
                </span>
            )}
        </div>
    );
}
