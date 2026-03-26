import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

export const StatCardComponent = React.memo(function StatCardComponent({ stat }: { stat: StatCard }) {
  return (
    <GlassCard className="relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          {stat.description && <p className="text-xs text-[var(--text-muted)] mt-1">{stat.description}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
          {stat.icon}
        </div>
      </div>
    </GlassCard>
  );
});
