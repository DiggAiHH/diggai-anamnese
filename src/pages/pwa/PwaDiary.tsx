import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  Trash2,
  Edit,
  Heart,
  Moon,
  ThermometerSun,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  usePwaDiaryList,
  usePwaDiaryCreate,
  usePwaDiaryUpdate,
  usePwaDiaryDelete,
} from '../../hooks/useApi';

// ── Mood config ──

type MoodKey = 'VERY_GOOD' | 'GOOD' | 'NEUTRAL' | 'BAD' | 'VERY_BAD';

const MOOD_EMOJIS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: 'VERY_GOOD', emoji: '😊', label: 'Sehr gut' },
  { key: 'GOOD', emoji: '🙂', label: 'Gut' },
  { key: 'NEUTRAL', emoji: '😐', label: 'Neutral' },
  { key: 'BAD', emoji: '😕', label: 'Schlecht' },
  { key: 'VERY_BAD', emoji: '😣', label: 'Sehr schlecht' },
];

const MOOD_MAP: Record<string, string> = Object.fromEntries(MOOD_EMOJIS.map((m) => [m.key, m.emoji]));

// ── Empty form ──

interface DiaryForm {
  mood: MoodKey | '';
  painLevel: number;
  sleepQuality: number;
  sleepHours: string;
  symptoms: string[];
  notes: string;
  // vitals
  bloodPressureSys: string;
  bloodPressureDia: string;
  heartRate: string;
  temperature: string;
  weight: string;
}

const EMPTY_FORM: DiaryForm = {
  mood: '',
  painLevel: 0,
  sleepQuality: 5,
  sleepHours: '',
  symptoms: [],
  notes: '',
  bloodPressureSys: '',
  bloodPressureDia: '',
  heartRate: '',
  temperature: '',
  weight: '',
};

const SYMPTOM_PRESETS = [
  'Kopfschmerzen',
  'Übelkeit',
  'Müdigkeit',
  'Schwindel',
  'Rückenschmerzen',
  'Appetitlosigkeit',
  'Schlafstörungen',
  'Atemnot',
];

// ── Component ──

export default function PwaDiary() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const diaryList = usePwaDiaryList({ page, limit });
  const createMutation = usePwaDiaryCreate();
  const updateMutation = usePwaDiaryUpdate();
  const deleteMutation = usePwaDiaryDelete();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DiaryForm>({ ...EMPTY_FORM });
  const [showVitals, setShowVitals] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = diaryList.data as any;
  const entries: Record<string, unknown>[] =
    rawData?.data ?? rawData?.items ?? rawData ?? [];
  const totalPages: number =
    rawData?.totalPages ?? rawData?.meta?.totalPages ?? 1;

  // ── Helpers ──

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setShowVitals(false);
    setSymptomInput('');
    setFormError(null);
    setEditId(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (entry: any) => {
    setEditId(entry.id);
    setForm({
      mood: entry.mood ?? '',
      painLevel: entry.painLevel ?? 0,
      sleepQuality: entry.sleepQuality ?? 5,
      sleepHours: entry.sleepHours?.toString() ?? '',
      symptoms: entry.symptoms ?? [],
      notes: entry.notes ?? '',
      bloodPressureSys: entry.bloodPressureSys?.toString() ?? '',
      bloodPressureDia: entry.bloodPressureDia?.toString() ?? '',
      heartRate: entry.heartRate?.toString() ?? '',
      temperature: entry.temperature?.toString() ?? '',
      weight: entry.weight?.toString() ?? '',
    });
    setShowVitals(false);
    setShowForm(true);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.mood) {
      setFormError('Bitte wählen Sie Ihre Stimmung aus.');
      return;
    }

    const payload: Record<string, unknown> = {
      mood: form.mood,
      painLevel: form.painLevel,
      sleepQuality: form.sleepQuality,
      sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : undefined,
      symptoms: form.symptoms.length > 0 ? form.symptoms : undefined,
      notes: form.notes || undefined,
      bloodPressureSys: form.bloodPressureSys ? parseInt(form.bloodPressureSys, 10) : undefined,
      bloodPressureDia: form.bloodPressureDia ? parseInt(form.bloodPressureDia, 10) : undefined,
      heartRate: form.heartRate ? parseInt(form.heartRate, 10) : undefined,
      temperature: form.temperature ? parseFloat(form.temperature) : undefined,
      weight: form.weight ? parseFloat(form.weight) : undefined,
    };

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowForm(false);
      resetForm();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Speichern fehlgeschlagen.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      /* error handled by react-query */
    }
  };

  const toggleSymptom = (s: string) => {
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(s)
        ? prev.symptoms.filter((x) => x !== s)
        : [...prev.symptoms, s],
    }));
  };

  const addCustomSymptom = () => {
    const trimmed = symptomInput.trim();
    if (trimmed && !form.symptoms.includes(trimmed)) {
      setForm((prev) => ({ ...prev, symptoms: [...prev.symptoms, trimmed] }));
    }
    setSymptomInput('');
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── UI ──

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900">Tagebuch</h1>
          <p className="text-xs text-gray-400 mt-0.5">Ihr tägliches Gesundheitstagebuch</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* ── Inline Form ── */}
        {showForm && (
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                {editId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            {/* Mood picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Stimmung
              </label>
              <div className="flex gap-2 justify-between">
                {MOOD_EMOJIS.map(({ key, emoji, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mood: key }))}
                    className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${
                      form.mood === key
                        ? 'bg-sky-50 ring-2 ring-sky-400 scale-105'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-[10px] text-gray-500">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pain slider */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-400" /> Schmerz ({form.painLevel}/10)
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={form.painLevel}
                onChange={(e) => setForm((f) => ({ ...f, painLevel: parseInt(e.target.value, 10) }))}
                className="w-full accent-red-500"
                aria-label="Schmerzniveau"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Kein Schmerz</span>
                <span>Unerträglich</span>
              </div>
            </div>

            {/* Sleep quality */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Schlafqualität ({form.sleepQuality}/10)
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={form.sleepQuality}
                onChange={(e) => setForm((f) => ({ ...f, sleepQuality: parseInt(e.target.value, 10) }))}
                className="w-full accent-indigo-500"
                aria-label="Schlafqualität"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Sehr schlecht</span>
                <span>Ausgezeichnet</span>
              </div>
            </div>

            {/* Sleep hours */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Schlafstunden
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={24}
                value={form.sleepHours}
                onChange={(e) => setForm((f) => ({ ...f, sleepHours: e.target.value }))}
                placeholder="z. B. 7.5"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Symptoms */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Symptome
              </label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.symptoms.includes(s)
                        ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Custom symptom */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSymptom(); } }}
                  placeholder="Eigenes Symptom…"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addCustomSymptom}
                  className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
              </div>
              {/* Active tags */}
              {form.symptoms.filter((s) => !SYMPTOM_PRESETS.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.symptoms
                    .filter((s) => !SYMPTOM_PRESETS.includes(s))
                    .map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 px-2.5 py-1 text-xs font-medium"
                      >
                        {s}
                        <button type="button" onClick={() => toggleSymptom(s)} className="hover:text-red-500" aria-label={`${s} entfernen`}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Notizen
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Wie fühlen Sie sich heute?"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Vitals accordion */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVitals((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ThermometerSun className="w-3.5 h-3.5" /> Vitalwerte
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showVitals ? 'rotate-180' : ''}`}
                />
              </button>
              {showVitals && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Blutdruck sys</label>
                      <input
                        type="number"
                        value={form.bloodPressureSys}
                        onChange={(e) => setForm((f) => ({ ...f, bloodPressureSys: e.target.value }))}
                        placeholder="120"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Blutdruck dia</label>
                      <input
                        type="number"
                        value={form.bloodPressureDia}
                        onChange={(e) => setForm((f) => ({ ...f, bloodPressureDia: e.target.value }))}
                        placeholder="80"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Puls</label>
                      <input
                        type="number"
                        value={form.heartRate}
                        onChange={(e) => setForm((f) => ({ ...f, heartRate: e.target.value }))}
                        placeholder="72"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Temp. °C</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.temperature}
                        onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))}
                        placeholder="36.5"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400">Gewicht kg</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.weight}
                        onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                        placeholder="70"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Aktualisieren' : 'Speichern'}
            </button>
          </section>
        )}

        {/* ── Entry List ── */}
        {diaryList.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-10 text-center space-y-2">
            <p className="text-sm text-gray-400">Noch keine Einträge vorhanden.</p>
            <p className="text-xs text-gray-300">Tippen Sie auf + um Ihren ersten Eintrag zu erstellen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(Array.isArray(entries) ? entries : []).map((entry: any) => {
              const isExpanded = expandedEntry === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-2xl flex-shrink-0">{MOOD_MAP[entry.mood] ?? '😐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(entry.date ?? entry.createdAt).toLocaleDateString('de-DE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {entry.painLevel != null && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Heart className="w-3 h-3 text-red-300" /> {entry.painLevel}/10
                          </span>
                        )}
                        {entry.sleepHours != null && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Moon className="w-3 h-3 text-indigo-300" /> {entry.sleepHours}h
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Pain bar */}
                    {entry.painLevel != null && (
                      <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden flex-shrink-0" role="progressbar" aria-valuenow={entry.painLevel} aria-valuemin={0} aria-valuemax={10} aria-label="Schmerzniveau">
                        <div
                          className="h-full rounded-full bg-red-400 transition-all"
                          // Width is dynamic per pain level; inline style required
                          style={{ width: `${(entry.painLevel / 10) * 100}%` }}
                        />
                      </div>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3 text-sm animate-in fade-in slide-in-from-top-1">
                      {entry.sleepQuality != null && (
                        <div>
                          <span className="text-xs text-gray-400">Schlafqualität:</span>{' '}
                          <span className="font-medium">{entry.sleepQuality}/10</span>
                        </div>
                      )}
                      {entry.symptoms && entry.symptoms.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Symptome:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.symptoms.map((s: string) => (
                              <span
                                key={s}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.notes && (
                        <div>
                          <span className="text-xs text-gray-400">Notizen:</span>
                          <p className="text-gray-700 mt-0.5">{entry.notes}</p>
                        </div>
                      )}
                      {/* Vitals summary */}
                      {(entry.bloodPressureSys || entry.heartRate || entry.temperature || entry.weight) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {entry.bloodPressureSys && entry.bloodPressureDia && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-400">RR:</span>{' '}
                              <span className="font-medium">
                                {entry.bloodPressureSys}/{entry.bloodPressureDia}
                              </span>
                            </div>
                          )}
                          {entry.heartRate && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-400">Puls:</span>{' '}
                              <span className="font-medium">{entry.heartRate}</span>
                            </div>
                          )}
                          {entry.temperature && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-400">Temp:</span>{' '}
                              <span className="font-medium">{entry.temperature}°C</span>
                            </div>
                          )}
                          {entry.weight && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-400">Gewicht:</span>{' '}
                              <span className="font-medium">{entry.weight} kg</span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Löschen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              aria-label="Vorherige Seite"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500">
              Seite {page} von {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              aria-label="Nächste Seite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* ── FAB ── */}
      {!showForm && (
        <button
          type="button"
          onClick={openNew}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-700 active:scale-95 transition-all flex items-center justify-center z-50"
          aria-label="Neuer Eintrag"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
