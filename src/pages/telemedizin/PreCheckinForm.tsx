// ─── Telemedizin Pre-Checkin Form ───────────────────────────
// Modul 9: Symptom pre-check form filled by patient before
//          a telemedicine appointment.

import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, Clock, AlertTriangle, Pill, Camera,
  ChevronLeft, CheckCircle2, Upload, X, Loader2,
  Shield, Video,
} from 'lucide-react';
import { API_BASE_URL, ensureCsrfToken, getCsrfToken } from '../../api/client';

// ─── Types ───────────────────────────────────────────────────

interface PreCheckinPayload {
  sessionId: string;
  hauptbeschwerden: string;
  symptomDauer: string;
  schweregrad: number;
  vorerkrankungen: string;
  aktuellleMedikamente: string;
  fotoUploadUrls: string[];
}

interface PreCheckinResponse {
  success: boolean;
  checkinId: string;
  message?: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface FormErrors {
  hauptbeschwerden?: string;
  symptomDauer?: string;
  schweregrad?: string;
}

// ─── Constants ────────────────────────────────────────────────

const DAUER_OPTIONS = [
  { value: 'heute', labelKey: 'preCheckin.dauer.heute', labelFallback: 'Heute / Akut' },
  { value: '1-3_tage', labelKey: 'preCheckin.dauer.1_3_tage', labelFallback: '1–3 Tage' },
  { value: '4-7_tage', labelKey: 'preCheckin.dauer.4_7_tage', labelFallback: '4–7 Tage' },
  { value: '1-2_wochen', labelKey: 'preCheckin.dauer.1_2_wochen', labelFallback: '1–2 Wochen' },
  { value: '2-4_wochen', labelKey: 'preCheckin.dauer.2_4_wochen', labelFallback: '2–4 Wochen' },
  { value: 'ueber_1_monat', labelKey: 'preCheckin.dauer.ueber_1_monat', labelFallback: 'Über 1 Monat' },
  { value: 'chronisch', labelKey: 'preCheckin.dauer.chronisch', labelFallback: 'Chronisch / Dauerhaft' },
];

const SCHWEREGRAD_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Kaum spürbar', color: 'text-green-600' },
  2: { text: 'Sehr leicht', color: 'text-green-500' },
  3: { text: 'Leicht', color: 'text-lime-600' },
  4: { text: 'Mäßig', color: 'text-yellow-600' },
  5: { text: 'Mittel', color: 'text-amber-500' },
  6: { text: 'Deutlich', color: 'text-orange-500' },
  7: { text: 'Stark', color: 'text-orange-600' },
  8: { text: 'Sehr stark', color: 'text-red-500' },
  9: { text: 'Schwer', color: 'text-red-600' },
  10: { text: 'Unerträglich', color: 'text-red-700' },
};

// ─── Helper: submit to backend (or demo fallback) ─────────────

async function submitPreCheckin(payload: PreCheckinPayload): Promise<PreCheckinResponse> {
  let csrfToken = getCsrfToken();
  if (!csrfToken) {
    csrfToken = await ensureCsrfToken();
  }

  const res = await fetch(`${API_BASE_URL}/telemedizin/session/pre-checkin`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-xsrf-token': csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<PreCheckinResponse>;
}

// ─── Success State ────────────────────────────────────────────

function SuccessScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-sm border border-gray-100">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {t('preCheckin.success.title', 'Angaben erfolgreich übermittelt')}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {t(
              'preCheckin.success.subtitle',
              'Ihr Arzt kann Ihre Symptominformationen jetzt vor der Sprechstunde einsehen. Bitte warten Sie auf den Verbindungsaufbau.'
            )}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              {t(
                'preCheckin.success.privacy_note',
                'Ihre Daten werden Ende-zu-Ende verschlüsselt übertragen und ausschließlich für diese Sprechstunde verwendet.'
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all"
          >
            {t('preCheckin.success.back', 'Zurück zur Übersicht')}
          </button>
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-all"
          >
            <Video className="w-4 h-4" />
            {t('preCheckin.success.join', 'Zur Sprechstunde')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function PreCheckinForm() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form fields ──
  const [hauptbeschwerden, setHauptbeschwerden] = useState('');
  const [symptomDauer, setSymptomDauer] = useState('');
  const [schweregrad, setSchweregrad] = useState(0);
  const [hoverSchweregrad, setHoverSchweregrad] = useState(0);
  const [vorerkrankungen, setVorerkrankungen] = useState('');
  const [aktuellleMedikamente, setAktuellleMedikamente] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  // ── UI state ──
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ── Validation ────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!hauptbeschwerden.trim()) {
      errors.hauptbeschwerden = t(
        'preCheckin.error.hauptbeschwerden_required',
        'Bitte beschreiben Sie Ihre Hauptbeschwerden.'
      );
    } else if (hauptbeschwerden.trim().length < 5) {
      errors.hauptbeschwerden = t(
        'preCheckin.error.hauptbeschwerden_too_short',
        'Bitte geben Sie mindestens 5 Zeichen ein.'
      );
    }

    if (!symptomDauer) {
      errors.symptomDauer = t(
        'preCheckin.error.symptom_dauer_required',
        'Bitte wählen Sie die Symptomdauer aus.'
      );
    }

    if (schweregrad === 0) {
      errors.schweregrad = t(
        'preCheckin.error.schweregrad_required',
        'Bitte geben Sie den Schweregrad an.'
      );
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [hauptbeschwerden, symptomDauer, schweregrad, t]);

  // ── File Upload ────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const allowed = files.filter(f => f.type.startsWith('image/'));
      if (allowed.length !== files.length) {
        // silently drop non-image files
      }
      const combined = [...uploadedFiles, ...allowed].slice(0, 3); // max 3 images
      setUploadedFiles(combined);
      // Create object URLs for preview; in production these would be uploaded to object storage
      const urls = combined.map(f => URL.createObjectURL(f));
      setUploadedUrls(urls);
      // Reset input so the same file can be re-added after removal
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [uploadedFiles]
  );

  const removeFile = useCallback(
    (idx: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
      setUploadedUrls(prev => prev.filter((_, i) => i !== idx));
    },
    []
  );

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitState('submitting');
    setErrorMessage('');

    const payload: PreCheckinPayload = {
      sessionId: sessionId ?? '',
      hauptbeschwerden: hauptbeschwerden.trim(),
      symptomDauer,
      schweregrad,
      vorerkrankungen: vorerkrankungen.trim(),
      aktuellleMedikamente: aktuellleMedikamente.trim(),
      // In production, actual upload URLs from object-storage would be provided here.
      fotoUploadUrls: uploadedUrls,
    };

    try {
      await submitPreCheckin(payload);
      setSubmitState('success');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t('preCheckin.error.generic', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setErrorMessage(msg);
      setSubmitState('error');
    }
  }, [
    validate,
    sessionId,
    hauptbeschwerden,
    symptomDauer,
    schweregrad,
    vorerkrankungen,
    aktuellleMedikamente,
    uploadedUrls,
    t,
  ]);

  // ── Render: success ───────────────────────────────────────

  if (submitState === 'success') {
    return <SuccessScreen onBack={() => navigate(-1)} />;
  }

  // ── Render: form ──────────────────────────────────────────

  const activeSchweregrad = hoverSchweregrad || schweregrad;
  const schweregradLabel = activeSchweregrad ? SCHWEREGRAD_LABELS[activeSchweregrad] : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            aria-label={t('preCheckin.back', 'Zurück')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              {t('preCheckin.title', 'Symptom-Voranmeldung')}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('preCheckin.subtitle', 'Bitte füllen Sie dieses Formular vor Ihrer Videosprechstunde aus.')}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Privacy notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              {t(
                'preCheckin.privacy_notice',
                'Ihre Angaben werden Ende-zu-Ende verschlüsselt übertragen (§ 630d BGB). Sie sind nur für den behandelnden Arzt sichtbar.'
              )}
            </p>
          </div>
        </div>

        {/* ── Hauptbeschwerden ─────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {t('preCheckin.section.hauptbeschwerden', 'Hauptbeschwerden')}{' '}
              <span className="text-red-500">*</span>
            </h2>
          </div>
          <textarea
            value={hauptbeschwerden}
            onChange={e => {
              setHauptbeschwerden(e.target.value);
              if (formErrors.hauptbeschwerden) {
                setFormErrors(prev => ({ ...prev, hauptbeschwerden: undefined }));
              }
            }}
            placeholder={t(
              'preCheckin.placeholder.hauptbeschwerden',
              'Beschreiben Sie Ihre Hauptbeschwerden möglichst genau (z. B. Kopfschmerzen, Husten, Schmerzen im rechten Knie)…'
            )}
            rows={4}
            className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none outline-none transition-all focus:ring-2 focus:ring-blue-200 ${
              formErrors.hauptbeschwerden
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 focus:border-blue-400'
            }`}
          />
          {formErrors.hauptbeschwerden && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {formErrors.hauptbeschwerden}
            </p>
          )}
          <p className="text-xs text-gray-400 text-right">{hauptbeschwerden.length} / 1000</p>
        </section>

        {/* ── Symptom-Dauer ──────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {t('preCheckin.section.symptom_dauer', 'Symptom-Dauer')}{' '}
              <span className="text-red-500">*</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {DAUER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSymptomDauer(opt.value);
                  if (formErrors.symptomDauer) {
                    setFormErrors(prev => ({ ...prev, symptomDauer: undefined }));
                  }
                }}
                className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                  symptomDauer === opt.value
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {t(opt.labelKey, opt.labelFallback)}
              </button>
            ))}
          </div>
          {formErrors.symptomDauer && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {formErrors.symptomDauer}
            </p>
          )}
        </section>

        {/* ── Schweregrad 1–10 ───────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                {t('preCheckin.section.schweregrad', 'Schweregrad (1–10)')}{' '}
                <span className="text-red-500">*</span>
              </h2>
            </div>
            {schweregradLabel && (
              <span className={`text-sm font-bold ${schweregradLabel.color}`}>
                {activeSchweregrad} – {schweregradLabel.text}
              </span>
            )}
          </div>

          {/* Scale buttons */}
          <div
            className="flex gap-1.5"
            onMouseLeave={() => setHoverSchweregrad(0)}
            role="group"
            aria-label={t('preCheckin.section.schweregrad', 'Schweregrad (1–10)')}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
              const isActive = val <= (hoverSchweregrad || schweregrad);
              const color =
                val <= 3
                  ? isActive
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                  : val <= 6
                  ? isActive
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                  : isActive
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'border-red-200 text-red-600 hover:bg-red-50';

              return (
                <button
                  key={val}
                  type="button"
                  aria-label={`${t('preCheckin.schweregrad_level', 'Schweregrad')} ${val}`}
                  aria-pressed={schweregrad === val}
                  onMouseEnter={() => setHoverSchweregrad(val)}
                  onClick={() => {
                    setSchweregrad(val);
                    if (formErrors.schweregrad) {
                      setFormErrors(prev => ({ ...prev, schweregrad: undefined }));
                    }
                  }}
                  className={`flex-1 h-10 rounded-lg border text-xs font-bold transition-all ${color}`}
                >
                  {val}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>{t('preCheckin.schweregrad_low', 'Kein Schmerz')}</span>
            <span>{t('preCheckin.schweregrad_high', 'Unerträglich')}</span>
          </div>

          {formErrors.schweregrad && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {formErrors.schweregrad}
            </p>
          )}
        </section>

        {/* ── Vorerkrankungen ────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {t('preCheckin.section.vorerkrankungen', 'Vorerkrankungen')}{' '}
              <span className="text-xs font-normal text-gray-400">
                ({t('preCheckin.optional', 'optional')})
              </span>
            </h2>
          </div>
          <textarea
            value={vorerkrankungen}
            onChange={e => setVorerkrankungen(e.target.value)}
            placeholder={t(
              'preCheckin.placeholder.vorerkrankungen',
              'z. B. Diabetes Typ 2, Bluthochdruck, Asthma, Schilddrüsenerkrankung…'
            )}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none outline-none transition-all focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </section>

        {/* ── Aktuelle Medikamente ───────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-4 h-4 text-teal-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {t('preCheckin.section.medikamente', 'Aktuelle Medikamente')}{' '}
              <span className="text-xs font-normal text-gray-400">
                ({t('preCheckin.optional', 'optional')})
              </span>
            </h2>
          </div>
          <textarea
            value={aktuellleMedikamente}
            onChange={e => setAktuellleMedikamente(e.target.value)}
            placeholder={t(
              'preCheckin.placeholder.medikamente',
              'z. B. Metformin 500 mg, Ramipril 5 mg, Ibuprofen bei Bedarf…'
            )}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none outline-none transition-all focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </section>

        {/* ── Foto-Upload ───────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              {t('preCheckin.section.foto_upload', 'Foto-Upload')}{' '}
              <span className="text-xs font-normal text-gray-400">
                ({t('preCheckin.optional', 'optional')}, {t('preCheckin.max_files', 'max. 3 Bilder')})
              </span>
            </h2>
          </div>

          <p className="text-xs text-gray-500">
            {t(
              'preCheckin.foto_hint',
              'Sie können Fotos der betroffenen Körperstelle hochladen (z. B. Hautausschlag, Verletzung). Nur JPG/PNG, max. 10 MB pro Datei.'
            )}
          </p>

          {/* Preview grid */}
          {uploadedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                  <img
                    src={uploadedUrls[idx]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    aria-label={t('preCheckin.remove_photo', 'Foto entfernen')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/40 px-2 py-1">
                    <p className="text-white text-[10px] truncate">{file.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload trigger */}
          {uploadedFiles.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-500 hover:text-blue-600"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">
                {t('preCheckin.upload_cta', 'Foto auswählen oder hier ablegen')}
              </span>
              <span className="text-xs text-gray-400">JPG, PNG – max. 10 MB</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </section>

        {/* ── Error banner ──────────────────────────────────────── */}
        {submitState === 'error' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">
                {t('preCheckin.error.submit_failed', 'Übertragung fehlgeschlagen')}
              </p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* ── Submit / Cancel ───────────────────────────────────── */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitState === 'submitting'}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all disabled:opacity-50"
          >
            {t('preCheckin.cancel', 'Abbrechen')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitState === 'submitting'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitState === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('preCheckin.submitting', 'Wird übermittelt…')}
              </>
            ) : (
              t('preCheckin.submit', 'Angaben absenden')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreCheckinForm;
