import React, { useState } from 'react';
import { Server, Plus, ArrowLeftRight, Settings2, BarChart3 } from 'lucide-react';
import { PvsConnectionWizard, PvsConnectionList } from '../pvs/PvsConnectionWizard';
import { PvsTransferLog } from '../pvs/PvsTransferLog';
import { usePvsTransferStats, usePvsConnections, usePvsMappings, usePvsSaveMappings, usePvsResetMappings } from '../../hooks/useApi';

type PvsSubTab = 'connections' | 'wizard' | 'transfers' | 'mappings';

export function PvsAdminPanel() {
    const [subTab, setSubTab] = useState<PvsSubTab>('connections');
    const { data: stats } = usePvsTransferStats();

    const SUB_TABS: Array<{ id: PvsSubTab; label: string; icon: React.ReactNode; badge?: number | string }> = [
        { id: 'connections', label: 'Verbindungen', icon: <Server className="w-4 h-4" /> },
        { id: 'wizard', label: 'Neue Verbindung', icon: <Plus className="w-4 h-4" /> },
        { id: 'transfers', label: 'Transfer-Log', icon: <ArrowLeftRight className="w-4 h-4" />, badge: stats?.today },
        { id: 'mappings', label: 'Feld-Mappings', icon: <Settings2 className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Server className="w-5 h-5" /> PVS-Integration
                </h2>
                {stats && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> {stats.today ?? 0} Transfers heute</span>
                        {stats.successRate != null && (
                            <span className={`font-medium ${stats.successRate >= 95 ? 'text-green-600' : stats.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {Math.round(stats.successRate)}% Erfolgsrate
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                {SUB_TABS.map(tab => (
                    <button key={tab.id} onClick={() => setSubTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${subTab === tab.id ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {tab.icon}
                        {tab.label}
                        {tab.badge != null && Number(tab.badge) > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">{tab.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div>
                {subTab === 'connections' && (
                    <div className="space-y-4">
                        <PvsConnectionList />
                        <button onClick={() => setSubTab('wizard')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center">
                            <Plus className="w-4 h-4" /> Neue PVS-Verbindung einrichten
                        </button>
                    </div>
                )}

                {subTab === 'wizard' && (
                    <PvsConnectionWizard onClose={() => setSubTab('connections')} />
                )}

                {subTab === 'transfers' && (
                    <PvsTransferLog />
                )}

                {subTab === 'mappings' && (
                    <PvsMappingsPanel />
                )}
            </div>
        </div>
    );
}

// ─── Field Mappings Sub-Panel ────────────────────────────────

function PvsMappingsPanel() {
    const { data: connections } = usePvsConnections();
    const [selectedConnId, setSelectedConnId] = useState<string>('');

    const activeConnections = (connections || []).filter((c: any) => c.isActive);

    if (activeConnections.length === 0) {
        return <div className="text-center py-8 text-gray-400 text-sm">Keine aktive PVS-Verbindung vorhanden. Bitte zuerst eine Verbindung einrichten.</div>;
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">Verbindung auswählen</label>
                <select value={selectedConnId} onChange={e => setSelectedConnId(e.target.value)}
                    className="w-full max-w-sm px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm">
                    <option value="">– Bitte wählen –</option>
                    {activeConnections.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.pvsType})</option>
                    ))}
                </select>
            </div>

            {selectedConnId && <MappingEditor connectionId={selectedConnId} />}
        </div>
    );
}

function MappingEditor({ connectionId }: { connectionId: string }) {
    const { data: mappings, isLoading } = usePvsMappings(connectionId);
    const saveMappings = usePvsSaveMappings();
    const resetMappings = usePvsResetMappings();
    const [localMappings, setLocalMappings] = useState<Array<{ sourceField: string; targetField: string; transform?: string }>>([]);
    const [initialized, setInitialized] = useState(false);

    // Sync from server once
    React.useEffect(() => {
        if (mappings && !initialized) {
            setLocalMappings(mappings.map((m: any) => ({ sourceField: m.sourceField, targetField: m.targetField, transform: m.transform || '' })));
            setInitialized(true);
        }
    }, [mappings, initialized]);

    const handleSave = () => {
        saveMappings.mutate({ connectionId, mappings: localMappings });
    };

    const handleReset = () => {
        if (confirm('Mappings auf Standardwerte zurücksetzen?')) {
            resetMappings.mutate(connectionId, {
                onSuccess: () => setInitialized(false),
            });
        }
    };

    if (isLoading) return <div className="animate-pulse p-4">Lade Mappings...</div>;

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">DiggAI-Feld</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">PVS-Feld (GDT/FHIR)</th>
                            <th className="text-left px-4 py-2.5 font-medium text-gray-500">Transformation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {localMappings.map((m, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="px-4 py-2">
                                    <input type="text" value={m.sourceField} onChange={e => {
                                        const updated = [...localMappings];
                                        updated[idx] = { ...updated[idx], sourceField: e.target.value };
                                        setLocalMappings(updated);
                                    }} className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono" />
                                </td>
                                <td className="px-4 py-2">
                                    <input type="text" value={m.targetField} onChange={e => {
                                        const updated = [...localMappings];
                                        updated[idx] = { ...updated[idx], targetField: e.target.value };
                                        setLocalMappings(updated);
                                    }} className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono" />
                                </td>
                                <td className="px-4 py-2">
                                    <input type="text" value={m.transform || ''} onChange={e => {
                                        const updated = [...localMappings];
                                        updated[idx] = { ...updated[idx], transform: e.target.value };
                                        setLocalMappings(updated);
                                    }} placeholder="optional" className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 text-xs font-mono" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between">
                <button onClick={handleReset} disabled={resetMappings.isPending}
                    className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-orange-600">
                    Standard-Mappings wiederherstellen
                </button>
                <button onClick={handleSave} disabled={saveMappings.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {saveMappings.isPending ? 'Speichere...' : 'Mappings speichern'}
                </button>
            </div>
        </div>
    );
}
