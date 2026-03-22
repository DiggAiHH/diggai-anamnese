import { useState } from 'react';
import { Search, User, Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePvsSearchPatient } from '../../hooks/useOpsApi';

export function PvsPatientSearch({ connectionId, onLink }: {
    connectionId: string;
    onLink: (pvsPatientId: string, patientNumber: string) => void;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const search = usePvsSearchPatient();

    const handleSearch = () => {
        if (query.trim().length < 2) return;
        search.mutate({ connectionId, query: query.trim() });
    };

    const results = search.data?.patients || [];

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder={t('pvs.searchPatientPlaceholder', 'Name oder Patientennummer...')}
                        className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={search.isPending || query.trim().length < 2}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50"
                >
                    {search.isPending ? t('common.searching', 'Suche...') : t('common.search', 'Suchen')}
                </button>
            </div>

            {results.length > 0 && (
                <div className="space-y-2">
                    {results.map((patient: any) => (
                        <div key={patient.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{patient.name || patient.patientNumber}</p>
                                <p className="text-xs text-gray-500">{patient.patientNumber} {patient.birthDate ? `• ${patient.birthDate}` : ''}</p>
                            </div>
                            <button
                                onClick={() => onLink(patient.id, patient.patientNumber)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                                <Link className="w-3.5 h-3.5" />
                                {t('pvs.link', 'Verknüpfen')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {search.data && results.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                    {t('pvs.noPatientFound', 'Kein Patient gefunden')}
                </p>
            )}
        </div>
    );
}
