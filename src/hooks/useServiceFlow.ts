import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateSession } from './useApi/usePatientApi';
import { useSessionStore } from '../store/sessionStore';
import { preloadConsentExperience } from '../lib/routePreloaders';
import {
  getPatientQuestionnairePath,
  getPatientServiceById,
  type PatientServiceId,
} from '../lib/patientFlow';

export interface ServiceFlowState {
  showDSGVO: boolean;
  showConsent: boolean;
  createStatus: 'idle' | 'pending' | 'success' | 'error';
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

  useEffect(() => {
    if (!service || createStatus !== 'success' || !sessionId) {
      return;
    }

    navigate(getPatientQuestionnairePath(service.id, bsnr), { replace: true });
  }, [bsnr, createStatus, navigate, service, sessionId]);

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

  // User completed mandatory consent (checkboxes + signature)
  const handleConsentComplete = useCallback((signatureData: string, documentHash: string, flags: Record<string, boolean>) => {
    // Persist to localStorage for quick re-check
    localStorage.setItem('dsgvo_consent', new Date().toISOString());
    localStorage.setItem('dsgvo_signature_hash', documentHash);

    // Persist to Zustand store for PDF export / GDT
    setDsgvoSignature(signatureData, documentHash);
    for (const [id, checked] of Object.entries(flags)) {
      setDsgvoConsentFlag(id, checked);
    }
    completeDsgvoConsent();

    setShowConsent(false);
    startFlow();
  }, [startFlow, setDsgvoSignature, setDsgvoConsentFlag, completeDsgvoConsent]);

  const handleConsentCancel = useCallback(() => {
    setShowConsent(false);
  }, []);

  const preloadConsent = useCallback(() => {
    void preloadConsentExperience();
  }, []);

  return {
    showDSGVO,
    showConsent,
    createStatus,
    handleSelect,
    handleConsentAccept,
    handleConsentDecline,
    handleConsentSkip,
    handleConsentComplete,
    handleConsentCancel,
    preloadConsent,
  };
}
