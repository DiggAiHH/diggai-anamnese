import React from 'react';
import { Workflow, GitBranch, Cpu } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { FlowDiagram } from './FlowDiagram';

export default function FlowTab() {
  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Workflow size={20} className="text-blue-400" /> Interaktiver Patienten-Flow
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Klicken Sie auf einen Knoten, um den Unterbaum auf-/zuzuklappen. Der Flow zeigt den vollständigen Anamnese-Pfad von der Landing Page bis zum PDF-Export.
        </p>
        <FlowDiagram />
      </GlassCard>

      {/* Routing Engine */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <GitBranch size={20} className="text-purple-400" /> Drei-Stufen-Routing-Engine
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Stufe 1: Follow-Up', desc: 'Option hat spezifische Sub-Fragen? → Folge diesem Pfad', color: 'border-green-500/40 bg-green-500/5', icon: '1️⃣' },
            { title: 'Stufe 2: Conditional', desc: 'Prüfe when/context/equals-Bedingungen → then-Pfad', color: 'border-amber-500/40 bg-amber-500/5', icon: '2️⃣' },
            { title: 'Stufe 3: Static Next', desc: 'Fester nächster Schritt via logic.next Array', color: 'border-blue-500/40 bg-blue-500/5', icon: '3️⃣' },
          ].map(s => (
            <div key={s.title} className={`rounded-xl border ${s.color} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{s.icon}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Operators */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Cpu size={20} className="text-cyan-400" /> Unterstützte Operatoren
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'contextEquals', 'contextGreaterThan', 'contextLessThan'].map(op => (
            <div key={op} className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] px-3 py-2 text-center">
              <code className="text-xs text-cyan-400 font-mono">{op}</code>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
