import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Activity, FileText, Globe,
  AlertTriangle, Heart, Box, GitBranch, BarChart3,
  TrendingUp, PieChart
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart as RechartsPie, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend
} from 'recharts';
import { GlassCard } from './GlassCard';
import { StatCardComponent } from './StatCardComponent';
import { FLOW_DATA, STATS, SERVICE_CHART_DATA, TRIAGE_PIE_DATA, BODY_RADAR_DATA, WEEKLY_SESSIONS_DATA, SERVICES, BODY_MODULES, TRIAGE_RULES, CUSTOM_TOOLTIP_STYLE } from './adminData';
import { FlowDiagram } from './FlowDiagram';

export default function OverviewTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(stat => <StatCardComponent key={stat.label} stat={stat} />)}
      </div>

      {/* ── Interactive Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Questions per Service */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" /> Fragen pro Service-Pfad
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SERVICE_CHART_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#9BB0C0', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9BB0C0', fontSize: 11 }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="fragen" name="Fragen" fill="#4A90E2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="dauer" name="Dauer (Min)" fill="#81B29A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Area Chart: Weekly Sessions */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-400" /> Wöchentliche Sessions (Demo)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_SESSIONS_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4A90E2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="triageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E07A5F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E07A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#9BB0C0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9BB0C0', fontSize: 11 }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#9BB0C0' }} />
                <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#4A90E2" fill="url(#sessionGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="triage" name="Triage-Alerts" stroke="#E07A5F" fill="url(#triageGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Pie Chart: Triage Distribution */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-amber-400" /> Triage-Verteilung
          </h3>
          <div className="h-[240px] flex items-center justify-center gap-8">
            <div className="w-[200px] h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={TRIAGE_PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                    {TRIAGE_PIE_DATA.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {TRIAGE_PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-[var(--text-secondary)]">{d.name}: <span className="font-semibold text-[var(--text-primary)]">{d.value} Regeln</span></span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border-primary)]">
                <span className="text-xs text-[var(--text-muted)]">Gesamt: 10 Regeln aktiv</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Radar Chart: Body Module Coverage */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-400" /> Body-Modul Abdeckung (%)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={BODY_RADAR_DATA} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="module" tick={{ fill: '#9BB0C0', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: '#6B8BA4', fontSize: 9 }} domain={[0, 100]} />
                <Radar name="Coverage" dataKey="coverage" stroke="#4A90E2" fill="#4A90E2" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-400" /> 10 Service-Pfade
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SERVICES.map(s => (
            <GlassCard key={s.id} className="text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
              <div className="flex justify-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                <span>⏱ {s.duration}</span>
                <span>📝 {s.questions}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Body Modules */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Heart size={20} className="text-red-400" /> 13 Körperregion-Module
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {BODY_MODULES.map(m => (
            <div key={m.id} className={`rounded-xl border ${m.color} bg-[var(--bg-card)] p-3 text-center hover:scale-105 transition-transform`}>
              <div className="text-xl mb-1">{m.icon}</div>
              <p className="text-xs font-medium text-[var(--text-primary)]">{m.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">ID: {m.id}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Triage Rules */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-400" /> Triage-Regeln (Echtzeit)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TRIAGE_RULES.map(r => (
            <div key={r.name} className={`rounded-xl border ${r.color} p-3 flex items-start gap-3`}>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.level === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'}`}>
                {r.level}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{r.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{r.trigger}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">→ {r.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
