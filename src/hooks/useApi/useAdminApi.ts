/**
 * Admin API Hooks
 * 
 * Hooks für Admin-bezogene Operationen:
 * - Admin Dashboard (Stats, Timeline, Analytics)
 * - User Management
 * - Permissions
 * - ROI
 * - Wunschbox
 * - Content Management
 * - Atoms Builder
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAbortableRequest, isAbortError } from './useAbortableRequest';

// ─── Admin Dashboard Hooks ──────────────────────────────────

/**
 * Hook zum Laden der Admin-Statistiken
 */
export function useAdminStats() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
            try {
                return await api.adminStats();
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalPatients: 0, totalSessions: 0, activeSessions: 0, completedSessions: 0, sessionsToday: 0, completionRate: 0, avgCompletionMinutes: 0, unresolvedTriageEvents: 0, totalUsers: 0 };
                }
                throw error;
            }
        },
        refetchInterval: 30 * 1000,
    });
}

/**
 * Hook zum Laden der Admin-Timeline
 * 
 * @param days - Anzahl der Tage (Standard: 30)
 */
export function useAdminTimeline(days: number = 30) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'timeline', days],
        queryFn: async () => {
            try {
                return await api.adminTimeline(days);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden der Service-Analytics
 */
export function useAdminServiceAnalytics() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'services'],
        queryFn: async () => {
            try {
                return await api.adminServiceAnalytics();
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden der Triage-Analytics
 * 
 * @param days - Anzahl der Tage (Standard: 30)
 */
export function useAdminTriageAnalytics(days: number = 30) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'triage', days],
        queryFn: async () => {
            try {
                return await api.adminTriageAnalytics(days);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden des Audit-Logs
 * 
 * @param params - Filter-Parameter
 */
export function useAdminAuditLog(params?: { page?: number; limit?: number; action?: string; userId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'audit-log', params],
        queryFn: async () => {
            try {
                return await api.adminAuditLog(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { entries: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        },
    });
}

// ─── Admin User Hooks ───────────────────────────────────────

/**
 * Hook zum Laden aller Benutzer
 */
export function useAdminUsers() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: async () => {
            try {
                return await api.adminUsers();
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Erstellen eines neuen Benutzers
 */
export function useAdminCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { username: string; password: string; displayName: string; role: string }) =>
            api.adminCreateUser(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

/**
 * Hook zum Aktualisieren eines Benutzers
 */
export function useAdminUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; displayName?: string; role?: string; isActive?: boolean; password?: string; pin?: string }) =>
            api.adminUpdateUser(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

/**
 * Hook zum Löschen eines Benutzers
 */
export function useAdminDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.adminDeleteUser(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

// ─── Permission Hooks ───────────────────────────────────────

/**
 * Hook zum Laden aller Berechtigungen
 */
export function useAdminPermissions() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'permissions'],
        queryFn: async () => {
            try {
                return await api.adminPermissions();
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden der Berechtigungen einer Rolle
 * 
 * @param role - Die Rollenbezeichnung
 */
export function useAdminRolePermissions(role: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'role-permissions', role],
        queryFn: async () => {
            try {
                return await api.adminRolePermissions(role);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
        enabled: !!role,
    });
}

/**
 * Hook zum Setzen der Berechtigungen einer Rolle
 */
export function useAdminSetRolePermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ role, permissionIds }: { role: string; permissionIds: string[] }) =>
            api.adminSetRolePermissions(role, permissionIds),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] }); 
            queryClient.invalidateQueries({ queryKey: ['admin', 'role-permissions'] }); 
        },
    });
}

/**
 * Hook zum Setzen der Benutzer-Berechtigungen
 */
export function useAdminSetUserPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, permissionCodes }: { userId: string; permissionCodes: string[] }) =>
            api.adminSetUserPermissions(userId, permissionCodes),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    });
}

// ─── ROI Hooks ──────────────────────────────────────────────

/**
 * Hook zum Laden der heutigen ROI-Daten
 */
export function useROIToday() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['roi', 'today'],
        queryFn: async () => {
            try {
                return await api.roiToday();
            } catch (error) {
                if (isAbortError(error)) {
                    return { minutesSaved: 0, moneySaved: 0, patientsProcessed: 0 };
                }
                throw error;
            }
        },
        refetchInterval: 60 * 1000,
    });
}

/**
 * Hook zum Laden der ROI-Historie
 * 
 * @param period - Zeitraum ('week' | 'month' | 'year')
 */
export function useROIHistory(period: 'week' | 'month' | 'year' = 'month') {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['roi', 'history', period],
        queryFn: async () => {
            try {
                return await api.roiHistory(period);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden der ROI-Konfiguration
 */
export function useROIConfig() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['roi', 'config'],
        queryFn: async () => {
            try {
                return await api.roiConfig();
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Aktualisieren der ROI-Konfiguration
 */
export function useROIUpdateConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { mfaHourlyCost?: number; avgManualIntakeMin?: number; monthlyLicenseCost?: number; workdaysPerMonth?: number }) =>
            api.roiUpdateConfig(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roi'] }); },
    });
}

/**
 * Hook zum Laden der ROI-Projektion
 * 
 * @param months - Anzahl der Monate (Standard: 12)
 */
export function useROIProjection(months: number = 12) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['roi', 'projection', months],
        queryFn: async () => {
            try {
                return await api.roiProjection(months);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

// ─── Wunschbox Hooks ────────────────────────────────────────

/**
 * Hook zum Absenden eines Wunschbox-Eintrags
 */
export function useWunschboxSubmit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (text: string) => api.wunschboxSubmit(text),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wunschbox'] }); },
    });
}

/**
 * Hook zum Laden der Wunschbox-Liste
 * 
 * @param params - Filter-Parameter
 */
export function useWunschboxList(params?: { page?: number; limit?: number; status?: string }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['wunschbox', 'list', params],
        queryFn: async () => {
            try {
                return await api.wunschboxList(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { entries: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden der eigenen Wunschbox-Einträge
 */
export function useWunschboxMy() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['wunschbox', 'my'],
        queryFn: async () => {
            try {
                return await api.wunschboxMy();
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Bearbeiten eines Wunschbox-Eintrags
 */
export function useWunschboxProcess() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.wunschboxProcess(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wunschbox'] }); },
    });
}

/**
 * Hook zum Reviewen eines Wunschbox-Eintrags
 */
export function useWunschboxReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; status: string; adminNotes?: string }) =>
            api.wunschboxReview(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wunschbox'] }); },
    });
}

/**
 * Hook zum Exportieren eines Wunschbox-Eintrags
 */
export function useWunschboxExport() {
    return useMutation({
        mutationFn: (id: string) => api.wunschboxExport(id),
    });
}

// ─── Admin Content Hooks ────────────────────────────────────

/**
 * Hook zum Laden der Content-Liste
 * 
 * @param params - Filter-Parameter
 */
export function useAdminContentList(params?: { type?: string; category?: string }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['admin', 'content', params],
        queryFn: async () => {
            try {
                return await api.adminContentList(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Erstellen von Content
 */
export function useAdminContentCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { type: string; category: string; title: string; body: string; quizData?: unknown; displayDurationSec?: number; priority?: number; isActive?: boolean; seasonal?: string; language?: string }) =>
            api.adminContentCreate(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }); },
    });
}

/**
 * Hook zum Aktualisieren von Content
 */
export function useAdminContentUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
            api.adminContentUpdate(id, data),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }); 
            queryClient.invalidateQueries({ queryKey: ['content'] }); 
        },
    });
}

/**
 * Hook zum Löschen von Content
 */
export function useAdminContentDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.adminContentDelete(id),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }); 
            queryClient.invalidateQueries({ queryKey: ['content'] }); 
        },
    });
}

// ─── Atoms Builder Hooks ────────────────────────────────────

/**
 * Hook zum Laden eines einzelnen Atoms
 * 
 * @param id - Die Atom-ID
 */
export function useAtomSingle(id: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['atoms', id],
        queryFn: async () => {
            try {
                return await api.atomSingle(id);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!id,
    });
}

/**
 * Hook zum Neuordnen von Atoms
 */
export function useAtomsReorder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (orders: Array<{ id: string; orderIndex: number }>) =>
            api.atomsReorder(orders),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms'] }); },
    });
}

/**
 * Hook zum Aktivieren/Deaktivieren eines Atoms
 */
export function useAtomToggle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            api.atomToggle(id, isActive),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms'] }); },
    });
}

/**
 * Hook zum Erstellen eines Atom-Drafts
 */
export function useAtomDraftCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { atomId?: string; draftData: Record<string, unknown>; changeNote?: string }) =>
            api.atomDraftCreate(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms', 'drafts'] }); },
    });
}

/**
 * Hook zum Laden der Atom-Drafts
 * 
 * @param status - Filter-Status (Standard: 'DRAFT')
 */
export function useAtomDraftsList(status: string = 'DRAFT') {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['atoms', 'drafts', status],
        queryFn: async () => {
            try {
                return await api.atomDraftsList(status);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Veröffentlichen eines Atom-Drafts
 */
export function useAtomDraftPublish() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.atomDraftPublish(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms'] }); },
    });
}

/**
 * Hook zum Löschen eines Atom-Drafts
 */
export function useAtomDraftDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.atomDraftDelete(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atoms', 'drafts'] }); },
    });
}
