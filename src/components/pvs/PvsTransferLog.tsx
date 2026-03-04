import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, Clock, RotateCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { usePvsTransfers, usePvsRetryTransfer, usePvsTransferStats } from '../../hooks/useApi';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    SUCCESS: { label: 'Erfolgreich', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    FAILED: { label: 'Fehlgeschlagen', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
    PENDING: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: <Clock className="w-3.5 h-3.5" /> },
    PARTIAL: { label: 'Teilweise', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: <Clock className="w-3.5 h-3.5" /> },
};

const DIRECTION_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    EXPORT: { label: 'Export', icon: <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" /> },
    IMPORT: { label: 'Import', icon: <ArrowDownLeft className="w-3.5 h-3.5 text-purple-500" /> },
};

export function PvsTransferLog() {
    const [page, setPage] = useState(1);
    const [directionFilter, setDirectionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = usePvsTransfers({
        page,
        limit: 20,
        direction: directionFilter || undefined,
        status: statusFilter || undefined,
    });
    const { data: stats } = usePvsTransferStats();
    const retry = usePvsRetryTransfer();

    const transfers = data?.transfers || [];
    const pagination = data?.pagination || { page: 1, totalPages: 0, total: 0 };

    return (
        <div className="space-y-4">
            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.today ?? 0}</div>
                        <div className="text-xs text-gray-500">Transfers heute</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.successRate != null ? `${Math.round(stats.successRate)}%` : '–'}</div>
                        <div className="text-xs text-gray-500">Erfolgsrate</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.byStatus?.FAILED ?? 0}</div>
                        <div className="text-xs text-gray-500">Fehlgeschlagen</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                <button onClick={() => setDirectionFilter('')} className={`px-3 py-1 rounded-lg text-xs font-medium ${!directionFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Alle</button>
                <button onClick={() => setDirectionFilter('EXPORT')} className={`px-3 py-1 rounded-lg text-xs font-medium ${directionFilter === 'EXPORT' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Exports</button>
                <button onClick={() => setDirectionFilter('IMPORT')} className={`px-3 py-1 rounded-lg text-xs font-medium ${directionFilter === 'IMPORT' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Imports</button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button onClick={() => setStatusFilter('')} className={`px-3 py-1 rounded-lg text-xs font-medium ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Alle Status</button>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                    <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1 rounded-lg text-xs font-medium ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{label}</button>
                ))}
            </div>

            {/* Transfer table */}
            {isLoading ? (
                <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />)}
                </div>
            ) : transfers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Keine Transfers gefunden</div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Richtung</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">PVS</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Felder</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Datum</th>
                                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.map((t: any) => {
                                const dir = DIRECTION_CONFIG[t.direction] || DIRECTION_CONFIG.EXPORT;
                                const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                                return (
                                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750">
                                        <td className="px-4 py-2.5">
                                            <span className="flex items-center gap-1.5">{dir.icon} {dir.label}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                                                {st.icon} {st.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                                            {t.connection?.name || t.connectionId?.slice(0, 8)}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                                            {t.recordCount ?? '–'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                                            {new Date(t.createdAt).toLocaleString('de-DE')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {t.status === 'FAILED' && (
                                                <button onClick={() => retry.mutate(t.id)} disabled={retry.isPending}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Erneut versuchen">
                                                    <RotateCw className={`w-4 h-4 ${retry.isPending ? 'animate-spin' : ''}`} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Seite {pagination.page} von {pagination.totalPages} ({pagination.total} Einträge)</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
