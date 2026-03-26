/**
 * Toast Component
 * 
 * Gentle, calming toast notifications with anxiety-reducing animations.
 * 
 * Design Principles:
 * - NO shake animations for errors
 * - Gentle fade-in for all toast types
 * - Smooth slide-out on dismissal
 * - Respects prefers-reduced-motion
 * - Soft color coding without aggression
 * 
 * Animation Timing:
 * - Enter: 400ms gentle fade + slide
 * - Exit: 200ms smooth fade-out
 * - No bouncing or aggressive movements
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type Toast, type ToastType } from '../../store/toastStore';
import { useCalmAnimation } from '../../hooks/useCalmAnimation';

// ─── Toast Icons ───────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
  error:   <XCircle     className="w-5 h-5 text-rose-500   flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  info:    <Info         className="w-5 h-5 text-blue-500  flex-shrink-0" />,
};

const BORDER: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error:   'border-l-rose-500',
  warning: 'border-l-amber-500',
  info:    'border-l-blue-500',
};

// ─── Single Toast Item ─────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onRemove?: (id: string) => void;
}

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { shouldAnimate } = useCalmAnimation<HTMLDivElement>();

  useEffect(() => {
    const dur = toast.duration ?? 5000;
    if (dur > 0) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, dur);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [toast.id, toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      onRemove?.(toast.id);
    }, 200); // Match CSS animation duration
  };

  // Determine animation class based on state
  const animationClass = isExiting 
    ? 'animate-slideOutRight' 
    : 'animate-slideInRight';

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 w-full max-w-sm
        bg-[var(--bg-card)] border border-[var(--border-primary)] border-l-4 ${BORDER[toast.type]}
        rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm
        transition-all duration-200
        ${shouldAnimate ? animationClass : ''}
        hover:shadow-2xl hover:translate-y-[-1px]
      `}
    >
      {/* Icon with gentle scale animation on enter */}
      <div className={shouldAnimate ? 'animate-successScale' : ''}>
        {ICONS[toast.type]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
            {toast.title}
          </p>
        )}
        <p className="text-sm text-[var(--text-secondary)] leading-snug">
          {toast.message}
        </p>
      </div>
      
      {/* Close button with gentle hover */}
      <button
        onClick={handleClose}
        aria-label="Schließen"
        className="
          text-[var(--text-secondary)] 
          hover:text-[var(--text-primary)] 
          transition-all duration-200 
          mt-0.5 flex-shrink-0
          rounded-md p-1
          hover:bg-[var(--bg-card-hover)]
        "
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Toast Container ───────────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
    >
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto w-full"
          style={{ 
            // Stagger entrance animations
            animationDelay: `${index * 50}ms` 
          }}
        >
          <ToastItem 
            toast={toast} 
            onRemove={removeToast}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Toast Provider Wrapper ────────────────────────────────────

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
