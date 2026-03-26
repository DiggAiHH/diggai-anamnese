import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from 'react-i18next';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useThemeStore();
    const { t } = useTranslation();

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:bg-black/5 light:hover:bg-black/10 border border-white/10 dark:border-white/10 light:border-black/10 rounded-xl transition-all text-sm font-medium backdrop-blur-md"
            title={theme === 'dark' ? t('Zum hellen Modus wechseln') : t('Zum dunklen Modus wechseln')}
            aria-label={theme === 'dark' ? t('Zum hellen Modus wechseln') : t('Zum dunklen Modus wechseln')}
            data-testid="theme-toggle"
        >
            {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
            ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
            )}
        </button>
    );
};
