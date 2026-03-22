/**
 * System API Hooks
 * 
 * Hooks für System-Management und spezialisierte Module:
 * - System Management (Deployment, Backups, Logs)
 * - TI (Telematikinfrastruktur) Integration
 * - NFC (Near Field Communication)
 * - Flow Management
 * - Feedback System
 * - Payment
 * - Praxis Chat
 * - Avatar & Voice
 * - Telemedizin
 * - Gamification
 * - Forms
 * - Private ePA
 * - DiggAI Agents
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAbortableRequest, isAbortError } from './useAbortableRequest';

// ─── System Management Hooks ───────────────────────────────

/**
 * Hook zum Laden der Deployment-Informationen
 */
export function useSystemDeployment() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'deployment'], 
        queryFn: async () => {
            try {
                return await api.systemDeployment();
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
 * Hook zum Laden der verfügbaren Features
 */
export function useSystemFeatures() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'features'], 
        queryFn: async () => {
            try {
                return await api.systemFeatures();
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
 * Hook zum Laden der System-Konfigurationen
 * 
 * @param category - Optionale Kategorie
 */
export function useSystemConfigs(category?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'configs', category], 
        queryFn: async () => {
            try {
                return await api.systemConfigs(category);
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
 * Hook zum Aktualisieren einer System-Konfiguration
 */
export function useSystemUpdateConfig() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ key, value }: { key: string; value: string }) => api.systemUpdateConfig(key, value), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['system', 'configs'] }); } 
    });
}

/**
 * Hook zum Laden der Backups
 * 
 * @param params - Filter-Parameter
 */
export function useSystemBackups(params?: { status?: string }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'backups', params], 
        queryFn: async () => {
            try {
                return await api.systemBackups(params);
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
 * Hook zum Erstellen eines Backups
 */
export function useSystemCreateBackup() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data?: { type?: string; tables?: string[] }) => api.systemCreateBackup(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['system', 'backups'] }); } 
    });
}

/**
 * Hook zum Wiederherstellen eines Backups
 */
export function useSystemRestoreBackup() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, options }: { id: string; options?: { verifyChecksum?: boolean } }) => 
            api.systemRestoreBackup(id, options), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['system'] }); } 
    });
}

/**
 * Hook zum Löschen eines Backups
 */
export function useSystemDeleteBackup() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.systemDeleteBackup(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['system', 'backups'] }); } 
    });
}

/**
 * Hook zum Laden des Backup-Schedules
 */
export function useSystemBackupSchedule() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'backup-schedule'], 
        queryFn: async () => {
            try {
                return await api.systemBackupSchedule();
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
 * Hook zum Laden der Netzwerk-Informationen
 */
export function useSystemNetwork() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'network'], 
        queryFn: async () => {
            try {
                return await api.systemNetwork();
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        refetchInterval: 60000 
    });
}

/**
 * Hook zum Laden der System-Logs
 * 
 * @param params - Filter-Parameter
 */
export function useSystemLogs(params?: { limit?: number; level?: string }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'logs', params], 
        queryFn: async () => {
            try {
                return await api.systemLogs(params);
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
 * Hook zum Laden der System-Informationen
 */
export function useSystemInfo() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['system', 'info'], 
        queryFn: async () => {
            try {
                return await api.systemInfo();
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        } 
    });
}

// ─── TI (Telematikinfrastruktur) Hooks ─────────────────────

/**
 * Hook zum Laden des TI-Status
 */
export function useTIStatus() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['ti', 'status'], 
        queryFn: async () => {
            try {
                return await api.tiStatus();
            } catch (error) {
                if (isAbortError(error)) {
                    return { connected: false, status: 'DISCONNECTED' };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Prüfen der TI-Verbindung
 */
export function useTIPing() {
    return useMutation({ mutationFn: () => api.tiPing() });
}

/**
 * Hook zum Aktualisieren der TI-Verbindung
 */
export function useTIRefresh() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: () => api.tiRefresh(), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['ti'] }); } 
    });
}

/**
 * Hook zum Laden der Karten
 */
export function useTICards() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['ti', 'cards'], 
        queryFn: async () => {
            try {
                return await api.tiCards();
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
 * Hook zum Lesen der eGK (elektronische Gesundheitskarte)
 */
export function useTIReadEGK() {
    return useMutation({ mutationFn: () => api.tiReadEGK() });
}

/**
 * Hook zum Laden der TI-Konfiguration
 */
export function useTIConfig() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['ti', 'config'], 
        queryFn: async () => {
            try {
                return await api.tiConfig();
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
 * Hook zum Laden des ePA-Status
 */
export function useTIEpaStatus() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['ti', 'epa', 'status'], 
        queryFn: async () => {
            try {
                return await api.tiEpaStatus();
            } catch (error) {
                if (isAbortError(error)) {
                    return { available: false };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Laden des KIM-Status
 */
export function useTIKimStatus() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['ti', 'kim', 'status'], 
        queryFn: async () => {
            try {
                return await api.tiKimStatus();
            } catch (error) {
                if (isAbortError(error)) {
                    return { available: false };
                }
                throw error;
            }
        } 
    });
}

// ─── NFC Hooks ─────────────────────────────────────────────

/**
 * Hook zum Scannen eines NFC-Tags
 */
export function useNfcScan() {
    return useMutation({ 
        mutationFn: (data: { locationId: string; praxisId: string; timestamp: number; signature: string; sessionHint?: string; deviceInfo?: string }) => 
            api.nfcScan(data) 
    });
}

/**
 * Hook zum Laden der NFC-Checkpoints
 * 
 * @param praxisId - Die Praxis-ID
 */
export function useNfcCheckpoints(praxisId?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['nfc', 'checkpoints', praxisId], 
        queryFn: async () => {
            try {
                return await api.nfcListCheckpoints(praxisId);
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
 * Hook zum Erstellen eines NFC-Checkpoints
 */
export function useNfcCreateCheckpoint() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { locationId: string; praxisId: string; type: string; roomName?: string; nfcUid: string; coordinates?: unknown; secretRef?: string }) => api.nfcCreateCheckpoint(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['nfc', 'checkpoints'] }); } 
    });
}

/**
 * Hook zum Aktualisieren eines NFC-Checkpoints
 */
export function useNfcUpdateCheckpoint() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, data }: { id: string; data: unknown }) => api.nfcUpdateCheckpoint(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['nfc', 'checkpoints'] }); } 
    });
}

/**
 * Hook zum Löschen eines NFC-Checkpoints
 */
export function useNfcDeleteCheckpoint() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.nfcDeleteCheckpoint(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['nfc', 'checkpoints'] }); } 
    });
}

/**
 * Hook zum Laden der Scans eines Checkpoints
 * 
 * @param checkpointId - Die Checkpoint-ID
 * @param limit - Maximale Anzahl
 */
export function useNfcCheckpointScans(checkpointId: string, limit?: number) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['nfc', 'scans', checkpointId], 
        queryFn: async () => {
            try {
                return await api.nfcCheckpointScans(checkpointId, limit);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!checkpointId 
    });
}

// ─── Flow Hooks ────────────────────────────────────────────

/**
 * Hook zum Laden der Flows
 * 
 * @param praxisId - Die Praxis-ID
 */
export function useFlowList(praxisId?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['flows', praxisId], 
        queryFn: async () => {
            try {
                return await api.flowList(praxisId);
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
 * Hook zum Laden eines spezifischen Flows
 * 
 * @param id - Die Flow-ID
 */
export function useFlowGet(id: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['flows', id], 
        queryFn: async () => {
            try {
                return await api.flowGet(id);
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
 * Hook zum Erstellen eines Flows
 */
export function useFlowCreate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { praxisId: string; name: string; description?: string; serviceType?: string; steps: unknown[] }) => api.flowCreate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); } 
    });
}

/**
 * Hook zum Aktualisieren eines Flows
 */
export function useFlowUpdate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, data }: { id: string; data: unknown }) => api.flowUpdate(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); } 
    });
}

/**
 * Hook zum Laden des Flow-Fortschritts
 * 
 * @param flowId - Die Flow-ID
 * @param sessionId - Die Session-ID
 */
export function useFlowProgress(flowId: string, sessionId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['flows', flowId, 'progress', sessionId], 
        queryFn: async () => {
            try {
                return await api.flowGetProgress(flowId, sessionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!flowId && !!sessionId, 
        refetchInterval: 10000 
    });
}

/**
 * Hook zum Starten eines Flows
 */
export function useFlowStart() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ sessionId, flowId }: { sessionId: string; flowId: string }) => 
            api.flowStart(sessionId, flowId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); } 
    });
}

/**
 * Hook zum Fortschreiten im Flow
 */
export function useFlowAdvance() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { sessionId: string; fromStep: number; toStep: number; reason?: string; triggeredBy?: string }) => 
            api.flowAdvance(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); } 
    });
}

/**
 * Hook zum Verzögern eines Flow-Schritts
 */
export function useFlowDelay() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { sessionId: string; delayMinutes: number; reason: string }) => 
            api.flowDelay(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); } 
    });
}

// ─── Feedback Hooks ────────────────────────────────────────

/**
 * Hook zum Absenden von Feedback
 */
export function useFeedbackSubmit() {
    return useMutation({ 
        mutationFn: (data: { praxisId: string; sessionId?: string; rating: number; text?: string; categories?: string[] }) => 
            api.feedbackSubmit(data) 
    });
}

/**
 * Hook zum Laden der Feedback-Liste
 * 
 * @param params - Filter-Parameter
 */
export function useFeedbackList(params?: { praxisId?: string; escalated?: boolean; limit?: number }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['feedback', params], 
        queryFn: async () => {
            try {
                return await api.feedbackList(params);
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
 * Hook zum Laden der Feedback-Statistiken
 * 
 * @param praxisId - Die Praxis-ID
 */
export function useFeedbackStats(praxisId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['feedback', 'stats', praxisId], 
        queryFn: async () => {
            try {
                return await api.feedbackStats(praxisId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { total: 0, averageRating: 0, escalatedCount: 0, categories: [] };
                }
                throw error;
            }
        }, 
        enabled: !!praxisId 
    });
}

/**
 * Hook zum Eskalieren von Feedback
 */
export function useFeedbackEscalate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, status }: { id: string; status: string }) => api.feedbackEscalate(id, status), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['feedback'] }); } 
    });
}

/**
 * Hook zum Checkout einer Session
 */
export function useCheckoutSession() {
    return useMutation({ 
        mutationFn: ({ sessionId, action }: { sessionId: string; action: 'keep' | 'export' | 'delete' }) => 
            api.checkoutSession(sessionId, action) 
    });
}

// ─── Payment Hooks ─────────────────────────────────────────

/**
 * Hook zum Erstellen einer Zahlungsintent
 */
export function usePaymentCreateIntent() {
    return useMutation({ 
        mutationFn: (data: { sessionId: string; patientId: string; amount: number; currency?: string; type: string; description?: string }) => 
            api.paymentCreateIntent(data) 
    });
}

/**
 * Hook zum Laden einer NFC-Zahlung
 */
export function usePaymentNfcCharge() {
    return useMutation({ 
        mutationFn: (data: { sessionId: string; patientId: string; amount: number; type: string; nfcCardToken: string; description?: string }) => 
            api.paymentNfcCharge(data) 
    });
}

/**
 * Hook zum Laden eines Zahlungsbelegs
 * 
 * @param id - Die Zahlungs-ID
 */
export function usePaymentReceipt(id: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['payment', 'receipt', id], 
        queryFn: async () => {
            try {
                return await api.paymentReceipt(id);
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
 * Hook zum Laden der Zahlungsstatistiken
 * 
 * @param praxisId - Die Praxis-ID
 */
export function usePaymentStats(praxisId?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['payment', 'stats', praxisId], 
        queryFn: async () => {
            try {
                return await api.paymentStats(praxisId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalRevenue: 0, transactions: 0 };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Erstatten einer Zahlung
 */
export function usePaymentRefund() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.paymentRefund(id, reason), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment'] }); } 
    });
}

/**
 * Hook zum Laden der Zahlungen einer Session
 * 
 * @param sessionId - Die Session-ID
 */
export function usePaymentSessionList(sessionId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['payment', 'session', sessionId], 
        queryFn: async () => {
            try {
                return await api.paymentSessionList(sessionId);
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

// ─── Praxis Chat Hooks ─────────────────────────────────────

/**
 * Hook zum Laden der Chat-Nachrichten
 * 
 * @param sessionId - Die Session-ID
 * @param limit - Maximale Anzahl
 */
export function usePraxisChatMessages(sessionId: string, limit?: number) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['praxis-chat', sessionId], 
        queryFn: async () => {
            try {
                return await api.praxisChatMessages(sessionId, limit);
            } catch (error) {
                if (isAbortError(error)) {
                    return { messages: [] };
                }
                throw error;
            }
        }, 
        enabled: !!sessionId, 
        refetchInterval: 5000 
    });
}

/**
 * Hook zum Senden einer Chat-Nachricht
 */
export function usePraxisChatSend() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { sessionId: string; senderType: string; senderId?: string; contentType?: string; content: string; isTemplate?: boolean; templateId?: string }) => 
            api.praxisChatSend(data), 
        onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['praxis-chat', vars.sessionId] }); } 
    });
}

/**
 * Hook zum Broadcasten einer Chat-Nachricht
 */
export function usePraxisChatBroadcast() {
    return useMutation({ 
        mutationFn: (data: { praxisId: string; senderId: string; senderType: string; content: string; target: 'waiting' | 'all' | 'room'; roomFilter?: string }) => 
            api.praxisChatBroadcast(data) 
    });
}

/**
 * Hook zum Markieren von Nachrichten als gelesen
 */
export function usePraxisChatMarkRead() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ sessionId, readerId, readerType }: { sessionId: string; readerId: string; readerType: string }) => 
            api.praxisChatMarkRead(sessionId, readerId, readerType), 
        onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['praxis-chat', vars.sessionId] }); } 
    });
}

/**
 * Hook zum Laden der ungelesenen Nachrichten
 * 
 * @param sessionId - Die Session-ID
 * @param viewerType - Der Betrachter-Typ
 */
export function usePraxisChatUnread(sessionId: string, viewerType?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['praxis-chat', 'unread', sessionId], 
        queryFn: async () => {
            try {
                return await api.praxisChatUnread(sessionId, viewerType);
            } catch (error) {
                if (isAbortError(error)) {
                    return { count: 0 };
                }
                throw error;
            }
        }, 
        enabled: !!sessionId, 
        refetchInterval: 10000 
    });
}

/**
 * Hook zum Laden der Chat-Templates
 */
export function usePraxisChatTemplates() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['praxis-chat', 'templates'], 
        queryFn: async () => {
            try {
                return await api.praxisChatTemplates();
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
 * Hook zum Laden der Chat-Statistiken
 * 
 * @param praxisId - Die Praxis-ID
 */
export function usePraxisChatStats(praxisId?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['praxis-chat', 'stats', praxisId], 
        queryFn: async () => {
            try {
                return await api.praxisChatStats(praxisId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalMessages: 0, totalSessions: 0 };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Löschen eines Chats
 */
export function usePraxisChatDelete() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (sessionId: string) => api.praxisChatDelete(sessionId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['praxis-chat'] }); } 
    });
}

// ─── Avatar + Voice Hooks ──────────────────────────────────

/**
 * Hook zum Laden eines Avatars
 * 
 * @param staffId - Die Mitarbeiter-ID
 */
export function useAvatarGet(staffId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['avatar', staffId], 
        queryFn: async () => {
            try {
                return await api.avatarGet(staffId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!staffId 
    });
}

/**
 * Hook zum Aktualisieren eines Avatars
 */
export function useAvatarUpdate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ staffId, data }: { staffId: string; data: unknown }) => api.avatarUpdate(staffId, data), 
        onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['avatar', vars.staffId] }); } 
    });
}

/**
 * Hook zum Laden der Avatar-Liste
 * 
 * @param activeOnly - Nur aktive Avatars
 */
export function useAvatarList(activeOnly?: boolean) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['avatar', 'list', activeOnly], 
        queryFn: async () => {
            try {
                return await api.avatarList(activeOnly);
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
 * Hook zum Sprechen mit Avatar
 */
export function useAvatarSpeak() {
    return useMutation({ 
        mutationFn: (data: { staffId: string; text: string; language?: string; ssml?: boolean; format?: string }) => 
            api.avatarSpeak(data) 
    });
}

/**
 * Hook zum Einwilligen in Avatar-Nutzung
 */
export function useAvatarConsent() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (staffId: string) => api.avatarConsent(staffId), 
        onSuccess: (_d, staffId) => { qc.invalidateQueries({ queryKey: ['avatar', staffId] }); } 
    });
}

/**
 * Hook zum Widerrufen der Avatar-Einwilligung
 */
export function useAvatarRevokeConsent() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (staffId: string) => api.avatarRevokeConsent(staffId), 
        onSuccess: (_d, staffId) => { qc.invalidateQueries({ queryKey: ['avatar', staffId] }); } 
    });
}

/**
 * Hook zum Starten des Avatar-Clonings
 */
export function useAvatarCloneStart() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { staffId: string; audioSamples: string[]; consentToken: string; language?: string }) => 
            api.avatarCloneStart(data), 
        onSuccess: (_d, vars) => { qc.invalidateQueries({ queryKey: ['avatar', vars.staffId] }); } 
    });
}

/**
 * Hook zum Laden des Avatar-Cloning-Status
 * 
 * @param staffId - Die Mitarbeiter-ID
 */
export function useAvatarCloneStatus(staffId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['avatar', 'clone', staffId], 
        queryFn: async () => {
            try {
                return await api.avatarCloneStatus(staffId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!staffId 
    });
}

/**
 * Hook zum Löschen eines Avatars
 */
export function useAvatarDelete() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (staffId: string) => api.avatarDelete(staffId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['avatar'] }); } 
    });
}

/**
 * Hook zum Laden der Avatar-Sprachen
 */
export function useAvatarLanguages() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['avatar', 'languages'], 
        queryFn: async () => {
            try {
                return await api.avatarLanguages();
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        } 
    });
}

// ─── Telemedizin Hooks ─────────────────────────────────────

/**
 * Hook zum Laden der Telemedizin-Sessions
 * 
 * @param params - Filter-Parameter
 */
export function useTelemedizinList(params?: { status?: string; from?: string; to?: string }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['telemedizin', 'sessions', params], 
        queryFn: async () => {
            try {
                return await api.telemedizinList(params);
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
 * Hook zum Laden einer Telemedizin-Session
 * 
 * @param id - Die Session-ID
 */
export function useTelemedizinGet(id: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['telemedizin', 'session', id], 
        queryFn: async () => {
            try {
                return await api.telemedizinGet(id);
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
 * Hook zum Laden der Telemedizin-Statistiken
 */
export function useTelemedizinStats() {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['telemedizin', 'stats'], 
        queryFn: async () => {
            try {
                return await api.telemedizinStats();
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalSessions: 0, completedSessions: 0 };
                }
                throw error;
            }
        } 
    });
}

/**
 * Hook zum Erstellen einer Telemedizin-Session
 */
export function useTelemedizinCreate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { patientId: string; doctorId: string; type?: string; scheduledAt: string; notes?: string }) => 
            api.telemedizinCreate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['telemedizin'] }); } 
    });
}

/**
 * Hook zum Beitreten einer Telemedizin-Session
 */
export function useTelemedizinJoin() {
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string; participantId: string; role: string }) => 
            api.telemedizinJoin(id, data) 
    });
}

/**
 * Hook zum Beenden einer Telemedizin-Session
 */
export function useTelemedizinEnd() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string; notes?: string; diagnosis?: string }) => 
            api.telemedizinEnd(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['telemedizin'] }); } 
    });
}

/**
 * Hook zum Stornieren einer Telemedizin-Session
 */
export function useTelemedizinCancel() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.telemedizinCancel(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['telemedizin'] }); } 
    });
}

/**
 * Hook zum Markieren als "No-Show"
 */
export function useTelemedizinNoShow() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.telemedizinNoShow(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['telemedizin'] }); } 
    });
}

/**
 * Hook zum Erstellen eines Rezepts
 */
export function useTelemedizinPrescription() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string; medication: string; dosage: string; instructions?: string }) => 
            api.telemedizinPrescription(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['telemedizin'] }); } 
    });
}

/**
 * Hook zum Planen eines Follow-Ups
 */
export function useTelemedizinFollowUp() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string; followUpDate: string; notes?: string }) => 
            api.telemedizinFollowUp(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['telemedizin'] }); } 
    });
}

// ─── Gamification Hooks ────────────────────────────────────

/**
 * Hook zum Laden der Mitarbeiter-Achievements
 * 
 * @param staffId - Die Mitarbeiter-ID
 */
export function useGamificationStaffAchievements(staffId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['gamification', 'achievements', staffId], 
        queryFn: async () => {
            try {
                return await api.gamificationStaffAchievements(staffId);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!staffId 
    });
}

/**
 * Hook zum Laden des Leaderboards
 * 
 * @param params - Filter-Parameter
 */
export function useGamificationLeaderboard(params: { praxisId: string; period?: string; limit?: number }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['gamification', 'leaderboard', params], 
        queryFn: async () => {
            try {
                return await api.gamificationLeaderboard(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!params.praxisId 
    });
}

/**
 * Hook zum Laden der Mitarbeiter-Punkte
 * 
 * @param staffId - Die Mitarbeiter-ID
 */
export function useGamificationStaffPoints(staffId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['gamification', 'points', staffId], 
        queryFn: async () => {
            try {
                return await api.gamificationStaffPoints(staffId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { points: 0, level: 0 };
                }
                throw error;
            }
        }, 
        enabled: !!staffId 
    });
}

/**
 * Hook zum Laden der Gamification-Statistiken
 * 
 * @param praxisId - Die Praxis-ID
 */
export function useGamificationStats(praxisId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['gamification', 'stats', praxisId], 
        queryFn: async () => {
            try {
                return await api.gamificationStats(praxisId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalPoints: 0, activeUsers: 0 };
                }
                throw error;
            }
        }, 
        enabled: !!praxisId 
    });
}

/**
 * Hook zum Vergeben von Punkten/Awards
 */
export function useGamificationAward() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { staffId: string; type: string; points?: number; description: string }) => 
            api.gamificationAward(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['gamification'] }); } 
    });
}

/**
 * Hook zum Neuberechnen der Gamification-Daten
 */
export function useGamificationRecalculate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { praxisId: string; period: string }) => api.gamificationRecalculate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['gamification'] }); } 
    });
}

// ─── Forms Hooks ───────────────────────────────────────────

/**
 * Hook zum Laden eines Formulars
 * 
 * @param id - Die Formular-ID
 */
export function useFormGet(id: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['forms', id], 
        queryFn: async () => {
            try {
                return await api.formGet(id);
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
 * Hook zum Laden der Formular-Liste
 * 
 * @param params - Filter-Parameter
 */
export function useFormList(params: { praxisId: string; isActive?: boolean; tag?: string }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['forms', 'list', params], 
        queryFn: async () => {
            try {
                return await api.formList(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        }, 
        enabled: !!params.praxisId 
    });
}

/**
 * Hook zum Laden der Formular-Statistiken
 * 
 * @param praxisId - Die Praxis-ID
 */
export function useFormStats(praxisId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['forms', 'stats', praxisId], 
        queryFn: async () => {
            try {
                return await api.formStats(praxisId);
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalForms: 0, activeForms: 0 };
                }
                throw error;
            }
        }, 
        enabled: !!praxisId 
    });
}

/**
 * Hook zum Erstellen eines Formulars
 */
export function useFormCreate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { praxisId: string; createdBy: string; name: string; description?: string; questions: unknown[]; logic?: unknown; tags?: string[]; ageRange?: unknown }) => 
            api.formCreate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); } 
    });
}

/**
 * Hook zum Aktualisieren eines Formulars
 */
export function useFormUpdate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) => api.formUpdate(id, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); } 
    });
}

/**
 * Hook zum Löschen eines Formulars
 */
export function useFormDelete() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.formDelete(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); } 
    });
}

/**
 * Hook zum AI-Generieren eines Formulars
 */
export function useFormAiGenerate() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { praxisId: string; createdBy: string; prompt: string; language?: string }) => 
            api.formAiGenerate(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); } 
    });
}

/**
 * Hook zum Veröffentlichen eines Formulars
 */
export function useFormPublish() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (id: string) => api.formPublish(id), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); } 
    });
}

/**
 * Hook zum Laden der Formular-Nutzung
 */
export function useFormUsage() {
    return useMutation({ mutationFn: (id: string) => api.formUsage(id) });
}

// ─── Private ePA Hooks ─────────────────────────────────────

/**
 * Hook zum Laden der ePA-Daten
 * 
 * @param patientId - Die Patienten-ID
 */
export function useEpaGet(patientId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['epa', patientId], 
        queryFn: async () => {
            try {
                return await api.epaGet(patientId);
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
 * Hook zum Laden der ePA-Dokumente
 * 
 * @param patientId - Die Patienten-ID
 * @param type - Der Dokumententyp
 */
export function useEpaDocuments(patientId: string, type?: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['epa', 'documents', patientId, type], 
        queryFn: async () => {
            try {
                return await api.epaGetDocuments(patientId, type);
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
 * Hook zum Laden der ePA-Shares
 * 
 * @param patientId - Die Patienten-ID
 */
export function useEpaShares(patientId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['epa', 'shares', patientId], 
        queryFn: async () => {
            try {
                return await api.epaGetShares(patientId);
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
 * Hook zum Zugriff auf ePA via Token
 * 
 * @param token - Der Zugriffstoken
 */
export function useEpaAccessByToken(token: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['epa', 'access', token], 
        queryFn: async () => {
            try {
                return await api.epaAccessByToken(token);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!token 
    });
}

/**
 * Hook zum Laden eines ePA-Exports
 * 
 * @param exportId - Die Export-ID
 */
export function useEpaExport(exportId: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({ 
        queryKey: ['epa', 'export', exportId], 
        queryFn: async () => {
            try {
                return await api.epaGetExport(exportId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        }, 
        enabled: !!exportId 
    });
}

/**
 * Hook zum Hinzufügen eines ePA-Dokuments
 */
export function useEpaAddDocument() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ patientId, ...data }: { patientId: string; type: string; title: string; content?: string; fileUrl?: string; createdBy: string }) => 
            api.epaAddDocument(patientId, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['epa'] }); } 
    });
}

/**
 * Hook zum Löschen eines ePA-Dokuments
 */
export function useEpaDeleteDocument() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (docId: string) => api.epaDeleteDocument(docId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['epa'] }); } 
    });
}

/**
 * Hook zum Erstellen eines ePA-Shares
 */
export function useEpaCreateShare() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: ({ patientId, ...data }: { patientId: string; sharedWith: string; accessScope: string[]; expiresInHours?: number }) => 
            api.epaCreateShare(patientId, data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['epa'] }); } 
    });
}

/**
 * Hook zum Widerrufen eines ePA-Shares
 */
export function useEpaRevokeShare() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (shareId: string) => api.epaRevokeShare(shareId), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['epa'] }); } 
    });
}

/**
 * Hook zum Erstellen eines ePA-Exports
 */
export function useEpaCreateExport() {
    const qc = useQueryClient();
    return useMutation({ 
        mutationFn: (data: { patientId: string; exportType: string; format?: string }) => 
            api.epaCreateExport(data), 
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['epa'] }); } 
    });
}

// ─── Agent Hooks ───────────────────────────────────────────

/**
 * Hook zum Laden des Agent-Status
 */
export function useAgentStatus() {
    const { getSignal } = useAbortableRequest();
    return useQuery({
        queryKey: ['agents', 'status'],
        queryFn: async () => {
            try {
                return await api.agentStatus();
            } catch (error) {
                if (isAbortError(error)) {
                    return { agents: [], overallHealth: 'UNKNOWN' };
                }
                throw error;
            }
        },
        refetchInterval: 15_000,
    });
}

/**
 * Hook zum Laden der Agent-Tasks
 * 
 * @param params - Filter-Parameter
 */
export function useAgentTasks(params?: { status?: string; agentName?: string; limit?: number }) {
    const { getSignal } = useAbortableRequest();
    return useQuery({
        queryKey: ['agents', 'tasks', params],
        queryFn: async () => {
            try {
                return await api.agentTasks(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { tasks: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        },
        refetchInterval: 10_000,
    });
}

/**
 * Hook zum Laden eines spezifischen Agent-Tasks
 * 
 * @param id - Die Task-ID
 */
export function useAgentTaskDetail(id: string) {
    const { getSignal } = useAbortableRequest();
    return useQuery({
        queryKey: ['agents', 'tasks', id],
        queryFn: async () => {
            try {
                return await api.agentTaskDetail(id);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!id,
        refetchInterval: 5_000,
    });
}

/**
 * Hook zum Erstellen eines Agent-Tasks
 */
export function useCreateAgentTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { taskType?: string; description?: string; agentName?: string; priority?: string; payload?: Record<string, unknown> }) =>
            api.agentCreateTask(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents', 'tasks'] }); },
    });
}

/**
 * Hook zum Laden der Agent-Metriken
 */
export function useAgentMetrics() {
    const { getSignal } = useAbortableRequest();
    return useQuery({
        queryKey: ['agents', 'metrics'],
        queryFn: async () => {
            try {
                return await api.agentMetrics();
            } catch (error) {
                if (isAbortError(error)) {
                    return { totalTasks: 0, completedTasks: 0, failedTasks: 0 };
                }
                throw error;
            }
        },
        refetchInterval: 30_000,
    });
}
