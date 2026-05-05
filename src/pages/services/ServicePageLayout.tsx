import React, { lazy, Suspense, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, AlertCircle, Loader2, Info, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { ServiceFlowState } from '../../hooks/useServiceFlow';
import { getPatientAppBasePath } from '../../lib/patientFlow';
import { SovereigntyBanner } from '../../components/SovereigntyBanner';

const DatenschutzGame = lazy(() => import('../../components/DatenschutzGame').then(m => ({ default: m.DatenschutzGame })));
const SignaturePad = lazy(() => import('../../components/SignaturePad').then(m => ({ default: m.SignaturePad })));

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

interface Step {
  label: string;
}

interface ServicePageLayoutProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  duration: string;
  description: string;
  steps: Step[];
  flow: ServiceFlowState;
  children?: React.ReactNode;
}

export function ServicePageLayout({
  icon,
  color,
  title,
  subtitle,
  duration,
  description,
  steps,
  flow,
  children,
}: ServicePageLayoutProps) {
  const { t } = useTranslation();
  const { bsnr } = useParams<{ bsnr?: string }>();

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-blue-500/30 font-sans"
    >
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-20">
        {/* Back button */}
        <Link
          to={getPatientAppBasePath(bsnr)}
          className="inline-flex items-center gap-2 px-4 py-2 mb-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300 text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('service.back')}
        </Link>

        {/* M6 (Arzt-Feedback 2026-05-03): Daten-Hoheit-Banner */}
        <SovereigntyBanner />

        {/* Header — Klapproth-Feedback 2026-05-04 (A1+A2+A3+B1+B2):
            steps_title und Schritt-Liste entfernt; Start-Button steht direkt neben dem Titel;
            Button-Label „Jetzt starten" ohne Wort „Anamnese". Bei Loading-Hänger (Backend
            nicht erreichbar, A5/C1) wird ein Error-Banner gerendert. */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-gradient-to-br ${color}`}>
            {icon}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[var(--text-primary)] mb-2">
              {title}
            </h1>
            <p className="text-lg text-[var(--text-secondary)] font-medium">{subtitle}</p>
            <div className="flex items-center gap-2 mt-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">{duration}</span>
            </div>
          </div>
          {/* Inline Start-CTA — Desktop, direkt neben dem Titel */}
          <motion.button
            type="button"
            onClick={flow.handleSelect}
            onMouseEnter={flow.preloadConsent}
            onFocus={flow.preloadConsent}
            disabled={flow.createStatus === 'pending'}
            aria-label={t('service.start_cta_short', { defaultValue: 'Jetzt starten' })}
            initial={{ scale: 1 }}
            animate={flow.createStatus === 'pending' ? {} : { scale: [1, 1.02, 1] }}
            transition={{ duration: 1.6, repeat: 2, ease: 'easeInOut' }}
            className={`hidden sm:inline-flex shrink-0 min-h-14 items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-xl transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait bg-gradient-to-r ${color}`}
          >
            {flow.createStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
            {flow.createStatus === 'pending'
              ? t('service.loading')
              : t('service.start_cta_short', { defaultValue: 'Jetzt starten' })}
          </motion.button>
        </div>

        {/* A5/C1 Error-Banner — sichtbar wenn createSession fehlschlägt
            (häufige Ursache: Backend offline, z. B. Hetzner-Down). Statt endlosem Loading
            sieht der Patient eine klare Fehlermeldung und einen Retry-Button. */}
        {flow.createStatus === 'error' && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-10 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4"
          >
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-200 mb-1">
                {t('service.error_title', { defaultValue: 'Verbindung zum Praxis-Server unterbrochen' })}
              </p>
              <p className="text-sm text-amber-100/80 leading-relaxed">
                {t('service.error_body', {
                  defaultValue:
                    'Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es in einem Moment erneut. Falls das Problem bestehen bleibt, sprechen Sie das Praxispersonal an der Anmeldung an.',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={flow.handleSelect}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-bold text-sm transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              {t('service.error_retry', { defaultValue: 'Erneut versuchen' })}
            </button>
          </div>
        )}

        {/* Description */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] mb-10">
          <p className="text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>

        {/* Trust indicators — Klapproth-Feedback 2026-05-04 (A4):
            DSGVO + Encrypted Pills mit Hover-Tooltips, die die wichtigsten Infos aus dem
            späteren Quiz vermitteln. Damit kann das eigene Quiz langfristig entfallen. */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <TrustPill
            icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
            label={t('service.dsgvo')}
            tooltip={t('service.dsgvo_tooltip', {
              defaultValue:
                'Ihre Daten werden gemäß DSGVO Art. 9 Abs. 2 lit. h verarbeitet — ausschließlich für die Behandlung in dieser Praxis. Sie haben jederzeit Auskunfts-, Lösch- und Widerrufsrecht. Hosting in Deutschland.',
            })}
          />
          <TrustPill
            icon={<CheckCircle className="w-4 h-4 text-blue-400" />}
            label={t('service.encrypted')}
            tooltip={t('service.encrypted_tooltip', {
              defaultValue:
                'Übertragung per TLS 1.3, Speicherung mit AES-256-GCM verschlüsselt. Ihr Patientenname und Geburtsdatum sind als PII markiert und werden gesondert gesichert.',
            })}
          />
        </div>

        {children}

        {/* Sticky-Bottom CTA — Mobile only. Inline-Button im Header reicht für Desktop. */}
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 px-4 py-3 bg-[var(--bg-primary)]/95 backdrop-blur border-t border-[var(--border-primary)]">
          <motion.button
            type="button"
            onClick={flow.handleSelect}
            onMouseEnter={flow.preloadConsent}
            onFocus={flow.preloadConsent}
            disabled={flow.createStatus === 'pending'}
            aria-label={t('service.start_cta_short', { defaultValue: 'Jetzt starten' })}
            initial={{ scale: 1 }}
            animate={flow.createStatus === 'pending' ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 1.6, repeat: 2, ease: 'easeInOut' }}
            className={`w-full min-h-14 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-bold text-base shadow-2xl active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait bg-gradient-to-r ${color}`}
          >
            {flow.createStatus === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
            {flow.createStatus === 'pending'
              ? t('service.loading')
              : t('service.start_cta_short', { defaultValue: 'Jetzt starten' })}
          </motion.button>
        </div>
        {/* Spacer so sticky-bottom button does not overlap content on mobile */}
        <div className="sm:hidden h-20" aria-hidden="true" />
        {/* Steps-Zubehör: nicht mehr gerendert (Klapproth A1). steps-Prop bleibt erhalten,
            damit Aufrufer keine Breaking-API-Änderung haben — wird intern ignoriert. */}
        <span className="sr-only">{steps.length > 0 ? `${steps.length} Schritte` : ''}</span>
      </div>

      {/* DSGVO Consent Modal */}
      {flow.showDSGVO && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />}>
          <DatenschutzGame
            onAccept={flow.handleConsentAccept}
            onDecline={flow.handleConsentDecline}
            onSkip={flow.handleConsentSkip}
            praxisName="DiggAI Praxis"
          />
        </Suspense>
      )}

      {/* Mandatory Consent Checkboxes + Signature */}
      {flow.showConsent && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />}>
          <ConsentSignatureModal
            flow={flow}
          />
        </Suspense>
      )}
    </motion.main>
  );
}

// ─── Trust Pill mit Hover-Tooltip ──────────────────────────
// Klapproth-Feedback 2026-05-04 (A4): DSGVO/Encrypted-Pills tragen die wichtigen
// Quiz-Inhalte als Tooltip — damit kann das langfristig das Quiz ersetzen.
// Tooltip ist auf Touch-Geräten via Click toggle-bar.

interface TrustPillProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}

function TrustPill({ icon, label, tooltip }: TrustPillProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-describedby={open ? `tooltip-${label}` : undefined}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-blue-500/40 transition-colors"
      >
        {icon}
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
        <Info className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`tooltip-${label}`}
          role="tooltip"
          className="absolute left-0 top-full mt-2 z-50 max-w-sm w-[min(22rem,80vw)] p-4 rounded-xl bg-gray-900/95 backdrop-blur border border-gray-700 shadow-2xl text-sm text-gray-200 leading-relaxed"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─── Required consent checkbox definitions ──────────────────

const CONSENT_CHECKBOXES = [
  { id: 'datenverarbeitung', labelKey: 'consent.checkbox_data_processing', fallback: 'Ich willige in die Verarbeitung meiner personenbezogenen Daten ein.' },
  { id: 'gesundheitsdaten', labelKey: 'consent.checkbox_health_data', fallback: 'Ich stimme der Verarbeitung meiner Gesundheitsdaten gemäß Art. 9 DSGVO ausdrücklich zu.' },
  { id: 'speicherung', labelKey: 'consent.checkbox_storage', fallback: 'Ich verstehe, dass meine Daten gemäß §630f BGB für 10 Jahre aufbewahrt werden.' },
  { id: 'widerruf', labelKey: 'consent.checkbox_revocation', fallback: 'Mir ist bekannt, dass ich die Einwilligung jederzeit widerrufen kann.' },
] as const;

// ─── Combined Consent + Signature Modal ────────────────────

function ConsentSignatureModal({ flow }: { flow: ServiceFlowState }) {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureHash, setSignatureHash] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const allChecked = useMemo(
    () => CONSENT_CHECKBOXES.every(cb => checks[cb.id] === true),
    [checks]
  );
  const hasSigned = signatureData !== null;
  const canSubmit = allChecked && hasSigned;
  const isPending = flow.submitStatus === 'pending';

  const toggleCheck = useCallback((id: string) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
    setShowError(false);
  }, []);

  const handleSignatureComplete = useCallback((data: string, hash: string) => {
    setSignatureData(data);
    setSignatureHash(hash);
    setShowError(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) {
      setShowError(true);
      return;
    }
    flow.handleConsentComplete(signatureData!, signatureHash!, checks);
  }, [canSubmit, signatureData, signatureHash, checks, flow]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl p-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t('consent.title')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t('consent.subtitle')}
          </p>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          {CONSENT_CHECKBOXES.map(cb => (
            <label
              key={cb.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                checks[cb.id]
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : showError && !checks[cb.id]
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-[var(--border-primary)] hover:border-blue-500/30'
              }`}
            >
              <input
                type="checkbox"
                checked={checks[cb.id] ?? false}
                onChange={() => toggleCheck(cb.id)}
                disabled={isPending}
                className="mt-0.5 w-5 h-5 rounded border-2 border-[var(--border-primary)] text-blue-600 focus:ring-blue-500 shrink-0 accent-blue-600"
              />
              <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {t(cb.labelKey)}
              </span>
            </label>
          ))}
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t('consent.signature_label')}
          </p>
          <div className={`rounded-xl border-2 transition-colors ${
            showError && !hasSigned ? 'border-red-500/50' : 'border-[var(--border-primary)]'
          }`}>
            <SignaturePad
              documentText={t('consent.document_text') + ' — DiggAI Praxis — ' + new Date().toISOString()}
              onComplete={handleSignatureComplete}
              label={t('consent.signature_hint', { defaultValue: 'Bitte unterschreiben Sie im Feld unten.' })}
            />
          </div>
        </div>

        {/* Validation error */}
        {showError && !canSubmit && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {!allChecked && !hasSigned
              ? t('consent.error_both')
              : !allChecked
              ? t('consent.error_checkboxes', { defaultValue: 'Bitte bestätigen Sie alle erforderlichen Einwilligungen.' })
              : t('consent.error_signature')}
          </div>
        )}

        {/* K8: Inline submit error (e.g. network failure during session creation) */}
        {flow.submitError && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {flow.submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={isPending || (!canSubmit && flow.submitStatus !== 'error')}
            aria-busy={isPending}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
              isPending
                ? 'bg-emerald-700 text-white cursor-wait'
                : canSubmit
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.02]'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('consent.submit', { defaultValue: 'Einwilligung abgeben' })}
              </>
            )}
          </button>
          <button
            onClick={flow.handleConsentCancel}
            disabled={isPending}
            className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
          >
            {t('consent.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
