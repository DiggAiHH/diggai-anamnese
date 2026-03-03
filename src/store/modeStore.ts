import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModeState {
    mode: 'demo' | 'live';
    toggleMode: () => void;
    setMode: (m: 'demo' | 'live') => void;
    isDemo: () => boolean;
}

/**
 * Switchable Demo/Live mode store.
 * 
 * - Demo: All API calls use localStorage fallback (no backend required)
 * - Live: API calls go to the real backend server
 * 
 * Changing mode at runtime updates the exported `isDemoMode()` function
 * used by client.ts to decide which path to take.
 */
export const useModeStore = create<ModeState>()(
    persist(
        (set, get) => ({
            mode: 'demo', // Default to demo for static deployments
            toggleMode: () =>
                set(state => ({ mode: state.mode === 'demo' ? 'live' : 'demo' })),
            setMode: (m) => set({ mode: m }),
            isDemo: () => get().mode === 'demo',
        }),
        {
            name: 'anamnese-mode',
        }
    )
);

/**
 * Non-hook accessor for use in client.ts (outside React components).
 * Returns true when the app is in Demo mode.
 */
export function isDemoMode(): boolean {
    return useModeStore.getState().mode === 'demo';
}
