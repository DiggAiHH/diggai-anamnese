import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            {icon && (
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
                    {icon}
                </div>
            )}
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</p>
            {description && <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed mb-4">{description}</p>}
            {action}
        </div>
    );
}
