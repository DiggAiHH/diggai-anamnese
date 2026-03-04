import { Shield, CreditCard, Wifi, WifiOff, RefreshCw, Radio, FileText, Mail, Settings, Zap, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  useTIStatus,
  useTIPing,
  useTIRefresh,
  useTICards,
  useTIConfig,
  useTIEpaStatus,
  useTIKimStatus,
} from '../hooks/useApi';

const CONNECTION_COLORS: Record<string, string> = {
  CONNECTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DISCONNECTED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CONNECTING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function TIStatusPanel() {
  const { data: status, isLoading } = useTIStatus();
  const { data: cards } = useTICards();
  const { data: config } = useTIConfig();
  const { data: epaStatus } = useTIEpaStatus();
  const { data: kimStatus } = useTIKimStatus();
  const ping = useTIPing();
  const refresh = useTIRefresh();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isConfigured = status?.configured !== false;
  const connStatus = status?.status || 'DISCONNECTED';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TI-Konnektor Status</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Telematik-Infrastruktur — Verbindung & Karten</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${CONNECTION_COLORS[connStatus] || CONNECTION_COLORS.DISCONNECTED}`}>
            {connStatus}
          </span>
        </div>

        {/* Not Configured Warning */}
        {!isConfigured && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">TI-Konnektor nicht konfiguriert</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                {status?.hint || 'Setzen Sie TI_KONNEKTOR_URL, TI_MANDANT_ID und weitere TI_*-Umgebungsvariablen.'}
              </p>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => ping.mutate()}
            disabled={ping.isPending || !isConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            <Radio className="w-4 h-4" />
            {ping.isPending ? 'Ping…' : 'Ping Konnektor'}
          </button>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending || !isConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
            {refresh.isPending ? 'Aktualisiere…' : 'Vollständige Aktualisierung'}
          </button>
          {ping.data && (
            <span className={`text-sm ${ping.data.reachable ? 'text-green-600' : 'text-red-500'}`}>
              {ping.data.reachable ? `Erreichbar (${ping.data.latencyMs}ms)` : `Nicht erreichbar: ${ping.data.errorMessage}`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Details */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {connStatus === 'CONNECTED' ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-400" />}
              Verbindung
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">URL</span><span className="font-mono text-gray-900 dark:text-white text-xs">{status?.konnektorUrl || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="text-gray-900 dark:text-white">{status?.konnektorVersion || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Praxis-ID</span><span className="text-gray-900 dark:text-white">{status?.praxisId || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Latenz</span><span className="text-gray-900 dark:text-white">{status?.lastPingMs != null ? `${status.lastPingMs}ms` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Letzter Ping</span><span className="text-gray-900 dark:text-white">{status?.lastPingAt ? new Date(status.lastPingAt).toLocaleString('de-DE') : '—'}</span></div>
              {status?.lastError && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-red-500 text-xs"><AlertTriangle className="w-3 h-3 inline mr-1" />{status.lastError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" /> Karten-Status
            </h2>
            {(cards?.cards || []).length === 0 ? (
              <p className="text-sm text-gray-400">Keine Karten erkannt</p>
            ) : (
              <div className="space-y-4">
                {(cards?.cards || []).map((card: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.inserted ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <CreditCard className={`w-4 h-4 ${card.inserted ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{card.type}</p>
                        {card.iccsn && <p className="text-xs text-gray-500 font-mono">{card.iccsn}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded ${card.inserted ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                        {card.inserted ? 'Eingesteckt' : 'Nicht erkannt'}
                      </span>
                      {card.expiry && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> {new Date(card.expiry).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" /> TI-Dienste
            </h2>
            <div className="space-y-3">
              {[
                { label: 'VSDM (Versichertenstammdaten)', enabled: status?.features?.vsdm },
                { label: 'NFDM (Notfalldaten)', enabled: status?.features?.nfdm },
                { label: 'ePA (Elektronische Patientenakte)', enabled: status?.features?.epa },
                { label: 'KIM (Kommunikation im Medizinwesen)', enabled: status?.features?.kim },
                { label: 'E-Rezept', enabled: status?.features?.erp },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  {item.enabled ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                </div>
              ))}
            </div>
          </div>

          {/* ePA + KIM Status */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" /> ePA
              </h2>
              <p className={`text-sm ${epaStatus?.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                {epaStatus?.message || 'Lade…'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" /> KIM
              </h2>
              <p className={`text-sm ${kimStatus?.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                {kimStatus?.message || 'Lade…'}
              </p>
            </div>
          </div>

          {/* Configuration */}
          {config && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> Konfiguration
              </h2>
              {config.configured ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-500">Konnektor URL</p><p className="font-mono text-xs text-gray-900 dark:text-white break-all">{config.konnektorUrl}</p></div>
                  <div><p className="text-gray-500">Mandant-ID</p><p className="text-gray-900 dark:text-white">{config.mandantId}</p></div>
                  <div><p className="text-gray-500">Client-System</p><p className="text-gray-900 dark:text-white">{config.clientSystemId}</p></div>
                  <div><p className="text-gray-500">Arbeitsplatz</p><p className="text-gray-900 dark:text-white">{config.workplaceId}</p></div>
                  <div><p className="text-gray-500">Client-Zertifikat</p><p>{config.hasCert ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-gray-300 inline" />}</p></div>
                  <div><p className="text-gray-500">Client-Key</p><p>{config.hasKey ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-gray-300 inline" />}</p></div>
                  <div><p className="text-gray-500">CA-Zertifikat</p><p>{config.hasCa ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-gray-300 inline" />}</p></div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">TI nicht konfiguriert</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
