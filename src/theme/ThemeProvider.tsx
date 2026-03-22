/**
 * White-Labeling Theme System - React Provider
 * 
 * Provides theme context to the application with:
 * - Runtime theme switching
 * - System preference detection
 * - Tenant-specific branding
 * - Smooth transitions
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { 
  Theme, 
  ThemeMode, 
  ThemeContextValue, 
  ThemeTransitionConfig 
} from './types';
import { 
  defaultLightTheme, 
  defaultDarkTheme, 
  mergeThemes 
} from './defaultThemes';
import { 
  applyThemeToCSS, 
  setupThemeTransitions, 
  removeThemeTransitions 
} from './applyTheme';

// Theme Context
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Storage key for persisted mode preference
const MODE_STORAGE_KEY = 'diggai-theme-mode';

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial tenant-specific theme overrides */
  tenantTheme?: Partial<Theme>;
  /** Tenant ID for fetching theme from backend */
  tenantId?: string;
  /** Initial mode preference */
  defaultMode?: ThemeMode;
  /** Disable system preference detection */
  disableSystemPreference?: boolean;
  /** Transition configuration */
  transitionConfig?: Partial<ThemeTransitionConfig>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Theme Provider Component
 * Wraps the application with theme context and applies CSS variables
 */
export function ThemeProvider({
  children,
  tenantTheme: initialTenantTheme,
  tenantId,
  defaultMode = 'system',
  disableSystemPreference = false,
  transitionConfig,
  debug = false,
}: ThemeProviderProps) {
  // State
  const [mode, setModeState] = useState<ThemeMode>(() => 
    loadModePreference(defaultMode)
  );
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantOverrides, setTenantOverrides] = useState<Partial<Theme>>(
    initialTenantTheme || {}
  );

  // Debug logging
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
       
      console.log('[ThemeProvider]', ...args);
    }
  }, [debug]);

  // Determine if dark mode based on mode setting
  useEffect(() => {
    const updateDarkMode = () => {
      let shouldBeDark: boolean;

      if (mode === 'system' && !disableSystemPreference) {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = mode === 'dark';
      }

      setIsDark(shouldBeDark);
      log('Dark mode updated:', shouldBeDark, '(mode:', mode, ')');
    };

    updateDarkMode();

    // Listen for system preference changes
    if (mode === 'system' && !disableSystemPreference) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        log('System preference changed:', e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [mode, disableSystemPreference, log]);

  // Compute merged theme
  const theme = useMemo(() => {
    const baseTheme = isDark ? defaultDarkTheme : defaultLightTheme;
    return mergeThemes(baseTheme, tenantOverrides);
  }, [isDark, tenantOverrides]);

  // Apply theme to CSS
  useEffect(() => {
    setupThemeTransitions(transitionConfig);
    applyThemeToCSS(theme);
    
    // Mark as ready after initial apply
    if (!isReady) {
      setIsReady(true);
      log('Theme initialized:', theme.name);
    }

    return () => {
      removeThemeTransitions();
    };
  }, [theme, transitionConfig, isReady, log]);

  // Fetch tenant theme from backend if tenantId provided
  useEffect(() => {
    if (!tenantId) {
      setIsReady(true);
      return;
    }

    const fetchTenantTheme = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tenant/${tenantId}/theme`);
        if (response.ok) {
          const data = await response.json();
          if (data.theme) {
            setTenantOverrides(data.theme);
            log('Tenant theme loaded:', data.theme.name || 'unnamed');
          }
          if (data.mode && !loadModePreference()) {
            setModeState(data.mode as ThemeMode);
          }
        }
      } catch (error) {
        // Silent fail - use defaults
        log('Failed to load tenant theme:', error);
      } finally {
        setIsLoading(false);
        setIsReady(true);
      }
    };

    fetchTenantTheme();
  }, [tenantId, log]);

  // Set mode with persistence
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    saveModePreference(newMode);
    log('Mode changed to:', newMode);
  }, [log]);

  // Toggle dark/light
  const toggleDarkMode = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    setMode(newMode);
  }, [isDark, setMode]);

  // Update tenant theme overrides
  const updateTenantTheme = useCallback((overrides: Partial<Theme>) => {
    setTenantOverrides(prev => ({
      ...prev,
      ...overrides,
    }));
    log('Tenant overrides updated');
  }, [log]);

  // Context value
  const contextValue: ThemeContextValue = useMemo(() => ({
    theme,
    mode,
    setMode,
    isDark,
    toggleDarkMode,
    updateTenantTheme,
    tenantOverrides,
    isReady,
    isLoading,
  }), [
    theme,
    mode,
    setMode,
    isDark,
    toggleDarkMode,
    updateTenantTheme,
    tenantOverrides,
    isReady,
    isLoading,
  ]);

  // Prevent flash of unstyled content
  if (!isReady) {
    return (
      <div style={{ 
        visibility: 'hidden',
        position: 'fixed',
        inset: 0,
      }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook for theme-aware class names
 * Returns class names based on current theme mode
 */
export function useThemeClasses() {
  const { isDark, theme } = useTheme();
  
  return useMemo(() => ({
    // Mode-based classes
    mode: isDark ? 'dark' : 'light',
    dataMode: isDark ? 'dark' : 'light',
    
    // Common component classes
    card: `bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]`,
    button: `px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] font-[family-name:var(--font-body)]`,
    input: `w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)]`,
    text: `text-[var(--color-text)] font-[family-name:var(--font-body)]`,
    textMuted: `text-[var(--color-text-muted)] font-[family-name:var(--font-body)]`,
    heading: `text-[var(--color-text)] font-[family-name:var(--font-heading)] font-semibold`,
    
    // Surface variants
    surface: `bg-[var(--color-surface)]`,
    surfaceHover: `hover:bg-[var(--color-surface)]/80`,
    
    // Border
    border: `border-[var(--color-border)]`,
    
    // Theme info
    themeName: theme.name,
  }), [isDark, theme.name]);
}

/**
 * Hook for CSS variable values
 * Returns current computed CSS variable values
 */
export function useThemeCSS() {
  const { theme } = useTheme();
  
  return useMemo(() => ({
    // Color values
    colors: theme.colors,
    // Font values
    fonts: theme.fonts,
    // Border radius values
    borderRadius: theme.borderRadius,
    // Shadow values
    shadows: theme.shadows,
    // CSS variable strings
    vars: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      background: 'var(--color-background)',
      surface: 'var(--color-surface)',
      text: 'var(--color-text)',
      textMuted: 'var(--color-text-muted)',
      border: 'var(--color-border)',
      error: 'var(--color-error)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      info: 'var(--color-info)',
      fontHeading: 'var(--font-heading)',
      fontBody: 'var(--font-body)',
      radiusSm: 'var(--radius-sm)',
      radiusMd: 'var(--radius-md)',
      radiusLg: 'var(--radius-lg)',
      radiusXl: 'var(--radius-xl)',
      shadowSm: 'var(--shadow-sm)',
      shadowMd: 'var(--shadow-md)',
      shadowLg: 'var(--shadow-lg)',
    },
  }), [theme]);
}

// Storage helpers
function saveModePreference(mode: ThemeMode): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

function loadModePreference(fallback: ThemeMode = 'system'): ThemeMode {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as ThemeMode;
    }
  } catch {
    // Ignore storage errors
  }
  return fallback;
}

export default ThemeProvider;
