import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

interface Passkey {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface RegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification: 'required' | 'preferred' | 'discouraged';
    residentKey?: 'required' | 'preferred' | 'discouraged';
  };
  attestation?: 'none' | 'indirect' | 'direct';
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransport[];
  }>;
}

interface AuthenticationOptions {
  challenge: string;
  rpId: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

// API Functions
async function fetchPasskeyStatus(): Promise<{ enabled: boolean }> {
  const response = await apiClient.get('/auth/passkeys/status');
  return response.data;
}

async function fetchPasskeys(): Promise<Passkey[]> {
  const response = await apiClient.get('/auth/passkeys');
  return response.data.passkeys;
}

async function getRegistrationOptions(deviceName: string): Promise<RegistrationOptions> {
  const response = await apiClient.post('/auth/passkeys/register-options', { deviceName });
  return response.data;
}

async function registerPasskey(
  response: RegistrationResponseJSON,
  deviceName: string
): Promise<{ success: boolean; credentialId?: string }> {
  const res = await apiClient.post('/auth/passkeys/register', {
    response,
    deviceName,
  });
  return res.data;
}

async function getAuthenticationOptions(userId?: string): Promise<AuthenticationOptions> {
  const response = await apiClient.post('/auth/passkeys/auth-options', { userId });
  return response.data;
}

async function authenticateWithPasskey(
  response: AuthenticationResponseJSON
): Promise<{ success: boolean; userId?: string; userType?: string }> {
  const res = await apiClient.post('/auth/passkeys/authenticate', { response });
  return res.data;
}

async function deletePasskey(credentialId: string): Promise<void> {
  await apiClient.delete(`/auth/passkeys/${credentialId}`);
}

// React Query Hooks
export function usePasskeyStatus() {
  return useQuery({
    queryKey: ['auth', 'passkeys', 'status'],
    queryFn: fetchPasskeyStatus,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePasskeys() {
  return useQuery({
    queryKey: ['auth', 'passkeys'],
    queryFn: fetchPasskeys,
  });
}

export function useRegisterPasskey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      deviceName,
    }: {
      deviceName: string;
    }): Promise<RegistrationResponseJSON> => {
      // 1. Get options from server
      const options = await getRegistrationOptions(deviceName);
      
      // 2. Call WebAuthn API (needs to be done in component for browser access)
      // This returns the credential that the component will create
      return options as any; // This will be replaced by actual browser call
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'passkeys'] });
    },
  });
}

export function useDeletePasskey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePasskey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'passkeys'] });
    },
  });
}

export { getRegistrationOptions, registerPasskey, getAuthenticationOptions, authenticateWithPasskey };
export type { Passkey, RegistrationOptions, AuthenticationOptions };
