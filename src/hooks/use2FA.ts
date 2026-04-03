import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

// =============================================================================
// Types
// =============================================================================

export interface TwoFAStatus {
  enabled: boolean;
  method?: 'totp' | 'webauthn';
  verifiedAt?: string;
}

export interface TwoFASetupResponse {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFAVerifyPayload {
  code: string;
}

export interface TwoFAVerifyResponse {
  success: boolean;
  backupCodes: string[];
}

export interface TwoFADisablePayload {
  code: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch 2FA status for current user
 */
async function fetchTwoFAStatus(): Promise<TwoFAStatus> {
  const response = await apiClient.get('/auth/2fa/status');
  return response.data;
}

/**
 * Initiate 2FA setup - returns QR code and secret
 */
async function setupTwoFA(): Promise<TwoFASetupResponse> {
  const response = await apiClient.post('/auth/2fa/setup');
  return response.data;
}

/**
 * Verify 2FA setup with TOTP code
 */
async function verifyTwoFASetup(payload: TwoFAVerifyPayload): Promise<TwoFAVerifyResponse> {
  const response = await apiClient.post('/auth/2fa/verify', payload);
  return response.data;
}

/**
 * Disable 2FA for current user
 */
async function disableTwoFA(payload: TwoFADisablePayload): Promise<{ success: boolean }> {
  const response = await apiClient.delete('/auth/2fa', { data: payload });
  return response.data;
}

// =============================================================================
// React Query Hooks
// =============================================================================

/**
 * Query hook for 2FA status
 * Fetches current 2FA status (enabled/disabled)
 */
export function use2FAStatus() {
  return useQuery({
    queryKey: ['auth', '2fa', 'status'],
    queryFn: fetchTwoFAStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Mutation hook for 2FA setup
 * Initiates setup and returns QR code, secret, and backup codes
 */
export function use2FASetup() {
  return useMutation({
    mutationFn: setupTwoFA,
  });
}

/**
 * Mutation hook for verifying 2FA setup
 * Verifies TOTP code and completes 2FA activation
 */
export function useVerify2FASetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyTwoFASetup,
    onSuccess: () => {
      // Invalidate 2FA status query to refresh state
      queryClient.invalidateQueries({ queryKey: ['auth', '2fa', 'status'] });
    },
  });
}

/**
 * Mutation hook for disabling 2FA
 * Disables 2FA after verifying TOTP code
 */
export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableTwoFA,
    onSuccess: () => {
      // Invalidate 2FA status query to refresh state
      queryClient.invalidateQueries({ queryKey: ['auth', '2fa', 'status'] });
    },
  });
}
