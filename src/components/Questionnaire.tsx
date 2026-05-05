import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { Answer } from '../types/question';
import { useSubmitAnswer, useSubmitSession, useSubmitAccidentDetails, useSubmitMedications, useSubmitSurgeries, useQueuePosition, useQueueFlowConfig, useWaitingContent } from '../hooks/usePatientApi';
import { questions as allQuestions } from '../data/questions';
import { QuestionRenderer } from './QuestionRenderer';
import { ProgressBar } from './ProgressBar';
import { ChapterProgress, DEFAULT_CHAPTERS } from './ui/ChapterProgress';
import { AutoSaveIndicator } from './ui/AutoSaveIndicator';
import {
    validateAnswer,
    shouldShowQuestion,
    getActivePath,
    estimateFullPath,
    getTriageAlert
} from '../utils/questionLogic';
import { AnswerSummary } from './AnswerSummary';
import { HistorySidebar } from './HistorySidebar';
import { AnmeldeHinweisOverlay, AnmeldeHinweisBanner, type AnmeldeHinweis } from './AnmeldeHinweisOverlay';
import { routingHintFromTriage } from '../utils/routingHintFromTriage';
import { MedicationManager } from './MedicationManager';
import { SurgeryManager } from './SurgeryManager';
import { SchwangerschaftCheck } from './SchwangerschaftCheck';
import { PDFExport } from './PDFExport';
import { SubmittedPage } from './SubmittedPage';
import { WaitingRoomModal } from './WaitingRoomModal';
import { EmailFallbackModal } from './EmailFallbackModal';
import { PatientIdentify } from './inputs/PatientIdentify';
import { CameraScanner } from './inputs/CameraScanner';
import { IGelServices } from './IGelServices';
import { ChatBubble } from './ChatBubble';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { ModeToggle } from './ModeToggle';
import { FontSizeControl } from './FontSizeControl';
import { CelebrationOverlay as CompletionCelebration } from './Celebrations';
import { KioskToggle } from './KioskToggle';
import { SimpleModeToggle } from './SimpleModeToggle';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { InfoBreak } from './waiting/InfoBreak';
import { hapticTap, hapticSelect, hapticSuccess, hapticWarning } from '../utils/haptics';
import { api } from '../api/client';
import {
    ClipboardList,
    FilePlus,
    FileText,
    Calendar,
    Stethoscope,
    AlertCircle,
    Phone,
    Home,
    ArrowLeft,
    ArrowRight,
    Clock,
    ShieldCheck,
    History,
    HardHat,
    Camera
} from 'lucide-react';

interface ServiceTheme {
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    borderClass: string;
}

const SERVICE_THEMES: Record<string, ServiceTheme> = {
    'Termin / Anamnese': { icon: Stethoscope, colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20' },
    'Medikamente / Rezepte': { icon: ClipboardList, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' },
    'Dateien / Befunde': { icon: FilePlus, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20' },
    'AU (Krankschreibung)': { icon: FileText, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20' },
    'Überweisung': { icon: Calendar, colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/20' },
    'Terminabsage': { icon: AlertCircle, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20' },
    'Telefonanfrage': { icon: Phone, colorClass: 'text-cyan-400', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/20' },
    'Dokumente anfordern': { icon: ClipboardList, colorClass: 'text-purple-400', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/20' },
    'Nachricht schreiben': { icon: ClipboardList, colorClass: 'text-pink-400', bgClass: 'bg-pink-500/10', borderClass: 'border-pink-500/20' },
    'Unfallmeldung (BG)': { icon: HardHat, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20' },
};

const ESTIMATED_TIME_NUMBERS: Record<string, string> = {
    'Termin / Anamnese': '5-8',
    'Medikamente / Rezepte': '2',
    'Dateien / Befunde': '2',
    'AU (Krankschreibung)': '3',
    'Überweisung': '2',
    'Terminabsage': '1',
    'Telefonanfrage': '2',
    'Dokumente anfordern': '2',
    'Nachricht schreiben': '3',
    'Unfallmeldung (BG)': '5',
};

import { useTranslation } from 'react-i18next';
import { ConsentFlow } from './ui/ConsentFlow';
import { useTenantStore } from '../store/tenantStore';

/**
 * Questionnaire Component - Phase 3: Layout & Whitespace
 * 
 * Psychology-Based Design (Miller's Law + Progressive Disclosure):
 * - Simple Mode: 1 question per screen (stressed/overwhelmed users)
 * - Normal Mode: Max 3-4 questions per screen (standard users)
 * - 40% whitespace target for reduced cognitive load
 * - 48px minimum touch targets for thumb reach
 * - 20px border radius for friendly, approachable UI
 * - 32px padding for cognitive breathing room
 */
export function Questionnaire() {
    const { t } = useTranslation();
    const store = useSessionStore();
    const showWaitingRoom = useTenantStore((state) => state.features.showWaitingRoom);
    const { mutate: submitAnswer } = useSubmitAnswer();
    const { mutateAsync: submitSession } = useSubmitSession();
    const { mutateAsync: submitMedicationsAsync } = useSubmitMedications();
    const { mutateAsync: submitSurgeriesAsync } = useSubmitSurgeries();
    const { mutate: submitAccident } = useSubmitAccidentDetails();

    // Legacy mapping to store
    const legacyAnswers = Object.fromEntries(
        Object.entries(store.answers).map(([key, a]) => [key, { ...a, questionId: a.atomId }])
    ) as Record<string, Answer & { questionId: string }>;

    const state = {
        answers: legacyAnswers,
        currentQuestionId: store.currentAtomId,
        questionHistory: store.atomHistory,
        selectedReason: store.selectedService,
    };
    const dispatch = (action: { type: string; payload?: unknown; source?: string }) => {
        if (action.type === 'SET_CURRENT_QUESTION') {
            if (import.meta.env.DEV) console.log('DISPATCH [SET_CURRENT_QUESTION] payload:', action.payload, 'source:', action.source || 'manual');
            store.navigateToAtom(action.payload as string);
        }
        if (action.type === 'ANSWER_QUESTION') {
            const p = action.payload as { questionId: string; value: string | string[] | boolean | number | Record<string, unknown> | null; answeredAt: Date };
            store.setAnswer(p.questionId, p.value);
        }
        if (action.type === 'GO_BACK') store.goBack();
        if (action.type === 'RESET') store.clearSession();
    };

    const [localError, setLocalError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Patient-facing routing hints — werden über das AnmeldeHinweisOverlay/Banner gerendert.
    // Hier wird KEIN diagnostischer Text aus question.logic.triage.message gespeichert,
    // sondern ein patient-sicherer Hinweis (siehe routingHintFromTriage).
    const [triageAlert, setTriageAlert] = useState<AnmeldeHinweis | null>(null);
    const [criticalOverlay, setCriticalOverlay] = useState<AnmeldeHinweis | null>(null);
    const [showPDF, setShowPDF] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showEmailFallback, setShowEmailFallback] = useState(false);
    const [clinicalConsentDone, setClinicalConsentDone] = useState(false);
    const [medications, setMedications] = useState<{ id: string; name: string; dosage: string; frequency: string; sinceWhen: string }[]>([]);
    const [surgeries, setSurgeries] = useState<{ id: string; surgeryName: string; date: string; complications: string; notes: string }[]>([]);
    const [showCameraScanner, setShowCameraScanner] = useState(false);

    // InfoBreak state (Modul 1: Wartezeit-Management)
    const [infoBreakContent, setInfoBreakContent] = useState<{ id: string; type: string; title: string; body: string; displayDurationSec?: number } | null>(null);
    const [infoBreakSeenIds, setInfoBreakSeenIds] = useState<string[]>([]);

    // Queue & flow config for adaptive InfoBreak timing
    const { data: queuePositionData } = useQueuePosition(store.sessionId ?? '');
    const { data: flowConfigData } = useQueueFlowConfig(store.sessionId ?? '');
    const { data: infoBreakContentData } = useWaitingContent(
      { lang: 'de', limit: 1, exclude: infoBreakSeenIds.join(',') }
    );

    // Guard: Skip SyncEffect during active user input to prevent race conditions
    const isUserInteractingRef = useRef(false);
    const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Patient-Daten aus Antworten ableiten
    const patientGender = state.answers['0002']?.value as string || '';
    const patientBirthDate = state.answers['0003']?.value as string || '';
    const patientName = useMemo(() => {
        const nachname = state.answers['0001']?.value || '';
        const vorname = state.answers['0011']?.value || '';
        return nachname && vorname ? `${vorname} ${nachname}` : '';
    }, [state.answers]);
    const patientEmail = useMemo(() => {
        const value = state.answers['9010']?.value ?? state.answers['3003']?.value;
        return typeof value === 'string' && value.includes('@') ? value.trim() : null;
    }, [state.answers]);

    // Alter berechnen
    const patientAge = useMemo(() => {
        if (!patientBirthDate) return null;
        const birth = new Date(patientBirthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }, [patientBirthDate]);

    // Prüfe ob aktuelle Frage die Medikamenten-Frage ist
    const isMedicationQuestion = state.currentQuestionId === '8900';

    // Prüfe ob Schwangerschafts-Check angezeigt werden soll
    const isSchwangerschaftQuestion = state.currentQuestionId === '8800';

    // Synchronize current question visibility (debounced to prevent race conditions)
    useEffect(() => {
        if (!store.isHydrated) return;
        if (!state.currentQuestionId) return;
        // Skip during active user input to prevent losing focus/data
        if (isUserInteractingRef.current) return;

        const context = {
            gender: patientGender,
            age: patientAge,
            selectedReason: state.selectedReason
        };

        const currentQuestion = allQuestions.find(q => q.id === state.currentQuestionId);
        if (currentQuestion) {
            const isVisible = shouldShowQuestion(currentQuestion, state.answers, context);
            if (!isVisible) {
                if (import.meta.env.DEV) console.log('SyncEffect: Question', state.currentQuestionId, 'is NOT visible. Recalculating path...');
                const activePath = getActivePath(allQuestions, state.answers, context);
                if (activePath.length > 0) {
                    const targetId = activePath[activePath.length - 1];
                    if (import.meta.env.DEV) console.log('SyncEffect: Navigating to', targetId);
                    dispatch({ type: 'SET_CURRENT_QUESTION', payload: targetId, source: 'SyncEffect' });
                }
            } else {
                // Keep it
            }
        }
    }, [state.currentQuestionId, state.answers, state.selectedReason, patientGender, patientAge, dispatch]);

    const handleAnswer = useCallback((questionId: string, value: string | string[] | boolean | number | Record<string, unknown> | null) => {
        if (import.meta.env.DEV) console.log('handleAnswer:', questionId, value);
        // Set interaction guard to prevent SyncEffect from re-navigating during input
        isUserInteractingRef.current = true;
        if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = setTimeout(() => { isUserInteractingRef.current = false; }, 500);

        dispatch({ type: 'ANSWER_QUESTION', payload: { questionId, value, answeredAt: new Date() } });
        setLocalError(null);

        // API Call in background
        submitAnswer({ atomId: questionId, value });

        // Phase 7: Automatically route accident data
        if (questionId === '2080' && value) {
            submitAccident(value);
        }

        // Lokale Routing-Heuristik (Frontend-only) — der Patient sieht ausschließlich
        // patient-sichere Workflow-Hinweise; der diagnostische Text aus
        // question.logic.triage.message wird im Adapter routingHintFromTriage verworfen.
        // Definitive Auswertung erfolgt serverseitig durch RoutingEngine (server/engine/RoutingEngine.ts).
        const question = allQuestions.find(q => q.id === questionId);
        if (question) {
            const rawTriage = getTriageAlert(question, { atomId: questionId, value, answeredAt: new Date() } as Answer);
            if (rawTriage) {
                const hinweis = routingHintFromTriage(rawTriage, questionId, t);
                if (hinweis.level === 'PRIORITY') {
                    setCriticalOverlay(hinweis);
                } else {
                    setTriageAlert(hinweis);
                }
            } else {
                setTriageAlert(null);
            }
        }
    }, [dispatch, submitAnswer]);

    const handleCameraScan = useCallback((data: { firstname?: string; lastname?: string; dob?: string; insurance?: string; num?: string }) => {
        // Auto-fill answers based on OCR data
        if (data.firstname) handleAnswer('0011', data.firstname);
        if (data.lastname) handleAnswer('0001', data.lastname);
        if (data.dob) handleAnswer('0003', data.dob);
        if (data.num) {
            handleAnswer('2000', 'GKV'); // Assuming GKV if KV-number found
            handleAnswer('2001', data.num); // Versichertennummer auto-fill
        }
        if (data.insurance) {
            // we could store it if we had a field, left as example
        }
    }, [handleAnswer]);

    // InfoBreak logic: determine if we should show an info break between questions
    const shouldInsertInfoBreak = useCallback((): boolean => {
        if (!queuePositionData || queuePositionData.status !== 'WAITING') return false;
        if (!flowConfigData || flowConfigData.level === 0) return false;

        const answeredCount = Object.keys(state.answers).length;
        const breakFrequency = flowConfigData.breakFrequency ?? 5;

        // Insert InfoBreak every N questions based on adaptive level
        return answeredCount > 0 && answeredCount % breakFrequency === 0;
    }, [queuePositionData, flowConfigData, state.answers]);

    const handleNext = useCallback(async () => {
        hapticTap();
        const { currentAtomId, answers, selectedService } = useSessionStore.getState();
        if (!currentAtomId) return;

        // Email Fallback Check (Question 3003): Before proceeding to next question
        if (currentAtomId === '3003') {
            const emailValue = (answers['3003']?.value as string || '').trim();
            if (!emailValue) {
                // Email is required but empty - show fallback modal instead of error
                setShowEmailFallback(true);
                return;
            }
        }

        const currentQuestion = allQuestions.find(q => q.id === currentAtomId);
        if (!currentQuestion) {
            if (import.meta.env.DEV) console.log('handleNext: No current question found for ID', currentAtomId);
            return;
        }

        // Schwangerschafts-Check: Nach Beantwortung weiter zu Medikamente
        if (currentAtomId === '8800') {
            if (!state.answers['8800']) {
                setLocalError(t('validation.please_answer', 'Diese Antwort fehlt uns noch — dann geht es weiter.'));
                return;
            }
            dispatch({ type: 'SET_CURRENT_QUESTION', payload: '8900' });
            setLocalError(null);
            return;
        }

        // Medikamenten-Frage: Speichere strukturierte Daten
        if (currentAtomId === '8900' && medications.length > 0) {
            try {
                // Sende an dedizierten Bulk-Endpoint
                await submitMedicationsAsync(medications);
                // Speichere in lokaler Queue für Kompatibilität mit AnswerSummary
                dispatch({
                    type: 'ANSWER_QUESTION',
                    payload: {
                        questionId: '8900',
                        value: medications.map(m => `${m.name} ${m.dosage} (${m.frequency})`).join('; '),
                        answeredAt: new Date()
                    }
                });
            } catch (err) {
                setLocalError(t('Fehler beim Speichern der Medikamente.'));
                return;
            }
        }

        // OP-Frage: Speichere strukturierte Daten
        if (currentQuestion.type === 'surgery-form' && surgeries.length > 0) {
            try {
                await submitSurgeriesAsync(surgeries);
                dispatch({
                    type: 'ANSWER_QUESTION',
                    payload: {
                        questionId: currentQuestion.id,
                        value: surgeries.map(s => `${s.surgeryName} (${s.date})`).join('; '),
                        answeredAt: new Date()
                    }
                });
            } catch (err) {
                setLocalError(t('Fehler beim Speichern der OP-Historie.'));
                return;
            }
        }

        const answer = answers[currentAtomId];
        if (import.meta.env.DEV) console.log('handleNext for', currentAtomId, 'Answer:', answer?.value);
        const validationError = validateAnswer(currentQuestion, answer?.value, answers);

        if (validationError) {
            if (import.meta.env.DEV) console.log('handleNext validationError:', validationError);
            setLocalError(validationError);
            hapticWarning();
            return;
        }

        // Wenn keine Antwort existiert (optionales Feld), als "null" speichern
        if (!answer) {
            dispatch({
                type: 'ANSWER_QUESTION',
                payload: { questionId: currentAtomId, value: null, answeredAt: new Date() }
            });
        }

        // Letzte Frage -> Absenden
        if (currentAtomId === '9000') {
            await submitSession();

            try {
                if (store.sessionId) await api.requestEncryptedPackage(store.sessionId);
            } catch (err) {
                console.error('Encrypted package export failed:', err);
            }

            setIsSubmitted(true);
            hapticSuccess();
            setLocalError(null);
            return;
        }

        // NEUE ARCHITEKTUR: Bestimme die komplette aktuelle Abfolge (inkl. Multiselect-Parallel-Zweige!)
        // Wenn die aktuelle Frage noch nicht beantwortet wurde (optional!), injecten wir eine Dummy-Antwort für das Path-Routing.
        const routingAnswers = {
            ...answers,
            [currentAtomId]: answer || { atomId: currentAtomId, value: null, answeredAt: new Date() }
        };

        const activePath = getActivePath(
            allQuestions,
            routingAnswers,
            { selectedReason: selectedService, gender: patientGender, age: patientAge }
        );

        const currentIndex = activePath.indexOf(currentAtomId);
        if (currentIndex !== -1 && currentIndex + 1 < activePath.length) {
            const nextQuestionId = activePath[currentIndex + 1];

            // InfoBreak check: show info break between questions if adaptive flow requires it
            if (shouldInsertInfoBreak() && infoBreakContentData?.items?.[0]) {
                const content = infoBreakContentData.items[0];
                setInfoBreakContent(content);
                setInfoBreakSeenIds((prev) => [...prev, content.id]);
                // Store the pending next question — will navigate after InfoBreak dismissal
                store.setAnswer('__pendingNextAtom', nextQuestionId);
                return;
            }

            if (import.meta.env.DEV) console.log(`handleNext -> navigating to ${nextQuestionId} (Index ${currentIndex + 1} of ${activePath.length})`);
            dispatch({ type: 'SET_CURRENT_QUESTION', payload: nextQuestionId });
            setLocalError(null);
            setTriageAlert(null);
        } else {
            if (import.meta.env.DEV) console.log('handleNext -> No next question found or end of path reached.');
        }
    }, [state.answers, state.selectedReason, dispatch, isMedicationQuestion, medications, submitMedicationsAsync, surgeries, submitSurgeriesAsync, patientGender, patientAge, shouldInsertInfoBreak, infoBreakContentData]);

    const handleGoBack = useCallback(() => {
        hapticSelect();
        setLocalError(null);
        setTriageAlert(null);
        dispatch({ type: 'GO_BACK' });
    }, [dispatch]);

    const handleJumpToQuestion = useCallback((questionId: string) => {
        setLocalError(null);
        setTriageAlert(null);
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: questionId });
        // Keep sidebar open so users can continue navigating
    }, [dispatch]);

    const handleReset = useCallback(() => {
        dispatch({ type: 'RESET' });
        setLocalError(null);
        setTriageAlert(null);
        setIsSubmitted(false);
        setCriticalOverlay(null);
        setMedications([]);
    }, [dispatch]);

    const handleEditQuestion = useCallback((questionId: string) => {
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: questionId });
    }, [dispatch]);

    const handleDownloadSecurePackage = useCallback(async () => {
        if (!store.sessionId) return;
        await api.requestEncryptedPackage(store.sessionId);
    }, [store.sessionId]);

    const handleSendPackageLink = useCallback(async () => {
        if (!store.sessionId) return;

        try {
            await api.sendPackageLink(store.sessionId, patientEmail || undefined);
            const { toast } = await import('../store/toastStore');
            toast.success('Der sichere Download-Link wurde vorbereitet.');
        } catch (err) {
            console.error('Package link failed:', err);
        }
    }, [patientEmail, store.sessionId]);

    // Keyboard shortcuts: Enter=next, Escape=back, 1-9=select option
    useKeyboardShortcuts({
        onNext: handleNext,
        onBack: handleGoBack,
        enabled: !isSubmitted && !showPDF && !showCameraScanner && !criticalOverlay,
    });

    const currentQuestion = allQuestions.find(q => q.id === state.currentQuestionId) || allQuestions[0];
    const context = { selectedReason: state.selectedReason, gender: patientGender, age: patientAge };
    const activePathIds = getActivePath(allQuestions, state.answers, context);
    const estimatedPath = estimateFullPath(allQuestions, state.answers, context);
    const totalAnswered = activePathIds.filter(id => state.answers[id]).length;
    const totalEstimated = Math.max(estimatedPath.length, activePathIds.length, 1);
    const progress = Math.min((totalAnswered / totalEstimated) * 100, 98);

    const theme = (state.selectedReason && SERVICE_THEMES[state.selectedReason]) || SERVICE_THEMES['Termin / Anamnese'];
    const estTimeNum = (state.selectedReason && ESTIMATED_TIME_NUMBERS[state.selectedReason]) || ESTIMATED_TIME_NUMBERS['Termin / Anamnese'];
    const estTime = `${estTimeNum} ${t('time.min', 'Min.')}`;
    const isLastQuestion = state.currentQuestionId === '9000';

    // ─── Clinical Consent Gate (trust signals before questionnaire) ─────────
    if (!clinicalConsentDone) {
        const estimatedMinutes = Number(
            (ESTIMATED_TIME_NUMBERS[state.selectedReason ?? ''] ?? '5').split('-')[0]
        );
        return (
            <div className="min-h-screen bg-(--bg-primary) flex items-center justify-center p-4">
                <ConsentFlow
                    onContinue={(values) => {
                        // Persist gamification preference — default is OFF (DSGVO Art. 6 Abs. 1 lit. a)
                        localStorage.setItem('gamification_consent', values.gamification ? 'true' : 'false');
                        localStorage.setItem('gamification_consent_ts', new Date().toISOString());
                        setClinicalConsentDone(true);
                    }}
                    estimatedMinutes={estimatedMinutes || 5}
                />
            </div>
        );
    }

    // ─── Submitted ──────────────────────────────────────────
    if (isSubmitted) {
        return (
            <>
                <SubmittedPage
                    sessionId={store.sessionId || undefined}
                    patientName={patientName}
                    selectedService={state.selectedReason || ''}
                    onReset={handleReset}
                    onPDF={() => setShowPDF(true)}
                    onSecurePackage={handleDownloadSecurePackage}
                    onSendPackageLink={handleSendPackageLink}
                    canSendPackageLink={Boolean(patientEmail)}
                />
                {showWaitingRoom && store.sessionId && store.token && (
                    <WaitingRoomModal
                        open={isSubmitted}
                        onClose={handleReset}
                        sessionId={store.sessionId}
                        patientName={patientName || 'Patient'}
                        service={state.selectedReason || ''}
                        token={store.token}
                    />
                )}
                {showPDF && (
                    <PDFExport
                        questions={allQuestions}
                        answers={state.answers}
                        activePathIds={activePathIds}
                        patientName={patientName}
                        selectedService={state.selectedReason || ''}
                        onClose={() => setShowPDF(false)}
                    />
                )}
            </>
        );
    }

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
            <HistorySidebar
                questions={allQuestions}
                answers={state.answers}
                activePathIds={activePathIds}
                currentQuestionId={state.currentQuestionId}
                onJumpToQuestion={handleJumpToQuestion}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main className="flex-1 relative flex flex-col min-w-0">
                {/* Background effects - subtle for 40% whitespace target */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
                </div>

                {/* Header - Simplified Navigation (Max 5 items per Miller's Law) */}
                <header className="relative z-10 px-6 lg:px-8 py-4 flex items-center justify-between border-b border-[var(--border-primary)] backdrop-blur-md bg-[var(--bg-overlay)] text-[var(--text-primary)]">
                    {/* Left: History + Service Info (Max 2 items) */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            aria-label={t('Verlauf anzeigen', 'Verlauf anzeigen')}
                            className="
                                p-3 min-h-[48px] min-w-[48px]  /* 48px touch target */
                                hover:bg-[var(--bg-card)] rounded-[20px]  /* 20px radius */
                                transition-colors border border-[var(--border-primary)] 
                                active:scale-95 shadow-lg shadow-blue-500/5 group
                            "
                        >
                            <History className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 ${theme.bgClass} rounded-[16px] border ${theme.borderClass} shadow-lg shadow-black/20`}>
                                <theme.icon className={`w-5 h-5 ${theme.colorClass}`} />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold tracking-tight">{t(state.selectedReason || 'Anamnese')}</h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    {patientName ? `${patientName} – ` : ''}{t('Frage')} {totalAnswered + 1}/{totalEstimated}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Controls (Max 3 items visible on mobile, 5 on desktop) */}
                    <div className="flex items-center gap-2">
                        {/* Time & Security - Hidden on small screens */}
                        <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-[var(--bg-card)] rounded-full border border-[var(--border-primary)]">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs font-medium text-[var(--text-secondary)]">{t('Dauer')}: <span className="text-[var(--text-primary)]">{t(estTime)}</span></span>
                            </div>
                            <div className="w-px h-3 bg-[var(--border-primary)]" />
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-500/70" />
                                <span className="text-xs font-medium text-green-500/70 uppercase tracking-wider">{t('Sicher')}</span>
                            </div>
                        </div>

                        {/* Simple Mode Toggle - Phase 3 Feature */}
                        <SimpleModeToggle />

                        {/* Other Controls - Hidden on mobile */}
                        <div className="hidden sm:flex items-center gap-2">
                            <ModeToggle />
                            <FontSizeControl />
                            <LanguageSelector />
                            <ThemeToggle />
                            <KioskToggle />
                        </div>

                        {/* Home/Exit Button */}
                        <button
                            onClick={handleReset}
                            className="
                                p-3 min-h-[48px] min-w-[48px]  /* 48px touch target */
                                text-[var(--text-muted)] hover:text-[var(--text-primary)] 
                                hover:bg-[var(--bg-card)] rounded-[20px]  /* 20px radius */
                                transition-all border border-transparent hover:border-[var(--border-primary)]
                            "
                            title={t('Abbrechen & Home')}
                        >
                            <Home className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Main Content - Progressive Disclosure Based on Simple Mode */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 text-[var(--text-primary)]">
                    <div className={`
                        mx-auto px-6 lg:px-8 py-8 
                        ${store.simpleMode ? 'max-w-2xl' : 'max-w-3xl'}  /* Narrower in simple mode for focus */
                    `}>
                        {/* Progress - Increased spacing for breathing room */}
                        <div className="mb-10 space-y-4">
                            <ProgressBar
                                progress={progress}
                                colorClass={theme.colorClass}
                                currentStep={totalAnswered + 1}
                                totalSteps={activePathIds.length}
                            />

                            {/* Chapter Progress + Auto-Save (Trust & Transparency) */}
                            <div className="flex items-start justify-between gap-4">
                                <ChapterProgress
                                    activeChapterIndex={(() => {
                                        const currentQ = allQuestions.find(q => q.id === state.currentQuestionId);
                                        if (!currentQ) return 0;
                                        const idx = DEFAULT_CHAPTERS.findIndex(ch => ch.sections.includes(currentQ.section));
                                        return idx >= 0 ? idx : 0;
                                    })()}
                                    answeredCount={totalAnswered}
                                    totalEstimated={activePathIds.length}
                                    compact={store.simpleMode}
                                />
                                <AutoSaveIndicator />
                            </div>
                        </div>

                        {/* Workflow-Hinweis-Banner (INFO-Level — patient-sicher) */}
                        {triageAlert && triageAlert.level !== 'PRIORITY' && (
                            <AnmeldeHinweisBanner
                                hinweis={triageAlert}
                                onDismiss={() => setTriageAlert(null)}
                            />
                        )}

                        {/* Summary (letzte Frage) */}
                        {isLastQuestion && (
                            <div className="mb-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <AnswerSummary
                                    questions={allQuestions}
                                    answers={state.answers}
                                    activePathIds={activePathIds}
                                    onEdit={handleEditQuestion}
                                    colorClass={theme.colorClass}
                                    bgClass={theme.bgClass}
                                    borderClass={theme.borderClass}
                                />
                            </div>
                        )}

                        {/* Question Content - Single Focus in Simple Mode */}
                        <div 
                            className={`
                                min-h-[400px] 
                                ${store.simpleMode ? 'flex flex-col items-center justify-center' : ''}
                            `} 
                            aria-live="polite" 
                            aria-atomic="true"
                        >
                            {/* Schwangerschafts-Check */}
                            {isSchwangerschaftQuestion ? (
                                <div className={`
                                    bg-[var(--bg-card)] rounded-[20px] p-8 border border-[var(--border-primary)]
                                    ${store.simpleMode ? 'w-full max-w-lg shadow-xl' : ''}
                                `}>
                                    <SchwangerschaftCheck
                                        onAnswer={(value) => handleAnswer('8800', value)}
                                        initialValue={state.answers['8800']?.value as string}
                                    />
                                </div>
                            ) : isMedicationQuestion ? (
                                /* Strukturierte Medikamenten-Eingabe */
                                <div className={`
                                    space-y-6
                                    ${store.simpleMode ? 'w-full max-w-lg' : ''}
                                `}>
                                    <div className="bg-[var(--bg-card)] rounded-[20px] p-8 border border-[var(--border-primary)]">
                                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                                            {currentQuestion.question}
                                        </h2>
                                        <p className="text-sm text-[var(--text-muted)]">
                                            {t('medInputHint', 'Bitte geben Sie alle aktuellen Medikamente strukturiert ein, oder nutzen Sie das Freitextfeld unten.')}
                                        </p>
                                    </div>
                                    <MedicationManager
                                        value={medications}
                                        onChange={(meds) => {
                                            setMedications(meds);
                                            // Auch als Freitext-Antwort speichern
                                            const text = meds.map(m => `${m.name} ${m.dosage} (${m.frequency})`).join('; ');
                                            handleAnswer('8900', text || '');
                                        }}
                                    />
                                    {/* Fallback Freitext */}
                                    <div className="bg-[var(--bg-card)] rounded-[20px] p-6 border border-[var(--border-primary)]">
                                        <label className="text-xs text-[var(--text-muted)] block mb-2">
                                            {t('medFreetextLabel', 'Oder als Freitext eingeben:')}
                                        </label>
                                        <textarea
                                            value={state.answers['8900']?.value as string || ''}
                                            onChange={(e) => handleAnswer('8900', e.target.value)}
                                            placeholder="z.B. Ramipril 5mg morgens, Metformin 850mg 2x täglich"
                                            rows={3}
                                            className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[16px] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            ) : currentQuestion.type === 'surgery-form' ? (
                                <div className={`
                                    space-y-6
                                    ${store.simpleMode ? 'w-full max-w-lg' : ''}
                                `}>
                                    <div className="bg-[var(--bg-card)] rounded-[20px] p-8 border border-[var(--border-primary)]">
                                        <SurgeryManager
                                            value={surgeries}
                                            onChange={(surgs) => {
                                                setSurgeries(surgs);
                                                // Auch als Freitext speichern
                                                const text = surgs.map(s => `${s.surgeryName} (${s.date})`).join('; ');
                                                handleAnswer(currentQuestion.id, text || '');
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : currentQuestion.type === 'patient-identify' ? (
                                <div className={`
                                    bg-[var(--bg-card)] rounded-[20px] p-8 border border-[var(--border-primary)]
                                    ${store.simpleMode ? 'w-full max-w-lg shadow-xl' : ''}
                                `}>
                                    <PatientIdentify
                                        onIdentified={(patient) => {
                                            // Store patient data and advance
                                            handleAnswer(currentQuestion.id, JSON.stringify({
                                                patientId: patient.patientId,
                                                patientNumber: patient.patientNumber,
                                                name: patient.name,
                                            }));
                                        }}
                                        onFallback={() => {
                                            // Patient not found → mark as fallback and go to manual flow
                                            handleAnswer(currentQuestion.id, 'fallback');
                                        }}
                                        onError={(msg) => {
                                            console.error('Patient identify error:', msg);
                                        }}
                                    />
                                </div>
                            ) : state.currentQuestionId === '9999' ? (
                                <IGelServices />
                            ) : (
                                /* Standard-Frage with Simple Mode Support */
                                <div className={`
                                    ${store.simpleMode ? 'w-full max-w-lg' : ''}
                                `}>
                                    {/* Optional Camera Scanner Button for demographics */}
                                    {(currentQuestion.id === '0001' || currentQuestion.id === '0011' || currentQuestion.id === '0003' || currentQuestion.id === '2000') && (
                                        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-[20px]">
                                            <div className="flex items-start gap-3">
                                                <button
                                                    onClick={() => setShowCameraScanner(true)}
                                                    className="
                                                        flex items-center gap-2 px-4 py-3 
                                                        min-h-[48px]  /* 48px touch target */
                                                        bg-blue-600 hover:bg-blue-500 text-white 
                                                        rounded-[16px] text-sm font-medium 
                                                        transition-all shadow-lg shadow-blue-500/20 shrink-0
                                                    "
                                                >
                                                    <Camera className="w-4 h-4" />
                                                    {t('Kamera')}
                                                </button>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-blue-400 mb-1">{t('Kamera scannen')}</p>
                                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                                        {t('cameraExplanation', 'Scannen Sie Ihre elektronische Gesundheitskarte (eGK), um Name, Geburtsdatum und Versicherungsdaten automatisch einzulesen. Halten Sie die Karte einfach vor die Kamera.')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Question Card - Enhanced spacing in Simple Mode */}
                                    <div className={`
                                        bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-primary)]
                                        ${store.simpleMode ? 'p-8 lg:p-10 shadow-xl' : 'p-6 lg:p-8'}
                                    `}>
                                        {/* Simple Mode: More prominent question display */}
                                        {store.simpleMode && (
                                            <div className="mb-8 text-center">
                                                <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 rounded-full">
                                                    {t('question.label', 'Frage')} {totalAnswered + 1} {t('question.of', 'von')} {totalEstimated}
                                                </span>
                                                <h2 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)] leading-relaxed">
                                                    {currentQuestion.question}
                                                </h2>
                                                {currentQuestion.description && (
                                                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                                                        {currentQuestion.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        <QuestionRenderer
                                            question={currentQuestion}
                                            value={state.answers[state.currentQuestionId!]?.value as string}
                                            onAnswer={(value) => handleAnswer(currentQuestion.id, value as string | string[] | boolean | number | Record<string, unknown> | null)}
                                            error={localError}
                                            simpleMode={store.simpleMode}  /* Pass simple mode for child components */
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation - 48px Touch Targets, Psychology-Optimized */}
                        <div className="mt-10 flex items-center justify-between gap-4">
                            <button
                                onClick={handleGoBack}
                                className={`
                                    flex items-center gap-3 
                                    min-h-[48px] min-w-[48px] px-6 py-3  /* 48px touch target */
                                    rounded-[20px] font-semibold text-sm  /* 20px radius */
                                    transition-all duration-200
                                    active:scale-[0.98]
                                    ${state.questionHistory.length === 0
                                        ? 'opacity-0 pointer-events-none'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                                    }
                                `}
                                aria-label={t('Zurück')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">{t('Zurück')}</span>
                            </button>

                            <button
                                onClick={handleNext}
                                className="
                                    btn-primary group flex items-center gap-3 
                                    min-h-[48px] min-w-[48px] px-8 py-4  /* 48px touch target, extra padding for primary */
                                    rounded-[20px] font-bold text-sm  /* 20px radius */
                                    transition-all shadow-lg hover:shadow-xl
                                    hover:scale-[1.02] active:scale-[0.98]
                                "
                                aria-label={isLastQuestion ? t('Absenden') : t('Weiter')}
                            >
                                <span>{isLastQuestion ? t('Absenden') : t('Weiter')}</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Privacy Reassurance - Increased spacing */}
                        {!isLastQuestion && (
                            <div className="mt-10 p-4 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center gap-4">
                                <div className="p-2.5 bg-green-500/10 rounded-[16px] border border-green-500/20 shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-green-400" />
                                </div>
                                <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                                    {t('dataProtectionDetail', 'AES-256 verschlüsselt • DSGVO-konform • Ausschließlich medizinische Nutzung')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* PRIORITY Anmelde-Hinweis Overlay — patient-sicher */}
            {criticalOverlay && (
                <AnmeldeHinweisOverlay
                    hinweis={criticalOverlay}
                    onAcknowledge={() => setCriticalOverlay(null)}
                />
            )}

            {/* Camera Scanner Modal */}
            {showCameraScanner && (
                <CameraScanner
                    onScan={handleCameraScan}
                    onClose={() => setShowCameraScanner(false)}
                />
            )}

            {/* Email Fallback Modal (Phase 3) */}
            {showEmailFallback && (
                <EmailFallbackModal
                    open={showEmailFallback}
                    onContinuePhoneOnly={() => {
                        // Set flag and proceed
                        dispatch({
                            type: 'ANSWER_QUESTION',
                            payload: {
                                questionId: '3003',
                                value: '__PHONE_ONLY__',
                                answeredAt: new Date()
                            }
                        });
                        setShowEmailFallback(false);
                        handleNext();
                    }}
                    onProvideEmail={() => {
                        // Refocus email field
                        setShowEmailFallback(false);
                        // Email input will auto-focus
                    }}
                    isLoading={false}
                />
            )}

            {/* InfoBreak Overlay (Modul 1: Wartezeit-Management) */}
            {infoBreakContent && (
                <InfoBreak
                    content={infoBreakContent}
                    onDismiss={() => {
                        const pendingNext = state.answers['__pendingNextAtom']?.value as string;
                        setInfoBreakContent(null);
                        if (pendingNext) {
                            dispatch({ type: 'SET_CURRENT_QUESTION', payload: pendingNext });
                            store.setAnswer('__pendingNextAtom', null);
                        }
                    }}
                    onSkip={() => {
                        const pendingNext = state.answers['__pendingNextAtom']?.value as string;
                        setInfoBreakContent(null);
                        if (pendingNext) {
                            dispatch({ type: 'SET_CURRENT_QUESTION', payload: pendingNext });
                            store.setAnswer('__pendingNextAtom', null);
                        }
                    }}
                />
            )}

            {/* PDF Export Modal */}
            {showPDF && (
                <PDFExport
                    questions={allQuestions}
                    answers={state.answers}
                    activePathIds={activePathIds}
                    patientName={patientName}
                    selectedService={state.selectedReason || ''}
                    onClose={() => setShowPDF(false)}
                />
            )}
            {store.sessionId && (
                <ChatBubble sessionId={store.sessionId} />
            )}

            {/* Confetti celebration — only when patient opted in to gamification */}
            <CompletionCelebration show={
                isLastQuestion && progress >= 100 &&
                localStorage.getItem('gamification_consent') === 'true'
            } />

            {/* Session timeout warning (15 min idle → 5 min countdown) */}
            <SessionTimeoutWarning onTimeout={handleReset} />
        </div>
    );
}
