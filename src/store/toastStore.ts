import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
    duration?: number; // ms, 0 = persistent
}

interface ToastHelpers {
    success: (message: string, title?: string) => string;
    error: (message: string, title?: string) => string;
    warning: (message: string, title?: string) => string;
    info: (message: string, title?: string) => string;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearAll: () => void;
    toast: ToastHelpers;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => {
    const addToast = (toast: Omit<Toast, 'id'>): string => {
        const id = `toast-${++counter}-${Date.now()}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        return id;
    };

    const toastHelpers: ToastHelpers = {
        success: (message: string, title?: string): string =>
            addToast({ type: 'success', message, title, duration: 4000 }),
        error: (message: string, title?: string): string =>
            addToast({ type: 'error', message, title, duration: 6000 }),
        warning: (message: string, title?: string): string =>
            addToast({ type: 'warning', message, title, duration: 5000 }),
        info: (message: string, title?: string): string =>
            addToast({ type: 'info', message, title, duration: 4000 }),
    };

    return {
        toasts: [],
        addToast,
        removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        clearAll: () => set({ toasts: [] }),
        toast: toastHelpers,
    };
});

// Convenience helper - usable outside React components (e.g. api/client.ts)
export const toast = useToastStore.getState().toast;
