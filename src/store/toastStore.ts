import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
    duration?: number; // ms, 0 = persistent
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearAll: () => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (toast) => {
        const id = `toast-${++counter}-${Date.now()}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        return id;
    },
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    clearAll: () => set({ toasts: [] }),
}));

// Convenience helper — nutzbar außerhalb von React-Komponenten (z.B. api/client.ts)
export const toast = {
    success: (message: string, title?: string) =>
        useToastStore.getState().addToast({ type: 'success', message, title, duration: 4000 }),
    error: (message: string, title?: string) =>
        useToastStore.getState().addToast({ type: 'error', message, title, duration: 6000 }),
    warning: (message: string, title?: string) =>
        useToastStore.getState().addToast({ type: 'warning', message, title, duration: 5000 }),
    info: (message: string, title?: string) =>
        useToastStore.getState().addToast({ type: 'info', message, title, duration: 4000 }),
};
