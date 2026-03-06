import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Database, Wifi, Shield, HardDrive, Activity, Clock, Download, Upload, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import {
  useSystemDeployment,
  useSystemFeatures,
  useSystemNetwork,
  useSystemBackups,
  useSystemCreateBackup,
  useSystemDeleteBackup,
  useSystemRestoreBackup,
  useSystemLogs,
  useSystemInfo,
  useSystemBackupSchedule,
} from '../hooks/useApi';

interface BackupEntry {
  id: string;
  filename: string;
  type: string;
  fileSize: number;
  status: string;
  startedAt: string;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

const MODE_COLORS: Record<string, string> = {
  CLOUD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HYBRID: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  LOCAL: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  connected: <CheckCircle className="w-4 h-4 text-green-500" />,
  disconnected: <XCircle className="w-4 h-4 text-gray-400" />,
  error: <AlertTriangle className="w-4 h-4 text-red-500" />,
  unknown: <Info className="w-4 h-4 text-gray-400" />,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SystemPanel() {
  const { i18n } = useTranslation();
  const { data: deployment, isLoading: deployLoading } = useSystemDeployment();
  const { data: features } = useSystemFeatures();
  const { data: network, refetch: refetchNetwork } = useSystemNetwork();
  const { data: backups } = useSystemBackups();
  const { data: sysInfo } = useSystemInfo();
  const { data: logs } = useSystemLogs({ limit: 50 });
  const { data: schedule } = useSystemBackupSchedule();
  const createBackup = useSystemCreateBackup();
  const deleteBackup = useSystemDeleteBackup();
  const restoreBackup = useSystemRestoreBackup();
  const [logFilter, setLogFilter] = useState<string>('all');

  if (deployLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredLogs = logs?.filter((l: LogEntry) => logFilter === 'all' || l.level === logFilter) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System-Verwaltung</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modul 6 — Deployment, Backup, Netzwerk, TI</p>
            </div>
          </div>
          {deployment?.mode && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${MODE_COLORS[deployment.mode] || 'bg-gray-100 text-gray-800'}`}>
              {deployment.mode}
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deployment Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" /> Deployment
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Modus</span><span className="font-medium text-gray-900 dark:text-white">{deployment?.mode || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="font-medium text-gray-900 dark:text-white">{deployment?.version || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Umgebung</span><span className="font-medium text-gray-900 dark:text-white">{deployment?.environment || '—'}</span></div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-gray-500 mb-2">Feature-Flags</p>
                <div className="flex flex-wrap gap-2">
                  {features && Object.entries(features).map(([key, val]) => (
                    <span key={key} className={`px-2 py-0.5 rounded text-xs font-medium ${val ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                      {key.replace('Enabled', '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wifi className="w-5 h-5 text-green-500" /> Netzwerk-Status
              </h2>
              <button onClick={() => refetchNetwork()} title="Netzwerk aktualisieren" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {network ? (
              <div className="space-y-3">
                {[
                  { label: 'Datenbank', data: network.database, icon: <Database className="w-4 h-4" /> },
                  { label: 'Redis', data: network.redis, icon: <Activity className="w-4 h-4" /> },
                  { label: 'TI-Konnektor', data: network.tiKonnektor, icon: <Shield className="w-4 h-4" /> },
                  { label: 'Internet', data: network.internet, icon: <Wifi className="w-4 h-4" /> },
                  { label: 'DNS', data: network.dns, icon: <Server className="w-4 h-4" /> },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      {item.icon} {item.label}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.data?.latencyMs != null && <span className="text-xs text-gray-400">{item.data.latencyMs}ms</span>}
                      {STATUS_ICON[item.data?.status || 'unknown']}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Uptime: {formatUptime(network.uptime || 0)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Lade Netzwerkstatus…</p>
            )}
          </div>

          {/* Backup Management */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-orange-500" /> Backup-Verwaltung
              </h2>
              <div className="flex items-center gap-2">
                {schedule?.enabled && (
                  <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Auto: {schedule.cronExpression}</span>
                )}
                <button
                  onClick={() => createBackup.mutate({ type: 'full' })}
                  disabled={createBackup.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {createBackup.isPending ? 'Erstelle…' : 'Neues Backup'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-2 font-medium">Datei</th>
                    <th className="pb-2 font-medium">Typ</th>
                    <th className="pb-2 font-medium">Größe</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Datum</th>
                    <th className="pb-2 font-medium text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {(backups || []).length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">Keine Backups vorhanden</td></tr>
                  ) : (
                    (backups || []).map((b: BackupEntry) => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 font-mono text-xs">{b.filename}</td>
                        <td className="py-2">{b.type}</td>
                        <td className="py-2">{formatBytes(b.fileSize)}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            b.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                            b.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                            b.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>{b.status}</span>
                        </td>
                        <td className="py-2 text-gray-500">{new Date(b.startedAt).toLocaleString(i18n.language)}</td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {b.status === 'COMPLETED' && (
                              <button
                                onClick={() => restoreBackup.mutate({ id: b.id })}
                                disabled={restoreBackup.isPending}
                                className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500"
                                title="Wiederherstellen"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => { if (confirm('Backup wirklich löschen?')) deleteBackup.mutate(b.id); }}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" /> System-Info
            </h2>
            {sysInfo ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Uptime</span><span className="font-medium text-gray-900 dark:text-white">{formatUptime(sysInfo.uptime)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Node.js</span><span className="font-medium text-gray-900 dark:text-white">{sysInfo.nodeVersion}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Platform</span><span className="font-medium text-gray-900 dark:text-white">{sysInfo.platform} ({sysInfo.arch})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CPUs</span><span className="font-medium text-gray-900 dark:text-white">{sysInfo.cpuCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">RAM Total</span><span className="font-medium text-gray-900 dark:text-white">{formatBytes(sysInfo.totalMemory)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">RAM Frei</span><span className="font-medium text-gray-900 dark:text-white">{formatBytes(sysInfo.freeMemory)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hostname</span><span className="font-medium text-gray-900 dark:text-white">{sysInfo.hostname}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Lade System-Info…</p>
            )}
          </div>

          {/* System Logs */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-500" /> System-Logs
              </h2>
              <select
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                title="Log-Level Filter"
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="all">Alle</option>
                <option value="error">Fehler</option>
                <option value="warn">Warnungen</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {filteredLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Keine Logs vorhanden</p>
              ) : (
                filteredLogs.map((log: LogEntry) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      log.level === 'error' ? 'bg-red-500' : log.level === 'warn' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-gray-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString('de-DE')}</span>
                    <span className="text-gray-600 dark:text-gray-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
