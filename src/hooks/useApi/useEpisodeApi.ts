/**
 * Episode API Hooks
 *
 * Hooks für Behandlungsepisoden:
 * - Episoden CRUD (erstellen, laden, aktualisieren)
 * - Session ↔ Episode Zuordnung
 * - Präferenzen (setzen, deaktivieren)
 * - Verlaufsnotizen
 * - Personalisierung (aktive Episoden für neue Session)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { STALE_TIME } from './utils';

// ─── Query Keys ─────────────────────────────────────────────

export const episodeKeys = {
  all: ['episodes'] as const,
  byPatient: (patientId: string) => [...episodeKeys.all, 'patient', patientId] as const,
  byPatientStatus: (patientId: string, status?: string) =>
    [...episodeKeys.byPatient(patientId), { status }] as const,
  activeForPersonalization: (patientId: string) =>
    [...episodeKeys.all, 'active', patientId] as const,
  detail: (episodeId: string) => [...episodeKeys.all, 'detail', episodeId] as const,
};

// ─── Query Hooks ────────────────────────────────────────────

/**
 * Alle Episoden eines Patienten laden.
 * Verwendet vom Arzt-Dashboard / Patientenakte.
 */
export function usePatientEpisodes(patientId: string | undefined, status?: string) {
  return useQuery({
    queryKey: episodeKeys.byPatientStatus(patientId ?? '', status),
    queryFn: () => api.episodeGetByPatient(patientId!, { status }),
    enabled: !!patientId,
    staleTime: STALE_TIME.NORMAL,
  });
}

/**
 * Aktive Episoden eines Patienten für Personalisierung.
 * Wird bei Session-Erstellung abgefragt für maßgeschneiderte Fragen.
 */
export function useActiveEpisodesForPersonalization(patientId: string | undefined) {
  return useQuery({
    queryKey: episodeKeys.activeForPersonalization(patientId ?? ''),
    queryFn: () => api.episodeGetActiveForPersonalization(patientId!),
    enabled: !!patientId,
    staleTime: STALE_TIME.NORMAL,
  });
}

/**
 * Einzelne Episode mit allen Details laden (Sitzungen, Präferenzen, Notizen).
 */
export function useEpisodeDetail(episodeId: string | undefined) {
  return useQuery({
    queryKey: episodeKeys.detail(episodeId ?? ''),
    queryFn: () => api.episodeGetById(episodeId!),
    enabled: !!episodeId,
    staleTime: STALE_TIME.NORMAL,
  });
}

// ─── Mutation Hooks ─────────────────────────────────────────

/**
 * Neue Episode erstellen.
 */
export function useCreateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.episodeCreate>[0]) =>
      api.episodeCreate(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.byPatient(variables.patientId),
      });
    },
  });
}

/**
 * Episode aktualisieren (Status, Titel, Wünsche, etc.).
 */
export function useUpdateEpisode(episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.episodeUpdate>[1]) =>
      api.episodeUpdate(episodeId, data),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.detail(episodeId),
      });
      // Auch Patient-Liste aktualisieren
      queryClient.invalidateQueries({
        queryKey: episodeKeys.all,
      });
    },
  });
}

/**
 * Session einer Episode zuordnen.
 */
export function useLinkSessionToEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, sessionId }: { episodeId: string; sessionId: string }) =>
      api.episodeLinkSession(episodeId, sessionId),
    onSuccess: (_data, { episodeId }) => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.detail(episodeId),
      });
    },
  });
}

/**
 * Session von Episode trennen.
 */
export function useUnlinkSessionFromEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ episodeId, sessionId }: { episodeId: string; sessionId: string }) =>
      api.episodeUnlinkSession(episodeId, sessionId),
    onSuccess: (_data, { episodeId }) => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.detail(episodeId),
      });
    },
  });
}

/**
 * Präferenz setzen/aktualisieren.
 */
export function useSetEpisodePreference(episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.episodeSetPreference>[1]) =>
      api.episodeSetPreference(episodeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.detail(episodeId),
      });
    },
  });
}

/**
 * Präferenz deaktivieren.
 */
export function useDeactivateEpisodePreference(episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferenceId: string) =>
      api.episodeDeactivatePreference(episodeId, preferenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.detail(episodeId),
      });
    },
  });
}

/**
 * Verlaufsnotiz hinzufügen.
 */
export function useAddEpisodeNote(episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.episodeAddNote>[1]) =>
      api.episodeAddNote(episodeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: episodeKeys.detail(episodeId),
      });
    },
  });
}
