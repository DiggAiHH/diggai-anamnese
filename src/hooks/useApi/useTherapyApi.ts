/**
 * Therapy API Hooks
 * 
 * Hooks für Therapieplan-bezogene Operationen:
 * - Therapiepläne (CRUD)
 * - Maßnahmen (CRUD)
 * - Templates
 * - Alerts
 * - Analytics
 * - AI-Features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAbortableRequest, isAbortError } from './useAbortableRequest';

// ─── Therapy Plan Hooks ────────────────────────────────────

/**
 * Hook zum Laden der Therapiepläne einer Session
 * 
 * @param sessionId - Die Session-ID
 */
export function useTherapyPlansBySession(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'plans', 'session', sessionId], 
        queryFn: async () => {
            try {
                return await api.therapyPlansBySession(sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!sessionId 
    });
}

/**
 * Hook zum Laden der Therapiepläne eines Patienten
 * 
 * @param patientId - Die Patienten-ID
 */
export function useTherapyPlansByPatient(patientId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'plans', 'patient', patientId], 
        queryFn: async () => {
            try {
                return await api.therapyPlansByPatient(patientId);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!patientId 
    });
}

/**
 * Hook zum Laden eines spezifischen Therapieplans
 * 
 * @param id - Die Plan-ID
 */
export function useTherapyPlan(id: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'plan', id], 
        queryFn: async () => {
            try {
                return await api.therapyGetPlan(id);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!id 
    });
}

/**
 * Hook zum Erstellen eines Therapieplans
 */
export function useTherapyCreatePlan() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { sessionId: string; patientId: string; title: string; diagnosis?: string; icdCodes?: string[]; summary?: string; templateId?: string }) => 
            api.therapyCreatePlan(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'plans'] }); } 
    });
}

/**
 * Hook zum Aktualisieren eines Therapieplans
 */
export function useTherapyUpdatePlan() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => 
            api.therapyUpdatePlan(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

/**
 * Hook zum Löschen eines Therapieplans
 */
export function useTherapyDeletePlan() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.therapyDeletePlan(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'plans'] }); } 
    });
}

/**
 * Hook zum Aktualisieren des Therapieplan-Status
 */
export function useTherapyUpdateStatus() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, status }: { id: string; status: string }) => 
            api.therapyUpdateStatus(id, status), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

// ─── Measures (Maßnahmen) Hooks ────────────────────────────

/**
 * Hook zum Hinzufügen einer Maßnahme
 */
export function useTherapyAddMeasure() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ planId, ...data }: { planId: string } & Record<string, unknown>) => 
            api.therapyAddMeasure(planId, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

/**
 * Hook zum Aktualisieren einer Maßnahme
 */
export function useTherapyUpdateMeasure() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => 
            api.therapyUpdateMeasure(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

/**
 * Hook zum Löschen einer Maßnahme
 */
export function useTherapyDeleteMeasure() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.therapyDeleteMeasure(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

/**
 * Hook zum Aktualisieren des Maßnahmen-Status
 */
export function useTherapyUpdateMeasureStatus() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, status }: { id: string; status: string }) => 
            api.therapyUpdateMeasureStatus(id, status), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

/**
 * Hook zum Neuordnen von Maßnahmen
 */
export function useTherapyReorderMeasures() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ planId, measureIds }: { planId: string; measureIds: string[] }) => 
            api.therapyReorderMeasures(planId, measureIds), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

// ─── Templates Hooks ───────────────────────────────────────

/**
 * Hook zum Laden der Therapie-Templates
 * 
 * @param category - Optionale Kategorie
 */
export function useTherapyTemplates(category?: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'templates', category], 
        queryFn: async () => {
            try {
                return await api.therapyTemplates(category);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Anwenden eines Templates
 */
export function useTherapyApplyTemplate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ templateId, planId }: { templateId: string; planId: string }) => 
            api.therapyApplyTemplate(templateId, planId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

// ─── Alerts Hooks ──────────────────────────────────────────

/**
 * Hook zum Laden der Therapie-Alerts
 * 
 * @param params - Filter-Parameter
 */
export function useTherapyAlerts(params?: { page?: number; severity?: string; unreadOnly?: boolean }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'alerts', params], 
        queryFn: async () => {
            try {
                return await api.therapyAlerts(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { alerts: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Laden der Alerts eines Patienten
 * 
 * @param patientId - Die Patienten-ID
 */
export function useTherapyAlertsByPatient(patientId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'alerts', 'patient', patientId], 
        queryFn: async () => {
            try {
                return await api.therapyAlertsByPatient(patientId);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!patientId 
    });
}

/**
 * Hook zum Markieren eines Alerts als gelesen
 */
export function useTherapyAlertRead() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.therapyAlertRead(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } 
    });
}

/**
 * Hook zum Schließen/Dismissen eines Alerts
 */
export function useTherapyAlertDismiss() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
            api.therapyAlertDismiss(id, reason), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } 
    });
}

/**
 * Hook zum Ausführen einer Alert-Aktion
 */
export function useTherapyAlertAction() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, action }: { id: string; action: string }) => 
            api.therapyAlertAction(id, action), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } 
    });
}

/**
 * Hook zum Auswerten/Auslösen von Alerts
 */
export function useTherapyEvaluateAlerts() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { sessionId: string; patientId: string; planId?: string }) => 
            api.therapyEvaluateAlerts(data.sessionId, data.patientId, data.planId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy', 'alerts'] }); } 
    });
}

// ─── Analytics + Anon Hooks ────────────────────────────────

/**
 * Hook zum Laden der Therapie-Analytics
 * 
 * @param days - Anzahl der Tage
 */
export function useTherapyAnalytics(days?: number) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'analytics', days], 
        queryFn: async () => {
            try {
                return await api.therapyAnalytics(days);
            } catch (error) {
                if (isAbortError(error)) {
                    return { stats: {} };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Laden der anonymisierten Therapiedaten
 * 
 * @param patientId - Die Patienten-ID
 */
export function useTherapyAnon(patientId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['therapy', 'anon', patientId], 
        queryFn: async () => {
            try {
                return await api.therapyAnon(patientId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!patientId 
    });
}

/**
 * Hook zum Exportieren eines Therapieplans zum PVS
 */
export function useTherapyExportPvs() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (planId: string) => api.therapyExportPvs(planId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

// ─── AI Engine Hooks ───────────────────────────────────────

/**
 * Hook zum Laden des AI-Status
 */
export function useAiStatus() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['ai', 'status'], 
        queryFn: async () => {
            try {
                return await api.therapyAiStatus();
            } catch (error) {
                if (isAbortError(error)) {
                    return { available: false, models: [] };
                }
                throw error;
            }
        }, 
        staleTime: 30_000 
    });
}

/**
 * Hook zum Anfordern von Therapie-Vorschlägen via AI
 */
export function useAiSuggestTherapy() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (sessionId: string) => api.therapyAiSuggest(sessionId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['therapy'] }); } 
    });
}

/**
 * Hook zum Zusammenfassen einer Session via AI
 */
export function useAiSummarizeSession() {
    return useMutation({ 
        mutationFn: (sessionId: string) => api.therapyAiSummarize(sessionId) 
    });
}

/**
 * Hook zum Anfordern von ICD-Code-Vorschlägen via AI
 */
export function useAiIcdSuggest() {
    return useMutation({ 
        mutationFn: (symptoms: string) => api.therapyAiIcdSuggest(symptoms) 
    });
}
