import { useState } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { usePvsConnections, usePvsExportSession } from '../../hooks/useOpsApi';

interface PvsExportDialogProps {
    sessionId: string;
    patientName?: string | null;
    onClose: () => void;
}

export function PvsExportDialog({ sessionId, patientName, onClose }: PvsExportDialogProps) {
    const { data: connections } = usePvsConnections();
    const exportSession = usePvsExportSession();
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

    const activeConnections = (connections || []).filter((c: any) => c.isActive);

    const handleExport = () => {
        exportSession.mutate({
            sessionId,
            connectionId: selectedConnectionId || undefined,
        }, {
            onSuccess: (data) => {
                setResult({ success: data.success !== false, message: data.message || 'Export erfolgreich an PVS übermittelt' });
            },
            onError: (err: any) => {
                setResult({ success: false, message: err?.response?.data?.error || 'Export fehlgeschlagen' });
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="font-semibold">An PVS exportieren</h3>
                        {patientName && <p className="text-sm text-gray-500">{patientName}</p>}
                    </div>
                    <button onClick={onClose} title="Schließen" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {!result ? (
                        <>
                            {activeConnections.length === 0 ? (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    <p>Keine aktive PVS-Verbindung konfiguriert.</p>
                                    <p className="mt-1">Bitte richten Sie zunächst eine Verbindung im Admin-Dashboard ein.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">PVS-Verbindung wählen</label>
                                        <div className="space-y-2">
                                            {activeConnections.map((conn: any) => (
                                                <label key={conn.id}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedConnectionId === conn.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                                    <input type="radio" name="pvs-conn" value={conn.id}
                                                        checked={selectedConnectionId === conn.id}
                                                        onChange={() => setSelectedConnectionId(conn.id)}
                                                        className="sr-only" />
                                                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${selectedConnectionId === conn.id ? 'border-blue-500' : 'border-gray-400'}`}>
                                                        {selectedConnectionId === conn.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium">{conn.name}</div>
                                                        <div className="text-xs text-gray-500">{conn.pvsType} · {conn.protocol}</div>
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full ${conn.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                                        Die Anamnese-Daten werden automatisch in das Format des PVS konvertiert (GDT 3.0 oder FHIR R4) und an das System übermittelt.
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={`rounded-xl p-6 text-center ${result.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                            {result.success ? (
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            ) : (
                                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                            )}
                            <p className="font-medium">{result.success ? 'Export erfolgreich' : 'Export fehlgeschlagen'}</p>
                            {result.message && <p className="text-sm text-gray-500 mt-1">{result.message}</p>}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    {!result ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                                Abbrechen
                            </button>
                            <button onClick={handleExport}
                                disabled={!selectedConnectionId || exportSession.isPending || activeConnections.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                {exportSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Exportieren
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                            Schließen
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
