import { useState } from 'react';
import { Lightbulb, Send, Cpu, Check, X, FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWunschboxList, useWunschboxSubmit, useWunschboxProcess, useWunschboxReview, useWunschboxExport } from '../../hooks/useOpsApi';
import type { WunschboxEntry, AiParsedChange } from '../../types/admin';

const STATUS_LABELS: Record<string, { labelKey: string; color: string }> = {
    PENDING: { labelKey: 'wunschbox.status_pending', color: 'bg-yellow-100 text-yellow-800' },
    AI_PROCESSED: { labelKey: 'wunschbox.status_ai_processed', color: 'bg-blue-100 text-blue-800' },
    REVIEWED: { labelKey: 'wunschbox.status_reviewed', color: 'bg-purple-100 text-purple-800' },
    APPROVED: { labelKey: 'wunschbox.status_approved', color: 'bg-green-100 text-green-800' },
    REJECTED: { labelKey: 'wunschbox.status_rejected', color: 'bg-red-100 text-red-800' },
    IMPLEMENTED: { labelKey: 'wunschbox.status_implemented', color: 'bg-emerald-100 text-emerald-800' },
};

export function WunschboxTab() {
    const { t } = useTranslation();
    const [statusFilter, setStatusFilter] = useState('');
    const [newWish, setNewWish] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [page] = useState(1);

    const { data, isLoading } = useWunschboxList({ page, limit: 20, status: statusFilter || undefined });
    const submit = useWunschboxSubmit();
    const process = useWunschboxProcess();
    const review = useWunschboxReview();
    const exportSpec = useWunschboxExport();

    const entries = data?.entries || [];
    const selected = entries.find((e: WunschboxEntry) => e.id === selectedId);

    const handleSubmit = () => {
        if (newWish.trim().length < 10) return;
        submit.mutate(newWish, { onSuccess: () => setNewWish('') });
    };

    if (isLoading) return <div className="animate-pulse p-8">{t('app.dashboard_loading')}</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5" /> {t('wunschbox.title')}</h2>

            {/* Submit new wish */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <textarea value={newWish} onChange={e => setNewWish(e.target.value)} placeholder={t('wunschbox.placeholder')}
                    rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm mb-3" />
                <button onClick={handleSubmit} disabled={submit.isPending || newWish.trim().length < 10}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    <Send className="w-4 h-4" /> {t('wunschbox.submit')}
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{t('wunschbox.all_wishes')}</button>
                {Object.entries(STATUS_LABELS).map(([key, { labelKey }]) => (
                    <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{t(labelKey)}</button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* List */}
                <div className="space-y-2 max-h-125 overflow-y-auto">
                    {entries.map((entry: WunschboxEntry) => (
                        <div key={entry.id} onClick={() => setSelectedId(entry.id)}
                            className={`bg-white dark:bg-gray-800 rounded-lg p-4 border cursor-pointer hover:border-blue-300 transition-colors ${selectedId === entry.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm line-clamp-2">{entry.originalText}</p>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${STATUS_LABELS[entry.status]?.color || 'bg-gray-100'}`}>
                                    {STATUS_LABELS[entry.status]?.labelKey ? t(STATUS_LABELS[entry.status].labelKey) : entry.status}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{new Date(entry.createdAt).toLocaleDateString()}</div>
                        </div>
                    ))}
                    {entries.length === 0 && <div className="text-center py-8 text-gray-600 dark:text-gray-400">Keine Einträge</div>}
                </div>

                {/* Detail */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    {selected ? (
                        <div className="space-y-4">
                            <div className="text-sm">{selected.originalText}</div>

                            {/* AI parsed changes */}
                            {selected.aiParsedChanges && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-blue-600">{t('wunschbox.process_ai')}:</h4>
                                    {(selected.aiParsedChanges ?? []).map((c: AiParsedChange, i: number) => (
                                        <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-xs space-y-1">
                                            <div className="flex gap-2"><span className="font-medium">{c.area}</span><span className="text-gray-500">{c.component}</span></div>
                                            <div>{c.description}</div>
                                            <div className="flex gap-3 text-gray-600 dark:text-gray-400">
                                                <span>Prio: {c.priority}</span><span>Aufwand: {c.estimatedEffort}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap pt-2">
                                {selected.status === 'PENDING' && (
                                    <button onClick={() => process.mutate(selected.id)} disabled={process.isPending}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                                        <Cpu className="w-3 h-3" /> {t('wunschbox.process_ai')}
                                    </button>
                                )}
                                {['AI_PROCESSED', 'REVIEWED'].includes(selected.status) && (
                                    <>
                                        <button onClick={() => review.mutate({ id: selected.id, status: 'APPROVED' })}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                                            <Check className="w-3 h-3" /> {t('wunschbox.approve')}
                                        </button>
                                        <button onClick={() => review.mutate({ id: selected.id, status: 'REJECTED' })}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                                            <X className="w-3 h-3" /> {t('wunschbox.reject')}
                                        </button>
                                    </>
                                )}
                                {['APPROVED', 'AI_PROCESSED', 'REVIEWED'].includes(selected.status) && (
                                    <button onClick={() => exportSpec.mutate(selected.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                                        <FileDown className="w-3 h-3" /> {t('wunschbox.export_spec')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-600 dark:text-gray-400">
                            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Wählen Sie einen Wunsch aus der Liste</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
