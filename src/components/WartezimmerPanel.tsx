import React from 'react';
import { Users, Phone, Stethoscope, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueue, useQueueCall, useQueueTreat, useQueueDone, useQueueRemove } from '../hooks/useStaffApi';

interface QueueEntry {
    id: string;
    sessionId: string;
    patientName: string;
    service: string;
    priority: 'NORMAL' | 'URGENT' | 'EMERGENCY';
    status: 'WAITING' | 'CALLED' | 'IN_TREATMENT' | 'DONE';
    position: number;
    joinedAt: string;
    calledAt?: string;
    estimatedWaitMinutes?: number;
}

interface QueueResponse {
    queue?: QueueEntry[];
    stats?: {
        waiting: number;
        called: number;
        inTreatment: number;
        total: number;
    };
}

const PRIORITY_CONFIG = {
    EMERGENCY: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: '🚨', sort: 0 },
    URGENT: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: '⚠️', sort: 1 },
    NORMAL: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '🟢', sort: 2 },
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    WAITING: { color: 'text-white/40', icon: <Clock className="w-3 h-3" /> },
    CALLED: { color: 'text-yellow-400', icon: <Phone className="w-3 h-3" /> },
    IN_TREATMENT: { color: 'text-green-400', icon: <Stethoscope className="w-3 h-3" /> },
};

export const WartezimmerPanel: React.FC = () => {
    const { t } = useTranslation();
    const { data, isLoading } = useQueue() as { data: QueueResponse | undefined; isLoading: boolean };
    const callMutation = useQueueCall();
    const treatMutation = useQueueTreat();
    const doneMutation = useQueueDone();
    const removeMutation = useQueueRemove();

    const entries = data?.queue || [];
    const stats = data?.stats || { waiting: 0, called: 0, inTreatment: 0, total: 0 };

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    {t('queue.title')}
                </h2>
                <div className="flex gap-2">
                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">
                        {t('queue.waiting')}: {stats.waiting}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-400">
                        {t('queue.called')}: {stats.called}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400">
                        {t('queue.inTreatment')}: {stats.inTreatment}
                    </span>
                </div>
            </div>

            {/* Empty State */}
            {entries.length === 0 && (
                <div className="text-center py-12 text-white/20">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">{t('queue.empty')}</p>
                </div>
            )}

            {/* Queue List */}
            <div className="space-y-2">
                {entries.map((entry: QueueEntry) => {
                    const priorityCfg = PRIORITY_CONFIG[entry.priority];
                    const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG['WAITING'];
                    const waitMinutes = Math.round((Date.now() - new Date(entry.joinedAt).getTime()) / 60000);

                    return (
                        <div
                            key={entry.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                entry.status === 'CALLED'
                                    ? 'bg-yellow-500/10 border-yellow-500/20 animate-pulse'
                                    : entry.status === 'IN_TREATMENT'
                                    ? 'bg-green-500/10 border-green-500/20'
                                    : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                            }`}
                        >
                            {/* Position */}
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-black text-white/60">
                                {entry.status === 'WAITING' ? entry.position : '—'}
                            </div>

                            {/* Priority Badge */}
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-black border ${priorityCfg.color}`}>
                                {priorityCfg.label} {entry.priority}
                            </span>

                            {/* Patient Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{entry.patientName}</p>
                                <p className="text-[10px] text-white/30">
                                    {entry.service} • {t('queue.waitingSince', { minutes: waitMinutes })}
                                </p>
                            </div>

                            {/* Status */}
                            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${statusCfg.color}`}>
                                {statusCfg.icon}
                                {t(`queue.status_${entry.status}`)}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1.5">
                                {entry.status === 'WAITING' && (
                                    <button
                                        onClick={() => callMutation.mutate(entry.id)}
                                        disabled={callMutation.isPending}
                                        className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-all disabled:opacity-50"
                                        title={t('queue.callPatient')}
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {entry.status === 'CALLED' && (
                                    <button
                                        onClick={() => treatMutation.mutate(entry.id)}
                                        disabled={treatMutation.isPending}
                                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all disabled:opacity-50"
                                        title={t('queue.startTreatment')}
                                    >
                                        <Stethoscope className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {entry.status === 'IN_TREATMENT' && (
                                    <button
                                        onClick={() => doneMutation.mutate(entry.id)}
                                        disabled={doneMutation.isPending}
                                        className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-all disabled:opacity-50"
                                        title={t('queue.markDone')}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => removeMutation.mutate(entry.id)}
                                    disabled={removeMutation.isPending}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-all disabled:opacity-50"
                                    title={t('queue.remove')}
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Emergency Hint */}
            {entries.some((e: QueueEntry) => e.priority === 'EMERGENCY') && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {t('queue.emergencyHint')}
                </div>
            )}
        </div>
    );
};
