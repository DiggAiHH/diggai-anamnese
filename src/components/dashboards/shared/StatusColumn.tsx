/**
 * StatusColumn Component
 * 
 * Kanban-Spalte fuer einen bestimmten Queue-Status.
 * Unterstuetzt Drag & Drop via @dnd-kit.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '../../../lib/utils';
import type { QueueStatus, PatientQueueItem } from '../../../types/dashboard';

interface StatusColumnProps {
  status: QueueStatus;
  title: string;
  patients: PatientQueueItem[];
  color: string;
  // onDrop wird über DnD-Context gehandhabt
  renderPatient: (patient: PatientQueueItem) => React.ReactNode;
  className?: string;
}

// Konfiguration fuer Status-Farben
const STATUS_COLORS: Record<QueueStatus, { bg: string; border: string; text: string }> = {
  PENDING: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
  },
  IN_ANAMNESE: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  READY_FOR_DOCTOR: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  IN_TREATMENT: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  CANCELLED: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
};

export const StatusColumn: React.FC<StatusColumnProps> = ({
  status,
  title,
  patients,
  renderPatient,
  className,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { status },
  });

  const colors = STATUS_COLORS[status];
  const count = patients.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[400px] rounded-xl border backdrop-blur-sm',
        'bg-white/5 border-white/10',
        isOver && 'ring-2 ring-purple-500/50 bg-purple-500/5',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b rounded-t-xl',
          colors.bg,
          colors.border
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className={cn('font-semibold text-sm', colors.text)}>
            {title}
          </h3>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              'bg-white/10 text-white/70'
            )}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Patienten-Liste */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
        <SortableContext
          items={patients.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {patients.length === 0 ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center h-32',
                'text-white/30 text-sm',
                'border-2 border-dashed border-white/10 rounded-lg'
              )}
            >
              <span>Keine Patienten</span>
              <span className="text-xs mt-1">
                Ziehen Sie Patienten hierher
              </span>
            </div>
          ) : (
            patients.map((patient) => (
              <div key={patient.id}>{renderPatient(patient)}</div>
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

/**
 * Statistik fuer eine Spalte
 */
export const ColumnStats: React.FC<{
  patients: PatientQueueItem[];
  className?: string;
}> = ({ patients, className }) => {
  const avgWaitTime = patients.length > 0
    ? Math.floor(patients.reduce((sum, p) => sum + p.waitTimeMinutes, 0) / patients.length)
    : 0;

  const criticalCount = patients.filter((p) => p.triageLevel === 'CRITICAL').length;

  return (
    <div className={cn('flex items-center gap-3 text-xs text-white/40', className)}>
      {avgWaitTime > 0 && (
        <span>
          O: {avgWaitTime} Min
        </span>
      )}
      {criticalCount > 0 && (
        <span className="text-red-400">
          {criticalCount} Kritisch
        </span>
      )}
    </div>
  );
};
