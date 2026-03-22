import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminAuditLog } from '../../hooks/useOpsApi';
import type { AuditLogEntry } from '../../types/admin';

export function AuditLogTab() {
    const { i18n } = useTranslation();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const { data, isLoading } = useAdminAuditLog({ page, limit: 25, search: search || undefined, action: actionFilter || undefined });

    if (isLoading) return <div className="animate-pulse p-8">Lade Audit-Log...</div>;

    const entries = data?.entries || [];
    const pagination = data?.pagination || { page: 1, totalPages: 0, total: 0 };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Audit-Log</h2>
                <span className="text-sm text-gray-500">{pagination.total} Einträge</span>
            </div>

            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Suchen..." className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} aria-label="Aktion filtern" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                    <option value="">Alle Aktionen</option>
                    <option value="CREATE">CREATE</option>
                    <option value="READ">READ</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="EXPORT">EXPORT</option>
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Zeitpunkt</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Aktion</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Ressource</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Benutzer</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {entries.map((entry: AuditLogEntry) => (
                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString(i18n.language)}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.action === 'CREATE' ? 'bg-green-100 text-green-700' : entry.action === 'DELETE' ? 'bg-red-100 text-red-700' : entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {entry.action}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{entry.resource}</td>
                                <td className="px-4 py-2 text-gray-500">{entry.userId || '–'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{entry.ipAddress || '–'}</td>
                            </tr>
                        ))}
                        {entries.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">Keine Einträge gefunden</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Vorherige Seite" className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm text-gray-500">Seite {page} von {pagination.totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} aria-label="Nächste Seite" className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
}
