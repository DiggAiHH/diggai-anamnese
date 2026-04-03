import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { usePwaAppointments, usePwaAppointmentSlots, usePwaAppointmentCreate, usePwaAppointmentCancel } from '../../hooks/usePatientApi';
import { CancellationConfirmModal } from '../../components/CancellationConfirmModal';

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledAt?: string;
  requestedAt?: string;
  requestNotes?: string;
}

interface AppointmentSlot {
  time: string;
  datetime: string;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const SERVICES = [
  { key: 'GENERAL', label: 'Allgemeinmedizin' },
  { key: 'FOLLOWUP', label: 'Kontrolltermin' },
  { key: 'PREVENTIVE', label: 'Vorsorge' },
  { key: 'PRESCRIPTION', label: 'Rezept' },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Bestätigt',
  REQUESTED: 'Angefragt',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Abgesagt',
};

export default function PwaAppointments() {
  const navigate = useNavigate();
  const [showBook, setShowBook] = useState(false);
  const [service, setService] = useState('GENERAL');
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<Appointment | null>(null);

  const { data: appointments, isLoading } = usePwaAppointments();
  const { data: slots, isLoading: slotsLoading } = usePwaAppointmentSlots(date, service);
  const createMutation = usePwaAppointmentCreate();
  const cancelMutation = usePwaAppointmentCancel();

  const appointmentList = asArray<Appointment>(appointments);
  const slotList = asArray<AppointmentSlot>(slots);

  const today = new Date().toISOString().split('T')[0];

  function handleBook() {
    if (!selectedSlot) return;
    createMutation.mutate(
      { service, date: selectedSlot, requestNotes: notes || undefined },
      { onSuccess: () => { setShowBook(false); setSelectedSlot(''); setNotes(''); } }
    );
  }

  function getAppointmentDate(apt: Appointment): string {
    return apt.scheduledAt ?? apt.requestedAt ?? new Date().toISOString();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pwa/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Zurück zum Dashboard"
            title="Zurück zum Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Termine</h1>
        </div>
        <button onClick={() => setShowBook(true)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Neu
        </button>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : appointmentList.length ? (
          appointmentList.map((apt) => (
            <div key={apt.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">
                      {new Date(getAppointmentDate(apt)).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  {apt.scheduledAt && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Clock className="w-4 h-4" />
                      {new Date(apt.scheduledAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{SERVICES.find(s => s.key === apt.type)?.label ?? apt.type}</p>
                  {apt.requestNotes && <p className="text-xs text-gray-400 italic">"{apt.requestNotes}"</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] ?? ''}`}>
                    {STATUS_LABELS[apt.status] ?? apt.status}
                  </span>
                  {apt.status === 'REQUESTED' || apt.status === 'SCHEDULED' ? (
                    <button onClick={() => {
                      setSelectedAppointmentForCancel(apt);
                      setShowCancellationModal(true);
                    }}
                      disabled={cancelMutation.isPending}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <X className="w-3 h-3" /> Absagen
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Keine Termine vorhanden</p>
            <button onClick={() => setShowBook(true)} className="mt-3 text-blue-600 text-sm font-medium">
              Jetzt Termin anfragen
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Termin anfragen</h2>
              <button onClick={() => setShowBook(false)} aria-label="Modal schließen" title="Modal schließen"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Art des Termins</label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(s => (
                  <button key={s.key} onClick={() => setService(s.key)}
                    className={`p-2.5 rounded-xl text-sm font-medium border transition-colors ${service === s.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datum</label>
              <input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setSelectedSlot(''); }} title="Datum auswählen"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm" />
            </div>

            {date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Uhrzeit</label>
                {slotsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                ) : slotList.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {slotList.map((slot) => (
                      <button key={slot.time} onClick={() => setSelectedSlot(slot.datetime)}
                        className={`py-2 rounded-xl text-sm font-medium border transition-colors ${selectedSlot === slot.datetime ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700'}`}>
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">Keine freien Slots</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Anmerkung (optional)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="z.B. Kontrolltermin wegen Bluthochdruck"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm resize-none" />
            </div>

            <button onClick={handleBook} disabled={!selectedSlot || createMutation.isPending}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Termin anfragen
            </button>
          </div>
        </div>
      )}

      <CancellationConfirmModal
        open={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setSelectedAppointmentForCancel(null);
        }}
        appointments={appointmentList.map(apt => ({
          id: apt.id,
          date: (apt.scheduledAt || apt.requestedAt || new Date().toISOString()).split('T')[0],
          time: apt.scheduledAt ? new Date(apt.scheduledAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '',
          reason: SERVICES.find(s => s.key === apt.type)?.label || apt.type,
          status: apt.status as 'SCHEDULED' | 'REQUESTED'
        }))}
        onConfirmCancel={(appointmentId) => {
          cancelMutation.mutate(appointmentId);
          setShowCancellationModal(false);
          setSelectedAppointmentForCancel(null);
        }}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
