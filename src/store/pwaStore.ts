import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from '../api/client';

interface PwaAuthState {
    token: string | null;
    accountId: string | null;
    patientId: string | null;
    isAuthenticated: boolean;
    login: (token: string | null, accountId: string | null, patientId: string | null) => void;
    logout: () => void;
    setToken: (token: string | null) => void;
}

function syncPwaAuthToken(token: string | null) {
    setAuthToken(token);
}

export const usePwaStore = create<PwaAuthState>()(
    persist(
        (set) => ({
            token: null,
            accountId: null,
            patientId: null,
            isAuthenticated: false,
            login: (token, accountId, patientId) => {
                syncPwaAuthToken(token);
                set({
                    token,
                    accountId,
                    patientId,
                    isAuthenticated: Boolean(token && accountId && patientId),
                });
            },
            logout: () => {
                syncPwaAuthToken(null);
                set({ token: null, accountId: null, patientId: null, isAuthenticated: false });
            },
            setToken: (token) => {
                syncPwaAuthToken(token);
                set((state) => ({
                    token,
                    isAuthenticated: Boolean(token && state.accountId && state.patientId),
                }));
            },
        }),
        {
            name: 'diggai-pwa-auth',
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                syncPwaAuthToken(state?.token ?? null);
            },
        }
    )
);
