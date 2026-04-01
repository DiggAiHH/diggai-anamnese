/**
 * AdminAnalyticsDashboard Component
 * 
 * Vollstaendiges Analytics-Dashboard fuer die Praxisleitung.
 * Kombiniert KPIs, Throughput, Funnel und Heatmap.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, TrendingUp, Filter, Download, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useQueueStats } from '../../../hooks/useDashboard';
import {
  generateMockHourlyData,
  generateMockFunnelData,
  generateMockHeatmapData,
} from '../../../data/mockDashboards';
import { KpiCards, KpiCardDetailed } from './KpiCards';
import { ThroughputChart } from './ThroughputChart';
import { FunnelChart } from './FunnelChart';
import { HeatmapCalendar } from './HeatmapCalendar';
import type { DashboardStats } from '../../../types/dashboard';

interface AdminAnalyticsDashboardProps {
  className?: string;
}

type TimeRange = 'today' | 'week' | 'month';

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Aktuelle Stats
  const currentStats = useQueueStats();
  
  // Mock-Daten fuer Vergleich (Vortag)
  const previousStats: Partial<DashboardStats> = useMemo(() => ({
    totalToday: Math.round(currentStats.totalToday * 0.9),
    averageWaitTime: Math.round(currentStats.averageWaitTime * 1.1),
    completedCount: Math.round(currentStats.completedCount * 0.85),
    criticalCount: Math.round(currentStats.criticalCount * 0.7),
  }), [currentStats]);
  
  // Chart-Daten (Mock)
  const hourlyData = useMemo(() => generateMockHourlyData(), []);
  const funnelData = useMemo(() => generateMockFunnelData(), []);
  const heatmapData = useMemo(() => generateMockHeatmapData(), []);
  
  // Refresh Handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  // Export Handler
  const handleExport = () => {
    // In Produktion: CSV/Excel Export
    alert('Export wird vorbereitet...');
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header mit Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            {t('admin.analytics.title', 'Praxis-Analytics')}
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {t('admin.analytics.subtitle', 'Übersicht über Patientenfluss und Effizienz')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex bg-white/5 rounded-lg p-1">
            {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  timeRange === range
                    ? 'bg-purple-500 text-white'
                    : 'text-white/60 hover:text-white'
                )}
              >
                {t(`admin.timeRange.${range}`)}
              </button>
            ))}
          </div>
          
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className={cn(
              'p-2 bg-white/5 border border-white/10 rounded-lg',
              'hover:bg-white/10 transition-all',
              isRefreshing && 'animate-spin'
            )}
            title={t('admin.refresh')}
          >
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
          
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
          >
            <Download className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60">{t('admin.export')}</span>
          </button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <KpiCards 
        stats={currentStats} 
        previousStats={previousStats}
      />
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Throughput Chart */}
        <ThroughputChart 
          data={hourlyData} 
          className="lg:col-span-2"
        />
        
        {/* Funnel Chart */}
        <FunnelChart data={funnelData} />
        
        {/* Heatmap */}
        <HeatmapCalendar data={heatmapData} />
      </div>
      
      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCardDetailed
          title={t('admin.kpi.satisfaction')}
          value="4.7/5"
          subtitle={t('admin.kpi.basedOnReviews', 'Basierend auf 127 Bewertungen')}
          trend={{ value: 5, isPositive: true, label: 'vs. letzte Woche' }}
          icon={<svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
          color="amber"
        />
        
        <KpiCardDetailed
          title={t('admin.kpi.staffEfficiency')}
          value="92%"
          subtitle={t('admin.kpi.timeSaved', '12h Zeit gespart')}
          trend={{ value: 8, isPositive: true, label: 'vs. letzte Woche' }}
          icon={<svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          color="blue"
        />
        
        <KpiCardDetailed
          title={t('admin.kpi.digitalAdoption')}
          value="87%"
          subtitle={t('admin.kpi.patientsOnline', 'Patienten nutzen Anamnese')}
          trend={{ value: 3, isPositive: true, label: 'vs. letzte Woche' }}
          icon={<svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
          color="purple"
        />
        
        <KpiCardDetailed
          title={t('admin.kpi.revenueImpact')}
          value="+2.4k€"
          subtitle={t('admin.kpi.additionalRevenue', 'Zusätzlicher Umsatz')}
          trend={{ value: 12, isPositive: true, label: 'vs. letzte Woche' }}
          icon={<svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          color="green"
        />
      </div>
    </div>
  );
};
