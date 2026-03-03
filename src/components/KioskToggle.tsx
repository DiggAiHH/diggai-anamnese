import { useState, useEffect, useCallback } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function KioskToggle() {
    const { t } = useTranslation();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const updateState = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', updateState);
        return () => document.removeEventListener('fullscreenchange', updateState);
    }, [updateState]);

    const toggle = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch {
            // Fullscreen not supported or denied
        }
    };

    // Only render if Fullscreen API is available
    if (!document.documentElement.requestFullscreen) return null;

    return (
        <button
            onClick={toggle}
            className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-xl transition-all border border-transparent hover:border-[var(--border-primary)]"
            title={isFullscreen ? t('kiosk.exit', 'Vollbild beenden') : t('kiosk.enter', 'Vollbild (Kiosk-Modus)')}
            aria-label={isFullscreen ? t('kiosk.exit_aria', 'Exit fullscreen') : t('kiosk.enter_aria', 'Enter fullscreen')}
        >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
    );
}
