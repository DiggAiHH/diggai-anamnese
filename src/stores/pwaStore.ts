import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PwaAuthState {
    token: string | null;
    accountId: string | null;
    patientId: string | null;
    isAuthenticated: boolean;
    login: (token: string, accountId: string, patientId: string) => void;
    logout: () => void;
    setToken: (token: string) => void;
}

export const usePwaStore = create<PwaAuthState>()(
    persist(
        (set) => ({
            token: null,
            accountId: null,
            patientId: null,
            isAuthenticated: false,
            login: (token, accountId, patientId) => set({ token, accountId, patientId, isAuthenticated: true }),
            logout: () => set({ token: null, accountId: null, patientId: null, isAuthenticated: false }),
            setToken: (token) => set({ token }),
        }),
        {
            name: 'diggai-pwa-auth',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
