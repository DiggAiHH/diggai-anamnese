/**
 * AnamneseRadar Component
 * 
 * Radar-Chart fuer die visuelle Zusammenfassung der Anamnese.
 * Zeigt 6 Dimensionen: Allergien, Chronisch, Medikamente, 
 * Vorerkrankungen, Operationen, Risikofaktoren
 */

import React, { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import type { PatientQueueItem } from '../../../types/dashboard';

interface AnamneseRadarProps {
  patient: PatientQueueItem;
  className?: string;
}

interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
  details: string[];
}

/**
 * Berechnet den Radar-Score basierend auf Patientendaten
 */
function calculateRadarData(patient: PatientQueueItem): RadarDataPoint[] {
  const { quickInfo, criticalFlags } = patient;
  
  // Score-Berechnung (0-100)
  // Je höher der Wert, desto relevanter für den Arzt
  
  const allergiesScore = Math.min(
    100,
    quickInfo.allergies.length * 40 + (criticalFlags.some(f => f.type === 'ALLERGY') ? 30 : 0)
  );
  
  const chronicScore = Math.min(
    100,
    quickInfo.chronicConditions.length * 35 + (criticalFlags.some(f => f.type === 'CHRONIC') ? 30 : 0)
  );
  
  const medicationScore = Math.min(
    100,
    quickInfo.currentMedications.length * 25 + (criticalFlags.some(f => f.type === 'MEDICATION') ? 30 : 0)
  );
  
  const historyScore = Math.min(
    100,
    (quickInfo.chronicConditions.length + quickInfo.allergies.length) * 20
  );
  
  const surgicalScore = criticalFlags.some(f => f.type === 'SURGICAL') ? 80 : 
    patient.service.includes('OP') ? 60 : 20;
  
  const riskScore = patient.triageLevel === 'CRITICAL' ? 100 :
    patient.triageLevel === 'WARNING' ? 70 :
    patient.waitTimeMinutes > 30 ? 40 : 20;

  return [
    {
      subject: 'Allergien',
      value: allergiesScore,
      fullMark: 100,
      details: quickInfo.allergies,
    },
    {
      subject: 'Chronisch',
      value: chronicScore,
      fullMark: 100,
      details: quickInfo.chronicConditions,
    },
    {
      subject: 'Medikamente',
      value: medicationScore,
      fullMark: 100,
      details: quickInfo.currentMedications,
    },
    {
      subject: 'Vorgeschichte',
      value: historyScore,
      fullMark: 100,
      details: [...quickInfo.chronicConditions, ...quickInfo.allergies].slice(0, 3),
    },
    {
      subject: 'Operativ',
      value: surgicalScore,
      fullMark: 100,
      details: criticalFlags.filter(f => f.type === 'SURGICAL').map(f => f.description),
    },
    {
      subject: 'Risiko',
      value: riskScore,
      fullMark: 100,
      details: patient.triageLevel === 'CRITICAL' ? ['Kritische Triage'] :
        patient.triageLevel === 'WARNING' ? ['Warnung'] : [],
    },
  ];
}

/**
 * Bestimmt die Farbe basierend auf dem durchschnittlichen Score
 */
function getRadarColor(avgScore: number): { stroke: string; fill: string } {
  if (avgScore >= 70) return { stroke: '#ef4444', fill: '#ef4444' }; // Red
  if (avgScore >= 40) return { stroke: '#f59e0b', fill: '#f59e0b' }; // Amber
  return { stroke: '#10b981', fill: '#10b981' }; // Emerald
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarDataPoint }> }) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-white mb-1">{point.subject}</p>
        <p className="text-sm text-white/70">Score: {point.value}/100</p>
        {point.details.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-xs text-white/50 mb-1">Details:</p>
            {point.details.map((detail, i) => (
              <p key={i} className="text-xs text-white/70">• {detail}</p>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const AnamneseRadar: React.FC<AnamneseRadarProps> = ({ patient, className }) => {
  const { t } = useTranslation();
  
  const data = useMemo(() => calculateRadarData(patient), [patient]);
  const avgScore = useMemo(() => 
    Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length),
    [data]
  );
  const colors = useMemo(() => getRadarColor(avgScore), [avgScore]);

  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          {t('arzt.anamneseSummary', 'Anamnese-Profil')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-bold',
            avgScore >= 70 ? 'text-red-400' :
            avgScore >= 40 ? 'text-amber-400' :
            'text-emerald-400'
          )}>
            {avgScore}/100
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Anamnese"
              dataKey="value"
              stroke={colors.stroke}
              fill={colors.fill}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {data.slice(0, 3).map((item) => (
          <div key={item.subject} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: item.value >= 70 ? '#ef4444' :
                  item.value >= 40 ? '#f59e0b' : '#10b981'
              }}
            />
            <span className="text-white/60 truncate">{item.subject}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
