import { Shield, CreditCard, Wifi, WifiOff, RefreshCw, Radio, Settings, Zap, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KIMPanel } from '../components/admin/KIMPanel';
import { EPAPanel } from '../components/admin/EPAPanel';
import type { TICard } from '../types/admin';
import {
  useTIStatus,
  useTIPing,
  useTIRefresh,
  useTICards,
  useTIConfig,
} from '../hooks/useOpsApi';

const CONNECTION_COLORS: Record<string, string> = {
  CONNECTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DISCONNECTED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CONNECTING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function TIStatusPanel() {
  const { i18n } = useTranslation();
  const { data: status, isLoading } = useTIStatus();
  const { data: cards } = useTICards();
  const { data: config } = useTIConfig();
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
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Shield className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">TI-Konnektor Status</h1>
              <p className="text-sm text-[var(--text-secondary)]">Telematik-Infrastruktur — Verbindung & Karten</p>
            </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border ${
            connStatus === 'CONNECTED' 
              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
              : 'bg-red-500/10 text-red-600 border-red-500/20'
          }`}>
            {connStatus}
          </span>
        </div>

        {/* Not Configured Warning */}
        {!isConfigured && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4 animate-gentleFadeIn">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-700 dark:text-amber-400">TI-Konnektor nicht konfiguriert</p>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                {status?.hint || 'Setzen Sie TI_KONNEKTOR_URL, TI_MANDANT_ID und weitere TI_*-Umgebungsvariablen.'}
              </p>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => ping.mutate()}
            disabled={ping.isPending || !isConfigured}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all font-semibold text-sm active:scale-[0.98]"
          >
            <Radio className="w-4 h-4" />
            {ping.isPending ? 'Ping…' : 'Ping Konnektor'}
          </button>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending || !isConfigured}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all font-semibold text-sm active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
            {refresh.isPending ? 'Aktualisiere…' : 'Vollständige Aktualisierung'}
          </button>
          {ping.data && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${
              ping.data.reachable 
                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                : 'bg-red-500/10 text-red-600 border-red-500/20'
            }`}>
              {ping.data.reachable ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {ping.data.reachable ? `Erreichbar (${ping.data.latencyMs}ms)` : `Nicht erreichbar: ${ping.data.errorMessage}`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Details */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--bg-primary)]">
                {connStatus === 'CONNECTED' ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-400" />}
              </div>
              Verbindungsdetails
            </h2>
            <div className="space-y-4">
              {[
                { label: 'URL', value: status?.konnektorUrl, mono: true },
                { label: 'Version', value: status?.konnektorVersion },
                { label: 'Praxis-ID', value: status?.praxisId },
                { label: 'Latenz', value: status?.lastPingMs != null ? `${status.lastPingMs}ms` : null },
                { label: 'Letzter Ping', value: status?.lastPingAt ? new Date(status.lastPingAt).toLocaleString(i18n.language) : null },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--border-primary)] last:border-0">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{row.label}</span>
                  <span className={`text-sm font-semibold text-[var(--text-primary)] ${row.mono ? 'font-mono text-[10px] bg-[var(--bg-primary)] px-2 py-0.5 rounded' : ''}`}>
                    {row.value || '—'}
                  </span>
                </div>
              ))}
              {status?.lastError && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-red-500 text-xs flex gap-2 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {status.lastError}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--bg-primary)] text-orange-500">
                <CreditCard className="w-5 h-5" />
              </div>
              Karten-Status
            </h2>
            {(cards?.cards || []).length === 0 ? (
              <div className="py-8 text-center bg-[var(--bg-primary)] rounded-2xl border border-dashed border-[var(--border-primary)]">
                <CreditCard className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[var(--text-secondary)]">Keine Karten erkannt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(cards?.cards || []).map((card: TICard, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.inserted ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text-primary)]">{card.type}</p>
                        {card.iccsn && <p className="text-[10px] text-[var(--text-secondary)] font-mono tracking-tight">{card.iccsn}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                        card.inserted 
                          ? 'bg-green-500/10 text-green-600' 
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                      }`}>
                        {card.inserted ? 'Eingesteckt' : 'Leer'}
                      </span>
                      {card.expiry && (
                        <p className="text-[10px] font-medium text-[var(--text-secondary)] mt-1.5 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-indigo-500" /> {new Date(card.expiry).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--bg-primary)] text-yellow-500">
                <Zap className="w-5 h-5" />
              </div>
              TI-Schnittstellen
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'VSDM', full: 'Versichertenstammdaten', enabled: status?.features?.vsdm },
                { label: 'NFDM', full: 'Notfalldaten', enabled: status?.features?.nfdm },
                { label: 'ePA', full: 'Elektronische Akte', enabled: status?.features?.epa },
                { label: 'KIM', full: 'Kommunikation', enabled: status?.features?.kim },
                { label: 'E-Rezept', full: 'Verordnung', enabled: status?.features?.erp },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)]">
                  <div>
                    <p className="font-bold text-xs text-[var(--text-primary)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{item.full}</p>
                  </div>
                  {item.enabled ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          {config && (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--bg-primary)] text-indigo-500">
                  <Settings className="w-5 h-5" />
                </div>
                TI-Infrastruktur Konfiguration
              </h2>
              {config.configured ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-primary)]">
                  <div><p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Konnektor URL</p><p className="font-mono text-[10px] text-[var(--text-primary)] break-all">{config.konnektorUrl}</p></div>
                  <div><p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Mandant-ID</p><p className="text-xs font-bold text-[var(--text-primary)]">{config.mandantId}</p></div>
                  <div><p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Arbeitsplatz</p><p className="text-xs font-bold text-[var(--text-primary)]">{config.workplaceId}</p></div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Zertifikate</p>
                    <div className="flex gap-2">
                      <span title="Client Cert" className={config.hasCert ? "text-green-500" : "text-[var(--text-muted)]"}><Shield className="w-4 h-4" /></span>
                      <span title="CA Cert" className={config.hasCa ? "text-green-500" : "text-[var(--text-muted)]"}><CheckCircle className="w-4 h-4" /></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-red-500/5 rounded-2xl border border-dashed border-red-500/20">
                  <p className="text-sm font-medium text-red-500">TI nicht konfiguriert</p>
                </div>
              )}
            </div>
          )}

          {/* ePA & KIM Panels */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-sm overflow-hidden relative">
               <EPAPanel />
            </div>
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-sm overflow-hidden relative">
              <KIMPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
