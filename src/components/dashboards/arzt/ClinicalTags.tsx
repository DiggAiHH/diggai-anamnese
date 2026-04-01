/**
 * ClinicalTags Component
 * 
 * Zeigt klinische Informationen als farbcodierte Tags an.
 * 3-Sekunden-Erfassbarkeit durch klare visuelle Hierarchie.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, 
  Pill, 
  Activity, 
  Heart, 
  Stethoscope,
  Clock,
  Flame
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { PatientQueueItem, CriticalFlag } from '../../../types/dashboard';

interface ClinicalTagsProps {
  patient: PatientQueueItem;
  compact?: boolean;
  className?: string;
}

interface TagConfig {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  priority: number;
}

/**
 * Generiert Tag-Konfigurationen basierend auf Patientendaten
 */
function generateTags(patient: PatientQueueItem): Array<{ config: TagConfig; items: string[] }> {
  const tags: Array<{ config: TagConfig; items: string[] }> = [];

  // Allergien (Höchste Priorität)
  if (patient.quickInfo.allergies.length > 0 || patient.criticalFlags.some(f => f.type === 'ALLERGY')) {
    tags.push({
      config: {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: 'Allergien',
        color: 'text-red-400',
        bgColor: 'bg-red-500/15 border-red-500/30',
        priority: 100,
      },
      items: [
        ...patient.quickInfo.allergies,
        ...patient.criticalFlags.filter(f => f.type === 'ALLERGY').map(f => f.description)
      ],
    });
  }

  // Chronische Erkrankungen
  if (patient.quickInfo.chronicConditions.length > 0) {
    tags.push({
      config: {
        icon: <Activity className="w-3.5 h-3.5" />,
        label: 'Chronisch',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/15 border-amber-500/30',
        priority: 80,
      },
      items: patient.quickInfo.chronicConditions,
    });
  }

  // Medikamente
  if (patient.quickInfo.currentMedications.length > 0) {
    tags.push({
      config: {
        icon: <Pill className="w-3.5 h-3.5" />,
        label: 'Medikamente',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/15 border-blue-500/30',
        priority: 60,
      },
      items: patient.quickInfo.currentMedications,
    });
  }

  // Risikofaktoren
  if (patient.triageLevel === 'CRITICAL' || patient.triageLevel === 'WARNING') {
    tags.push({
      config: {
        icon: <Flame className="w-3.5 h-3.5" />,
        label: 'Risiko',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/15 border-rose-500/30',
        priority: 90,
      },
      items: patient.triageLevel === 'CRITICAL' ? ['Kritisch'] : ['Warnung'],
    });
  }

  // Lange Wartezeit
  if (patient.waitTimeMinutes > 30) {
    tags.push({
      config: {
        icon: <Clock className="w-3.5 h-3.5" />,
        label: 'Wartezeit',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/15 border-orange-500/30',
        priority: 40,
      },
      items: [`${patient.waitTimeMinutes} Min`],
    });
  }

  // Sortieren nach Priorität
  tags.sort((a, b) => b.config.priority - a.config.priority);

  return tags;
}

export const ClinicalTags: React.FC<ClinicalTagsProps> = ({ 
  patient, 
  compact = false,
  className 
}) => {
  const { t } = useTranslation();
  const tags = generateTags(patient);

  if (tags.length === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-emerald-400', className)}>
        <Stethoscope className="w-4 h-4" />
        <span>{t('arzt.noSpecialFindings', 'Keine besonderen Befunde')}</span>
      </div>
    );
  }

  if (compact) {
    // Kompakte Ansicht: Nur Icons mit Tooltips
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {tags.map(({ config, items }, _index) => (
          <div
            key={config.label}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md border',
              config.bgColor,
              config.color
            )}
            title={`${config.label}: ${items.join(', ')}`}
          >
            {config.icon}
            <span className="text-xs font-medium">{items.length}</span>
          </div>
        ))}
      </div>
    );
  }

  // Vollständige Ansicht
  return (
    <div className={cn('space-y-2', className)}>
      {tags.map(({ config, items }) => (
        <div
          key={config.label}
          className={cn(
            'flex items-start gap-2 p-2 rounded-lg border',
            config.bgColor
          )}
        >
          <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
          <div className="flex-1 min-w-0">
            <span className={cn('text-xs font-semibold uppercase tracking-wider', config.color)}>
              {config.label}
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="text-xs text-white/80 bg-black/20 px-1.5 py-0.5 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Einzelnes klinisches Tag
 */
export const ClinicalTag: React.FC<{
  flag: CriticalFlag;
  className?: string;
}> = ({ flag, className }) => {
  const severityColors = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/40',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  };

  const typeIcons = {
    ALLERGY: <AlertTriangle className="w-3 h-3" />,
    CHRONIC: <Activity className="w-3 h-3" />,
    MEDICATION: <Pill className="w-3 h-3" />,
    SURGICAL: <Heart className="w-3 h-3" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium',
        severityColors[flag.severity],
        className
      )}
    >
      {typeIcons[flag.type]}
      <span className="truncate">{flag.description}</span>
    </span>
  );
};
