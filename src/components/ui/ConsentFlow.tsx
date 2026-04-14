/**
 * ConsentFlow — Studienbasierter Einwilligungs-Schritt
 *
 * Forschungsgrundlage:
 * - Kassam et al. 2023 (JMIR): Separate Consent-Checkboxen → +18% Comprehension
 * - Adjekum et al. 2018: Transparenz über Datenzweck → primärer Trust-Enabler
 * - Busch-Casler & Radic 2023: Ausdrückliche "Nicht-kommerzielle Nutzung" → DE-Patienten
 * - DSGVO Art. 9: Gesundheitsdaten benötigen explizite Einwilligung (nicht implizit)
 *
 * Drei separate Checkboxen:
 * 1. Medizinische Behandlung (Pflicht)
 * 2. Datenverarbeitung für diesen Besuch (Pflicht)
 * 3. Anonyme Qualitätsforschung (Optional)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, FlaskConical, ChevronDown, ChevronUp, CheckCircle2, Lock, Gamepad2 } from 'lucide-react';
import { TrustBadgeBar } from './TrustBadgeBar';

export interface ConsentValues {
  treatment: boolean;
  dataProcessing: boolean;
  research: boolean;
  /** Opt-in for gamified anamnese experience. Default: false. DSGVO Art. 6 Abs. 1 lit. a */
  gamification: boolean;
}

interface ConsentItemProps {
  icon: React.ReactNode;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  detailKey: string;
  detailFallback: string;
  required: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

function ConsentItem({
  icon,
  titleKey,
  titleFallback,
  descKey,
  descFallback,
  detailKey,
  detailFallback,
  required,
  checked,
  onChange,
  id,
}: ConsentItemProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={[
        'rounded-2xl border-2 p-4 transition-all duration-200',
        checked
          ? 'border-blue-400 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-950/30'
          : 'border-[var(--border-primary)] bg-[var(--bg-card)]',
      ].join(' ')}
    >
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
        {/* Custom Checkbox */}
        <div className="relative mt-0.5 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-required={required}
            className="sr-only"
          />
          <div
            aria-hidden="true"
            className={[
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-150',
              checked
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600',
            ].join(' ')}
          >
            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[var(--text-secondary)]">{icon}</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {t(titleKey, titleFallback)}
            </span>
            {required ? (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full">
                {t('consent.required', 'Erforderlich')}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {t('consent.optional', 'Optional')}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t(descKey, descFallback)}
          </p>
        </div>
      </label>

      {/* "Mehr erfahren" Expander */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`${id}-detail`}
        className="mt-2 ml-8 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        {expanded ? (
          <ChevronUp className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        )}
        {expanded ? t('consent.less', 'Weniger anzeigen') : t('consent.more', 'Mehr erfahren')}
      </button>

      {expanded && (
        <div
          id={`${id}-detail`}
          className="mt-3 ml-8 p-3 rounded-xl bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] leading-relaxed"
        >
          {t(detailKey, detailFallback)}
        </div>
      )}
    </div>
  );
}

interface ConsentFlowProps {
  onContinue: (values: ConsentValues) => void;
  /** Name des behandelnden Arztes (für personalisierten Trust-Text) */
  doctorName?: string;
  /** Geschätzte Dauer des Fragebogens in Minuten */
  estimatedMinutes?: number;
}

export function ConsentFlow({
  onContinue,
  doctorName,
  estimatedMinutes = 8,
}: ConsentFlowProps) {
  const { t } = useTranslation();

  const [values, setValues] = useState<ConsentValues>({
    treatment: false,
    dataProcessing: false,
    research: false,
    gamification: false, // DEFAULT: off — patient must actively opt in
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const canContinue = values.treatment && values.dataProcessing;

  const set = (key: keyof ConsentValues) => (checked: boolean) =>
    setValues((v) => ({ ...v, [key]: checked }));

  const handleContinue = () => {
    if (!canContinue || isSubmitting) return;
    setIsSubmitting(true);
    // Brief visual confirmation before handing off
    setTimeout(() => {
      onContinue(values);
    }, 600);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Trust Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 mb-1">
          <Lock className="w-7 h-7 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">
          {t('consent.heading', 'Ihre Daten sind sicher')}
        </h1>

        {doctorName ? (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t(
              'consent.subheading_doctor',
              '{{doctor}} wird Ihre Antworten vor dem Termin persönlich lesen.',
              { doctor: doctorName },
            )}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t(
              'consent.subheading',
              'Nur Ihr Behandlungsteam sieht Ihre Angaben — niemals Dritte.',
            )}
          </p>
        )}

        {/* Zeitschätzung (Katz 2015: -26% Abandonment) */}
        <p className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-full px-4 py-1.5 inline-block">
          ⏱ {t('consent.time_estimate', 'Dauert etwa {{min}} Minuten', { min: estimatedMinutes })}
        </p>

        {/* Trust Badges above-the-fold */}
        <TrustBadgeBar className="mt-2" compact />
      </div>

      {/* Consent Items */}
      <div className="space-y-3" role="group" aria-labelledby="consent-group-label">
        <p id="consent-group-label" className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {t('consent.group_label', 'Ihre Einwilligung')}
        </p>

        <ConsentItem
          id="consent-treatment"
          icon={<ShieldCheck className="w-4 h-4" />}
          titleKey="consent.treatment.title"
          titleFallback="Medizinische Behandlung"
          descKey="consent.treatment.desc"
          descFallback="Ich willige ein, dass meine Angaben für meine Behandlung in dieser Praxis verwendet werden."
          detailKey="consent.treatment.detail"
          detailFallback="Ihre Antworten werden ausschließlich zur Vorbereitung und Durchführung Ihrer medizinischen Behandlung genutzt. Rechtsgrundlage: DSGVO Art. 9 Abs. 2h (medizinische Behandlung)."
          required
          checked={values.treatment}
          onChange={set('treatment')}
        />

        <ConsentItem
          id="consent-data"
          icon={<FileText className="w-4 h-4" />}
          titleKey="consent.data.title"
          titleFallback="Datenverarbeitung für diesen Besuch"
          descKey="consent.data.desc"
          descFallback="Meine Daten werden verschlüsselt gespeichert und nach dem Besuch gemäß DSGVO behandelt."
          detailKey="consent.data.detail"
          detailFallback="Alle Ihre Angaben werden mit AES-256-GCM verschlüsselt. Sie werden nicht für Werbung, KI-Training oder kommerzielle Zwecke genutzt. Sie können jederzeit Auskunft, Berichtigung oder Löschung beantragen (DSGVO Art. 15–17)."
          required
          checked={values.dataProcessing}
          onChange={set('dataProcessing')}
        />

        <ConsentItem
          id="consent-research"
          icon={<FlaskConical className="w-4 h-4" />}
          titleKey="consent.research.title"
          titleFallback="Anonyme Qualitätsforschung (optional)"
          descKey="consent.research.desc"
          descFallback="Ich erlaube die anonymisierte Nutzung meiner Daten zur Verbesserung der medizinischen Versorgung."
          detailKey="consent.research.detail"
          detailFallback="Ihre Daten werden vollständig anonymisiert — kein Rückschluss auf Ihre Person ist möglich. Die Teilnahme ist freiwillig und hat keinen Einfluss auf Ihre Behandlung. Sie können diese Einwilligung jederzeit widerrufen."
          required={false}
          checked={values.research}
          onChange={set('research')}
        />

        {/* Gamification opt-in — DSGVO Art. 6 Abs. 1 lit. a (explicit opt-in, default OFF) */}
        <ConsentItem
          id="consent-gamification"
          icon={<Gamepad2 className="w-4 h-4" />}
          titleKey="consent.gamification.title"
          titleFallback="Spielerische Darstellung (optional)"
          descKey="consent.gamification.desc"
          descFallback="Ich möchte den Fragebogen mit motivierenden Animationen und Fortschrittsanzeigen erleben."
          detailKey="consent.gamification.detail"
          detailFallback="Aktiviert visuelle Fortschrittsanzeigen, Abschluss-Animationen und Bestätigungs-Effekte während des Fragebogens. Keine zusätzlichen Daten werden erhoben. Rein ästhetisch — kein Einfluss auf medizinische Inhalte. Standard: deaktiviert."
          required={false}
          checked={values.gamification}
          onChange={set('gamification')}
        />
      </div>

      {/* Weiter-Button */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || isSubmitting}
          aria-disabled={!canContinue || isSubmitting}
          className={[
            'w-full py-4 px-6 rounded-2xl text-base font-bold transition-all duration-200',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
            canContinue && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed',
          ].join(' ')}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" aria-hidden="true" />
              {t('consent.cta_loading', 'Wird gestartet…')}
            </span>
          ) : canContinue ? (
            t('consent.cta_ready', 'Fragebogen starten →')
          ) : (
            t('consent.cta_waiting', 'Bitte beide Pflicht-Felder bestätigen')
          )}
        </button>

        {/* Datenschutz-Link + Impressum */}
        <p className="text-center text-xs text-[var(--text-secondary)]">
          {t('consent.privacy_link_prefix', 'Mehr Infos in unserer')}{' '}
          <a
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            {t('consent.privacy_link', 'Datenschutzerklärung')}
          </a>
          {' · '}
          <a
            href="/impressum"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            {t('consent.impressum_link', 'Impressum')}
          </a>
        </p>
      </div>
    </div>
  );
}
