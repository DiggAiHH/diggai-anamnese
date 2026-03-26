import React from 'react';
import { Layout, LayoutList } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { useTranslation } from 'react-i18next';

/**
 * SimpleModeToggle - Progressive Disclosure Control
 * 
 * Psychology-Based Design:
 * - Simple Mode: Single question per screen (overwhelmed/stressed users)
 * - Normal Mode: 3-4 questions max per screen (standard users)
 * 
 * Miller's Law Application:
 * - Stressed users: Max 3-4 choices
 * - Normal cognitive load: 7±2 items
 * - Simple mode reduces choices to minimize decision fatigue
 */
export const SimpleModeToggle: React.FC = () => {
    const { t } = useTranslation();
    const { simpleMode, setSimpleMode } = useSessionStore();

    const handleToggle = () => {
        setSimpleMode(!simpleMode);
    };

    return (
        <button
            onClick={handleToggle}
            title={simpleMode 
                ? t('simpleMode.active', 'Einfach-Modus: Eine Frage pro Bildschirm') 
                : t('simpleMode.inactive', 'Standard-Modus: Mehrere Fragen pro Bildschirm')
            }
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider 
                transition-all duration-300 border min-h-[48px] min-w-[48px]
                ${simpleMode
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                }
            `}
            aria-pressed={simpleMode}
            aria-label={simpleMode 
                ? t('simpleMode.ariaActive', 'Einfach-Modus ist aktiv') 
                : t('simpleMode.ariaInactive', 'Standard-Modus ist aktiv')
            }
        >
            {simpleMode ? (
                <>
                    <Layout className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('simpleMode.simple', 'Einfach')}</span>
                </>
            ) : (
                <>
                    <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('simpleMode.normal', 'Standard')}</span>
                </>
            )}
        </button>
    );
};

export default SimpleModeToggle;
