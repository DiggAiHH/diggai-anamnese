/**
 * PVS (Praxisverwaltungssystem) API Hooks
 * 
 * Hooks für PVS/FHIR-Integration:
 * - Verbindungsverwaltung
 * - Patienten-Import/Export
 * - Feld-Mappings
 * - Transfer-Verwaltung
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAbortableRequest, isAbortError } from './useAbortableRequest';

// ─── PVS / FHIR Integration Hooks ──────────────────────────

/**
 * Hook zum Laden aller PVS-Verbindungen
 */
export function usePvsConnections() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'connections'],
        queryFn: async () => {
            try {
                return await api.pvsConnections();
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
 * Hook zum Laden der Fähigkeiten einer PVS-Verbindung
 * 
 * @param connectionId - Die Verbindungs-ID
 */
export function usePvsCapabilities(connectionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'capabilities', connectionId],
        queryFn: async () => {
            try {
                return await api.pvsCapabilities(connectionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!connectionId,
    });
}

/**
 * Hook zum Erstellen einer PVS-Verbindung
 */
export function usePvsCreateConnection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { pvsType: string; protocol: string; name: string; config: Record<string, unknown> }) =>
            api.pvsCreateConnection(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'connections'] }); },
    });
}

/**
 * Hook zum Aktualisieren einer PVS-Verbindung
 */
export function usePvsUpdateConnection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
            api.pvsUpdateConnection(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'connections'] }); },
    });
}

/**
 * Hook zum Testen einer PVS-Verbindung
 */
export function usePvsTestConnection() {
    return useMutation({
        mutationFn: (id: string) => api.pvsTestConnection(id),
    });
}

/**
 * Hook zum Löschen einer PVS-Verbindung
 */
export function usePvsDeleteConnection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.pvsDeleteConnection(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'connections'] }); },
    });
}

/**
 * Hook zum Exportieren einer Session zum PVS
 */
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

/**
 * Hook zum Batch-Export mehrerer Sessions
 */
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

/**
 * Hook zum Importieren eines Patienten aus dem PVS
 */
export function usePvsImportPatient() {
    return useMutation({
        mutationFn: ({ externalId, connectionId }: { externalId: string; connectionId?: string }) =>
            api.pvsImportPatient(externalId, connectionId),
    });
}

/**
 * Hook zum Laden der Patienten-Links
 * 
 * @param patientId - Die Patienten-ID
 */
export function usePvsPatientLinks(patientId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'patient-links', patientId],
        queryFn: async () => {
            try {
                return await api.pvsPatientLinks(patientId);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
        enabled: !!patientId,
    });
}

/**
 * Hook zum Erstellen eines Patienten-Links
 */
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

/**
 * Hook zum Löschen eines Patienten-Links
 */
export function usePvsDeletePatientLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.pvsDeletePatientLink(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'patient-links'] }); },
    });
}

/**
 * Hook zum Laden der PVS-Transfers
 * 
 * @param params - Filter-Parameter
 */
export function usePvsTransfers(params?: { page?: number; limit?: number; direction?: string; status?: string; connectionId?: string }) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'transfers', params],
        queryFn: async () => {
            try {
                return await api.pvsTransfers(params);
            } catch (error) {
                if (isAbortError(error)) {
                    return { transfers: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
                }
                throw error;
            }
        },
    });
}

/**
 * Hook zum Laden eines spezifischen Transfers
 * 
 * @param id - Die Transfer-ID
 */
export function usePvsTransferDetail(id: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'transfer', id],
        queryFn: async () => {
            try {
                return await api.pvsTransferDetail(id);
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
 * Hook zum Wiederholen eines fehlgeschlagenen Transfers
 */
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

/**
 * Hook zum Laden der Transfer-Statistiken
 */
export function usePvsTransferStats() {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'transfer-stats'],
        queryFn: async () => {
            try {
                return await api.pvsTransferStats();
            } catch (error) {
                if (isAbortError(error)) {
                    return { total: 0, byStatus: {}, byConnection: {} };
                }
                throw error;
            }
        },
        refetchInterval: 30 * 1000,
    });
}

/**
 * Hook zum Laden der Feld-Mappings
 * 
 * @param connectionId - Die Verbindungs-ID
 */
export function usePvsMappings(connectionId: string) {
    const { getSignal } = useAbortableRequest();
    
    return useQuery({
        queryKey: ['pvs', 'mappings', connectionId],
        queryFn: async () => {
            try {
                return await api.pvsMappings(connectionId);
            } catch (error) {
                if (isAbortError(error)) {
                    return [];
                }
                throw error;
            }
        },
        enabled: !!connectionId,
    });
}

/**
 * Hook zum Speichern von Feld-Mappings
 */
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

/**
 * Hook zum Zurücksetzen der Feld-Mappings
 */
export function usePvsResetMappings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (connectionId: string) => api.pvsResetMappings(connectionId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'mappings'] }); },
    });
}

/**
 * Hook zum Anzeigen einer Mapping-Vorschau
 */
export function usePvsMappingPreview() {
    return useMutation({
        mutationFn: ({ connectionId, sessionId }: { connectionId: string; sessionId: string }) =>
            api.pvsMappingPreview(connectionId, sessionId),
    });
}

// ─── PVS Compatibility Aliases ──────────────────────────────

/**
 * Alias für usePvsMappings (Kompatibilität)
 * 
 * @param connectionId - Die Verbindungs-ID
 */
export function usePvsFieldMappings(connectionId: string) {
    return usePvsMappings(connectionId);
}

/**
 * Hook zum Aktualisieren eines einzelnen Feld-Mappings (Kompatibilität)
 */
export function usePvsUpdateFieldMapping() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ connectionId, mappingId: _mappingId, data }: { connectionId: string; mappingId: string; data: Record<string, unknown> }) =>
            api.pvsSaveMappings(connectionId, [{ sourceField: (data.gdtField as string) || '', targetField: `${data.diggaiModel || ''}.${data.diggaiField || ''}`, transform: data.transform as string | undefined }]),
        onSuccess: (_d, v) => { queryClient.invalidateQueries({ queryKey: ['pvs', 'mappings', v.connectionId] }); },
    });
}

/**
 * Hook zum Verknüpfen eines Patienten (Kompatibilität)
 */
export function usePvsLinkPatient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ connectionId, pvsPatientId, patientNumber }: { connectionId: string; pvsPatientId: string; patientNumber: string }) =>
            api.pvsCreatePatientLink({ patientId: patientNumber, connectionId, externalPatientId: pvsPatientId }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'patient-links'] }); },
    });
}

/**
 * Hook zum Entfernen einer Patienten-Verknüpfung (Kompatibilität)
 */
export function usePvsUnlinkPatient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ linkId }: { connectionId: string; linkId: string }) =>
            api.pvsDeletePatientLink(linkId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pvs', 'patient-links'] }); },
    });
}

/**
 * Hook zum Suchen nach Patienten im PVS (Kompatibilität)
 */
export function usePvsSearchPatient() {
    return useMutation({
        mutationFn: async ({ connectionId, query }: { connectionId: string; query: string }) => {
            const response = await api.pvsPatientLinks(connectionId);
            const all = Array.isArray(response) ? response : [];
            const filtered = all.filter((p: Record<string, string>) =>
                Object.values(p).some(v => typeof v === 'string' && v.toLowerCase().includes(query.toLowerCase()))
            );
            return { patients: filtered };
        },
    });
}
