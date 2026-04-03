import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { RadioInput } from './inputs/RadioInput';
import { Button } from './ui/Button';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Appointment {
  id: string;
  date: string;
  time: string;
  reason: string;
  status: 'SCHEDULED' | 'REQUESTED';
}

interface CancellationConfirmModalProps {
  open: boolean;
  onClose: () => void;
  appointments: Appointment[];
  onConfirmCancel: (appointmentId: string) => void;
  isLoading?: boolean;
}

type ConfirmStep = 'certainty' | 'review' | 'filtering';

/**
 * CancellationConfirmModal
 * 
 * Two-step confirmation flow for appointment cancellation:
 * 1. Certainty Check: "100% Sure" or "Not Sure (need help)"
 * 2a. If 100% Sure: Show exact appointment for review & confirmation
 * 2b. If Not Sure: Show filtered similar appointments (±2 days, same reason)
 * 
 * Features:
 * - Intelligent filtering of similar appointments
 * - Clear visual distinction between certainty states
 * - Smooth step navigation
 */
export const CancellationConfirmModal: React.FC<CancellationConfirmModalProps> = ({
  open,
  onClose,
  appointments,
  onConfirmCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<ConfirmStep>('certainty');
  const [certainty, setCertainty] = useState<'certain' | 'unsure' | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Reset state when modal closes
  const handleClose = () => {
    setStep('certainty');
    setCertainty(null);
    setSelectedAppointmentId(null);
    onClose();
  };

  // Filter similar appointments (±2 days, same reason)
  const filteredAppointments = useMemo(() => {
    if (!selectedAppointmentId || certainty !== 'unsure') return [];
    
    const selected = appointments.find(a => a.id === selectedAppointmentId);
    if (!selected) return [];

    const selectedDate = new Date(selected.date);
    return appointments
      .filter(apt => {
        const aptDate = new Date(apt.date);
        const dayDiff = Math.abs((aptDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
        return dayDiff <= 2 && apt.reason === selected.reason && apt.id !== selected.id;
      })
      .sort((a, b) => {
        // Score by proximity to selected date
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);
        return Math.abs(aDate.getTime() - selectedDate.getTime()) - 
               Math.abs(bDate.getTime() - selectedDate.getTime());
      });
  }, [selectedAppointmentId, certainty, appointments]);

  const handleCertaintySelect = (value: string) => {
    if (value === 'certain' || value === 'unsure') {
      setCertainty(value as typeof certainty);
      if (value === 'certain') {
        setStep('review');
      } else {
        setStep('filtering');
      }
    }
  };

  const handleConfirmCancellation = () => {
    if (selectedAppointmentId) {
      onConfirmCancel(selectedAppointmentId);
      handleClose();
    }
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date) + ` um ${timeStr}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: CERTAINTY CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (step === 'certainty') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        size="md"
        showCloseButton={true}
        trapFocus={true}
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {t('cancellation.stepTitle', 'Termin absagen')}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t('cancellation.uncertaintyQuestion', 'Wie sicher sind Sie, dass Sie diesen Termin absagen möchten?')}
            </p>
          </div>

          <RadioInput
            value={certainty || undefined}
            onChange={handleCertaintySelect}
            options={[
              {
                value: 'certain',
                label: t('cancellation.optionSure', '✅ 100% sicher — Termin absagen')
              },
              {
                value: 'unsure',
                label: t('cancellation.optionUnsure', '❓ Nicht sicher — Ich brauche Hilfe')
              }
            ]}
            className="gap-3"
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('common.cancel', 'Abbrechen')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2a: REVIEW (100% SURE)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 'review' && certainty === 'certain') {
    const appointmentToCancel = appointments[0]; // In real app, would be user-selected
    
    return (
      <Modal
        open={open}
        onClose={handleClose}
        size="md"
        showCloseButton={true}
        trapFocus={true}
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {t('cancellation.confirmTitle', 'Termin absagen?')}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t('cancellation.willBeCanceled', 'Dieser Termin wird gelöscht:')}
            </p>
          </div>

          {appointmentToCancel && (
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[var(--text-primary)]">
                    {formatDateTime(appointmentToCancel.date, appointmentToCancel.time)}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {appointmentToCancel.reason}
                  </p>
                  <p className="text-xs mt-2">
                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 font-bold">
                      Status: {appointmentToCancel.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400/80">
              {t('cancellation.warningText', 'Diese Aktion kann nicht rückgängig gemacht werden. Der Termin wird sofort aus Ihrem Kalender entfernt.')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep('certainty')}
              disabled={isLoading}
            >
              {t('common.back', 'Zurück')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancellation}
              disabled={isLoading}
              isLoading={isLoading}
            >
              {t('cancellation.confirmButton', 'Termin absagen')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2b: FILTERING (NOT SURE)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 'filtering' && certainty === 'unsure') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        showCloseButton={true}
        trapFocus={true}
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {t('cancellation.filterTitle', 'Ähnliche Termine')}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t('cancellation.filterDesc', 'Hier sind andere Termine für dieselbe Anfrage in den nächsten 2 Tagen:')}
            </p>
          </div>

          {filteredAppointments.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredAppointments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => setSelectedAppointmentId(apt.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAppointmentId === apt.id
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-[var(--border-primary)] hover:border-blue-400/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${
                        selectedAppointmentId === apt.id ? 'text-blue-400' : 'text-[var(--text-muted)]'
                      }`} />
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">
                          {formatDateTime(apt.date, apt.time)}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {apt.reason}
                        </p>
                      </div>
                    </div>
                    {selectedAppointmentId === apt.id && (
                      <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 text-center">
              <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                {t('cancellation.noSimilarFound', 'Keine ähnlichen Termine gefunden.')}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep('certainty')}
              disabled={isLoading}
            >
              {t('common.back', 'Zurück')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancellation}
              disabled={!selectedAppointmentId || isLoading}
              isLoading={isLoading}
            >
              {t('cancellation.confirmButton', 'Termin absagen')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
};
