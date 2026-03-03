import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Shortcut {
    keys: string[];
    action: string;
}

/**
 * Overlay showing available keyboard shortcuts.
 * Triggered by pressing "?" or clicking the help button.
 */
export const KeyboardShortcutsHelp: React.FC = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const shortcuts: Shortcut[] = [
        { keys: ['Enter', '→'], action: t('shortcut.next', 'Nächste Frage') },
        { keys: ['Esc', '←'], action: t('shortcut.back', 'Zurück') },
        { keys: ['1-9'], action: t('shortcut.selectOption', 'Option auswählen') },
        { keys: ['?'], action: t('shortcut.help', 'Tastenkürzel anzeigen') },
        { keys: ['Tab'], action: t('shortcut.focusNext', 'Nächstes Element fokussieren') },
    ];

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                aria-label={t('shortcut.help', 'Tastenkürzel anzeigen')}
                className="fixed bottom-6 left-6 w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-card-hover)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all z-40 print:hidden"
            >
                <Keyboard className="w-4 h-4" />
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
                    <div
                        className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
                            <div className="flex items-center gap-2">
                                <Keyboard className="w-4 h-4 text-blue-400" />
                                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                                    {t('shortcut.title', 'Tastenkürzel')}
                                </h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} aria-label={t('Hinweis schließen', 'Schließen')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {shortcuts.map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-secondary)]">{s.action}</span>
                                    <div className="flex items-center gap-1">
                                        {s.keys.map((key, j) => (
                                            <React.Fragment key={j}>
                                                {j > 0 && <span className="text-xs text-[var(--text-muted)]">/</span>}
                                                <kbd className="px-2 py-0.5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded text-xs font-mono text-[var(--text-primary)]">
                                                    {key}
                                                </kbd>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-[var(--border-primary)]">
                            <p className="text-[10px] text-[var(--text-muted)] text-center">
                                {t('shortcut.hint', 'Drücken Sie ? um dieses Menü zu öffnen')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
