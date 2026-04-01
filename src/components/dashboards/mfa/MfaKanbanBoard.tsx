/**
 * MfaKanbanBoard Component
 * 
 * Live-Kanban-Board fuer MFA-Dashboard.
 * Zeigt Patienten in Spalten entsprechend ihrem Status.
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { useDashboardStore, selectQueueItemsByStatus } from '../../../store/dashboardStore';
import { useRealtimeQueue } from '../../../hooks/useDashboard/useRealtimeQueue';
import { StatusColumn } from '../shared/StatusColumn';
import { PatientCard } from '../shared/PatientCard';
import type { QueueStatus, PatientQueueItem } from '../../../types/dashboard';
import { cn } from '../../../lib/utils';

// Spalten-Konfiguration
const COLUMNS: { status: QueueStatus; title: string; color: string }[] = [
  { status: 'PENDING', title: 'Ausstehend', color: 'bg-gray-500' },
  { status: 'IN_ANAMNESE', title: 'In Anamnese', color: 'bg-blue-500' },
  { status: 'READY_FOR_DOCTOR', title: 'Bereit fuer Arzt', color: 'bg-purple-500' },
  { status: 'IN_TREATMENT', title: 'In Behandlung', color: 'bg-amber-500' },
  { status: 'COMPLETED', title: 'Behandelt', color: 'bg-emerald-500' },
];

interface MfaKanbanBoardProps {
  className?: string;
}

export const MfaKanbanBoard: React.FC<MfaKanbanBoardProps> = ({ className }) => {
  const { t } = useTranslation();
  const { movePatient, isLoading } = useRealtimeQueue();
  const selectPatient = useDashboardStore((state) => state.selectPatient);
  const itemsByStatus = useDashboardStore(selectQueueItemsByStatus);
  
  // State fuer Drag & Drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePatient, setActivePatient] = useState<PatientQueueItem | null>(null);

  // Sensoren fuer Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mindestbewegung bevor Drag startet
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag Start Handler
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Patient aus allen Spalten finden
    const patient = Object.values(itemsByStatus)
      .flat()
      .find((p) => p.id === active.id);
    
    if (patient) {
      setActivePatient(patient);
    }
  }, [itemsByStatus]);

  // Drag End Handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActivePatient(null);
    
    if (!over) return;
    
    const patientId = active.id as string;
    const newStatus = over.id as QueueStatus;
    
    // Pruefen, ob sich der Status geaendert hat
    const patient = Object.values(itemsByStatus)
      .flat()
      .find((p) => p.id === patientId);
    
    if (patient && patient.status !== newStatus) {
      try {
        await movePatient(patientId, newStatus);
      } catch (error) {
        console.error('Failed to move patient:', error);
        // Fehler wird bereits im Store behandelt
      }
    }
  }, [itemsByStatus, movePatient]);

  // Patient auswaehlen
  const handlePatientClick = useCallback((patient: PatientQueueItem) => {
    selectPatient(patient.id);
  }, [selectPatient]);

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-full min-h-[500px]',
          className
        )}
      >
        {COLUMNS.map((column) => (
          <StatusColumn
            key={column.status}
            status={column.status}
            title={column.title}
            patients={itemsByStatus[column.status]}
            color={column.color}
            renderPatient={(patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                viewMode="privacy"
                onClick={handlePatientClick}
                showDragHandle={true}
                isDragging={activeId === patient.id}
              />
            )}
          />
        ))}
      </div>

      {/* Drag Overlay fuer visuelles Feedback */}
      <DragOverlay>
        {activePatient ? (
          <PatientCard
            patient={activePatient}
            viewMode="privacy"
            isDragging={true}
            className="shadow-2xl scale-105 opacity-90"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
