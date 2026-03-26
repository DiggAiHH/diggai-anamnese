import React from 'react';
import { Clock, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { PRODUCTIVITY_ROWS } from './adminData';

function AdminProgressBar({ value, max, label, color = 'bg-blue-500' }: { value: number; max: number; label: string; color?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-primary)] font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProductivityTab() {
  const totalPaper = PRODUCTIVITY_ROWS.reduce((acc, r) => acc + parseInt(r.paper), 0);
  const totalDigital = PRODUCTIVITY_ROWS.reduce((acc, r) => acc + parseFloat(r.digital), 0);
  const totalSaved = totalPaper - totalDigital;

  return (
    <div className="space-y-6">
      {/* Time Comparison */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock size={20} className="text-blue-400" /> Zeitersparnis pro Patientenkontakt
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Arbeitsschritt</th>
                <th className="text-center py-3 px-4 text-red-400 font-medium">📄 Papier</th>
                <th className="text-center py-3 px-4 text-green-400 font-medium">💻 DiggAI</th>
                <th className="text-center py-3 px-4 text-blue-400 font-medium">⚡ Ersparnis</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTIVITY_ROWS.map(r => (
                <tr key={r.task} className="border-b border-[var(--border-primary)]/50">
                  <td className="py-3 px-4 text-[var(--text-primary)]">{r.task}</td>
                  <td className="py-3 px-4 text-center text-red-400">{r.paper}</td>
                  <td className="py-3 px-4 text-center text-green-400">{r.digital}</td>
                  <td className="py-3 px-4 text-center text-blue-400 font-semibold">{r.saved}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--accent)]">
                <td className="py-3 px-4 font-bold text-[var(--text-primary)]">GESAMT</td>
                <td className="py-3 px-4 text-center font-bold text-red-400">{totalPaper} Min</td>
                <td className="py-3 px-4 text-center font-bold text-green-400">{totalDigital} Min</td>
                <td className="py-3 px-4 text-center font-bold text-blue-400">-{Math.round((totalSaved / totalPaper) * 100)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* ROI Calculator */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-green-400" /> ROI – Monatliche Hochrechnung
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Patienten/Tag', value: '40', unit: '', color: 'text-blue-400' },
            { label: 'Ersparnis/Tag', value: '18.3', unit: 'Std.', color: 'text-green-400' },
            { label: 'MFA-Äquivalent', value: '2.5', unit: 'Vollzeit', color: 'text-purple-400' },
            { label: 'Ersparnis/Monat', value: '~8.750', unit: '€', color: 'text-amber-400' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color} mt-1`}>{k.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{k.unit}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Quality Improvements */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-400" /> Qualitätsverbesserungen
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Vollständigkeit (Pflichtfelder)', value: 100, max: 100, color: 'bg-green-500' },
            { label: 'Lesbarkeit (digital vs. Handschrift)', value: 100, max: 100, color: 'bg-blue-500' },
            { label: 'Triage-Geschwindigkeit', value: 98, max: 100, color: 'bg-red-500' },
            { label: 'Sprachbarrieren beseitigt', value: 5, max: 5, color: 'bg-purple-500' },
            { label: 'Datensicherheit (E2E)', value: 100, max: 100, color: 'bg-emerald-500' },
            { label: 'Papierverbrauch eliminiert', value: 100, max: 100, color: 'bg-teal-500' },
          ].map(p => <AdminProgressBar key={p.label} {...p} />)}
        </div>
      </div>

      {/* Feature Highlights */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Zap size={20} className="text-yellow-400" /> Produktivitäts-Features
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { feature: 'Intelligentes Routing', effect: '-40% Fragen', icon: '🧠' },
            { feature: 'showIf-System', effect: 'Nur relevante Fragen', icon: '⚡' },
            { feature: 'Multiselect-Queue', effect: 'Keine vergessenen Symptome', icon: '📋' },
            { feature: 'OCR-Scanner', effect: '-90% manuelle Eingabe', icon: '📸' },
            { feature: 'Echtzeit-Chat', effect: 'Keine Rückfragen', icon: '💬' },
            { feature: 'Auto-Triage', effect: 'Notfälle in <2s erkannt', icon: '🚨' },
            { feature: 'Dark/Light Mode', effect: 'Bessere Akzeptanz', icon: '🌓' },
            { feature: 'Demo-Modus', effect: 'Offline testen', icon: '🧪' },
          ].map(f => (
            <div key={f.feature} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-3 text-center">
              <p className="text-xl mb-1">{f.icon}</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{f.feature}</p>
              <p className="text-xs text-green-400 mt-1">{f.effect}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
