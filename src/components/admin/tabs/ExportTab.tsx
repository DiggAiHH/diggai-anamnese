import React from 'react';
import { FileText, PieChart, CheckCircle, ArrowRight } from 'lucide-react';
import { GlassCard } from './GlassCard';

export default function ExportTab() {
  return (
    <div className="space-y-6">
      {/* Export Formats */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <FileText size={20} className="text-blue-400" /> Export-Formate
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { format: 'PDF', icon: '📄', endpoint: 'GET /api/export/pdf/:id', features: ['A4-optimiertes Layout', 'Digitale Signatur (Canvas)', 'Praxis-Header', 'Abschnittsgliederung', 'Druckoptimiert'] },
            { format: 'CSV', icon: '📊', endpoint: 'GET /api/export/csv/:id', features: ['Tabellarische Struktur', 'Excel-kompatibel', 'Massenexport möglich', 'UTF-8 Encoding'] },
            { format: 'JSON', icon: '🔧', endpoint: 'GET /api/export/json/:id', features: ['Maschinenlesbar', 'API-Integration', 'Vollständige Metadaten', 'Strukturiertes Schema'] },
          ].map(e => (
            <GlassCard key={e.format}>
              <div className="text-center mb-4">
                <p className="text-4xl mb-2">{e.icon}</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{e.format}</p>
                <code className="text-xs text-cyan-400 font-mono">{e.endpoint}</code>
              </div>
              <ul className="space-y-2">
                {e.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Report Structure */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-purple-400" /> Berichts-Gliederung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { group: '👤 Personalien & Kontakt', ids: '0000–9011', items: ['Name, Vorname', 'Geschlecht, Geburtsdatum', 'Adresse, Kontakt', 'Versicherung'] },
            { group: '🏥 Aktuelles Anliegen', ids: '1000–AU-103', items: ['Beschwerden & Dauer', 'Körperregion-Details', 'Triage-Ergebnisse', 'BG-Unfall/AU-Daten'] },
            { group: '📋 Med. Vorgeschichte', ids: '4000–8900', items: ['Vorerkrankungen', 'Operationen', 'Medikamente', 'Allergien, Gewohnheiten'] },
          ].map(g => (
            <div key={g.group} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{g.group}</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">IDs: {g.ids}</p>
              <ul className="space-y-1.5">
                {g.items.map(i => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <ArrowRight size={10} className="text-[var(--text-muted)]" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Signature Feature */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          ✍️ Digitale Signatur
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Der PDF-Export beinhaltet ein interaktives Canvas-Zeichenfeld für digitale Unterschriften.
          Unterstützt Touch-Geräte (Tablet/Smartphone) und Maus-Eingabe. Die Signatur wird als
          Rastergrafik in den Bericht eingebettet.
        </p>
      </GlassCard>
    </div>
  );
}
