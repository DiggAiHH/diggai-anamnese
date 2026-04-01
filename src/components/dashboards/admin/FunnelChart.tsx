/**
 * FunnelChart Component
 * 
 * Funnel-Chart zeigt an, an welcher Stelle im Anamnese-Prozess
 * Patienten am laengsten brauchen oder abbrechen.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { cn } from '../../../lib/utils';
import type { FunnelStage } from '../../../types/dashboard';

interface FunnelChartProps {
  data: FunnelStage[];
  className?: string;
}

interface ChartDataPoint extends FunnelStage {
  conversionRate: number;
  dropOffRate: number;
}

// Farbverlauf fuer die Funnel-Stufen
const STAGE_COLORS = [
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
];

// Custom Tooltip — defined outside component to avoid recreating on each render
const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) => {
  if (active && payload && payload.length) {
    const stage = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl min-w-[200px]">
        <p className="text-white font-semibold mb-2">{stage.name}</p>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Patienten:</span>
            <span className="text-white font-medium">{stage.value}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/50">Conversion:</span>
            <span className="text-emerald-400">{stage.conversionRate}%</span>
          </div>

          {stage.dropOff > 0 && (
            <div className="flex justify-between">
              <span className="text-white/50">Abbrüche:</span>
              <span className="text-red-400">{stage.dropOff} ({stage.dropOffRate}%)</span>
            </div>
          )}

          <div className="flex justify-between pt-1 border-t border-white/10">
            <span className="text-white/50">Ø Zeit:</span>
            <span className="text-white">{stage.avgTime} Min</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Label — defined outside component to avoid recreating on each render
const CustomLabel = (props: { x?: number; y?: number; width?: number; height?: number; value?: number; payload?: ChartDataPoint }) => {
  const { x = 0, y = 0, width = 0, value = 0, payload } = props;
  if (!payload) return null;

  return (
    <g>
      <text
        x={x + width / 2}
        y={y + (props.height || 0) / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs font-semibold"
      >
        {value}
      </text>
      <text
        x={x + width / 2}
        y={y + (props.height || 0) / 2 + 14}
        fill="rgba(255,255,255,0.5)"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[10px]"
      >
        ({payload.conversionRate}%)
      </text>
    </g>
  );
};

export const FunnelChart: React.FC<FunnelChartProps> = ({
  data,
  className,
}) => {
  const { t } = useTranslation();

  // Daten mit Conversion Rates aufbereiten
  const chartData: ChartDataPoint[] = useMemo(() => {
    const maxValue = data[0]?.value || 100;
    return data.map((stage, index) => ({
      ...stage,
      conversionRate: index === 0 ? 100 : Math.round((stage.value / maxValue) * 100),
      dropOffRate: index === 0 ? 0 : Math.round((stage.dropOff / maxValue) * 100),
    }));
  }, [data]);

  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
            {t('admin.funnel.title', 'Prozess-Funnel')}
          </h3>
          <p className="text-sm text-white/40 mt-1">
            {t('admin.funnel.subtitle', 'Patientenfluss durch den Anamnese-Prozess')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.05)"
              horizontal={false}
            />
            
            <XAxis 
              type="number"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              barSize={40}
            >
              <LabelList content={<CustomLabel />} />
              {chartData.map((_entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Drop-off Indicators */}
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-white/60 mb-2">
          {t('admin.funnel.dropOffPoints', 'Abbruch-Stellen')}:
        </p>
        {chartData
          .filter(stage => stage.dropOff > 0)
          .slice(0, 2)
          .map((stage, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20"
            >
              <span className="text-sm text-white/70">
                {stage.name} → {data[data.indexOf(stage) + 1]?.name || 'Ende'}
              </span>
              <span className="text-sm font-semibold text-red-400">
                {stage.dropOff} Abbrüche ({stage.dropOffRate}%)
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

/**
 * Alternative: Kompakter horizontaler Funnel
 */
export const CompactFunnel: React.FC<{
  data: FunnelStage[];
  className?: string;
}> = ({ data, className }) => {
  const maxValue = data[0]?.value || 100;
  
  return (
    <div className={cn('space-y-2', className)}>
      {data.map((stage, index) => {
        const width = (stage.value / maxValue) * 100;
        const color = STAGE_COLORS[index % STAGE_COLORS.length];
        
        return (
          <div key={stage.name} className="relative">
            {/* Bar */}
            <div
              className="h-8 rounded-r-md flex items-center px-3 transition-all duration-500"
              style={{ 
                width: `${width}%`,
                backgroundColor: color,
                opacity: 0.8
              }}
            >
              <span className="text-white text-sm font-medium truncate">
                {stage.name}
              </span>
            </div>
            
            {/* Value */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2">
              <span className="text-white/60 text-sm">{stage.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
