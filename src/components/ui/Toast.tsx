import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type Toast, type ToastType } from '../../store/toastStore';

// ─── Single Toast ──────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />,
    error:   <XCircle     className="w-5 h-5 text-red-400   flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
    info:    <Info         className="w-5 h-5 text-blue-400  flex-shrink-0" />,
};

const BORDER: Record<ToastType, string> = {
    success: 'border-l-green-500',
    error:   'border-l-red-500',
    warning: 'border-l-amber-500',
    info:    'border-l-blue-500',
};

function ToastItem({ toast }: { toast: Toast }) {
    const removeToast = useToastStore((s) => s.removeToast);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const dur = toast.duration ?? 5000;
        if (dur > 0) {
            timerRef.current = setTimeout(() => removeToast(toast.id), dur);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [toast.id, toast.duration, removeToast]);

    return (
        <div
            role="alert"
            className={`
                flex items-start gap-3 w-full max-w-sm
                bg-[var(--bg-card)] border border-[var(--border-primary)] border-l-4 ${BORDER[toast.type]}
                rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm
                animate-slideInRight
            `}
        >
            {ICONS[toast.type]}
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{toast.title}</p>
                )}
                <p className="text-sm text-[var(--text-secondary)] leading-snug">{toast.message}</p>
            </div>
            <button
                onClick={() => removeToast(toast.id)}
                aria-label="Schließen"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-0.5 flex-shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Toast Container ───────────────────────────────────────────

export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);

    if (toasts.length === 0) return null;

    return (
        <div
            aria-live="polite"
            aria-atomic="false"
            className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
        >
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto w-full">
                    <ToastItem toast={t} />
                </div>
            ))}
        </div>
    );
}
