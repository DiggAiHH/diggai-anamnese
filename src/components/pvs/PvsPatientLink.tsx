import { useState } from 'react';
import { Link2, Unlink, RefreshCw, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePvsPatientLinks, usePvsLinkPatient, usePvsUnlinkPatient } from '../../hooks/useApi';
import { PvsPatientSearch } from './PvsPatientSearch';

export function PvsPatientLink({ connectionId }: { connectionId: string }) {
    const { t } = useTranslation();
    const { data: links, isLoading, refetch } = usePvsPatientLinks(connectionId);
    const linkPatient = usePvsLinkPatient();
    const unlinkPatient = usePvsUnlinkPatient();
    const [showSearch, setShowSearch] = useState(false);

    if (isLoading) return <div className="animate-pulse p-4">{t('common.loading', 'Laden...')}</div>;

    const items = links || [];

    const handleLink = (pvsPatientId: string, patientNumber: string) => {
        linkPatient.mutate(
            { connectionId, pvsPatientId, patientNumber },
            { onSuccess: () => { setShowSearch(false); refetch(); } }
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('pvs.patientLinks', 'Patienten-Verknüpfungen')}
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => refetch()}
                        title="Aktualisieren"
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                    >
                        <Link2 className="w-3.5 h-3.5" />
                        {t('pvs.newLink', 'Neu verknüpfen')}
                    </button>
                </div>
            </div>

            {showSearch && (
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                    <PvsPatientSearch connectionId={connectionId} onLink={handleLink} />
                </div>
            )}

            {items.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                    {t('pvs.noLinks', 'Keine Verknüpfungen vorhanden')}
                </p>
            ) : (
                <div className="space-y-2">
                    {items.map((link: any) => (
                        <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{link.patientNumber || link.pvsPatientId}</p>
                                <p className="text-xs text-gray-500">
                                    DiggAI: {link.diggaiPatientId?.substring(0, 8)}... • PVS: {link.pvsPatientId?.substring(0, 8)}...
                                </p>
                            </div>
                            <button
                                onClick={() => unlinkPatient.mutate({ connectionId, linkId: link.id }, { onSuccess: () => refetch() })}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                title={t('pvs.unlink', 'Verknüpfung lösen')}
                            >
                                <Unlink className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
