import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateSession } from './useApi/usePatientApi';
import { useSessionStore } from '../store/sessionStore';
import { useModeStore } from '../store/modeStore';
import { preloadConsentExperience } from '../lib/routePreloaders';
import {
  getPatientQuestionnairePath,
  getPatientServiceById,
  type PatientServiceId,
} from '../lib/patientFlow';
import { submitSignatureToBackend } from '../services/signatureService';

export interface ServiceFlowState {
  showDSGVO: boolean;
  showConsent: boolean;
  createStatus: 'idle' | 'pending' | 'success' | 'error';
  /** Status of the full consent+session submission (K8 fix) */
  submitStatus: 'idle' | 'pending' | 'success' | 'error';
  /** Inline error message for the consent modal (K8 fix) */
  submitError: string | null;
  handleSelect: () => void;
  handleConsentAccept: () => void;
  handleConsentDecline: () => void;
  handleConsentSkip: () => void;
  handleConsentComplete: (signatureData: string, documentHash: string, flags: Record<string, boolean>) => void;
  handleConsentCancel: () => void;
  preloadConsent: () => void;
}

export function useServiceFlow(serviceId: PatientServiceId): ServiceFlowState {
  const { mutate: createSession, status: createStatus } = useCreateSession();
  const navigate = useNavigate();
  const { bsnr } = useParams<{ bsnr?: string }>();
  const sessionId = useSessionStore(state => state.sessionId);
  const setPatientData = useSessionStore(state => state.setPatientData);
  const setDsgvoSignature = useSessionStore(state => state.setDsgvoSignature);
  const setDsgvoConsentFlag = useSessionStore(state => state.setDsgvoConsentFlag);
  const completeDsgvoConsent = useSessionStore(state => state.completeDsgvoConsent);
  const [showDSGVO, setShowDSGVO] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  // K8: track the full consent submission lifecycle so the modal stays open on error
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Pending consent data used by the async effect after session creation
  const pendingConsentRef = useRef<{
    signatureData: string;
    documentHash: string;
    flags: Record<string, boolean>;
  } | null>(null);
  const service = getPatientServiceById(serviceId);

  const startFlow = useCallback(() => {
    if (!service) return;

    setPatientData({ selectedService: service.flowValue });
    createSession({
      email: '',
      isNewPatient: true,
      gender: '',
      birthDate: '',
      selectedService: service.flowValue,
    });
  }, [service, setPatientData, createSession]);

  // K8: watch session creation after consent submission
  // Keeps modal open during pending, surfaces errors inline, POSTs signature after session is ready
  useEffect(() => {
    if (submitStatus !== 'pending') return;
    if (!service) return;

    if (createStatus === 'success' && sessionId) {
      // Session created — best-effort backend signature storage (non-blocking for the user flow)
      const consent = pendingConsentRef.current;
      if (consent) {
        void submitSignatureToBackend({
          signatureData: consent.signatureData,
          documentHash: consent.documentHash,
          formType: 'DSGVO',
          sessionId,
        });
        pendingConsentRef.current = null;
      }
      setSubmitStatus('success');
      setShowConsent(false);
      navigate(getPatientQuestionnairePath(service.id, bsnr), { replace: true });
    } else if (createStatus === 'error') {
      setSubmitStatus('error');
      // Hilfreichere Meldung: wenn Live-Modus aktiv ist und das Backend nicht
      // erreichbar ist, dem Patienten den Demo-Modus als Ausweg anbieten.
      // Bug-Tracking 2026-05-06: api.diggai.de TLS-Handshake bricht ab → Live
      // ist temporär unbenutzbar. Demo-Modus bleibt voll funktional.
      const inLive = useModeStore.getState().mode === 'live';
      setSubmitError(
        inLive
          ? 'Live-Server nicht erreichbar. Sie können im Demo-Modus testen — wechseln Sie unten rechts auf "Demo".'
          : 'Verbindungsfehler. Bitte versuchen Sie es erneut.'
      );
    }
  }, [createStatus, sessionId, submitStatus, bsnr, navigate, service]);

  // Navigation for direct start (consent already in localStorage)
  useEffect(() => {
    if (!service || createStatus !== 'success' || !sessionId) return;
    // The consent submission effect handles navigation when submitStatus === 'pending'
    if (submitStatus === 'pending') return;
    navigate(getPatientQuestionnairePath(service.id, bsnr), { replace: true });
  }, [bsnr, createStatus, navigate, service, sessionId, submitStatus]);

  const handleSelect = useCallback(() => {
    const consentGiven = localStorage.getItem('dsgvo_consent');
    if (!consentGiven) {
      void preloadConsentExperience();
      setShowDSGVO(true);
      return;
    }
    startFlow();
  }, [startFlow]);

  // User completed the interactive DSGVO info module → go to consent+signature
  const handleConsentAccept = useCallback(() => {
    setShowDSGVO(false);
    setShowConsent(true);
  }, []);

  // User skipped the interactive DSGVO info module → go directly to consent+signature
  const handleConsentSkip = useCallback(() => {
    setShowDSGVO(false);
    setShowConsent(true);
  }, []);

  const handleConsentDecline = useCallback(() => {
    setShowDSGVO(false);
  }, []);

  // K8: keep modal open during submission; only close on success (handled in useEffect above)
  const handleConsentComplete = useCallback((signatureData: string, documentHash: string, flags: Record<string, boolean>) => {
    setSubmitStatus('pending');
    setSubmitError(null);

    // Store for the async effect
    pendingConsentRef.current = { signatureData, documentHash, flags };

    // Optimistic local persistence (kept even if backend call fails)
    localStorage.setItem('dsgvo_consent', new Date().toISOString());
    localStorage.setItem('dsgvo_signature_hash', documentHash);
    setDsgvoSignature(signatureData, documentHash);
    for (const [id, checked] of Object.entries(flags)) {
      setDsgvoConsentFlag(id, checked);
    }
    completeDsgvoConsent();

    // Trigger session creation — modal stays open (submitStatus = 'pending')
    startFlow();
  }, [startFlow, setDsgvoSignature, setDsgvoConsentFlag, completeDsgvoConsent]);

  const handleConsentCancel = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
    pendingConsentRef.current = null;
    setShowConsent(false);
  }, []);

  const preloadConsent = useCallback(() => {
    void preloadConsentExperience();
  }, []);

  return {
    showDSGVO,
    showConsent,
    createStatus,
    submitStatus,
    submitError,
    handleSelect,
    handleConsentAccept,
    handleConsentDecline,
    handleConsentSkip,
    handleConsentComplete,
    handleConsentCancel,
    preloadConsent,
  };
}
