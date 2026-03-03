import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SaveStatus = 'saved' | 'saving' | 'offline';

interface AutoSaveIndicatorProps {
    /** Timestamp of last successful save */
    lastSaved?: Date | null;
    /** Whether currently saving */
    isSaving?: boolean;
    /** Whether network is available */
    isOnline?: boolean;
}

/**
 * Non-intrusive auto-save status indicator.
 * Shows save state with subtle animations.
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
    lastSaved,
    isSaving = false,
    isOnline = navigator.onLine,
}) => {
    const { t } = useTranslation();
    const [online, setOnline] = useState(isOnline);
    // Derive showSaved from state instead of using setState in effect
    const showSaved = !!(lastSaved && !isSaving);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (showSaved) {
            setFadeOut(false);
            const timer = setTimeout(() => setFadeOut(true), 2500);
            return () => clearTimeout(timer);
        }
    }, [showSaved, lastSaved]);

    const status: SaveStatus = !online ? 'offline' : isSaving ? 'saving' : 'saved';

    const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] transition-all duration-300" role="status" aria-live="polite">
            {status === 'offline' ? (
                <>
                    <CloudOff className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400">{t('autosave.offline', 'Offline')}</span>
                </>
            ) : status === 'saving' ? (
                <>
                    <Cloud className="w-3 h-3 animate-pulse text-blue-400" />
                    <span>{t('autosave.saving', 'Speichert...')}</span>
                </>
            ) : showSaved && !fadeOut ? (
                <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{t('autosave.saved', 'Gespeichert')}</span>
                </>
            ) : lastSaved ? (
                <>
                    <Cloud className="w-3 h-3" />
                    <span>{t('autosave.lastSaved', 'Zuletzt gespeichert: {{time}}', { time: formatTime(lastSaved) })}</span>
                </>
            ) : null}
        </div>
    );
};
