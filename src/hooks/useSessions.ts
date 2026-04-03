import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

export interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  os?: string;
  location?: string;
  ipHash: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrentSession: boolean;
  isTrusted: boolean;
}

export interface ActivityEvent {
  id: string;
  action: 'LOGIN' | 'LOGOUT';
  deviceName: string;
  browser?: string;
  location?: string;
  ipHash: string;
  timestamp: string;
  status: string;
}

// Fetch sessions
async function fetchSessions(): Promise<Session[]> {
  const response = await apiClient.get('/auth/sessions');
  return response.data.sessions;
}

// Fetch activity log
async function fetchActivity(limit?: number): Promise<ActivityEvent[]> {
  const response = await apiClient.get('/auth/sessions/activity', {
    params: limit ? { limit } : undefined,
  });
  return response.data.activity;
}

// Terminate session
async function terminateSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/auth/sessions/${sessionId}`);
}

// Terminate all other sessions
async function terminateAllSessions(): Promise<{ terminatedCount: number }> {
  const response = await apiClient.delete('/auth/sessions/all');
  return response.data;
}

// React Query Hooks
export function useSessions() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: fetchSessions,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useActivityLog(limit?: number) {
  return useQuery({
    queryKey: ['auth', 'activity', limit],
    queryFn: () => fetchActivity(limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useTerminateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: terminateSession,
    onSuccess: () => {
      // Invalidate sessions query to refresh list
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'activity'] });
    },
  });
}

export function useTerminateAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: terminateAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'activity'] });
    },
  });
}
