import React from 'react';
import { Heart, BarChart3, AlertTriangle, Brain, TrendingUp, Activity } from 'lucide-react';
import { useTherapyAnalytics } from '../../hooks/useApi';
import { ClinicalAlertList } from '../therapy/ClinicalAlertBanner';

export function TherapyAnalyticsTab() {
    const { data: analytics, isLoading } = useTherapyAnalytics(30);

    if (isLoading) return <div className="animate-pulse p-8 text-gray-400">Lade Therapie-Analytik...</div>;

    const a = analytics || {
        totalPlans: 0,
        statusDistribution: {},
        topDiagnoses: [],
        measureTypes: {},
        avgMeasuresPerPlan: 0,
        avgPlanDurationDays: 0,
        aiUsage: { aiGeneratedPlans: 0, avgAiConfidence: 0, arztModificationRate: 0 },
        alertStats: { total: 0, bySeverity: {}, avgResponseTimeMinutes: 0, dismissRate: 0 },
    };

    const statusColors: Record<string, string> = {
        DRAFT: 'bg-gray-200 dark:bg-gray-600',
        ACTIVE: 'bg-green-500',
        PAUSED: 'bg-yellow-500',
        COMPLETED: 'bg-blue-500',
        CANCELLED: 'bg-red-400',
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="w-5 h-5" /> Therapie-Analytik (30 Tage)</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-blue-600">{a.totalPlans}</div>
                    <div className="text-xs text-gray-500 mt-1">Therapiepläne gesamt</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-purple-600">{a.avgMeasuresPerPlan}</div>
                    <div className="text-xs text-gray-500 mt-1">∅ Maßnahmen/Plan</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-green-600">{a.avgPlanDurationDays}d</div>
                    <div className="text-xs text-gray-500 mt-1">∅ Plandauer</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-orange-600">{a.alertStats.total}</div>
                    <div className="text-xs text-gray-500 mt-1">Klinische Alerts</div>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Status-Verteilung</h3>
                <div className="flex gap-1 h-6 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {Object.entries(a.statusDistribution || {}).filter(([_, v]) => (v as number) > 0).map(([status, count]) => (
                        <div key={status}
                            className={`${statusColors[status] || 'bg-gray-400'} transition-all`}
                            style={{ width: `${a.totalPlans ? ((count as number) / a.totalPlans) * 100 : 0}%` }}
                            title={`${status}: ${count}`} />
                    ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {Object.entries(a.statusDistribution || {}).map(([status, count]) => (
                        <span key={status} className="flex items-center gap-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || 'bg-gray-400'}`} />
                            {status}: {count as number}
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Diagnoses */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Top Diagnosen</h3>
                    {(a.topDiagnoses || []).length > 0 ? (
                        <div className="space-y-2">
                            {a.topDiagnoses.slice(0, 5).map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="font-mono text-xs text-blue-600 w-16">{d.icd}</span>
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${d.percentage}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-500 w-8 text-right">{d.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-400 text-sm">Noch keine Daten</div>
                    )}
                </div>

                {/* AI Usage */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Brain className="w-4 h-4" /> KI-Nutzung</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">KI-generierte Pläne</span>
                            <span className="font-medium">{a.aiUsage.aiGeneratedPlans}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">∅ KI-Konfidenz</span>
                            <span className="font-medium">{a.aiUsage.avgAiConfidence ? `${Math.round(a.aiUsage.avgAiConfidence * 100)}%` : '–'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Arzt-Modifikationsrate</span>
                            <span className="font-medium">{a.aiUsage.arztModificationRate}%</span>
                        </div>
                    </div>
                </div>

                {/* Alert Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alert-Statistik</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">∅ Reaktionszeit</span>
                            <span className="font-medium">{a.alertStats.avgResponseTimeMinutes} min</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Verwerfungsrate</span>
                            <span className="font-medium">{a.alertStats.dismissRate}%</span>
                        </div>
                        <div className="flex gap-2 text-xs mt-2">
                            {Object.entries(a.alertStats.bySeverity || {}).map(([sev, count]) => (
                                <span key={sev} className={`px-2 py-1 rounded-full ${sev === 'EMERGENCY' || sev === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' : sev === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {sev}: {count as number}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Measure Type Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Maßnahmen-Typen</h3>
                    <div className="space-y-1.5">
                        {Object.entries(a.measureTypes || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">{type}</span>
                                <span className="font-medium">{count as number}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Aktuelle Klinische Alerts</h3>
                <ClinicalAlertList />
            </div>
        </div>
    );
}
