import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SessionTimeoutWarningProps {
    /** Idle time in ms before showing warning (default: 15 minutes) */
    idleTimeout?: number;
    /** Time in ms before the session auto-clears after warning (default: 5 minutes) */
    warningDuration?: number;
    onTimeout: () => void;
}

export function SessionTimeoutWarning({
    idleTimeout = 15 * 60 * 1000,   // 15 min
    warningDuration = 5 * 60 * 1000, // 5 min
    onTimeout,
}: SessionTimeoutWarningProps) {
    const { t } = useTranslation();
    const [showWarning, setShowWarning] = useState(false);
    const [remaining, setRemaining] = useState(warningDuration);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(null as unknown as ReturnType<typeof setTimeout>);
    const countdownRef = useRef<ReturnType<typeof setInterval>>(null as unknown as ReturnType<typeof setInterval>);
    const warningStartRef = useRef<number>(0);

    const resetIdleTimer = useCallback(() => {
        // If warning is showing, don't reset (user must click Continue)
        if (showWarning) return;

        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            warningStartRef.current = Date.now();
            setRemaining(warningDuration);
        }, idleTimeout);
    }, [idleTimeout, warningDuration, showWarning]);

    // Listen for user activity
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
        events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
        resetIdleTimer(); // Start initial timer
        return () => {
            events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
            clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // Countdown when warning is shown
    useEffect(() => {
        if (!showWarning) {
            clearInterval(countdownRef.current);
            return;
        }
        countdownRef.current = setInterval(() => {
            const elapsed = Date.now() - warningStartRef.current;
            const left = Math.max(0, warningDuration - elapsed);
            setRemaining(left);
            if (left <= 0) {
                clearInterval(countdownRef.current);
                onTimeout();
            }
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [showWarning, warningDuration, onTimeout]);

    const handleContinue = () => {
        setShowWarning(false);
        // Reset the idle timer fresh
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            warningStartRef.current = Date.now();
            setRemaining(warningDuration);
        }, idleTimeout);
    };

    if (!showWarning) return null;

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {t('sessionTimeoutTitle', 'Sitzung inaktiv')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                    {t('sessionTimeoutMessage', 'Ihre Sitzung wird aus Sicherheitsgründen in {{time}} automatisch beendet.', { time: timeStr })}
                </p>
                <div className="text-3xl font-mono font-bold text-amber-400 mb-6">{timeStr}</div>
                <div className="flex gap-3">
                    <button
                        onClick={handleContinue}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        {t('Fortfahren')}
                    </button>
                    <button
                        onClick={onTimeout}
                        className="p-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] transition-all"
                        title={t('Sitzung beenden')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
