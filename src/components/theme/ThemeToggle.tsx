/**
 * Theme Toggle Component
 * 
 * Allows users to toggle between light/dark/system modes
 * Respects tenant settings for theme selection
 */


import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

interface ThemeToggleProps {
  /** Variant style */
  variant?: 'buttons' | 'dropdown' | 'segmented';
  /** Show system option */
  showSystem?: boolean;
  /** Size of the toggle */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * Theme Toggle Component
 * 
 * Usage:
 * <ThemeToggle variant="segmented" />
 * <ThemeToggle variant="dropdown" showSystem />
 */
export function ThemeToggle({
  variant = 'segmented',
  showSystem = true,
  size = 'md',
  className = '',
}: ThemeToggleProps) {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  const sizeClasses = {
    sm: 'text-xs p-1',
    md: 'text-sm p-1.5',
    lg: 'text-base p-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Button variant
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setMode('light')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
            ${mode === 'light' 
              ? 'bg-[var(--color-primary)] text-white' 
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }
          `}
          aria-label={t('theme.light', 'Light mode')}
          title={t('theme.light', 'Light mode')}
        >
          <span className={iconSizes[size]}>☀️</span>
          <span className="sr-only sm:not-sr-only">{t('theme.light', 'Hell')}</span>
        </button>
        
        <button
          onClick={() => setMode('dark')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
            ${mode === 'dark' 
              ? 'bg-[var(--color-primary)] text-white' 
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }
          `}
          aria-label={t('theme.dark', 'Dark mode')}
          title={t('theme.dark', 'Dark mode')}
        >
          <span className={iconSizes[size]}>🌙</span>
          <span className="sr-only sm:not-sr-only">{t('theme.dark', 'Dunkel')}</span>
        </button>

        {showSystem && (
          <button
            onClick={() => setMode('system')}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
              ${mode === 'system' 
                ? 'bg-[var(--color-primary)] text-white' 
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }
            `}
            aria-label={t('theme.system', 'System preference')}
            title={t('theme.system', 'System preference')}
          >
            <span className={iconSizes[size]}>💻</span>
            <span className="sr-only sm:not-sr-only">{t('theme.system', 'System')}</span>
          </button>
        )}
      </div>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'system')}
          className={`
            appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] 
            rounded-lg text-[var(--color-text)] cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
            ${sizeClasses[size]} pr-8
          `}
          aria-label={t('theme.selectMode', 'Select theme mode')}
        >
          <option value="light">☀️ {t('theme.light', 'Hell')}</option>
          <option value="dark">🌙 {t('theme.dark', 'Dunkel')}</option>
          {showSystem && (
            <option value="system">💻 {t('theme.system', 'System')}</option>
          )}
        </select>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]">
          ▼
        </span>
      </div>
    );
  }

  // Segmented variant (default)
  return (
    <div 
      className={`
        inline-flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1
        ${className}
      `}
      role="group"
      aria-label={t('theme.modeSelection', 'Theme mode selection')}
    >
      <button
        onClick={() => setMode('light')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all
          ${mode === 'light' 
            ? 'bg-[var(--color-primary)] text-white shadow-sm' 
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }
        `}
        aria-pressed={mode === 'light'}
      >
        <span className={iconSizes[size]}>☀️</span>
        <span className="hidden sm:inline">{t('theme.light', 'Hell')}</span>
      </button>
      
      <button
        onClick={() => setMode('dark')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all
          ${mode === 'dark' 
            ? 'bg-[var(--color-primary)] text-white shadow-sm' 
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }
        `}
        aria-pressed={mode === 'dark'}
      >
        <span className={iconSizes[size]}>🌙</span>
        <span className="hidden sm:inline">{t('theme.dark', 'Dunkel')}</span>
      </button>

      {showSystem && (
        <button
          onClick={() => setMode('system')}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all
            ${mode === 'system' 
              ? 'bg-[var(--color-primary)] text-white shadow-sm' 
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }
          `}
          aria-pressed={mode === 'system'}
        >
          <span className={iconSizes[size]}>💻</span>
          <span className="hidden sm:inline">{t('theme.system', 'System')}</span>
        </button>
      )}
    </div>
  );
}

/**
 * Simple Theme Toggle Button
 * Single button that cycles through modes
 */
export function ThemeToggleButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { toggleDarkMode, isDark } = useTheme();
  const { t } = useTranslation();

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
      aria-label={isDark ? t('theme.switchToLight', 'Switch to light mode') : t('theme.switchToDark', 'Switch to dark mode')}
      title={isDark ? t('theme.switchToLight', 'Switch to light mode') : t('theme.switchToDark', 'Switch to dark mode')}
    >
      {isDark ? (
        <span className={iconSizes[size]}>☀️</span>
      ) : (
        <span className={iconSizes[size]}>🌙</span>
      )}
    </button>
  );
}

export default ThemeToggle;
