import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Activity, TrendingUp, Clock, Euro, BarChart3, FileText,
    Download, Calendar, ChevronRight, Sparkles, ArrowUpRight,
    ArrowDownRight, RefreshCw, Filter, Users
} from 'lucide-react';
import {
    useUsageToday,
    useUsageSummary,
    useROIToday,
    useGenerateSummary,
} from '../hooks/useUsageDashboard';
import type {
    UsageBreakdownItem,
    InvoiceLineItem,
} from '../hooks/useUsageDashboard';

// ─── Service Type Labels & Icons ────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
    'ANAMNESE': 'Anamnese',
    'TRIAGE': 'Triage',
    'CHAT': 'Chat',
    'AI_SUMMARY': 'KI-Auswertung',
    'PDF_EXPORT': 'PDF Export',
    'CSV_EXPORT': 'CSV Export',
    'JSON_EXPORT': 'JSON Export',
    'PVS_EXPORT': 'PVS Export',
    'REZEPT': 'Rezepte',
    'AU': 'AU-Scheine',
    'UEBERWEISUNG': 'Überweisungen',
    'TERMIN': 'Termine',
    'ABSAGE': 'Absagen',
    'TELEFON': 'Telefon',
    'NACHRICHT': 'Nachrichten',
    'BG_UNFALL': 'BG-Unfälle',
};

const SERVICE_COLORS: Record<string, string> = {
    'ANAMNESE': '#4A90E2',
    'TRIAGE': '#F4A261',
    'CHAT': '#A78BFA',
    'AI_SUMMARY': '#34D399',
    'PDF_EXPORT': '#60A5FA',
    'CSV_EXPORT': '#6EE7B7',
    'JSON_EXPORT': '#93C5FD',
    'PVS_EXPORT': '#FCD34D',
    'REZEPT': '#F87171',
    'AU': '#FB923C',
    'UEBERWEISUNG': '#A3E635',
    'TERMIN': '#38BDF8',
    'ABSAGE': '#E879F9',
    'TELEFON': '#FDA4AF',
    'NACHRICHT': '#C4B5FD',
    'BG_UNFALL': '#FCA5A5',
};

// ─── Types ──────────────────────────────────────────────────

type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'custom';

// ─── KPI Card ───────────────────────────────────────────────

const KPICard = React.memo(function KPICard({
    icon: Icon,
    label,
    value,
    unit,
    trend,
    color,
}: {
    icon: React.ComponentType<{ className?: string; color?: string }>;
    label: string;
    value: string | number;
    unit?: string;
    trend?: number;
    color: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-5 h-5" color={color} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">
                {value}
                {unit && <span className="text-lg text-white/40 ml-1">{unit}</span>}
            </p>
            <p className="text-xs text-white/40 mt-1 font-medium">{label}</p>
        </div>
    );
});

// ─── Breakdown Bar ──────────────────────────────────────────

const BreakdownBar = React.memo(function BreakdownBar({
    serviceType,
    data,
    maxCount,
}: {
    serviceType: string;
    data: UsageBreakdownItem;
    maxCount: number;
}) {
    const pct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
    const color = SERVICE_COLORS[serviceType] || '#94A3B8';

    return (
        <div className="flex items-center gap-4 py-2.5 group">
            <div className="w-28 shrink-0">
                <p className="text-xs text-white/70 font-medium truncate">{SERVICE_LABELS[serviceType] || serviceType}</p>
            </div>
            <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                <div
                    className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-3"
                    style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: `${color}40` }}
                >
                    <span className="text-[10px] font-bold text-white/80 whitespace-nowrap">{data.count}×</span>
                </div>
            </div>
            <div className="w-20 text-right shrink-0">
                <p className="text-xs text-white/50">{data.timeSavedMin.toFixed(0)} Min</p>
            </div>
            <div className="w-16 text-right shrink-0">
                <p className="text-xs text-emerald-400 font-bold">€{data.costSaving.toFixed(0)}</p>
            </div>
        </div>
    );
});

// ─── Invoice Line ───────────────────────────────────────────

const InvoiceLine = React.memo(function InvoiceLine({ item }: { item: InvoiceLineItem }) {
    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
            <td className="py-3 px-4 text-xs text-white/70">{item.description}</td>
            <td className="py-3 px-4 text-xs text-white/50 text-center">{item.count}×</td>
            <td className="py-3 px-4 text-xs text-white/50 text-right">{item.timeSavedMin.toFixed(0)} Min</td>
            <td className="py-3 px-4 text-xs text-emerald-400 font-bold text-right">€{item.costSaving.toFixed(2)}</td>
        </tr>
    );
});

// ─── Main Component ─────────────────────────────────────────

export function PraxisDashboard() {
    const { t } = useTranslation();
    const [period, setPeriod] = useState<PeriodFilter>('day');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Data hooks
    const { data: usageToday, isLoading: loadingToday } = useUsageToday();
    const { data: roiToday } = useROIToday();
    const { data: summaryData, isLoading: loadingSummary } = useUsageSummary(
        period === 'custom' ? 'day' : period,
        period === 'custom' ? customFrom : undefined,
        period === 'custom' ? customTo : undefined,
    );
    const generateSummary = useGenerateSummary();

    // Derived data
    const breakdown = useMemo(() => {
        const raw = usageToday?.breakdown || {};
        const sorted = Object.entries(raw).sort((a, b) => b[1].count - a[1].count);
        return sorted;
    }, [usageToday?.breakdown]);

    const maxBreakdownCount = useMemo(() => {
        if (breakdown.length === 0) return 1;
        return Math.max(...breakdown.map(([, d]) => d.count));
    }, [breakdown]);

    // Period buttons
    const periods: { key: PeriodFilter; label: string }[] = [
        { key: 'day', label: 'Heute' },
        { key: 'week', label: 'Woche' },
        { key: 'month', label: 'Monat' },
        { key: 'year', label: 'Jahr' },
        { key: 'custom', label: 'Zeitraum' },
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-8 animate-fade-in text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 backdrop-blur-md bg-[var(--bg-card)]/30 p-6 rounded-3xl border border-[var(--border-primary)] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-inner">
                        <BarChart3 className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{t('praxis.title', 'Praxis Business Dashboard')}</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5 font-medium">
                            {t('praxis.subtitle', 'Leistungen, Zeitersparnis & ROI Analyse')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--bg-primary)] p-1.5 rounded-2xl border border-[var(--border-primary)] shadow-sm">
                    {periods.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPeriod(p.key)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${period === p.key
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/20'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Date Range */}
            {period === 'custom' && (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] animate-gentleFadeIn shadow-sm">
                    <Calendar className="w-5 h-5 text-blue-500/60" />
                    <div className="flex items-center gap-2">
                         <input
                            type="date"
                            value={customFrom}
                            onChange={e => setCustomFrom(e.target.value)}
                            className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        />
                        <span className="text-[var(--text-muted)] font-black">→</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={e => setCustomTo(e.target.value)}
                            className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Global Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-primary)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-wider">+12%</span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">{roiToday?.patientsServed ?? usageToday?.totalActions ?? 0}</h3>
                    <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest">{t('praxis.kpi.patients', 'Patienten heute')}</p>
                </div>

                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-primary)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">{usageToday?.totalActions ?? 0}</h3>
                    <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest">{t('praxis.kpi.actions', 'Leistungen gesamt')}</p>
                </div>

                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-primary)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black tracking-tight">{usageToday?.totalTimeSavedMin?.toFixed(0) ?? '0'}<span className="text-lg text-[var(--text-secondary)] ml-1">Min</span></h3>
                    <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest">{t('praxis.kpi.timeSaved', 'Zeitersparnis')}</p>
                </div>

                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-primary)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform">
                            <Euro className="w-6 h-6" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-green-500 tracking-tight">€{usageToday?.totalCostSaving?.toFixed(2) ?? '0.00'}</h3>
                    <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-widest">{t('praxis.kpi.costSaving', 'Kostenersparnis')}</p>
                </div>
            </div>

            {/* ROI Summary */}
            {roiToday && (
                <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32 rounded-full animate-pulse" />
                    <div className="relative z-10">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-blue-200" />
                            {t('praxis.roi.title', 'ROI-Performance')}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] text-blue-200 uppercase font-black tracking-extra-widest opacity-80">{t('praxis.roi.netToday', 'Netto-ROI heute')}</p>
                                <p className="text-3xl font-black tracking-tighter">€{roiToday.netROI.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-blue-200 uppercase font-black tracking-extra-widest opacity-80">{t('praxis.roi.cumulative', 'Kumulativ (Monat)')}</p>
                                <p className="text-3xl font-black tracking-tighter">€{roiToday.cumulativeMonthROI.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-blue-200 uppercase font-black tracking-extra-widest opacity-80">{t('praxis.roi.avgCompletion', 'Ø Ausfüllzeit')}</p>
                                <p className="text-3xl font-black tracking-tighter">{roiToday.avgCompletionMinutes.toFixed(1)} <span className="text-sm font-bold opacity-60">Min</span></p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-blue-200 uppercase font-black tracking-extra-widest opacity-80">{t('praxis.roi.licenseCost', 'Systemkosten/Tag')}</p>
                                <p className="text-3xl font-black tracking-tighter opacity-70">€{roiToday.licenseCostPerDay.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Service Breakdown */}
                <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-primary)] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                         <h2 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            {t('praxis.breakdown.title', 'Leistungs-Aufschlüsselung')}
                        </h2>
                    </div>

                    {loadingToday ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                             <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                             <p className="text-sm font-bold text-[var(--text-secondary)] opacity-50">{t('praxis.loading', 'Digitalisierung läuft...')}</p>
                        </div>
                    ) : breakdown.length === 0 ? (
                        <div className="text-center py-20 bg-[var(--bg-primary)] rounded-3xl border border-dashed border-[var(--border-primary)]">
                            <Sparkles className="w-12 h-12 text-blue-500/20 mx-auto mb-4" />
                            <p className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">{t('praxis.noData', 'Warten auf erste Patienten-Eingabe')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-4 py-3 border-b border-[var(--border-primary)] mb-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                <div className="w-28 shrink-0">Leistung</div>
                                <div className="flex-1">Fortschritt / Anzahl</div>
                                <div className="w-20 text-right shrink-0">Zeit</div>
                                <div className="w-20 text-right shrink-0">Ersparnis</div>
                            </div>
                            {breakdown.map(([type, data]) => (
                                <BreakdownBar
                                    key={type}
                                    serviceType={type}
                                    data={data}
                                    maxCount={maxBreakdownCount}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Daily Summary Sidebar */}
                <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-primary)] p-8 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            {t('praxis.invoice.title', 'Endabrechnung')}
                        </h2>
                    </div>

                    <button
                        onClick={() => generateSummary.mutate(todayStr)}
                        disabled={generateSummary.isPending}
                        className="w-full mb-8 flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {generateSummary.isPending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {t('praxis.invoice.generate', 'Report generieren')}
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {summaryData?.dailySummaries && summaryData.dailySummaries.length > 0 ? (
                            summaryData.dailySummaries.slice(0, 5).map(summary => (
                                <div key={summary.id} className="group cursor-pointer">
                                    <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-indigo-500/50 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black text-[var(--text-primary)]">{summary.date}</span>
                                            <ArrowUpRight className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Ersparnis</p>
                                                <p className="text-sm font-black text-green-500">€{summary.totalCostSaving.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Sessions</p>
                                                <p className="text-sm font-black text-[var(--text-primary)]">{summary.totalSessions}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : loadingSummary ? (
                            <div className="py-10 text-center animate-pulse">
                                <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-30">
                                <FileText className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Keine Reports</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live activity bar */}
            {usageToday && usageToday.actions.length > 0 && (
                 <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-primary)] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Live-Aktivitätsfeed
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-black animate-pulse uppercase tracking-wider">Echtzeit</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar items-center">
                        {usageToday.actions.slice(0, 15).map(action => (
                            <div key={action.id} className="shrink-0 flex items-center gap-3 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl">
                                <div className="w-2 h-2 rounded-full ring-4 ring-emerald-500/10 bg-emerald-500" />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-[var(--text-primary)] whitespace-nowrap">{action.actionName}</p>
                                    <p className="text-[9px] text-[var(--text-muted)] font-medium mt-0.5">{new Date(action.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            )}
        </div>
    );
}

export default PraxisDashboard;
