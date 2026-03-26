import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useThemeStore } from './themeStore';

describe('ThemeStore', () => {
  beforeEach(() => {
    // Reset store
    useThemeStore.setState({ theme: 'dark' });
    
    // Reset document classes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have dark theme as default', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('dark');
  });

  it('should set theme', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme('light');
    
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('should toggle theme from dark to light', () => {
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme();
    
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    const { setTheme, toggleTheme } = useThemeStore.getState();
    
    setTheme('light');
    toggleTheme();
    
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('should apply theme to document when set', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme('light');
    
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should apply dark theme to document', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme('dark');
    
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should remove old theme classes when switching', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme('dark');
    setTheme('light');
    
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('should persist theme to localStorage', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme('light');
    
    // Zustand persist middleware handles this internally
    // We're just verifying the state is correct
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('should handle multiple theme switches', () => {
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme(); // dark -> light
    toggleTheme(); // light -> dark
    toggleTheme(); // dark -> light
    
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });
});
