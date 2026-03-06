import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Plus, Trash2, Loader2, BarChart2 } from 'lucide-react';
import { usePwaReminders, usePwaReminderAdherence, usePwaReminderCreate, usePwaReminderToggle, usePwaReminderDelete } from '../../hooks/useApi';

const SCHEDULE_PRESETS = [
  { label: 'Morgens 8:00', cron: '0 8 * * *' },
  { label: 'Mittags 12:00', cron: '0 12 * * *' },
  { label: 'Abends 18:00', cron: '0 18 * * *' },
  { label: 'Nachts 22:00', cron: '0 22 * * *' },
];

export default function PwaReminderConfig() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [form, setForm] = useState({ medicationId: '', scheduleLabel: SCHEDULE_PRESETS[0].label, scheduleCron: SCHEDULE_PRESETS[0].cron, pushEnabled: true, pushTitle: '', pushBody: '' });

  const { data: reminders, isLoading } = usePwaReminders();
  const { data: adherence } = usePwaReminderAdherence();
  const createMutation = usePwaReminderCreate();
  const toggleMutation = usePwaReminderToggle();
  const deleteMutation = usePwaReminderDelete();

  function handleCreate() {
    if (!form.medicationId) return;
    createMutation.mutate(
      { ...form, pushTitle: form.pushTitle || undefined, pushBody: form.pushBody || undefined },
      { onSuccess: () => { setShowCreate(false); setForm({ medicationId: '', scheduleLabel: SCHEDULE_PRESETS[0].label, scheduleCron: SCHEDULE_PRESETS[0].cron, pushEnabled: true, pushTitle: '', pushBody: '' }); } }
    );
  }

  function selectPreset(preset: typeof SCHEDULE_PRESETS[0]) {
    setForm(f => ({ ...f, scheduleLabel: preset.label, scheduleCron: preset.cron }));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pwa/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Medikamenten-Erinnerungen</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowStats(!showStats)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <BarChart2 className="w-5 h-5 text-gray-500" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Adherence stats */}
      {showStats && adherence && (
        <div className="m-4 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3 text-sm">Einnahme-Statistik (letzte 30 Tage)</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Genommen', value: (adherence as any).taken ?? 0, color: 'text-green-600' },
              { label: 'Übersprungen', value: (adherence as any).skipped ?? 0, color: 'text-yellow-600' },
              { label: 'Verpasst', value: (adherence as any).missed ?? 0, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {(adherence as any).adherenceRate != null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Einnahmequote</span>
                <span>{Math.round((adherence as any).adherenceRate * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: `${Math.round((adherence as any).adherenceRate * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (reminders as any[])?.length ? (
          (reminders as any[]).map((r: any) => (
            <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.medication?.name ?? 'Medikament'}</p>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Bell className="w-3.5 h-3.5" />
                    <span>{r.scheduleLabel}</span>
                  </div>
                  {r.pushTitle && <p className="text-xs text-gray-400">"{r.pushTitle}"</p>}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button onClick={() => toggleMutation.mutate({ id: r.id, active: !r.isActive })}
                    disabled={toggleMutation.isPending}
                    className={`p-2 rounded-lg transition-colors ${r.isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                    {r.isActive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Keine Erinnerungen eingerichtet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-blue-600 text-sm font-medium">
              Erste Erinnerung erstellen
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Neue Erinnerung</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Medikament-ID</label>
              <input type="text" value={form.medicationId} onChange={e => setForm(f => ({ ...f, medicationId: e.target.value }))}
                placeholder="z.B. medication-uuid"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zeitplan</label>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_PRESETS.map(p => (
                  <button key={p.cron} onClick={() => selectPreset(p)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.scheduleCron === p.cron ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Push-Benachrichtigung</p>
                <p className="text-xs text-gray-400">Erinnerung als Notification senden</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, pushEnabled: !f.pushEnabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${form.pushEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.pushEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {form.pushEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Titel (optional)</label>
                  <input type="text" value={form.pushTitle} onChange={e => setForm(f => ({ ...f, pushTitle: e.target.value }))}
                    placeholder="Medikament einnehmen"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nachricht (optional)</label>
                  <input type="text" value={form.pushBody} onChange={e => setForm(f => ({ ...f, pushBody: e.target.value }))}
                    placeholder="Bitte Medikament jetzt einnehmen"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm" />
                </div>
              </>
            )}

            <button onClick={handleCreate} disabled={!form.medicationId || createMutation.isPending}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Erinnerung erstellen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
