/**
 * ThroughputChart Component
 * 
 * Line-Chart fuer den stuendlichen Patientendurchsatz.
 * Zeigt Vergleich zwischen heute und 30-Tage-Durchschnitt.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { cn } from '../../../lib/utils';
import type { HourlyDataPoint } from '../../../types/dashboard';

interface ThroughputChartProps {
  data: HourlyDataPoint[];
  averageData?: HourlyDataPoint[]; // 30-Tage-Durchschnitt
  className?: string;
}

interface ChartDataPoint {
  hour: string;
  today: number;
  average: number;
  waitTime: number;
  alerts: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">{label} Uhr</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white/60">{entry.name}:</span>
            <span className="text-white font-medium">
              {entry.value} {entry.name.includes('Wartezeit') ? 'Min' : 'Patienten'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ThroughputChart: React.FC<ThroughputChartProps> = ({
  data,
  averageData,
  className,
}) => {
  const { t } = useTranslation();

  // Daten fuer Chart aufbereiten
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((point, index) => ({
      hour: point.hour,
      today: point.patients,
      average: averageData?.[index]?.patients ?? Math.round(point.patients * 0.9),
      waitTime: point.avgWaitTime,
      alerts: point.triageAlerts,
    }));
  }, [data, averageData]);

  // Bestimme den hoechsten Wert fuer die Y-Achse
  const maxValue = useMemo(() => {
    const allValues = chartData.flatMap(d => [d.today, d.average]);
    return Math.max(...allValues, 10);
  }, [chartData]);

  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
            {t('admin.throughput.title', 'Stündlicher Durchsatz')}
          </h3>
          <p className="text-sm text-white/40 mt-1">
            {t('admin.throughput.subtitle', 'Heute vs. 30-Tage-Durchschnitt')}
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-white/60">{t('admin.throughput.today')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/30" />
            <span className="text-white/60">{t('admin.throughput.average')}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.05)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="hour" 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            
            <YAxis 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(maxValue * 1.1)]}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Average Line (dashed) */}
            <Line
              type="monotone"
              dataKey="average"
              name={t('admin.throughput.average')}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
            />
            
            {/* Today Area + Line */}
            <Area
              type="monotone"
              dataKey="today"
              name={t('admin.throughput.today')}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorToday)"
            />
            
            <Line
              type="monotone"
              dataKey="today"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <SummaryStat
          label={t('admin.throughput.totalToday')}
          value={chartData.reduce((sum, d) => sum + d.today, 0)}
        />
        <SummaryStat
          label={t('admin.throughput.peakHour')}
          value={chartData.reduce((max, d) => d.today > max.today ? d : max, chartData[0])?.hour || '-'}
        />
        <SummaryStat
          label={t('admin.throughput.avgWait')}
          value={`${Math.round(chartData.reduce((sum, d) => sum + d.waitTime, 0) / chartData.length)} Min`}
        />
      </div>
    </div>
  );
};

/**
 * Kleine Summary-Statistik
 */
const SummaryStat: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="text-center">
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-xs text-white/40 mt-0.5">{label}</p>
  </div>
);
