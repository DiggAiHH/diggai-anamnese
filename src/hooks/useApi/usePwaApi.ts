/**
 * PWA (Patient Portal) API Hooks
 * 
 * Hooks für Patienten-Portal-bezogene Operationen:
 * - Dashboard
 * - Tagebuch (Diary)
 * - Maßnahmen (Measures)
 * - Nachrichten
 * - Einwilligungen (Consents)
 * - Geräte
 * - Einstellungen
 * - Termine
 * - Erinnerungen (Reminders)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAbortableRequest, isAbortError } from './useAbortableRequest';

// ─── Dashboard ─────────────────────────────────────────────

/**
 * Hook zum Laden des PWA-Dashboards
 */
export function usePwaDashboard() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'dashboard'], 
        queryFn: async () => {
            try {
                return await api.pwaDashboard();
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        } 
    });
}

// ─── Diary (Tagebuch) ──────────────────────────────────────

/**
 * Hook zum Laden der Tagebucheinträge
 * 
 * @param params - Filter-Parameter
 */
export function usePwaDiaryList(params?: { page?: number; limit?: number; from?: string; to?: string }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'diary', params], 
        queryFn: async () => {
            try {
                return await api.pwaDiaryList(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { entries: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Laden eines spezifischen Tagebucheintrags
 * 
 * @param id - Die Eintrags-ID
 */
export function usePwaDiaryGet(id: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'diary', id], 
        queryFn: async () => {
            try {
                return await api.pwaDiaryGet(id);
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
 * Hook zum Erstellen eines Tagebucheintrags
 */
export function usePwaDiaryCreate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: Record<string, unknown>) => api.pwaDiaryCreate(data), 
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['pwa', 'diary'] }); 
            qc.invalidateQueries({ queryKey: ['pwa', 'dashboard'] }); 
        } 
    });
}

/**
 * Hook zum Aktualisieren eines Tagebucheintrags
 */
export function usePwaDiaryUpdate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => 
            api.pwaDiaryUpdate(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'diary'] }); } 
    });
}

/**
 * Hook zum Löschen eines Tagebucheintrags
 */
export function usePwaDiaryDelete() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.pwaDiaryDelete(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'diary'] }); } 
    });
}

/**
 * Hook zum Laden der Tagebuch-Trends
 * 
 * @param metric - Die Metrik
 * @param period - Der Zeitraum
 */
export function usePwaDiaryTrends(metric: string, period: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'diary', 'trends', metric, period], 
        queryFn: async () => {
            try {
                return await api.pwaDiaryTrends(metric, period);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!metric && !!period 
    });
}

// ─── Measures (Maßnahmen) ──────────────────────────────────

/**
 * Hook zum Laden der Maßnahmen
 */
export function usePwaMeasures() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'measures'], 
        queryFn: async () => {
            try {
                return await api.pwaMeasures();
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
 * Hook zum Laden der Maßnahmen-Trackings
 * 
 * @param params - Filter-Parameter
 */
export function usePwaMeasureTrackings(params?: { measureId?: string }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'trackings', params], 
        queryFn: async () => {
            try {
                return await api.pwaMeasureTrackings(params);
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
 * Hook zum Abschließen einer Maßnahme
 */
export function usePwaMeasureComplete() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (measureId: string) => api.pwaMeasureComplete(measureId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa'] }); } 
    });
}

/**
 * Hook zum Überspringen einer Maßnahme
 */
export function usePwaMeasureSkip() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ measureId, reason }: { measureId: string; reason?: string }) => 
            api.pwaMeasureSkip(measureId, reason), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa'] }); } 
    });
}

// ─── Messages ──────────────────────────────────────────────

/**
 * Hook zum Laden der Nachrichten
 * 
 * @param params - Filter-Parameter
 */
export function usePwaMessages(params?: { page?: number }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'messages', params], 
        queryFn: async () => {
            try {
                return await api.pwaMessages(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { messages: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Laden der ungelesenen Nachrichten-Anzahl
 */
export function usePwaUnreadCount() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'unread'], 
        queryFn: async () => {
            try {
                return await api.pwaUnreadCount();
            } catch (error) {
                if (isAbortError(error)) {
                    return { count: 0 };
                }
                throw error;
            }
        }, 
        refetchInterval: 30000 
    });
}

/**
 * Hook zum Senden einer Nachricht
 */
export function usePwaMessageSend() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { subject?: string; body: string }) => api.pwaMessageSend(data), 
        onSuccess: () => { 
            qc.invalidateQueries({ queryKey: ['pwa', 'messages'] }); 
            qc.invalidateQueries({ queryKey: ['pwa', 'unread'] }); 
        } 
    });
}

// ─── Consents ──────────────────────────────────────────────

/**
 * Hook zum Laden der Einwilligungen
 */
export function usePwaConsents() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'consents'], 
        queryFn: async () => {
            try {
                return await api.pwaConsents();
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
 * Hook zum Aktualisieren der Einwilligungen
 */
export function usePwaUpdateConsents() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (consents: Array<{ type: string; granted: boolean }>) => 
            api.pwaUpdateConsents(consents), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'consents'] }); } 
    });
}

// ─── Devices ───────────────────────────────────────────────

/**
 * Hook zum Laden der registrierten Geräte
 */
export function usePwaDevices() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'devices'], 
        queryFn: async () => {
            try {
                return await api.pwaDevices();
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
 * Hook zum Registrieren eines Geräts
 */
export function usePwaRegisterDevice() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { deviceName: string; deviceType: string; pushToken?: string }) => 
            api.pwaRegisterDevice(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'devices'] }); } 
    });
}

// ─── Settings ──────────────────────────────────────────────

/**
 * Hook zum Laden der Einstellungen
 */
export function usePwaSettings() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'settings'], 
        queryFn: async () => {
            try {
                return await api.pwaSettings();
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Aktualisieren der Einstellungen
 */
export function usePwaUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: Record<string, unknown>) => api.pwaUpdateSettings(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'settings'] }); } 
    });
}

/**
 * Hook zum Ändern des Passworts
 */
export function usePwaChangePassword() {
    return useMutation({ 
        mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => 
            api.pwaChangePassword(oldPassword, newPassword) 
    });
}

/**
 * Hook zum Setzen der PIN
 */
export function usePwaSetPin() {
    return useMutation({ 
        mutationFn: (pin: string) => api.pwaSetPin(pin) 
    });
}

// ─── Sync ──────────────────────────────────────────────────

/**
 * Hook zum Synchronisieren der PWA-Daten
 */
export function usePwaSync() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (payload: { diaryEntries?: unknown[]; measureTrackings?: unknown[]; lastSyncAt?: string }) => 
            api.pwaSync(payload), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa'] }); } 
    });
}

// ─── Profile ───────────────────────────────────────────────

/**
 * Hook zum Laden des Profils
 */
export function usePwaProfile() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'profile'], 
        queryFn: async () => {
            try {
                return await api.pwaProfile();
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        } 
    });
}

// ─── Auth ──────────────────────────────────────────────────

/**
 * Hook für den PWA-Login
 */
export function usePwaLogin() {
    return useMutation({ 
        mutationFn: ({ identifier, password }: { identifier: string; password: string }) => 
            api.pwaLogin(identifier, password) 
    });
}

/**
 * Hook für die PWA-Registrierung
 */
export function usePwaRegister() {
    return useMutation({ 
        mutationFn: (data: { patientNumber: string; birthDate: string; password: string; email?: string }) => 
            api.pwaRegister(data) 
    });
}

/**
 * Hook für die E-Mail-Verifizierung
 */
export function usePwaVerifyEmail() {
    return useMutation({ 
        mutationFn: (token: string) => api.pwaVerifyEmail(token) 
    });
}

// ─── Appointments ──────────────────────────────────────────

/**
 * Hook zum Laden der Termine
 */
export function usePwaAppointments() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'appointments'], 
        queryFn: async () => {
            try {
                return await api.pwaAppointments();
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
 * Hook zum Laden der verfügbaren Termin-Slots
 * 
 * @param date - Das Datum
 * @param service - Die Leistung
 */
export function usePwaAppointmentSlots(date: string, service: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'appointment-slots', date, service], 
        queryFn: async () => {
            try {
                return await api.pwaAppointmentSlots(date, service);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!date && !!service 
    });
}

/**
 * Hook zum Erstellen eines Termins
 */
export function usePwaAppointmentCreate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { service: string; date: string; requestNotes?: string }) => 
            api.pwaAppointmentCreate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'appointments'] }); } 
    });
}

/**
 * Hook zum Stornieren eines Termins
 */
export function usePwaAppointmentCancel() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.pwaAppointmentCancel(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'appointments'] }); } 
    });
}

// ─── Reminders ─────────────────────────────────────────────

/**
 * Hook zum Laden der Erinnerungen
 */
export function usePwaReminders() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'reminders'], 
        queryFn: async () => {
            try {
                return await api.pwaReminders();
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
 * Hook zum Laden der Erinnerungs-Compliance
 */
export function usePwaReminderAdherence() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({ 
        queryKey: ['pwa', 'reminders', 'adherence'], 
        queryFn: async () => {
            try {
                return await api.pwaReminderAdherence();
            } catch (error) {
                if (isAbortError(error)) {
                    return { adherence: 0 };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Erstellen einer Erinnerung
 */
export function usePwaReminderCreate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { medicationId: string; scheduleCron: string; scheduleLabel: string; pushEnabled: boolean; pushTitle?: string; pushBody?: string }) => 
            api.pwaReminderCreate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'reminders'] }); } 
    });
}

/**
 * Hook zum Aktivieren/Deaktivieren einer Erinnerung
 */
export function usePwaReminderToggle() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, active }: { id: string; active: boolean }) => 
            api.pwaReminderToggle(id, active), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'reminders'] }); } 
    });
}

/**
 * Hook zum Löschen einer Erinnerung
 */
export function usePwaReminderDelete() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.pwaReminderDelete(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pwa', 'reminders'] }); } 
    });
}
