import React from 'react';
import { Layers, Box, Database, Server } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { TECH_STACK } from './adminData';

export default function ArchitectureTab() {
  return (
    <div className="space-y-6">
      {/* Tech Stack */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Layers size={20} className="text-purple-400" /> Technologie-Stack
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TECH_STACK.map(cat => (
            <GlassCard key={cat.category}>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">{cat.category}</h4>
              <div className="space-y-2">
                {cat.items.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{item.name}</span>
                    <span className={`text-xs font-mono ${item.color}`}>{item.version || '—'}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Component Architecture */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Box size={20} className="text-cyan-400" /> Komponentenarchitektur (22 Komponenten)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {[
            { name: 'App', type: 'Router', color: 'border-green-500/30' },
            { name: 'LandingPage', type: 'Page', color: 'border-blue-500/30' },
            { name: 'Questionnaire', type: 'Page', color: 'border-blue-500/30' },
            { name: 'ArztDashboard', type: 'Page', color: 'border-purple-500/30' },
            { name: 'MFADashboard', type: 'Page', color: 'border-purple-500/30' },
            { name: 'AdminDashboard', type: 'Page (NEU)', color: 'border-amber-500/30' },
            { name: 'QuestionRenderer', type: 'Core', color: 'border-cyan-500/30' },
            { name: 'HistorySidebar', type: 'Nav', color: 'border-indigo-500/30' },
            { name: 'ProgressBar', type: 'UI', color: 'border-teal-500/30' },
            { name: 'AnswerSummary', type: 'Export', color: 'border-red-500/30' },
            { name: 'PDFExport', type: 'Export', color: 'border-red-500/30' },
            { name: 'RedFlagOverlay', type: 'Triage', color: 'border-rose-500/30' },
            { name: 'DSGVOConsent', type: 'Legal', color: 'border-emerald-500/30' },
            { name: 'ChatBubble', type: 'Chat', color: 'border-violet-500/30' },
            { name: 'MedicationManager', type: 'Medical', color: 'border-pink-500/30' },
            { name: 'SchwangerschaftCheck', type: 'Medical', color: 'border-pink-500/30' },
            { name: 'SurgeryManager', type: 'Medical', color: 'border-pink-500/30' },
            { name: 'UnfallBGFlow', type: 'Medical', color: 'border-orange-500/30' },
            { name: 'IGelServices', type: 'Business', color: 'border-amber-500/30' },
            { name: 'LanguageSelector', type: 'i18n', color: 'border-green-500/30' },
            { name: 'ThemeToggle', type: 'UI', color: 'border-gray-500/30' },
            { name: 'ErrorBoundary', type: 'Error', color: 'border-red-500/30' },
          ].map(c => (
            <div key={c.name} className={`rounded-xl border ${c.color} bg-[var(--bg-input)] p-3`}>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{c.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{c.type}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Database Models */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Database size={20} className="text-blue-400" /> Datenbankmodelle (Prisma/PostgreSQL)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { model: 'Patient', fields: 'hashedEmail, sessions, meds', icon: '👤' },
            { model: 'PatientSession', fields: 'status, service, answers', icon: '📋' },
            { model: 'Answer', fields: 'atomId, value, encrypted', icon: '💬' },
            { model: 'TriageEvent', fields: 'level, message, ack', icon: '🚨' },
            { model: 'MedicalAtom', fields: 'module, logic, redFlag', icon: '⚛️' },
            { model: 'ArztUser', fields: 'role, pwHash, sessions', icon: '👨‍⚕️' },
            { model: 'AuditLog', fields: 'action, user, timestamp', icon: '📝' },
            { model: 'AccidentDetails', fields: 'bgName, date, location', icon: '🚑' },
            { model: 'ChatMessage', fields: 'text, from, timestamp', icon: '💭' },
            { model: 'PatientMedication', fields: 'name, dose, freq', icon: '💊' },
          ].map(m => (
            <div key={m.model} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>{m.icon}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{m.model}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">{m.fields}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* API Endpoints */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Server size={20} className="text-amber-400" /> API-Endpunkte
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Methode</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Endpunkt</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Auth</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: 'POST', endpoint: '/api/sessions/start', auth: '–', desc: 'Session erstellen' },
                { method: 'POST', endpoint: '/api/sessions/:id/answers', auth: 'JWT', desc: 'Antwort speichern' },
                { method: 'POST', endpoint: '/api/triage', auth: 'JWT', desc: 'Triage-Event' },
                { method: 'PUT', endpoint: '/api/arzt/sessions/:id/status', auth: 'ARZT', desc: 'Status ändern' },
                { method: 'POST', endpoint: '/api/upload', auth: 'JWT', desc: 'Datei hochladen' },
                { method: 'GET', endpoint: '/api/export/:format/:id', auth: 'ARZT', desc: 'PDF/CSV/JSON' },
                { method: 'GET', endpoint: '/api/arzt/sessions', auth: 'ARZT', desc: 'Alle Sitzungen' },
                { method: 'POST', endpoint: '/api/chats/:id', auth: 'JWT', desc: 'Chat-Nachricht' },
              ].map(e => (
                <tr key={e.endpoint} className="border-b border-[var(--border-primary)]/30">
                  <td className="py-2 px-3">
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${e.method === 'GET' ? 'bg-green-500/20 text-green-400' : e.method === 'PUT' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{e.method}</span>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-cyan-400">{e.endpoint}</td>
                  <td className="py-2 px-3 text-xs text-[var(--text-muted)]">{e.auth}</td>
                  <td className="py-2 px-3 text-xs text-[var(--text-secondary)]">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
