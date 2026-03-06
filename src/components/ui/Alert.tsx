import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const STYLES: Record<AlertVariant, { border: string; bg: string; icon: string; iconEl: ReactNode }> = {
    info:    { border: 'border-blue-500/30',  bg: 'bg-blue-500/10',  icon: 'text-blue-400',  iconEl: <Info          className="w-4 h-4 flex-shrink-0 mt-0.5" /> },
    success: { border: 'border-green-500/30', bg: 'bg-green-500/10', icon: 'text-green-400', iconEl: <CheckCircle2  className="w-4 h-4 flex-shrink-0 mt-0.5" /> },
    warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', icon: 'text-amber-400', iconEl: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> },
    error:   { border: 'border-red-500/30',   bg: 'bg-red-500/10',   icon: 'text-red-400',   iconEl: <XCircle       className="w-4 h-4 flex-shrink-0 mt-0.5" /> },
};

interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    children: ReactNode;
    onDismiss?: () => void;
    className?: string;
}

export function Alert({ variant = 'info', title, children, onDismiss, className = '' }: AlertProps) {
    const s = STYLES[variant];
    return (
        <div role="alert" className={`flex gap-3 p-4 rounded-xl border ${s.border} ${s.bg} ${className}`}>
            <span className={s.icon}>{s.iconEl}</span>
            <div className="flex-1 min-w-0">
                {title && <p className={`text-sm font-semibold ${s.icon} mb-0.5`}>{title}</p>}
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
            </div>
            {onDismiss && (
                <button type="button" onClick={onDismiss} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
