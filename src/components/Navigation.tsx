import { ArrowLeft, ArrowRight, Send, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Navigation Component - Psychology-Optimized (Phase 3)
 * 
 * Miller's Law (7±2 items):
 * - Max 5 top-level navigation items
 * - Primary actions: Back, Next/Submit, Home (max 3 visible)
 * 
 * Thumb Zone Optimization:
 * - 48px minimum touch targets (WCAG 2.5.5)
 * - Primary actions within thumb reach (bottom-right for right-handed)
 * - Adequate spacing between touch targets (min 8px)
 */
interface NavigationProps {
    canGoBack: boolean;
    canGoForward: boolean;
    isLastQuestion: boolean;
    isSubmitting: boolean;
    onBack: () => void;
    onNext: () => void;
    onSubmit: () => void;
    onReset?: () => void;
}

export function Navigation({
    canGoBack,
    canGoForward,
    isLastQuestion,
    isSubmitting,
    onBack,
    onNext,
    onSubmit,
    onReset
}: NavigationProps) {
    const { t } = useTranslation();

    return (
        <nav 
            className="flex justify-between items-center mt-8 gap-4"
            aria-label={t('navigation.label', 'Fragebogen Navigation')}
        >
            {/* Back Button - Left aligned for thumb reach (left-handed users) */}
            <button
                type="button"
                onClick={onBack}
                disabled={!canGoBack}
                className="
                    flex items-center gap-2 
                    min-h-[48px] min-w-[48px] px-5 py-3  /* 48px touch target */
                    rounded-[20px] text-sm font-semibold
                    transition-all duration-200
                    disabled:opacity-30 disabled:cursor-not-allowed
                    text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                    hover:bg-[var(--bg-card)] border border-[var(--border-primary)]
                    hover:border-[var(--border-hover)]
                    active:scale-[0.98]
                "
                aria-label={t('navigation.back', 'Zurück')}
            >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('navigation.back', 'Zurück')}</span>
            </button>

            {/* Home Button - Optional, for emergency exit */}
            {onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    className="
                        flex items-center justify-center
                        min-h-[48px] min-w-[48px] p-3
                        rounded-[20px]
                        text-[var(--text-muted)] hover:text-[var(--text-primary)]
                        hover:bg-[var(--bg-card)] border border-transparent
                        hover:border-[var(--border-primary)]
                        transition-all duration-200
                        active:scale-[0.98]
                    "
                    title={t('navigation.home', 'Abbrechen & Home')}
                    aria-label={t('navigation.home', 'Abbrechen und zur Startseite')}
                >
                    <Home className="w-5 h-5" aria-hidden="true" />
                </button>
            )}

            {/* Primary Action - Next/Submit */}
            {isLastQuestion ? (
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="
                        flex items-center gap-2 
                        min-h-[48px] min-w-[48px] px-6 py-3  /* 48px touch target */
                        rounded-[20xl] text-sm font-bold
                        bg-gradient-to-r from-blue-600 to-indigo-600
                        text-white shadow-lg shadow-blue-500/25
                        hover:shadow-xl hover:shadow-blue-500/30
                        hover:scale-[1.02] active:scale-[0.98]
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    aria-label={t('navigation.submit', 'Absenden')}
                >
                    {isSubmitting ? (
                        <>
                            <div 
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" 
                                aria-hidden="true"
                            />
                            <span>{t('navigation.sending', 'Wird gesendet...')}</span>
                        </>
                    ) : (
                        <>
                            <span>{t('navigation.submit', 'Absenden')}</span>
                            <Send className="w-5 h-5" aria-hidden="true" />
                        </>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canGoForward}
                    className="
                        flex items-center gap-2 
                        min-h-[48px] min-w-[48px] px-6 py-3  /* 48px touch target */
                        rounded-[20px] text-sm font-bold
                        bg-gradient-to-r from-blue-600 to-indigo-600
                        text-white shadow-lg shadow-blue-500/25
                        hover:shadow-xl hover:shadow-blue-500/30
                        hover:scale-[1.02] active:scale-[0.98]
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    aria-label={t('navigation.next', 'Weiter')}
                >
                    <span>{t('navigation.next', 'Weiter')}</span>
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
            )}
        </nav>
    );
}

/**
 * Simplified Header Navigation - Max 5 items (Miller's Law)
 * 
 * Navigation Structure:
 * 1. Menu/History toggle
 * 2. Service indicator (current section)
 * 3. Progress indicator
 * 4. Settings/Language
 * 5. Help/Exit
 */
interface HeaderNavItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    isActive?: boolean;
}

export function HeaderNavigation({ 
    items,
    className = ''
}: { 
    items: HeaderNavItem[];
    className?: string;
}) {
    // Limit to max 5 items per Miller's Law
    const visibleItems = items.slice(0, 5);

    return (
        <nav className={`flex items-center gap-2 ${className}`}>
            {visibleItems.map((item) => (
                <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`
                        flex items-center gap-2
                        min-h-[48px] min-w-[48px] px-4 py-2
                        rounded-[20px] text-sm font-medium
                        transition-all duration-200
                        active:scale-[0.98]
                        ${item.isActive 
                            ? 'bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)]' 
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                        }
                    `}
                    aria-label={item.label}
                    aria-pressed={item.isActive}
                >
                    {item.icon}
                    <span className="hidden md:inline">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

export default Navigation;
