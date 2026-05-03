import React, { lazy, Suspense, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { ServiceFlowState } from '../../hooks/useServiceFlow';
import { getPatientAppBasePath } from '../../lib/patientFlow';

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

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-12">
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
        </div>

        {/* Description */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] mb-10">
          <p className="text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>

        {/* Steps */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
            {t('service.steps_title')}
          </h2>
          <div className="grid gap-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-blue-400">{i + 1}</span>
                </div>
                <p className="text-[var(--text-secondary)] font-medium pt-1">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)]">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('service.dsgvo')}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)]">
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('service.encrypted')}</span>
          </div>
        </div>

        {children}

        {/* CTA */}
        <button
          onClick={flow.handleSelect}
          onMouseEnter={flow.preloadConsent}
          onFocus={flow.preloadConsent}
          className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r ${color}`}
        >
          {flow.createStatus === 'pending'
            ? t('service.loading')
            : t('service.start_cta', { defaultValue: 'Anamnese jetzt starten' })}
        </button>
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

        {/* Error message */}
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

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            onClick={handleSubmit}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
              canSubmit
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.02]'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {t('consent.submit', { defaultValue: 'Einwilligung abgeben' })}
          </button>
          <button
            onClick={flow.handleConsentCancel}
            className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {t('consent.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
