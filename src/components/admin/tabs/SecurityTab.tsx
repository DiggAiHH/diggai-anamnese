import React from 'react';
import { Shield, Lock, CheckCircle } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { SECURITY_LAYERS } from './adminData';

export default function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* Security Layers */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Shield size={20} className="text-green-400" /> 8-Schichten Sicherheitsarchitektur
        </h3>
        <div className="space-y-3">
          {SECURITY_LAYERS.map((layer, i) => (
            <div key={layer.name} className={`rounded-xl border ${layer.color} p-4 flex items-start gap-4`}>
              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="w-7 h-7 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">{i + 1}</span>
                {layer.icon}
                <span className="text-sm font-semibold text-[var(--text-primary)]">{layer.name}</span>
              </div>
              <div className="flex-1">
                <span className="text-xs font-mono text-cyan-400 bg-[var(--bg-input)] px-2 py-0.5 rounded">{layer.tech}</span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{layer.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Encryption Visual */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Lock size={20} className="text-blue-400" /> Verschlüsselungs-Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { input: 'PII-Daten', desc: 'Name, Adresse, E-Mail', method: 'AES-256-GCM', icon: '🔐', detail: 'IV: 12B · Tag: 16B · Key: 32B' },
            { input: 'E-Mail (Zuordnung)', desc: 'Patientenmapping', method: 'SHA-256 Hash', icon: '🔗', detail: 'Einweg-Pseudonymisierung' },
            { input: 'Passwörter', desc: 'Arzt-Login', method: 'bcrypt (10)', icon: '🔑', detail: 'Salted + 10 Rounds' },
          ].map(e => (
            <div key={e.method} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-4 text-center space-y-3">
              <p className="text-3xl">{e.icon}</p>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{e.input}</p>
                <p className="text-xs text-[var(--text-muted)]">{e.desc}</p>
              </div>
              <div className="w-full h-px bg-[var(--border-primary)]" />
              <div>
                <p className="text-sm font-mono text-cyan-400">{e.method}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{e.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* DSGVO Checklist */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <CheckCircle size={20} className="text-emerald-400" /> DSGVO-Konformität
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            '✅ Einwilligungserklärung vor Datenverarbeitung',
            '✅ Datensparsamkeit – nur medizinisch notwendige Daten',
            '✅ Pseudonymisierung via SHA-256',
            '✅ Verschlüsselung (AES-256-GCM) für alle PII',
            '✅ Löschrecht – Session-Ablauf nach 24h',
            '✅ Datenportabilität – Export als PDF/CSV/JSON',
            '✅ Audit Trail – vollständige Zugriffsprotokolle',
            '✅ Widerruf jederzeit möglich',
            '✅ Transport-Verschlüsselung (TLS 1.3)',
          ].map(item => (
            <div key={item} className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-sm text-[var(--text-primary)]">{item}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
