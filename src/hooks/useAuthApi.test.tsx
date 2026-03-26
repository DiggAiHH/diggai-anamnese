import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGenerateQrToken, useArztLogin } from './useApi/useAuthApi';
import * as client from '../api/client';
import * as staffSession from '../lib/staffSession';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    generateQrToken: vi.fn(),
    arztLogin: vi.fn(),
  },
}));

vi.mock('../lib/staffSession', () => ({
  setStoredStaffUser: vi.fn(),
}));

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('useGenerateQrToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate QR token successfully', async () => {
    const mockResponse = { token: 'qr-token-123', url: 'https://example.com/qr' };
    vi.mocked(client.api.generateQrToken).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGenerateQrToken(), { wrapper });

    result.current.mutate('Allgemeinmedizin');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.generateQrToken).toHaveBeenCalledWith('Allgemeinmedizin');
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should generate QR token without service parameter', async () => {
    const mockResponse = { token: 'qr-token-456', url: 'https://example.com/qr' };
    vi.mocked(client.api.generateQrToken).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGenerateQrToken(), { wrapper });

    result.current.mutate(undefined);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.generateQrToken).toHaveBeenCalledWith(undefined);
  });

  it('should handle error when generating QR token fails', async () => {
    const mockError = new Error('Network error');
    vi.mocked(client.api.generateQrToken).mockRejectedValueOnce(mockError);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGenerateQrToken(), { wrapper });

    result.current.mutate('Service');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });
});

describe('useArztLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login successfully and cache the staff profile', async () => {
    const mockResponse = {
      user: { id: '1', username: 'dr.test', displayName: 'Dr. Test', role: 'arzt' },
    };
    vi.mocked(client.api.arztLogin).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArztLogin(), { wrapper });

    result.current.mutate({ username: 'dr.test', password: 'password123' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.arztLogin).toHaveBeenCalledWith('dr.test', 'password123');
    expect(staffSession.setStoredStaffUser).toHaveBeenCalledWith(mockResponse.user);
  });

  it('should handle login failure', async () => {
    const mockError = new Error('Invalid credentials');
    vi.mocked(client.api.arztLogin).mockRejectedValueOnce(mockError);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArztLogin(), { wrapper });

    result.current.mutate({ username: 'dr.test', password: 'wrong' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
    expect(staffSession.setStoredStaffUser).not.toHaveBeenCalled();
  });

  it('should set loading state during login', async () => {
    vi.mocked(client.api.arztLogin).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        user: { id: '1', username: 'dr.test', displayName: 'Dr. Test', role: 'arzt' },
      }), 100))
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useArztLogin(), { wrapper });

    result.current.mutate({ username: 'dr.test', password: 'password123' });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
