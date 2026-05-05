/**
 * Patient API Hooks
 * 
 * Hooks für Patienten-bezogene Operationen:
 * - Session-Verwaltung (Erstellen, Laden, Abschließen)
 * - Antworten absenden
 * - Medikamente und OP-Historie verwalten
 * - Atoms/Fragen laden
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, setAuthToken } from '../../api/client';
import { useSessionStore } from '../../store/sessionStore';
import { getErrorMessage, STALE_TIME } from './utils';
import { useOptimisticMutation } from './useOptimisticMutation';
import type { CreateSessionPayload, SubmitAnswerPayload, SubmitAnswerResponse } from './types';
import type { TriageAlert } from '../../store/sessionStore';

// ─── Session Hooks ──────────────────────────────────────────

/**
 * Hook zum Erstellen einer neuen Session
 * 
 * Erstellt eine Session, setzt das Auth-Token und navigiert zum ersten Atom
 * 
 * @example
 * ```ts
 * const createSession = useCreateSession();
 * createSession.mutate({ praxisId: '123', service: 'Allgemeinmedizin' });
 * ```
 */
export function useCreateSession() {
    const { setSession, setFlowStep, navigateToAtom } = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateSessionPayload) => api.createSession(data),
        onSuccess: (response) => {
            setAuthToken(response.token ?? null);
            setSession(response.sessionId, response.token ?? null);
            setFlowStep('questionnaire');

            if (response.nextAtomIds?.length > 0) {
                navigateToAtom(response.nextAtomIds[0]);
            }

            queryClient.invalidateQueries({ queryKey: ['session'] });
        },
        onError: (error: unknown) => {
            console.error('Session-Fehler:', error);
            useSessionStore.getState().setError(
                getErrorMessage(error, 'Verbindungsfehler. Bitte versuchen Sie es erneut.')
            );
        },
    });
}

/**
 * Hook zum Laden des Session-State vom Server
 * 
 * @param sessionId - Die Session-ID oder null wenn keine Session aktiv
 * @returns Query mit dem Session-State
 */
export function useSessionState(sessionId: string | null) {
    return useQuery({
        queryKey: sessionId ? ['session', sessionId] : ['session'],
        queryFn: () => api.getSessionState(sessionId!),
        enabled: !!sessionId,
        staleTime: STALE_TIME.NORMAL,
        refetchOnWindowFocus: false,
    });
}

// ─── Antwort Hooks ──────────────────────────────────────────

/**
 * Hook zum Absenden einer Antwort mit Optimistic Updates
 * 
 * SPEICHERUNG: UI zeigt sofort Erfolg, Server-Request läuft im Hintergrund.
 * Bei Fehler: Automatischer Rollback + Error Message.
 * 
 * WICHTIG: Dieser Hook ist für NICHT-KRITISCHE Antworten gedacht.
 * Triage-Alerts werden NACH Server-Response verarbeitet (kein Rollback bei Triage).
 * 
 * @example
 * ```ts
 * const submitAnswer = useSubmitAnswer();
 * submitAnswer.mutate({ atomId: 'Q001', value: 'ja' });
 * // UI zeigt sofort: Antwort gespeichert
 * // Bei Server-Fehler: Automatisches Rollback, User sieht alten Zustand
 * ```
 */
export function useSubmitAnswer() {
    const { sessionId, setAnswer, addAlert, setProgress, setError } = useSessionStore();

    return useOptimisticMutation<SubmitAnswerResponse, SubmitAnswerPayload>({
        mutationFn: async (data) => {
            if (!sessionId) throw new Error('Keine aktive Session');
            const response = await api.submitAnswer(sessionId, data);
            return response;
        },
        queryKey: ['session', sessionId || ''],

        /**
         * Optimistische Aktualisierung:
         * - Zeigt Antwort sofort in der UI an
         * - Aktualisiert lokalen Antwort-Cache
         * - Erhöht Fortschritt sofort (angenommen)
         */
        optimisticUpdate: (oldData, payload) => {
            // Lokale Antwort sofort cachen (für UI)
            setAnswer(payload.atomId, payload.value as string | string[] | boolean | number | Record<string, unknown> | null);

            // Fortschritt optimistisch erhöhen (wird bei Server-Antwort korrigiert)
            const total = oldData?.progress?.total || 100;
            const newCompleted = (oldData?.progress?.completed || 0) + 1;
            const newPercentage = Math.min(100, Math.round((newCompleted / total) * 100));
            
            setProgress(newPercentage);

            // Optimistische Datenstruktur zurückgeben
            return {
                ...oldData,
                progress: {
                    completed: newCompleted,
                    total: total,
                    percentage: newPercentage,
                },
            } as SubmitAnswerResponse;
        },

        rollbackOnError: true,
        invalidateOnSuccess: true,

        /**
         * Erfolgs-Handler (nach Server-Response):
         * - Verarbeitet Triage-Alerts (kritisch - nie optimistisch)
         * - Korrigiert Fortschritt mit Server-Daten
         */
        onSuccess: (response) => {
            // Routing-Hinweise verarbeiten — ausschließlich `patientMessage` aus dem
            // Server-Response (RoutingEngine.toPatientSafeView) wird in den Store geschrieben.
            // Der `staffMessage` existiert in dieser Response nicht und kann daher nicht leaken.
            // `routingHints` ist der kanonische Schlüssel; `redFlags` bleibt als Fallback während Übergangszeit.
            const hints = response.routingHints ?? response.redFlags ?? [];
            if (hints.length > 0) {
                for (const hint of hints) {
                    const storeAlert: TriageAlert = {
                        level: hint.level === 'PRIORITY' ? 'CRITICAL' : 'WARNING',
                        atomId: 'unknown',
                        message: hint.patientMessage,
                        triggerValues: null,
                    };
                    addAlert(storeAlert);
                }
            }

            // Fortschritt mit Server-Daten korrigieren
            if (response.progress) {
                setProgress(response.progress.percentage);
            }
        },

        /**
         * Fehler-Handler (nach Rollback):
         * - Rollback wurde automatisch durchgeführt
         * - User-Feedback anzeigen
         */
        onError: (error: unknown) => {
            console.error('Antwort-Fehler (Rollback durchgeführt):', error);
            setError(getErrorMessage(error, 'Die Antwort ließ sich gerade nicht speichern — Ihre Eingabe ist zurückgesetzt. Versuchen Sie es bitte erneut.'));
        },
    });
}

/**
 * Hook zum Absenden von BG-Unfall Details
 * 
 * Für die separate Verarbeitung von Unfalldaten (Phase 7 Priority 1)
 */
export function useSubmitAccidentDetails() {
    const { sessionId } = useSessionStore();
    return useMutation({
        mutationFn: (data: unknown) => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.submitAccidentDetails(sessionId, data);
        }
    });
}

/**
 * Hook zum Laden der Dauermedikation
 */
export function useMedications() {
    const { sessionId } = useSessionStore();
    return useQuery({
        queryKey: ['medications', sessionId],
        queryFn: () => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.getMedications(sessionId);
        },
        enabled: !!sessionId,
    });
}

/**
 * Hook zum Speichern der Dauermedikation
 */
export function useSubmitMedications() {
    const { sessionId } = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (medications: unknown[]) => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.submitMedications(sessionId, medications);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['medications', sessionId] });
        }
    });
}

/**
 * Hook zum Laden der OP-Historie
 */
export function useSurgeries() {
    const { sessionId } = useSessionStore();
    return useQuery({
        queryKey: ['surgeries', sessionId],
        queryFn: () => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.getSurgeries(sessionId);
        },
        enabled: !!sessionId,
    });
}

/**
 * Hook zum Speichern der OP-Historie
 */
export function useSubmitSurgeries() {
    const { sessionId } = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (surgeries: unknown[]) => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.submitSurgeries(sessionId, surgeries);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surgeries', sessionId] });
        }
    });
}

/**
 * Hook zum Abschließen einer Session
 */
export function useSubmitSession() {
    const { sessionId, setFlowStep } = useSessionStore();

    return useMutation({
        mutationFn: () => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.submitSession(sessionId);
        },
        onSuccess: () => {
            setFlowStep('submitted');
        },
    });
}

// ─── Fragen Hooks ───────────────────────────────────────────

/**
 * Hook zum Laden von Atoms/Fragen vom Server
 * 
 * @param ids - Optionale Array von Atom-IDs, oder undefined für alle
 * @returns Query mit den geladenen Atoms
 */
export function useAtoms(ids?: string[]) {
    const { loadAtoms } = useSessionStore();

    return useQuery({
        queryKey: ['atoms', ids?.join(',') || 'all'],
        queryFn: async () => {
            const response = await api.getAtoms(ids);
            loadAtoms(response.atoms);
            return response.atoms;
        },
        staleTime: STALE_TIME.SLOW, // 5 Minuten – Fragen ändern sich selten
        refetchOnWindowFocus: false,
    });
}
