/**
 * PatientCard Component
 * 
 * Zeigt Patienteninformationen in einer Karte an.
 * Unterstützt Privacy-Modus (abgekürzte Namen) und Drag & Drop.
 */

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Clock, User, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatDistanceToNow } from '../../../lib/dateUtils';
import { TriageBadge, TriageDot } from './TriageBadge';
import type { PatientQueueItem, QueueStatus } from '../../../types/dashboard';

interface PatientCardProps {
  patient: PatientQueueItem;
  viewMode?: 'full' | 'privacy' | 'compact';
  onClick?: (patient: PatientQueueItem) => void;
  showDragHandle?: boolean;
  isDragging?: boolean;
  className?: string;
}

// Hilfsfunktion für Wartezeit-Farbe
function getWaitTimeColor(minutes: number): string {
  if (minutes < 15) return 'text-emerald-400';
  if (minutes < 30) return 'text-amber-400';
  return 'text-red-400';
}

// Hilfsfunktion für Avatar-Initialen
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  viewMode = 'privacy',
  onClick,
  showDragHandle = true,
  isDragging = false,
  className,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: patient.id,
    data: { patient },
    disabled: !showDragHandle,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Name basierend auf ViewMode
  const displayName = viewMode === 'full' || isRevealed
    ? patient.patientName
    : patient.displayName;

  const isCompact = viewMode === 'compact';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white/5 border border-white/10 rounded-xl p-3',
        'hover:bg-white/[0.07] hover:border-white/20',
        'transition-all duration-200 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
        isDragging && 'opacity-50 scale-105 shadow-xl z-50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={() => onClick?.(patient)}
      {...attributes}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(patient)}
      aria-label={`Patient ${displayName}, Status ${patient.status}`}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div
          {...listeners}
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded',
            'text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
          aria-label="Verschieben"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className={cn('flex items-start gap-3', showDragHandle && 'pl-5')}>
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-purple-500/30 to-blue-500/30',
              'border border-white/10 text-white font-semibold text-sm'
            )}
          >
            {getInitials(patient.patientName)}
          </div>
          {patient.triageLevel === 'CRITICAL' && (
            <div className="absolute -top-1 -right-1">
              <TriageDot level="CRITICAL" size="sm" pulse />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name & Triage */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={cn(
                'font-semibold text-white truncate',
                viewMode === 'privacy' && !isRevealed && 'blur-sm select-none',
                'transition-all duration-200'
              )}
              onMouseEnter={() => viewMode === 'privacy' && setIsRevealed(true)}
              onMouseLeave={() => viewMode === 'privacy' && setIsRevealed(false)}
              title={viewMode === 'privacy' ? 'Hover für vollständigen Namen' : undefined}
            >
              {displayName}
            </h4>
            {!isCompact && (
              <TriageBadge
                level={patient.triageLevel}
                size="sm"
                pulse={patient.triageLevel === 'CRITICAL'}
                showLabel={false}
              />
            )}
          </div>

          {/* Service & Wartezeit */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-white/50 truncate">
              {patient.service}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3 text-white/30" />
              <span className={getWaitTimeColor(patient.waitTimeMinutes)}>
                {patient.waitTimeMinutes} Min
              </span>
            </span>
          </div>

          {/* Critical Flags (nur in full Mode) */}
          {viewMode === 'full' && patient.criticalFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {patient.criticalFlags.slice(0, 2).map((flag) => (
                <span
                  key={flag.id}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    flag.severity === 'HIGH'
                      ? 'bg-red-500/20 text-red-400'
                      : flag.severity === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  )}
                >
                  {flag.description}
                </span>
              ))}
              {patient.criticalFlags.length > 2 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] text-white/40">
                  +{patient.criticalFlags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Zugewiesener Arzt */}
          {patient.assignedDoctorName && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-white/40">
              <User className="w-3 h-3" />
              <span>{patient.assignedDoctorName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Kompakte Patientenkarte für Listen-Ansicht
 */
export const PatientListItem: React.FC<{
  patient: PatientQueueItem;
  viewMode?: 'full' | 'privacy';
  onClick?: (patient: PatientQueueItem) => void;
  selected?: boolean;
  className?: string;
}> = ({ patient, viewMode = 'privacy', onClick, selected = false, className }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  const displayName = viewMode === 'full' || isRevealed
    ? patient.patientName
    : patient.displayName;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
        'transition-all duration-200',
        selected
          ? 'bg-purple-500/20 border-purple-500/50'
          : 'bg-white/5 border-white/10 hover:bg-white/[0.07]',
        className
      )}
      onClick={() => onClick?.(patient)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(patient)}
    >
      {/* Triage-Indikator */}
      <TriageDot
        level={patient.triageLevel}
        size="sm"
        pulse={patient.triageLevel === 'CRITICAL'}
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'font-medium text-white truncate block',
            viewMode === 'privacy' && !isRevealed && 'blur-sm select-none'
          )}
          onMouseEnter={() => viewMode === 'privacy' && setIsRevealed(true)}
          onMouseLeave={() => viewMode === 'privacy' && setIsRevealed(false)}
        >
          {displayName}
        </span>
        <span className="text-xs text-white/40 truncate block">
          {patient.service}
        </span>
      </div>

      {/* Wartezeit */}
      <div className="text-right">
        <span
          className={cn(
            'text-sm font-semibold',
            getWaitTimeColor(patient.waitTimeMinutes)
          )}
        >
          {patient.waitTimeMinutes}m
        </span>
      </div>
    </div>
  );
};
