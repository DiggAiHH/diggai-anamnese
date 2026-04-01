/**
 * KpiCards Component
 * 
 * KPI-Karten mit Trend-Indikatoren fuer das Admin-Dashboard.
 * Zeigt Patienten heute, Wartezeit, Abschlussrate und Triage-Alerts.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatNumber } from '../../../lib/utils';
import type { DashboardStats } from '../../../types/dashboard';

interface KpiCardsProps {
  stats: DashboardStats;
  // Vergleichsdaten vom Vortag
  previousStats?: Partial<DashboardStats>;
  className?: string;
}

interface KpiConfig {
  key: keyof DashboardStats;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  format?: (value: number) => string;
  unit?: string;
}

const KPI_CONFIGS: KpiConfig[] = [
  {
    key: 'totalToday',
    label: 'admin.kpi.totalPatients',
    icon: <Users className="w-5 h-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15 border-blue-500/30',
    format: (v) => formatNumber(v),
  },
  {
    key: 'averageWaitTime',
    label: 'admin.kpi.avgWaitTime',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15 border-amber-500/30',
    format: (v) => `${v} Min`,
    unit: 'min',
  },
  {
    key: 'completedCount',
    label: 'admin.kpi.completed',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15 border-emerald-500/30',
    format: (v) => formatNumber(v),
  },
  {
    key: 'criticalCount',
    label: 'admin.kpi.triageAlerts',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/15 border-red-500/30',
    format: (v) => formatNumber(v),
  },
];

/**
 * Berechnet den Trend zwischen aktuellem und vorherigem Wert
 */
function calculateTrend(current: number, previous?: number): { 
  direction: 'up' | 'down' | 'neutral'; 
  percent: number;
  isGood: boolean;
} {
  if (!previous || previous === 0) {
    return { direction: 'neutral', percent: 0, isGood: true };
  }
  
  const diff = current - previous;
  const percent = Math.round((diff / previous) * 100);
  
  return {
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    percent: Math.abs(percent),
    isGood: diff > 0, // Annahme: mehr ist besser (kann je nach KPI angepasst werden)
  };
}

export const KpiCards: React.FC<KpiCardsProps> = ({ 
  stats, 
  previousStats,
  className 
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {KPI_CONFIGS.map((config) => {
        const value = stats[config.key] as number;
        const previousValue = previousStats?.[config.key] as number | undefined;
        const trend = calculateTrend(value, previousValue);
        
        // Bei Wartezeit ist weniger besser
        if (config.key === 'averageWaitTime') {
          trend.isGood = trend.direction === 'down';
        }
        // Bei Triage-Alerts ist weniger besser
        if (config.key === 'criticalCount') {
          trend.isGood = trend.direction === 'down';
        }

        return (
          <KpiCard
            key={config.key}
            config={config}
            value={value}
            trend={trend}
          />
        );
      })}
    </div>
  );
};

/**
 * Einzelne KPI-Karte
 */
const KpiCard: React.FC<{
  config: KpiConfig;
  value: number;
  trend: {
    direction: 'up' | 'down' | 'neutral';
    percent: number;
    isGood: boolean;
  };
}> = ({ config, value, trend }) => {
  const { t } = useTranslation();
  
  const trendColor = trend.direction === 'neutral' 
    ? 'text-white/40' 
    : trend.isGood 
      ? 'text-emerald-400' 
      : 'text-red-400';

  const TrendIcon = trend.direction === 'up' 
    ? TrendingUp 
    : trend.direction === 'down' 
      ? TrendingDown 
      : Minus;

  return (
    <div className={cn(
      'rounded-xl border p-4 backdrop-blur-sm',
      'bg-white/5 border-white/10',
      config.bgColor
    )}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', config.color, 'bg-black/20')}>
          {config.icon}
        </div>
        
        {/* Trend */}
        {trend.percent > 0 && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trend.percent}%</span>
          </div>
        )}
      </div>
      
      {/* Value */}
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">
          {config.format ? config.format(value) : value}
        </p>
        <p className={cn('text-sm mt-1', config.color)}>
          {t(config.label)}
        </p>
      </div>
      
      {/* Mini-Chart (sparkline) */}
      <div className="mt-3 h-8 flex items-end gap-0.5">
        {generateSparkline(value).map((height, i) => (
          <div
            key={i}
            className={cn('flex-1 rounded-t-sm opacity-60', config.color.replace('text-', 'bg-'))}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Generiert ein zufaelliges Sparkline-Pattern
 * In Produktion: echte Daten aus der letzten Stunde
 */
function generateSparkline(baseValue: number): number[] {
  const points = 12;
  return Array.from({ length: points }, () => 
    Math.max(20, Math.min(100, baseValue * (0.7 + Math.random() * 0.6)))
  );
}

/**
 * Erweiterte KPI-Karte mit Vergleichsdaten
 */
export const KpiCardDetailed: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
}> = ({ title, value, subtitle, trend, icon, color, className }) => {
  const colorClasses = {
    blue: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    green: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/15 border-red-500/30 text-red-400',
    purple: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
  };

  return (
    <div className={cn(
      'rounded-xl border p-5 backdrop-blur-sm',
      colorClasses[color],
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm opacity-70 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm',
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            )}>
              {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-black/20 rounded-xl">
          {icon}
        </div>
      </div>
    </div>
  );
};
