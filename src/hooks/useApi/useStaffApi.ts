/**
 * Staff API Hooks
 * 
 * Hooks für Mitarbeiter/Arzt-bezogene Operationen:
 * - Arzt Dashboard (Sessions, Triage)
 * - MFA Dashboard
 * - Wartezimmer/Queue
 * - Chat
 * - Wartezimmer-Content
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { REFETCH_INTERVAL, STALE_TIME } from './utils';
import { useAbortableRequest, isAbortError } from './useAbortableRequest';

// ─── Arzt Dashboard Hooks ───────────────────────────────────

/**
 * Hook zum Laden aller Sessions für das Arzt-Dashboard
 * 
 * Polled alle 10 Sekunden für Echtzeit-Updates
 */
export function useArztSessions() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['arzt', 'sessions'],
        queryFn: async () => {
            try {
                return await api.arztGetSessions();
            } catch (error) {
                if (isAbortError(error)) {
                    return { sessions: [] };
                }
                throw error;
            }
        },
        refetchInterval: REFETCH_INTERVAL.FAST,
        staleTime: STALE_TIME.FAST,
    });
}

/**
 * Hook zum Laden einer einzelnen Session-Detail für das Arzt-Dashboard
 * 
 * @param sessionId - Die Session-ID
 */
export function useArztSessionDetail(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['arzt', 'session', sessionId],
        queryFn: async () => {
            try {
                return await api.arztGetSession(sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!sessionId,
        staleTime: STALE_TIME.NORMAL,
    });
}

/**
 * Hook zum Bestätigen (Acknowledge) einer Triage-Meldung
 */
export function useAckTriage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (triageId: string) => api.arztAckTriage(triageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arzt'] });
        },
    });
}

/**
 * Hook zum Laden der Session-Zusammenfassung
 * 
 * Die Zusammenfassung ändert sich nicht, daher staleTime: Infinity
 * 
 * @param sessionId - Die Session-ID
 */
export function useArztSessionSummary(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['arzt', 'session', sessionId, 'summary'],
        queryFn: async () => {
            try {
                return await api.arztGetSessionSummary(sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!sessionId,
        staleTime: STALE_TIME.STATIC,
    });
}

// ─── MFA Dashboard Hooks ───────────────────────────────────

/**
 * Hook zum Laden aller Sessions für das MFA-Dashboard
 */
export function useMfaSessions() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['mfa', 'sessions'],
        queryFn: async () => {
            try {
                return await api.mfaGetSessions();
            } catch (error) {
                if (isAbortError(error)) {
                    return { sessions: [] };
                }
                throw error;
            }
        },
        refetchInterval: REFETCH_INTERVAL.FAST,
        staleTime: STALE_TIME.FAST,
    });
}

/**
 * Hook zum Laden der Ärzte-Liste für MFA
 */
export function useMfaDoctors() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['mfa', 'doctors'],
        queryFn: async () => {
            try {
                return await api.mfaGetDoctors();
            } catch (error) {
                if (isAbortError(error)) {
                    return { doctors: [] };
                }
                throw error;
            }
        },
        staleTime: STALE_TIME.SLOW,
    });
}

/**
 * Hook zum Zuweisen eines Arztes zu einer Session
 */
export function useMfaAssignDoctor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, arztId }: { sessionId: string; arztId: string }) =>
            api.mfaAssignDoctor(sessionId, arztId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'sessions'] });
        },
    });
}

export function useMfaReceptionInbox() {
    return useQuery({
        queryKey: ['mfa', 'reception', 'inbox'],
        queryFn: async () => api.mfaReceptionInbox(),
        refetchInterval: REFETCH_INTERVAL.FAST,
    });
}

export function useMfaReceptionStats() {
    return useQuery({
        queryKey: ['mfa', 'reception', 'stats'],
        queryFn: async () => api.mfaReceptionStats(),
        refetchInterval: REFETCH_INTERVAL.FAST,
    });
}

export function useMfaReceptionDetail(sessionId: string) {
    return useQuery({
        queryKey: ['mfa', 'reception', 'detail', sessionId],
        queryFn: async () => api.mfaReceptionDetail(sessionId),
        enabled: !!sessionId,
        staleTime: STALE_TIME.NORMAL,
    });
}

export function useMfaReceptionMarkRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: string) => api.mfaReceptionMarkRead(sessionId),
        onSuccess: (_data, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception'] });
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception', 'detail', sessionId] });
        },
    });
}

export function useMfaReceptionMarkProcessed() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: string) => api.mfaReceptionMarkProcessed(sessionId),
        onSuccess: (_data, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception'] });
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception', 'detail', sessionId] });
        },
    });
}

export function useMfaReceptionMarkCompleted() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: string) => api.mfaReceptionMarkCompleted(sessionId),
        onSuccess: (_data, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception'] });
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception', 'detail', sessionId] });
        },
    });
}

export function useMfaReceptionPracticeCopy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: string) => api.mfaReceptionPracticeCopy(sessionId),
        onSuccess: (_data, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception'] });
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception', 'detail', sessionId] });
        },
    });
}

export function useMfaReceptionRespond() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            sessionId,
            ...data
        }: {
            sessionId: string;
            templateKey: 'received' | 'in_review' | 'completed' | 'callback';
            customNote?: string | null;
            mode?: 'auto' | 'smtp' | 'manual';
        }) => api.mfaReceptionRespond(sessionId, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception'] });
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception', 'detail', variables.sessionId] });
        },
    });
}

export function useMfaReceptionConfirm() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, kind }: { sessionId: string; kind: 'practice-copy' | 'response' }) =>
            api.mfaReceptionConfirm(sessionId, kind),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception'] });
            queryClient.invalidateQueries({ queryKey: ['mfa', 'reception', 'detail', variables.sessionId] });
        },
    });
}

// ─── Chat Hooks ───────────────────────────────────────────

/**
 * Hook zum Laden von Chat-Nachrichten
 * 
 * @param sessionId - Die Session-ID
 */
export function useChatMessages(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['chat', sessionId],
        queryFn: async () => {
            try {
                return await api.getChatMessages(sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { messages: [] };
                }
                throw error;
            }
        },
        enabled: !!sessionId,
        staleTime: STALE_TIME.NORMAL,
    });
}

/**
 * Hook zum Senden einer Chat-Nachricht via REST-Fallback
 */
export function useSendChatMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, text }: { sessionId: string; text: string }) =>
            api.sendChatMessage(sessionId, text),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['chat', variables.sessionId] });
        },
    });
}

// ─── Queue / Wartezimmer Hooks ─────────────────────────────

/**
 * Hook zum Laden der Warteschlange
 */
export function useQueue() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['queue'],
        queryFn: async () => {
            try {
                return await api.queueList();
            } catch (error) {
                if (isAbortError(error)) {
                    return { queue: [], stats: { waiting: 0, called: 0, inTreatment: 0, total: 0 } };
                }
                throw error;
            }
        },
        refetchInterval: REFETCH_INTERVAL.FAST,
        staleTime: STALE_TIME.FAST,
    });
}

/**
 * Hook zum Laden der Position in der Warteschlange
 * 
 * @param sessionId - Die Session-ID
 */
export function useQueuePosition(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['queue', 'position', sessionId],
        queryFn: async () => {
            try {
                return await api.queuePosition(sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { position: null, status: null };
                }
                throw error;
            }
        },
        enabled: !!sessionId,
        refetchInterval: REFETCH_INTERVAL.REALTIME,
    });
}

/**
 * Hook zum Hinzufügen zur Warteschlange
 */
export function useQueueJoin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { sessionId: string; patientName: string; service: string; priority?: string }) =>
            api.queueJoin(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

/**
 * Hook zum Aufrufen eines Patienten
 */
export function useQueueCall() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueCall(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

/**
 * Hook zum Markieren als "in Behandlung"
 */
export function useQueueTreat() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueTreat(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

/**
 * Hook zum Abschließen eines Queue-Eintrags
 */
export function useQueueDone() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueDone(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

/**
 * Hook zum Entfernen aus der Warteschlange
 */
export function useQueueRemove() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueRemove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

/**
 * Hook zum Absenden von Queue-Feedback
 */
export function useQueueFeedback() {
    return useMutation({
        mutationFn: ({ id, rating }: { id: string; rating: number }) =>
            api.queueFeedback(id, rating),
    });
}

/**
 * Hook zum Laden der Flow-Konfiguration für die Warteschlange
 * 
 * @param sessionId - Die Session-ID
 */
export function useQueueFlowConfig(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['queue', 'flow-config', sessionId],
        queryFn: async () => {
            try {
                return await api.queueFlowConfig(sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { level: 0, breakFrequency: 999, breakDuration: 0, contentTypes: [], extraQuestionsEnabled: false };
                }
                throw error;
            }
        },
        enabled: !!sessionId,
        refetchInterval: 30 * 1000,
    });
}

// ─── Waiting Content Hooks ─────────────────────────────────

/**
 * Hook zum Laden von Wartezimmer-Content
 * 
 * @param params - Optionale Filter-Parameter
 */
export function useWaitingContent(params?: { lang?: string; waitMin?: number; exclude?: string; category?: string; limit?: number }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['content', 'waiting', params],
        queryFn: async () => {
            try {
                return await api.getWaitingContent(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { items: [] };
                }
                throw error;
            }
        },
        refetchInterval: REFETCH_INTERVAL.SLOW,
    });
}

/**
 * Hook zum Laden von Content-Analytics
 * 
 * @param days - Anzahl der Tage (optional)
 */
export function useContentAnalytics(days?: number) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['content', 'analytics', days],
        queryFn: async () => {
            try {
                return await api.getContentAnalytics(days);
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalViews: 0, totalLikes: 0, quizAccuracy: null, topContent: [] };
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Tracken von Content-Views
 */
export function useTrackContentView() {
    return useMutation({
        mutationFn: ({ contentId, sessionId, durationSec }: { contentId: string; sessionId: string; durationSec?: number }) =>
            api.trackContentView(contentId, sessionId, durationSec),
    });
}

/**
 * Hook zum Liken von Content
 */
export function useLikeContent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ contentId, sessionId }: { contentId: string; sessionId: string }) =>
            api.likeContent(contentId, sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content', 'waiting'] });
        },
    });
}

/**
 * Hook zum Tracken von Quiz-Antworten
 */
export function useTrackQuizAnswer() {
    return useMutation({
        mutationFn: ({ contentId, sessionId, selectedOption, correct }: { contentId: string; sessionId: string; selectedOption: number; correct: boolean }) =>
            api.trackQuizAnswer(contentId, sessionId, selectedOption, correct),
    });
}
