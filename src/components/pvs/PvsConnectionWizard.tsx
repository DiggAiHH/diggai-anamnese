import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, Server, ChevronRight, ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { usePvsConnections, usePvsCreateConnection, usePvsTestConnection, usePvsDeleteConnection } from '../../hooks/useApi';
import type { PvsConnection } from '../../types/admin';

// ─── PVS Types & Protocols ─────────────────────────────────
const PVS_TYPES = [
    { value: 'CGM_M1', label: 'CGM M1 PRO', protocol: 'GDT', icon: '🏥', desc: 'CompuGroup Medical M1 PRO' },
    { value: 'MEDATIXX', label: 'medatixx', protocol: 'GDT', icon: '💻', desc: 'medatixx Praxissoftware' },
    { value: 'MEDISTAR', label: 'Medistar', protocol: 'GDT', icon: '⭐', desc: 'CompuGroup Medistar' },
    { value: 'T2MED', label: 'T2med', protocol: 'FHIR', icon: '🔬', desc: 'T2med (FHIR-fähig)' },
    { value: 'X_ISYNET', label: 'x.isynet', protocol: 'GDT', icon: '🌐', desc: 'medatixx x.isynet' },
    { value: 'DOCTOLIB', label: 'Doctolib', protocol: 'FHIR', icon: '📅', desc: 'Doctolib Praxissoftware' },
    { value: 'TURBOMED', label: 'TurboMed', protocol: 'GDT', icon: '⚡', desc: 'CGM TurboMed' },
    { value: 'FHIR_GENERIC', label: 'FHIR (Generisch)', protocol: 'FHIR', icon: '🔥', desc: 'Beliebiges FHIR R4 System' },
] as const;

type WizardStep = 'type' | 'config' | 'test';

interface ConnectionConfig {
    name: string;
    pvsType: string;
    protocol: string;
    // GDT-specific
    importDir: string;
    exportDir: string;
    // FHIR-specific
    fhirBaseUrl: string;
    authType: string;
    clientId: string;
    clientSecret: string;
    apiKey: string;
}

const DEFAULT_CONFIG: ConnectionConfig = {
    name: '',
    pvsType: '',
    protocol: '',
    importDir: '',
    exportDir: '',
    fhirBaseUrl: '',
    authType: 'none',
    clientId: '',
    clientSecret: '',
    apiKey: '',
};

export function PvsConnectionWizard({ onClose }: { onClose?: () => void }) {
    const [step, setStep] = useState<WizardStep>('type');
    const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const createConn = usePvsCreateConnection();

    const selectedType = PVS_TYPES.find(t => t.value === config.pvsType);
    const isGdt = selectedType?.protocol === 'GDT';
    const isFhir = selectedType?.protocol === 'FHIR';

    const handleTypeSelect = (pvsType: string) => {
        const t = PVS_TYPES.find(p => p.value === pvsType);
        setConfig(prev => ({
            ...prev,
            pvsType,
            protocol: t?.protocol || '',
            name: t?.label || '',
        }));
        setStep('config');
    };

    const handleCreate = () => {
        const connectionConfig: Record<string, unknown> = {};
        if (isGdt) {
            connectionConfig.importDir = config.importDir;
            connectionConfig.exportDir = config.exportDir;
        } else if (isFhir) {
            connectionConfig.fhirBaseUrl = config.fhirBaseUrl;
            connectionConfig.authType = config.authType;
            if (config.authType === 'oauth2') {
                connectionConfig.clientId = config.clientId;
                connectionConfig.clientSecret = config.clientSecret;
            } else if (config.authType === 'apikey') {
                connectionConfig.apiKey = config.apiKey;
            }
        }

        createConn.mutate({
            pvsType: config.pvsType,
            protocol: config.protocol,
            name: config.name,
            config: connectionConfig,
        }, {
            onSuccess: (data) => {
                setTestResult(data.testResult || { success: true, message: 'Verbindung erstellt' });
                setStep('test');
            },
        });
    };

    const canProceedConfig = config.name.trim().length > 0 && (
        (isGdt && config.importDir.trim().length > 0 && config.exportDir.trim().length > 0) ||
        (isFhir && config.fhirBaseUrl.trim().length > 0)
    );

    return (
        <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm">
                {(['type', 'config', 'test'] as WizardStep[]).map((s, i) => (
                    <Fragment key={s}>
                        {i > 0 && <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${step === s ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
                            {s === 'type' ? '1. PVS-Typ' : s === 'config' ? '2. Konfiguration' : '3. Verbindungstest'}
                        </span>
                    </Fragment>
                ))}
            </div>

            {/* Step 1: PVS Type Selection */}
            {step === 'type' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PVS_TYPES.map(pvs => (
                        <button key={pvs.value} onClick={() => handleTypeSelect(pvs.value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all hover:border-blue-400 hover:shadow-md ${config.pvsType === pvs.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="text-2xl mb-2">{pvs.icon}</div>
                            <div className="font-medium text-sm">{pvs.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{pvs.protocol}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{pvs.desc}</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Step 2: Configuration */}
            {step === 'config' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Verbindungsname</label>
                        <input type="text" value={config.name} onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={selectedType?.label || 'PVS-Verbindung'}
                            className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                    </div>

                    {isGdt && (
                        <>
                            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm">
                                <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">GDT 3.0 Datei-Austausch</div>
                                <p className="text-blue-600 dark:text-blue-400 text-xs">Das PVS legt Patientendaten als GDT-Dateien im Import-Verzeichnis ab. DiggAI schreibt Ergebnisse als GDT-Dateien ins Export-Verzeichnis.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Import-Verzeichnis (PVS → DiggAI)</label>
                                <input type="text" value={config.importDir} onChange={e => setConfig(prev => ({ ...prev, importDir: e.target.value }))}
                                    placeholder="C:\PVS\GDT\Import" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm font-mono" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Export-Verzeichnis (DiggAI → PVS)</label>
                                <input type="text" value={config.exportDir} onChange={e => setConfig(prev => ({ ...prev, exportDir: e.target.value }))}
                                    placeholder="C:\PVS\GDT\Export" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm font-mono" />
                            </div>
                        </>
                    )}

                    {isFhir && (
                        <>
                            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3 text-sm">
                                <div className="font-medium text-orange-700 dark:text-orange-300 mb-1">FHIR R4 REST-Schnittstelle</div>
                                <p className="text-orange-600 dark:text-orange-400 text-xs">Verbindung über FHIR R4 REST API. Unterstützt OAuth2, API-Key oder offene Endpunkte.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">FHIR Base URL</label>
                                <input type="text" value={config.fhirBaseUrl} onChange={e => setConfig(prev => ({ ...prev, fhirBaseUrl: e.target.value }))}
                                    placeholder="https://pvs.example.com/fhir" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm font-mono" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Authentifizierung</label>
                                <select value={config.authType} onChange={e => setConfig(prev => ({ ...prev, authType: e.target.value }))}
                                    aria-label="Authentifizierung" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm">
                                    <option value="none">Keine (offener Endpunkt)</option>
                                    <option value="basic">Basic Auth</option>
                                    <option value="oauth2">OAuth2 Client Credentials</option>
                                    <option value="apikey">API Key</option>
                                </select>
                            </div>
                            {config.authType === 'oauth2' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Client ID</label>
                                        <input type="text" value={config.clientId} onChange={e => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                                            placeholder="Client ID" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Client Secret</label>
                                        <input type="password" value={config.clientSecret} onChange={e => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                                            placeholder="Client Secret" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                    </div>
                                </div>
                            )}
                            {config.authType === 'apikey' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">API Key</label>
                                    <input type="password" value={config.apiKey} onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                        placeholder="API Key" className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setStep('type')} className="flex items-center gap-1 px-4 py-2 rounded-lg border dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                            <ChevronLeft className="w-4 h-4" /> Zurück
                        </button>
                        <button onClick={handleCreate} disabled={!canProceedConfig || createConn.isPending}
                            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                            {createConn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                            Verbindung erstellen & testen
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Test Result */}
            {step === 'test' && (
                <div className="space-y-4">
                    {testResult && (
                        <div className={`rounded-xl p-6 border-2 ${testResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                {testResult.success ? <Check className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
                                <span className="text-lg font-semibold">{testResult.success ? 'Verbindung erfolgreich!' : 'Verbindung fehlgeschlagen'}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{testResult.message}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={() => { setConfig(DEFAULT_CONFIG); setStep('type'); setTestResult(null); }}
                            className="px-4 py-2 rounded-lg border dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                            Weitere Verbindung
                        </button>
                        {onClose && (
                            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                Fertig
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Connection List (used in PvsAdminPanel) ─────────────────

export function PvsConnectionList() {
    const { i18n } = useTranslation();
    const { data: connections, isLoading } = usePvsConnections();
    const testConn = usePvsTestConnection();
    const deleteConn = usePvsDeleteConnection();
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

    const handleTest = (id: string) => {
        testConn.mutate(id, {
            onSuccess: (result) => setTestResults(prev => ({ ...prev, [id]: result })),
            onError: () => setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Verbindungstest fehlgeschlagen' } })),
        });
    };

    if (isLoading) return <div className="animate-pulse p-4">Lade Verbindungen...</div>;
    if (!connections || connections.length === 0) {
        return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Keine PVS-Verbindungen konfiguriert</div>;
    }

    return (
        <div className="space-y-3">
            {connections.map((conn: PvsConnection) => (
                <div key={conn.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-3 h-3 rounded-full ${conn.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{conn.name}</div>
                            <div className="text-xs text-gray-500">{conn.pvsType} · {conn.protocol}</div>
                            {conn.lastSyncAt && <div className="text-xs text-gray-600 dark:text-gray-400">Letzter Sync: {new Date(conn.lastSyncAt).toLocaleString(i18n.language)}</div>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {testResults[conn.id] && (
                            <span className={`text-xs px-2 py-1 rounded-full ${testResults[conn.id].success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {testResults[conn.id].success ? '✓ OK' : '✗ Fehler'}
                            </span>
                        )}
                        <button onClick={() => handleTest(conn.id)} disabled={testConn.isPending}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" title="Verbindung testen">
                            {testConn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { if (confirm('Verbindung wirklich löschen?')) deleteConn.mutate(conn.id); }}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500 text-sm" title="Löschen">
                            <WifiOff className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
