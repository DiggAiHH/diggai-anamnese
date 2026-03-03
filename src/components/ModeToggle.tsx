import React from 'react';
import { Monitor, Cloud } from 'lucide-react';
import { useModeStore } from '../store/modeStore';
import { useTranslation } from 'react-i18next';

/**
 * Toggle between Demo mode (localStorage) and Live mode (backend API).
 * Shows a small pill-shaped indicator in the header.
 */
export const ModeToggle: React.FC = () => {
    const { t } = useTranslation();
    const { mode, toggleMode } = useModeStore();
    const isDemo = mode === 'demo';

    return (
        <button
            onClick={toggleMode}
            title={t('Modus wechseln', 'Modus wechseln')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border
                ${isDemo
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                }`}
        >
            {isDemo ? (
                <>
                    <Monitor className="w-3.5 h-3.5" />
                    {t('Demo-Modus', 'Demo')}
                </>
            ) : (
                <>
                    <Cloud className="w-3.5 h-3.5" />
                    {t('Live-Modus', 'Live')}
                </>
            )}
        </button>
    );
};
