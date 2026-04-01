/**
 * PriorityList Component
 * 
 * Priorisierte Patientenliste fuer das Arzt-Dashboard.
 * Sortierung: CRITICAL > WARNING > Wartezeit
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, User, ChevronRight } from 'lucide-react';
import { useDashboardStore, selectSelectedPatient } from '../../../store/dashboardStore';
import { ClinicalTags } from './ClinicalTags';
import { cn } from '../../../lib/utils';
import type { PatientQueueItem, TriageLevel } from '../../../types/dashboard';

interface PriorityListProps {
  patients: PatientQueueItem[];
  onSelectPatient: (patient: PatientQueueItem) => void;
  className?: string;
}

/**
 * Berechnet den Prioritaets-Score fuer Sortierung
 * Hoeherer Score = hoehere Prioritaet
 */
function calculatePriorityScore(patient: PatientQueueItem): number {
  let score = 0;

  // Triage-Level (hoechste Gewichtung)
  if (patient.triageLevel === 'CRITICAL') score += 1000;
  else if (patient.triageLevel === 'WARNING') score += 500;

  // Wartezeit (je laenger, desto hoeher)
  score += Math.min(patient.waitTimeMinutes, 120);

  // Kritische Flags
  score += patient.criticalFlags.length * 50;

  // Red Flags
  if (patient.quickInfo.hasRedFlags) score += 100;

  return score;
}

/**
 * Gruppiert Patienten nach Prioritaet
 */
function groupByPriority(patients: PatientQueueItem[]): {
  critical: PatientQueueItem[];
  warning: PatientQueueItem[];
  normal: PatientQueueItem[];
} {
  return {
    critical: patients
      .filter(p => p.triageLevel === 'CRITICAL')
      .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)),
    warning: patients
      .filter(p => p.triageLevel === 'WARNING')
      .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)),
    normal: patients
      .filter(p => p.triageLevel === 'NORMAL')
      .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a)),
  };
}

export const PriorityList: React.FC<PriorityListProps> = ({
  patients,
  onSelectPatient,
  className,
}) => {
  const { t } = useTranslation();
  const selectedPatientId = useDashboardStore(state => state.selectedPatientId);

  // Nur aktive Patienten (nicht abgeschlossen/abgebrochen)
  const activePatients = useMemo(() =>
    patients.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'),
    [patients]
  );

  // Gruppiert nach Prioritaet
  const { critical, warning, normal } = useMemo(() =>
    groupByPriority(activePatients),
    [activePatients]
  );

  const hasAnyPatients = critical.length > 0 || warning.length > 0 || normal.length > 0;

  if (!hasAnyPatients) {
    return (
      <div className={cn('bg-white/5 border border-white/10 rounded-xl p-8 text-center', className)}>
        <User className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40">{t('arzt.noPatientsWaiting', 'Keine Patienten warten')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Kritische Patienten */}
      {critical.length > 0 && (
        <PriorityGroup
          title={t('arzt.criticalPatients', 'Kritisch')}
          count={critical.length}
          color="red"
          patients={critical}
          selectedId={selectedPatientId}
          onSelect={onSelectPatient}
        />
      )}

      {/* Warnungen */}
      {warning.length > 0 && (
        <PriorityGroup
          title={t('arzt.warningPatients', 'Warnung')}
          count={warning.length}
          color="amber"
          patients={warning}
          selectedId={selectedPatientId}
          onSelect={onSelectPatient}
        />
      )}

      {/* Normale Patienten */}
      {normal.length > 0 && (
        <PriorityGroup
          title={t('arzt.normalPatients', 'Standard')}
          count={normal.length}
          color="emerald"
          patients={normal}
          selectedId={selectedPatientId}
          onSelect={onSelectPatient}
        />
      )}
    </div>
  );
};

/**
 * Gruppe von Patienten mit gleicher Prioritaet
 */
const PriorityGroup: React.FC<{
  title: string;
  count: number;
  color: 'red' | 'amber' | 'emerald';
  patients: PatientQueueItem[];
  selectedId: string | null;
  onSelect: (patient: PatientQueueItem) => void;
}> = ({ title, count, color, patients, selectedId, onSelect }) => {
  const colorClasses = {
    red: {
      header: 'bg-red-500/10 border-red-500/30',
      badge: 'bg-red-500/30 text-red-400',
      selected: 'ring-2 ring-red-500/50 bg-red-500/10',
    },
    amber: {
      header: 'bg-amber-500/10 border-amber-500/30',
      badge: 'bg-amber-500/30 text-amber-400',
      selected: 'ring-2 ring-amber-500/50 bg-amber-500/10',
    },
    emerald: {
      header: 'bg-emerald-500/10 border-emerald-500/30',
      badge: 'bg-emerald-500/30 text-emerald-400',
      selected: 'ring-2 ring-emerald-500/50 bg-emerald-500/10',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg border',
        colors.header
      )}>
        <div className="flex items-center gap-2">
          {color === 'red' && <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span className="font-semibold text-white">{title}</span>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', colors.badge)}>
          {count}
        </span>
      </div>

      {/* Patienten */}
      <div className="space-y-2">
        {patients.map(patient => (
          <PriorityListItem
            key={patient.id}
            patient={patient}
            isSelected={selectedId === patient.id}
            onClick={() => onSelect(patient)}
            selectedClassName={colors.selected}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Einzelner Patient in der Prioritaetsliste
 */
const PriorityListItem: React.FC<{
  patient: PatientQueueItem;
  isSelected: boolean;
  onClick: () => void;
  selectedClassName: string;
}> = ({ patient, isSelected, onClick, selectedClassName }) => {
  const getWaitTimeColor = (minutes: number) => {
    if (minutes < 15) return 'text-emerald-400';
    if (minutes < 30) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
        'bg-white/5 border-white/10 hover:bg-white/[0.07]',
        'transition-all duration-200',
        isSelected && selectedClassName,
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-white font-semibold text-sm shrink-0">
        {patient.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-white truncate">
            {patient.patientName}
          </h4>
          {patient.triageLevel === 'CRITICAL' && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-white/50 truncate">
          {patient.service}
        </p>
        <ClinicalTags patient={patient} compact />
      </div>

      {/* Wartezeit */}
      <div className="text-right shrink-0">
        <div className={cn('flex items-center gap-1', getWaitTimeColor(patient.waitTimeMinutes))}>
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm font-semibold">
            {patient.waitTimeMinutes}m
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20 ml-auto mt-1" />
      </div>
    </div>
  );
};
