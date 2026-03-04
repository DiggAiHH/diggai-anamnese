import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, setAuthToken, type CreateSessionPayload, type SubmitAnswerPayload } from '../api/client';
import { useSessionStore } from '../store/sessionStore';

function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error) return response.data.error;
    }
    return fallback;
}

/**
 * React Query Hooks für Server-State
 * Ersetzt die direkte localStorage-Persistierung
 */

// ─── Session Hooks ──────────────────────────────────────────

/**
 * Session erstellen
 */
export function useCreateSession() {
    const { setSession, setFlowStep, navigateToAtom } = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateSessionPayload) => api.createSession(data),
        onSuccess: (response) => {
            setAuthToken(response.token);
            setSession(response.sessionId, response.token);
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
 * Session-State vom Server laden
 */
export function useSessionState(sessionId: string | null) {
    return useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => api.getSessionState(sessionId!),
        enabled: !!sessionId,
        staleTime: 30 * 1000, // 30 Sekunden
        refetchOnWindowFocus: false,
    });
}

// ─── Antwort Hooks ──────────────────────────────────────────

/**
 * Antwort absenden + nächste Fragen erhalten
 */
export function useSubmitAnswer() {
    const { sessionId, setAnswer, addAlert, setProgress, setError } = useSessionStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubmitAnswerPayload) => {
            if (!sessionId) throw new Error('Keine aktive Session');
            return api.submitAnswer(sessionId, data);
        },
        onSuccess: (response, variables) => {
            // Lokale Antwort cachen
            setAnswer(variables.atomId, variables.value as string | string[] | boolean | number | Record<string, unknown> | null);

            // Triage-Alerts verarbeiten
            if (response.redFlags) {
                for (const flag of response.redFlags) {
                    addAlert(flag);
                }
            }

            // Fortschritt aktualisieren
            if (response.progress) {
                setProgress(response.progress);
            }

            // Session-Cache invalidieren
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        },
        onError: (error: unknown) => {
            console.error('Antwort-Fehler:', error);
            setError(getErrorMessage(error, 'Fehler beim Speichern der Antwort'));
        },
    });
}

/**
 * BG-Unfall Daten separat absenden (Phase 7 Priority 1)
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
 * Dauermedikation laden
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
 * Dauermedikation speichern
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
 * OP-Historie laden
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
 * OP-Historie speichern
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
 * Session abschließen
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
 * Fragen vom Server laden (Batch)
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
        staleTime: 5 * 60 * 1000, // 5 Minuten – Fragen ändern sich selten
        refetchOnWindowFocus: false,
    });
}

// ─── Arzt Dashboard Hooks ───────────────────────────────────

export function useGenerateQrToken() {
    return useMutation({
        mutationFn: (service?: string) => api.generateQrToken(service)
    });
}

export function useArztLogin() {
    return useMutation({
        mutationFn: ({ username, password }: { username: string; password: string }) =>
            api.arztLogin(username, password),
        onSuccess: (response) => {
            setAuthToken(response.token);
        },
    });
}

export function useArztSessions() {
    return useQuery({
        queryKey: ['arzt', 'sessions'],
        queryFn: () => api.arztGetSessions(),
        refetchInterval: 10 * 1000, // Alle 10s aktualisieren
    });
}

export function useArztSessionDetail(sessionId: string) {
    return useQuery({
        queryKey: ['arzt', 'session', sessionId],
        queryFn: () => api.arztGetSession(sessionId),
        enabled: !!sessionId,
    });
}

export function useAckTriage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (triageId: string) => api.arztAckTriage(triageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['arzt'] });
        },
    });
}

export function useArztSessionSummary(sessionId: string) {
    return useQuery({
        queryKey: ['arzt', 'session', sessionId, 'summary'],
        queryFn: () => api.arztGetSessionSummary(sessionId),
        enabled: !!sessionId,
        staleTime: Infinity, // Zusammenfassung ändert sich nicht
    });
}

// ─── MFA Dashboard Hooks ───────────────────────────────────

export function useMfaSessions() {
    return useQuery({
        queryKey: ['mfa', 'sessions'],
        queryFn: () => api.mfaGetSessions(),
        refetchInterval: 10 * 1000,
    });
}

export function useMfaDoctors() {
    return useQuery({
        queryKey: ['mfa', 'doctors'],
        queryFn: () => api.mfaGetDoctors(),
        staleTime: 5 * 60 * 1000,
    });
}

export function useMfaAssignDoctor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, arztId }: { sessionId: string, arztId: string }) =>
            api.mfaAssignDoctor(sessionId, arztId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mfa', 'sessions'] });
        },
    });
}

// ─── Chat Hooks ───────────────────────────────────────────

export function useChatMessages(sessionId: string) {
    return useQuery({
        queryKey: ['chat', sessionId],
        queryFn: () => api.getChatMessages(sessionId),
        enabled: !!sessionId,
        staleTime: 1000 * 60, // 1 Minute
    });
}

// ─── Queue / Wartezimmer Hooks ─────────────────────────────

export function useQueue() {
    return useQuery({
        queryKey: ['queue'],
        queryFn: () => api.queueList(),
        refetchInterval: 10 * 1000,
    });
}

export function useQueuePosition(sessionId: string) {
    return useQuery({
        queryKey: ['queue', 'position', sessionId],
        queryFn: () => api.queuePosition(sessionId),
        enabled: !!sessionId,
        refetchInterval: 5 * 1000,
    });
}

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

export function useQueueCall() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueCall(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useQueueTreat() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueTreat(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useQueueDone() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueDone(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useQueueRemove() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.queueRemove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
}

export function useQueueFeedback() {
    return useMutation({
        mutationFn: ({ id, rating }: { id: string; rating: number }) =>
            api.queueFeedback(id, rating),
    });
}

export function useQueueFlowConfig(sessionId: string) {
    return useQuery({
        queryKey: ['queue', 'flow-config', sessionId],
        queryFn: () => api.queueFlowConfig(sessionId),
        enabled: !!sessionId,
        refetchInterval: 30 * 1000, // Every 30s as per plan
    });
}

// ─── Waiting Content Hooks ─────────────────────────────────

export function useWaitingContent(params?: { lang?: string; waitMin?: number; exclude?: string; category?: string; limit?: number }) {
    return useQuery({
        queryKey: ['content', 'waiting', params],
        queryFn: () => api.getWaitingContent(params),
        refetchInterval: 60 * 1000, // Every 60s
    });
}

export function useContentAnalytics(days?: number) {
    return useQuery({
        queryKey: ['content', 'analytics', days],
        queryFn: () => api.getContentAnalytics(days),
    });
}

export function useTrackContentView() {
    return useMutation({
        mutationFn: ({ contentId, sessionId, durationSec }: { contentId: string; sessionId: string; durationSec?: number }) =>
            api.trackContentView(contentId, sessionId, durationSec),
    });
}

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

export function useTrackQuizAnswer() {
    return useMutation({
        mutationFn: ({ contentId, sessionId, selectedOption, correct }: { contentId: string; sessionId: string; selectedOption: number; correct: boolean }) =>
            api.trackQuizAnswer(contentId, sessionId, selectedOption, correct),
    });
}

// ─── Admin Dashboard Hooks ──────────────────────────────────

export function useAdminStats() {
    return useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: () => api.adminStats(),
        refetchInterval: 30 * 1000,
    });
}

export function useAdminTimeline(days: number = 30) {
    return useQuery({
        queryKey: ['admin', 'timeline', days],
        queryFn: () => api.adminTimeline(days),
    });
}

export function useAdminServiceAnalytics() {
    return useQuery({
        queryKey: ['admin', 'services'],
        queryFn: () => api.adminServiceAnalytics(),
    });
}

export function useAdminTriageAnalytics(days: number = 30) {
    return useQuery({
        queryKey: ['admin', 'triage', days],
        queryFn: () => api.adminTriageAnalytics(days),
    });
}

export function useAdminAuditLog(params?: { page?: number; limit?: number; action?: string; userId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    return useQuery({
        queryKey: ['admin', 'audit-log', params],
        queryFn: () => api.adminAuditLog(params),
    });
}

// ─── Admin User Hooks ───────────────────────────────────────

export function useAdminUsers() {
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: () => api.adminUsers(),
    });
}

export function useAdminCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { username: string; password: string; displayName: string; role: string }) =>
            api.adminCreateUser(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

export function useAdminUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; displayName?: string; role?: string; isActive?: boolean; password?: string; pin?: string }) =>
            api.adminUpdateUser(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

export function useAdminDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.adminDeleteUser(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

// ─── Permission Hooks ───────────────────────────────────────

export function useAdminPermissions() {
    return useQuery({
        queryKey: ['admin', 'permissions'],
        queryFn: () => api.adminPermissions(),
    });
}

export function useAdminRolePermissions(role: string) {
    return useQuery({
        queryKey: ['admin', 'role-permissions', role],
        queryFn: () => api.adminRolePermissions(role),
        enabled: !!role,
    });
}

export function useAdminSetRolePermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ role, permissionIds }: { role: string; permissionIds: string[] }) =>
            api.adminSetRolePermissions(role, permissionIds),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] }); queryClient.invalidateQueries({ queryKey: ['admin', 'role-permissions'] }); },
    });
}

export function useAdminSetUserPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, permissionCodes }: { userId: string; permissionCodes: string[] }) =>
            api.adminSetUserPermissions(userId, permissionCodes),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

// ─── ROI Hooks ──────────────────────────────────────────────

export function useROIToday() {
    return useQuery({
        queryKey: ['roi', 'today'],
        queryFn: () => api.roiToday(),
        refetchInterval: 60 * 1000,
    });
}

export function useROIHistory(period: 'week' | 'month' | 'year' = 'month') {
    return useQuery({
        queryKey: ['roi', 'history', period],
        queryFn: () => api.roiHistory(period),
    });
}

export function useROIConfig() {
    return useQuery({
        queryKey: ['roi', 'config'],
        queryFn: () => api.roiConfig(),
    });
}

export function useROIUpdateConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { mfaHourlyCost?: number; avgManualIntakeMin?: number; monthlyLicenseCost?: number; workdaysPerMonth?: number }) =>
            api.roiUpdateConfig(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roi'] }); },
    });
}

export function useROIProjection(months: number = 12) {
    return useQuery({
        queryKey: ['roi', 'projection', months],
        queryFn: () => api.roiProjection(months),
    });
}

// ─── Wunschbox Hooks ────────────────────────────────────────

export function useWunschboxSubmit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (text: string) => api.wunschboxSubmit(text),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wunschbox'] }); },
    });
}

export function useWunschboxList(params?: { page?: number; limit?: number; status?: string }) {
    return useQuery({
        queryKey: ['wunschbox', 'list', params],
        queryFn: () => api.wunschboxList(params),
    });
}

export function useWunschboxMy() {
    return useQuery({
        queryKey: ['wunschbox', 'my'],
        queryFn: () => api.wunschboxMy(),
    });
}

export function useWunschboxProcess() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.wunschboxProcess(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wunschbox'] }); },
    });
}

export function useWunschboxReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; status: string; adminNotes?: string }) =>
            api.wunschboxReview(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wunschbox'] }); },
    });
}

export function useWunschboxExport() {
    return useMutation({
        mutationFn: (id: string) => api.wunschboxExport(id),
    });
}

// ─── Admin Content Hooks ────────────────────────────────────

export function useAdminContentList(params?: { type?: string; category?: string }) {
    return useQuery({
        queryKey: ['admin', 'content', params],
        queryFn: () => api.adminContentList(params),
    });
}

export function useAdminContentCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { type: string; category: string; title: string; body: string; quizData?: unknown; displayDurationSec?: number; priority?: number; isActive?: boolean; seasonal?: string; language?: string }) =>
            api.adminContentCreate(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }); },
    });
}

export function useAdminContentUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
            api.adminContentUpdate(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }); queryClient.invalidateQueries({ queryKey: ['content'] }); },
    });
}

export function useAdminContentDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.adminContentDelete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }); queryClient.invalidateQueries({ queryKey: ['content'] }); },
    });
}

// ─── Atoms Builder Hooks ────────────────────────────────────

export function useAtomSingle(id: string) {
    return useQuery({
        queryKey: ['atoms', id],
        queryFn: () => api.atomSingle(id),
        enabled: !!id,
    });
}

export function useAtomsReorder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (orders: Array<{ id: string; orderIndex: number }>) =>
            api.atomsReorder(orders),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms'] }); },
    });
}

export function useAtomToggle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            api.atomToggle(id, isActive),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms'] }); },
    });
}

export function useAtomDraftCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { atomId?: string; draftData: Record<string, unknown>; changeNote?: string }) =>
            api.atomDraftCreate(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms', 'drafts'] }); },
    });
}

export function useAtomDraftsList(status: string = 'DRAFT') {
    return useQuery({
        queryKey: ['atoms', 'drafts', status],
        queryFn: () => api.atomDraftsList(status),
    });
}

export function useAtomDraftPublish() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.atomDraftPublish(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms'] }); },
    });
}

export function useAtomDraftDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.atomDraftDelete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms', 'drafts'] }); },
    });
}

// ─── PVS / FHIR Integration Hooks ──────────────────────────

export function usePvsConnections() {
    return useQuery({
        queryKey: ['pvs', 'connections'],
        queryFn: () => api.pvsConnections(),
    });
}

export function usePvsCapabilities(connectionId: string) {
    return useQuery({
        queryKey: ['pvs', 'capabilities', connectionId],
        queryFn: () => api.pvsCapabilities(connectionId),
        enabled: !!connectionId,
    });
}

export function usePvsCreateConnection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { pvsType: string; protocol: string; name: string; config: Record<string, unknown> }) =>
            api.pvsCreateConnection(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'connections'] }); },
    });
}

export function usePvsUpdateConnection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
            api.pvsUpdateConnection(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'connections'] }); },
    });
}

export function usePvsTestConnection() {
    return useMutation({
        mutationFn: (id: string) => api.pvsTestConnection(id),
    });
}

export function usePvsDeleteConnection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.pvsDeleteConnection(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'connections'] }); },
    });
}

export function usePvsExportSession() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sessionId, connectionId }: { sessionId: string; connectionId?: string }) =>
            api.pvsExportSession(sessionId, connectionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pvs', 'transfers'] });
            queryClient.invalidateQueries({ queryKey: ['pvs', 'transfer-stats'] });
        },
    });
}

export function usePvsExportBatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sessionIds, connectionId }: { sessionIds: string[]; connectionId?: string }) =>
            api.pvsExportBatch(sessionIds, connectionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pvs', 'transfers'] });
            queryClient.invalidateQueries({ queryKey: ['pvs', 'transfer-stats'] });
        },
    });
}

export function usePvsImportPatient() {
    return useMutation({
        mutationFn: ({ externalId, connectionId }: { externalId: string; connectionId?: string }) =>
            api.pvsImportPatient(externalId, connectionId),
    });
}

export function usePvsPatientLinks(patientId: string) {
    return useQuery({
        queryKey: ['pvs', 'patient-links', patientId],
        queryFn: () => api.pvsPatientLinks(patientId),
        enabled: !!patientId,
    });
}

export function usePvsCreatePatientLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { patientId: string; connectionId: string; externalPatientId: string }) =>
            api.pvsCreatePatientLink(data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pvs', 'patient-links', variables.patientId] });
        },
    });
}

export function usePvsDeletePatientLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.pvsDeletePatientLink(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'patient-links'] }); },
    });
}

export function usePvsTransfers(params?: { page?: number; limit?: number; direction?: string; status?: string; connectionId?: string }) {
    return useQuery({
        queryKey: ['pvs', 'transfers', params],
        queryFn: () => api.pvsTransfers(params),
    });
}

export function usePvsTransferDetail(id: string) {
    return useQuery({
        queryKey: ['pvs', 'transfer', id],
        queryFn: () => api.pvsTransferDetail(id),
        enabled: !!id,
    });
}

export function usePvsRetryTransfer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.pvsRetryTransfer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pvs', 'transfers'] });
            queryClient.invalidateQueries({ queryKey: ['pvs', 'transfer-stats'] });
        },
    });
}

export function usePvsTransferStats() {
    return useQuery({
        queryKey: ['pvs', 'transfer-stats'],
        queryFn: () => api.pvsTransferStats(),
        refetchInterval: 30 * 1000,
    });
}

export function usePvsMappings(connectionId: string) {
    return useQuery({
        queryKey: ['pvs', 'mappings', connectionId],
        queryFn: () => api.pvsMappings(connectionId),
        enabled: !!connectionId,
    });
}

export function usePvsSaveMappings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ connectionId, mappings }: { connectionId: string; mappings: Array<{ sourceField: string; targetField: string; transform?: string }> }) =>
            api.pvsSaveMappings(connectionId, mappings),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pvs', 'mappings', variables.connectionId] });
        },
    });
}

export function usePvsResetMappings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (connectionId: string) => api.pvsResetMappings(connectionId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'mappings'] }); },
    });
}

export function usePvsMappingPreview() {
    return useMutation({
        mutationFn: ({ connectionId, sessionId }: { connectionId: string; sessionId: string }) =>
            api.pvsMappingPreview(connectionId, sessionId),
    });
}

// ─── Therapy / Therapieplan Hooks ───────────────────────────

export function useTherapyPlansBySession(sessionId: string) {
    return useQuery({ queryKey: ['therapy', 'plans', 'session', sessionId], queryFn: () => api.therapyPlansBySession(sessionId), enabled: !!sessionId });
}
export function useTherapyPlansByPatient(patientId: string) {
    return useQuery({ queryKey: ['therapy', 'plans', 'patient', patientId], queryFn: () => api.therapyPlansByPatient(patientId), enabled: !!patientId });
}
export function useTherapyPlan(id: string) {
    return useQuery({ queryKey: ['therapy', 'plan', id], queryFn: () => api.therapyGetPlan(id), enabled: !!id });
}
export function useTherapyCreatePlan() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: { sessionId: string; patientId: string; title: string; diagnosis?: string; icdCodes?: string[]; summary?: string; templateId?: string }) => api.therapyCreatePlan(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'plans'] }); } });
}
export function useTherapyUpdatePlan() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.therapyUpdatePlan(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}
export function useTherapyDeletePlan() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (id: string) => api.therapyDeletePlan(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'plans'] }); } });
}
export function useTherapyUpdateStatus() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => api.therapyUpdateStatus(id, status), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}

// Measures
export function useTherapyAddMeasure() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ planId, ...data }: { planId: string } & Record<string, unknown>) => api.therapyAddMeasure(planId, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}
export function useTherapyUpdateMeasure() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.therapyUpdateMeasure(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}
export function useTherapyDeleteMeasure() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (id: string) => api.therapyDeleteMeasure(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}
export function useTherapyUpdateMeasureStatus() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => api.therapyUpdateMeasureStatus(id, status), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}
export function useTherapyReorderMeasures() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ planId, measureIds }: { planId: string; measureIds: string[] }) => api.therapyReorderMeasures(planId, measureIds), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}

// Templates
export function useTherapyTemplates(category?: string) {
    return useQuery({ queryKey: ['therapy', 'templates', category], queryFn: () => api.therapyTemplates(category) });
}
export function useTherapyApplyTemplate() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ templateId, planId }: { templateId: string; planId: string }) => api.therapyApplyTemplate(templateId, planId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}

// Alerts
export function useTherapyAlerts(params?: { page?: number; severity?: string; unreadOnly?: boolean }) {
    return useQuery({ queryKey: ['therapy', 'alerts', params], queryFn: () => api.therapyAlerts(params) });
}
export function useTherapyAlertsByPatient(patientId: string) {
    return useQuery({ queryKey: ['therapy', 'alerts', 'patient', patientId], queryFn: () => api.therapyAlertsByPatient(patientId), enabled: !!patientId });
}
export function useTherapyAlertRead() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (id: string) => api.therapyAlertRead(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } });
}
export function useTherapyAlertDismiss() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.therapyAlertDismiss(id, reason), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } });
}
export function useTherapyAlertAction() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, action }: { id: string; action: string }) => api.therapyAlertAction(id, action), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } });
}
export function useTherapyEvaluateAlerts() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: { sessionId: string; patientId: string; planId?: string }) => api.therapyEvaluateAlerts(data.sessionId, data.patientId, data.planId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } });
}

// Analytics + Anon
export function useTherapyAnalytics(days?: number) {
    return useQuery({ queryKey: ['therapy', 'analytics', days], queryFn: () => api.therapyAnalytics(days) });
}
export function useTherapyAnon(patientId: string) {
    return useQuery({ queryKey: ['therapy', 'anon', patientId], queryFn: () => api.therapyAnon(patientId), enabled: !!patientId });
}
export function useTherapyExportPvs() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (planId: string) => api.therapyExportPvs(planId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } });
}

// ─── Patient Portal (PWA) Hooks ─────────────────────────────

export function usePwaDashboard() {
    return useQuery({ queryKey: ['pwa', 'dashboard'], queryFn: () => api.pwaDashboard() });
}
export function usePwaDiaryList(params?: { page?: number; limit?: number; from?: string; to?: string }) {
    return useQuery({ queryKey: ['pwa', 'diary', params], queryFn: () => api.pwaDiaryList(params) });
}
export function usePwaDiaryGet(id: string) {
    return useQuery({ queryKey: ['pwa', 'diary', id], queryFn: () => api.pwaDiaryGet(id), enabled: !!id });
}
export function usePwaDiaryCreate() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: Record<string, unknown>) => api.pwaDiaryCreate(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'diary'] }); qc.invalidateQueries({ queryKey: ['pwa', 'dashboard'] }); } });
}
export function usePwaDiaryUpdate() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.pwaDiaryUpdate(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'diary'] }); } });
}
export function usePwaDiaryDelete() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (id: string) => api.pwaDiaryDelete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'diary'] }); } });
}
export function usePwaMeasures() {
    return useQuery({ queryKey: ['pwa', 'measures'], queryFn: () => api.pwaMeasures() });
}
export function usePwaMeasureTrackings(params?: { measureId?: string }) {
    return useQuery({ queryKey: ['pwa', 'trackings', params], queryFn: () => api.pwaMeasureTrackings(params) });
}
export function usePwaMeasureComplete() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (measureId: string) => api.pwaMeasureComplete(measureId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa'] }); } });
}
export function usePwaMeasureSkip() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ measureId, reason }: { measureId: string; reason?: string }) => api.pwaMeasureSkip(measureId, reason), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa'] }); } });
}
export function usePwaMessages(params?: { page?: number }) {
    return useQuery({ queryKey: ['pwa', 'messages', params], queryFn: () => api.pwaMessages(params) });
}
export function usePwaUnreadCount() {
    return useQuery({ queryKey: ['pwa', 'unread'], queryFn: () => api.pwaUnreadCount(), refetchInterval: 30000 });
}
export function usePwaMessageSend() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: { subject?: string; body: string }) => api.pwaMessageSend(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'messages'] }); qc.invalidateQueries({ queryKey: ['pwa', 'unread'] }); } });
}
export function usePwaConsents() {
    return useQuery({ queryKey: ['pwa', 'consents'], queryFn: () => api.pwaConsents() });
}
export function usePwaUpdateConsents() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (consents: Array<{ type: string; granted: boolean }>) => api.pwaUpdateConsents(consents), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'consents'] }); } });
}
export function usePwaDevices() {
    return useQuery({ queryKey: ['pwa', 'devices'], queryFn: () => api.pwaDevices() });
}
export function usePwaRegisterDevice() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: { deviceName: string; deviceType: string; pushToken?: string }) => api.pwaRegisterDevice(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'devices'] }); } });
}
export function usePwaSettings() {
    return useQuery({ queryKey: ['pwa', 'settings'], queryFn: () => api.pwaSettings() });
}
export function usePwaUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (data: Record<string, unknown>) => api.pwaUpdateSettings(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'settings'] }); } });
}
export function usePwaChangePassword() {
    return useMutation({ mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => api.pwaChangePassword(oldPassword, newPassword) });
}
export function usePwaSetPin() {
    return useMutation({ mutationFn: (pin: string) => api.pwaSetPin(pin) });
}
export function usePwaSync() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (payload: { diaryEntries?: any[]; measureTrackings?: any[]; lastSyncAt?: string }) => api.pwaSync(payload), onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa'] }); } });
}
export function usePwaProfile() {
    return useQuery({ queryKey: ['pwa', 'profile'], queryFn: () => api.pwaProfile() });
}
export function usePwaLogin() {
    return useMutation({ mutationFn: ({ identifier, password }: { identifier: string; password: string }) => api.pwaLogin(identifier, password) });
}
export function usePwaRegister() {
    return useMutation({ mutationFn: (data: { patientNumber: string; birthDate: string; password: string; email?: string }) => api.pwaRegister(data) });
}
