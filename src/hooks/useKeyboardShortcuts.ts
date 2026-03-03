import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
    onNext: () => void;
    onBack: () => void;
    onSelectOption?: (index: number) => void;
    enabled?: boolean;
}

/**
 * Keyboard shortcuts for questionnaire navigation:
 * - Enter / ArrowRight → Next question
 * - Escape / ArrowLeft → Previous question
 * - 1-9 → Select option by number (for radio/multiselect)
 */
export function useKeyboardShortcuts({
    onNext,
    onBack,
    onSelectOption,
    enabled = true,
}: KeyboardShortcutsOptions) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;

            // Don't intercept when typing in input/textarea/contenteditable
            const tag = (e.target as HTMLElement)?.tagName;
            const isEditable = (e.target as HTMLElement)?.isContentEditable;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) {
                // Only allow Enter in non-multiline inputs
                if (e.key === 'Enter' && tag === 'INPUT') {
                    e.preventDefault();
                    onNext();
                }
                return;
            }

            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    onNext();
                    break;
                case 'Escape':
                case 'Backspace':
                    e.preventDefault();
                    onBack();
                    break;
                default:
                    // Number keys 1-9 for option selection
                    if (onSelectOption && /^[1-9]$/.test(e.key)) {
                        e.preventDefault();
                        onSelectOption(parseInt(e.key, 10) - 1);
                    }
                    break;
            }
        },
        [onNext, onBack, onSelectOption, enabled]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
