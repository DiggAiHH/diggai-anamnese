import React from 'react';
import { History, Tag, CheckCircle, Rocket } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { DEPLOY_HISTORY, DEPLOY_TYPE_CONFIG } from './adminData';

export default function ChangelogTab() {
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <p className="text-3xl font-bold text-blue-400">{DEPLOY_HISTORY.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">Deployments</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-3xl font-bold text-green-400">{DEPLOY_HISTORY.reduce((a, d) => a + d.changes.length, 0)}</p>
          <p className="text-sm text-[var(--text-secondary)]">Änderungen gesamt</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-3xl font-bold text-purple-400">{DEPLOY_HISTORY[0]?.version || '—'}</p>
          <p className="text-sm text-[var(--text-secondary)]">Aktuelle Version</p>
        </GlassCard>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border-primary)]" />
        <div className="space-y-6">
          {DEPLOY_HISTORY.map((entry, idx) => {
            const typeConfig = DEPLOY_TYPE_CONFIG[entry.type];
            return (
              <div key={entry.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1 w-10 h-10 rounded-xl flex items-center justify-center border ${typeConfig.color}`}>
                  {typeConfig.icon}
                </div>

                <GlassCard className={idx === 0 ? 'ring-1 ring-[var(--accent)]/30' : ''}>
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <Tag size={14} className="text-[var(--text-muted)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {entry.phase} — v{entry.version}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto">
                      {new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    {idx === 0 && (
                      <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Aktuell
                      </span>
                    )}
                  </div>

                  {/* Changes list */}
                  <ul className="space-y-1.5">
                    {entry.changes.map((change, ci) => (
                      <li key={ci} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>

                  {/* Deploy info */}
                  {entry.deployId && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-primary)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="font-mono bg-[var(--bg-input)] px-2 py-0.5 rounded">ID: {entry.deployId}</span>
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer"
                           className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                          <Rocket size={12} /> {entry.url.replace('https://', '')}
                        </a>
                      )}
                    </div>
                  )}
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
