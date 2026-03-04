import React, { useState } from 'react';
import { TrendingUp, DollarSign, Clock, Users, Settings } from 'lucide-react';
import { useROIToday, useROIHistory, useROIProjection, useROIConfig, useROIUpdateConfig } from '../../hooks/useApi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';

export function ROIDashboard() {
    const { data: today } = useROIToday();
    const { data: history } = useROIHistory('month');
    const { data: projection } = useROIProjection(12);
    const [showConfig, setShowConfig] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> ROI-Dashboard</h2>
                <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Settings className="w-4 h-4" /> Konfiguration
                </button>
            </div>

            {showConfig && <ROIConfigDialog onClose={() => setShowConfig(false)} />}

            {/* Today's ROI Cards */}
            {today && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Patienten heute" value={String(today.patientsServed)} />
                    <StatCard icon={<Clock className="w-5 h-5 text-green-500" />} label="MFA-Min. gespart" value={`${today.mfaMinutesSaved} Min`} />
                    <StatCard icon={<DollarSign className="w-5 h-5 text-emerald-500" />} label="Einsparung" value={`€${today.costSaving.toFixed(2)}`} />
                    <StatCard icon={<TrendingUp className="w-5 h-5 text-purple-500" />} label="Netto ROI heute" value={`€${today.netROI.toFixed(2)}`} color={today.netROI >= 0 ? 'text-green-600' : 'text-red-600'} />
                </div>
            )}

            {today && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                        <div className="text-sm text-gray-500">Kumulativer Monats-ROI</div>
                        <div className={`text-3xl font-bold ${today.cumulativeMonthROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            €{today.cumulativeMonthROI.toFixed(2)}
                        </div>
                    </div>
                </div>
            )}

            {/* History Chart */}
            {history?.snapshots?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Monatliche Einsparungen (€)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={history.snapshots.map((s: any) => ({ date: new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), saving: s.estimatedCostSaving }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="saving" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    {history.summary && (
                        <div className="mt-4 flex gap-6 text-sm text-gray-600">
                            <div>Ø Täglich: <b>€{history.summary.avgDaily}</b></div>
                            <div>Gesamt: <b>€{history.summary.total}</b></div>
                            <div>Trend: <b className={history.summary.trend >= 0 ? 'text-green-600' : 'text-red-600'}>{history.summary.trend > 0 ? '+' : ''}{history.summary.trend}%</b></div>
                        </div>
                    )}
                </div>
            )}

            {/* Projection Chart */}
            {projection?.monthly?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">12-Monats-Prognose</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={projection.monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="projectedNetROI" name="Monatl. Netto-ROI" stroke="#8b5cf6" strokeWidth={2} />
                            <Line type="monotone" dataKey="cumulativeROI" name="Kumulativ" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
            <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
        </div>
    );
}

function ROIConfigDialog({ onClose }: { onClose: () => void }) {
    const { data: config } = useROIConfig();
    const updateConfig = useROIUpdateConfig();
    const [form, setForm] = useState<any>(null);

    React.useEffect(() => {
        if (config && !form) setForm({ ...config });
    }, [config, form]);

    if (!form) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-blue-700 space-y-4">
            <h3 className="font-semibold">ROI-Parameter konfigurieren</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-gray-500">MFA-Stundensatz (€)</label>
                    <input type="number" step="0.5" value={form.mfaHourlyCost} onChange={e => setForm({ ...form, mfaHourlyCost: parseFloat(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Ø Manuelle Anamnese (Min)</label>
                    <input type="number" step="0.5" value={form.avgManualIntakeMin} onChange={e => setForm({ ...form, avgManualIntakeMin: parseFloat(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Monatl. Lizenzkosten (€)</label>
                    <input type="number" step="1" value={form.monthlyLicenseCost} onChange={e => setForm({ ...form, monthlyLicenseCost: parseFloat(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Arbeitstage/Monat</label>
                    <input type="number" value={form.workdaysPerMonth} onChange={e => setForm({ ...form, workdaysPerMonth: parseInt(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => { updateConfig.mutate(form); onClose(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Speichern</button>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">Abbrechen</button>
            </div>
        </div>
    );
}
