import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, ShieldAlert, X, Check, MessageSquare } from 'lucide-react';
import { useTherapyAlertsByPatient, useTherapyAlertRead, useTherapyAlertDismiss, useTherapyAlertAction, useTherapyAlerts } from '../../hooks/useApi';
import type { ClinicalAlert } from '../../types/admin';

const SEVERITY_CONFIG: Record<string, { icon: ReactNode; color: string; bg: string; border: string }> = {
    EMERGENCY: { icon: <ShieldAlert className="w-5 h-5" />, color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-500' },
    CRITICAL: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-400' },
    WARNING: { icon: <AlertCircle className="w-5 h-5" />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-400' },
    INFO: { icon: <Info className="w-5 h-5" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-400' },
};

// ─── Banner (for top of ArztDashboard) ──────────────────────

export function ClinicalAlertBanner({ patientId }: { patientId: string }) {
    const { data: alerts } = useTherapyAlertsByPatient(patientId);
    const markRead = useTherapyAlertRead();
    const dismiss = useTherapyAlertDismiss();

    const active = (alerts || []).filter((a: ClinicalAlert) => !a.isDismissed);
    const critical = active.filter((a: ClinicalAlert) => a.severity === 'EMERGENCY' || a.severity === 'CRITICAL');

    if (active.length === 0) return null;

    return (
        <div className="space-y-2">
            {critical.map((alert: ClinicalAlert) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.WARNING;
                return (
                    <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 ${sev.bg} ${sev.border}`}>
                        <div className={`mt-0.5 ${sev.color}`}>{sev.icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm ${sev.color}`}>{alert.title}</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{alert.message}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {!alert.isRead && (
                                <button onClick={() => markRead.mutate(alert.id)} title="Gelesen"
                                    className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50">
                                    <Check className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                            <button onClick={() => dismiss.mutate({ id: alert.id })} title="Verwerfen"
                                className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>
                );
            })}

            {active.length > critical.length && (
                <div className="text-xs text-gray-500 px-2">
                    + {active.length - critical.length} weitere Hinweise ({active.filter((a: ClinicalAlert) => a.severity === 'WARNING').length} Warnungen, {active.filter((a: ClinicalAlert) => a.severity === 'INFO').length} Info)
                </div>
            )}
        </div>
    );
}

// ─── Full Alert List (for Admin/ArztDashboard) ─────────────

export function ClinicalAlertList({ patientId }: { patientId?: string }) {
    const { i18n } = useTranslation();
    const patientAlerts = useTherapyAlertsByPatient(patientId || '');
    const allAlerts = useTherapyAlerts({ unreadOnly: false });
    const markRead = useTherapyAlertRead();
    const dismiss = useTherapyAlertDismiss();
    const takeAction = useTherapyAlertAction();

    const alerts = patientId ? (patientAlerts.data || []) : (allAlerts.data?.alerts || []);
    const isLoading = patientId ? patientAlerts.isLoading : allAlerts.isLoading;

    const [actionId, setActionId] = useState<string | null>(null);
    const [actionText, setActionText] = useState('');

    if (isLoading) return <div className="animate-pulse p-4 text-gray-600 dark:text-gray-400">Lade Alerts...</div>;
    if (alerts.length === 0) return <div className="text-center py-8 text-gray-600 dark:text-gray-400 text-sm">Keine klinischen Alerts</div>;

    return (
        <div className="space-y-2">
            {alerts.map((alert: ClinicalAlert) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
                return (
                    <div key={alert.id} className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${alert.isDismissed ? 'opacity-50' : ''}`}>
                        <div className={`flex items-start gap-3 px-4 py-3 ${sev.bg}`}>
                            <div className={`mt-0.5 ${sev.color}`}>{sev.icon}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium text-sm ${sev.color}`}>{alert.title}</span>
                                    {alert.isRead && <span className="text-xs text-gray-600 dark:text-gray-400">✓ gelesen</span>}
                                    {alert.isDismissed && <span className="text-xs text-gray-600 dark:text-gray-400">verworfen</span>}
                                    {alert.actionTaken && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded dark:bg-green-900 dark:text-green-200">Aktion: {alert.actionTaken}</span>}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{alert.message}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    <span>{new Date(alert.createdAt).toLocaleString(i18n.language)}</span>
                                    {alert.category && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{alert.category}</span>}
                                    {alert.triggerField && <span>Trigger: {alert.triggerField}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {!alert.isRead && !alert.isDismissed && (
                                    <button onClick={() => markRead.mutate(alert.id)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50" title="Als gelesen">
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                                {!alert.isDismissed && !alert.actionTaken && (
                                    <button onClick={() => setActionId(actionId === alert.id ? null : alert.id)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50" title="Aktion">
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                )}
                                {!alert.isDismissed && (
                                    <button onClick={() => dismiss.mutate({ id: alert.id })} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50" title="Verwerfen">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Action form */}
                        {actionId === alert.id && (
                            <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                                <input type="text" value={actionText} onChange={e => setActionText(e.target.value)}
                                    placeholder="Durchgeführte Aktion beschreiben..."
                                    className="flex-1 px-3 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                <button onClick={() => {
                                    if (actionText.trim()) {
                                        takeAction.mutate({ id: alert.id, action: actionText });
                                        setActionId(null);
                                        setActionText('');
                                    }
                                }} disabled={!actionText.trim()}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                    Speichern
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
