/**
 * HeatmapCalendar Component
 * 
 * Aktivitäts-Heatmap über Woche/Stunden.
 * Identifiziert Stosszeiten fuer die Praxisleitung.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import type { HeatmapDataPoint } from '../../../types/dashboard';

interface HeatmapCalendarProps {
  data: HeatmapDataPoint[];
  className?: string;
}

// Farbskala fuer Heatmap
const HEATMAP_COLORS = [
  { threshold: 0, color: 'bg-slate-800', label: '0' },
  { threshold: 1, color: 'bg-emerald-900', label: '1-2' },
  { threshold: 3, color: 'bg-emerald-700', label: '3-4' },
  { threshold: 5, color: 'bg-emerald-500', label: '5-6' },
  { threshold: 7, color: 'bg-yellow-500', label: '7-8' },
  { threshold: 9, color: 'bg-orange-500', label: '9-10' },
  { threshold: 11, color: 'bg-red-500', label: '10+' },
];

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 - 19:00

/**
 * Bestimmt die Farbe basierend auf dem Wert
 */
function getHeatmapColor(value: number): string {
  for (let i = HEATMAP_COLORS.length - 1; i >= 0; i--) {
    if (value >= HEATMAP_COLORS[i].threshold) {
      return HEATMAP_COLORS[i].color;
    }
  }
  return HEATMAP_COLORS[0].color;
}

/**
 * Formatiert die Stunde fuer Anzeige
 */
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  data,
  className,
}) => {
  const { t } = useTranslation();

  // Daten in 2D-Array umwandeln
  const heatmapGrid = useMemo(() => {
    const grid: number[][] = [];
    
    DAYS.forEach((day, dayIndex) => {
      grid[dayIndex] = [];
      HOURS.forEach((hour) => {
        const dataPoint = data.find(d => d.day === day && d.hour === hour);
        grid[dayIndex].push(dataPoint?.value || 0);
      });
    });
    
    return grid;
  }, [data]);

  // Finde Peak-Zeiten
  const peakTimes = useMemo(() => {
    const flattened = data.map(d => ({ ...d, label: `${d.day} ${formatHour(d.hour)}` }));
    return flattened.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [data]);

  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {t('admin.heatmap.title', 'Aktivitäts-Heatmap')}
          </h3>
          <p className="text-sm text-white/40 mt-1">
            {t('admin.heatmap.subtitle', 'Patientenverteilung nach Wochentag und Stunde')}
          </p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header Row - Days */}
          <div className="flex">
            <div className="w-14" /> {/* Spacer for hour labels */}
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex-1 text-center py-2 text-sm font-medium text-white/60"
              >
                {t(`admin.heatmap.days.${day}`, day)}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {HOURS.map((hour, hourIndex) => (
            <div key={hour} className="flex items-center">
              {/* Hour Label */}
              <div className="w-14 text-right pr-3 text-xs text-white/40">
                {formatHour(hour)}
              </div>
              
              {/* Cells */}
              {DAYS.map((day, dayIndex) => {
                const value = heatmapGrid[dayIndex]?.[hourIndex] || 0;
                const colorClass = getHeatmapColor(value);
                
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      'flex-1 aspect-square m-0.5 rounded-md transition-all',
                      'hover:ring-2 hover:ring-white/30 cursor-pointer',
                      colorClass
                    )}
                    title={`${day} ${formatHour(hour)}: ${value} Patienten`}
                  >
                    {value > 0 && (
                      <span className="sr-only">{value} Patienten</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {HEATMAP_COLORS.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              <div className={cn('w-4 h-4 rounded', item.color)} />
              <span className="text-xs text-white/40">{item.label}</span>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-white/40">
          {t('admin.heatmap.patientsPerSlot', 'Patienten pro Zeitslot')}
        </div>
      </div>

      {/* Peak Times */}
      {peakTimes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm font-medium text-white/60 mb-2">
            {t('admin.heatmap.peakTimes', 'Stosszeiten')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {peakTimes.map((peak, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-medium"
              >
                {peak.day} {formatHour(peak.hour)} ({peak.value})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Kompakte Heatmap-Variante fuer Dashboard-Overview
 */
export const CompactHeatmap: React.FC<{
  data: HeatmapDataPoint[];
  className?: string;
}> = ({ data, className }) => {
  // Nur aktuelle Stunde +/- 2 Stunden
  const currentHour = new Date().getHours();
  const relevantHours = [
    Math.max(8, currentHour - 2),
    Math.max(8, currentHour - 1),
    currentHour,
    Math.min(19, currentHour + 1),
    Math.min(19, currentHour + 2),
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className={cn('space-y-1', className)}>
      {relevantHours.map((hour) => {
        const todayData = data.filter(d => d.hour === hour);
        const totalValue = todayData.reduce((sum, d) => sum + d.value, 0);
        const colorClass = getHeatmapColor(totalValue);
        
        return (
          <div key={hour} className="flex items-center gap-2">
            <span className="text-xs text-white/40 w-10">{formatHour(hour)}</span>
            <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', colorClass)}
                style={{ width: `${Math.min(100, (totalValue / 20) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-white/60 w-6 text-right">{totalValue}</span>
          </div>
        );
      })}
    </div>
  );
};
