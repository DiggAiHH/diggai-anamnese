/**
 * White-Labeling Theme System - CSS Variables Generator
 * 
 * Applies themes to DOM via CSS custom properties
 * Ensures smooth transitions and system preference detection
 */

import type { Theme, ThemeTransitionConfig, CSSVariableMap } from './types';

/**
 * Default transition configuration
 */
export const defaultTransitionConfig: ThemeTransitionConfig = {
  enabled: true,
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

/**
 * Convert theme to CSS variable map
 * Transforms theme object into CSS custom property definitions
 */
export function themeToCSSVariables(theme: Theme): CSSVariableMap {
  const variables: CSSVariableMap = {};
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    variables[`--color-${camelToKebab(key)}`] = value;
  });
  
  // Fonts
  variables['--font-heading'] = theme.fonts.heading;
  variables['--font-body'] = theme.fonts.body;
  if (theme.fonts.baseSize) {
    variables['--font-base-size'] = theme.fonts.baseSize;
  }
  
  // Border Radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    variables[`--radius-${key}`] = value;
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    variables[`--shadow-${key}`] = value;
  });
  
  // Logo
  if (theme.logo) {
    variables['--logo-url'] = `url(${theme.logo.url})`;
    variables['--logo-width'] = `${theme.logo.width}px`;
    variables['--logo-height'] = `${theme.logo.height}px`;
    if (theme.logo.alt) {
      variables['--logo-alt'] = `"${theme.logo.alt}"`;
    }
    if (theme.logo.faviconUrl) {
      variables['--logo-favicon'] = `url(${theme.logo.faviconUrl})`;
    }
  }
  
  // Custom variables
  if (theme.customVariables) {
    Object.entries(theme.customVariables).forEach(([key, value]) => {
      variables[`--custom-${camelToKebab(key)}`] = value;
    });
  }
  
  return variables;
}

/**
 * Apply theme to CSS by setting CSS variables on :root
 * This is the main function to apply a theme to the document
 */
export function applyThemeToCSS(theme: Theme): void {
  const root = document.documentElement;
  const variables = themeToCSSVariables(theme);
  
  // Set all CSS variables
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Set theme name as data attribute for debugging
  root.setAttribute('data-theme-name', theme.name);
  
  // Dispatch custom event for theme change
  window.dispatchEvent(new CustomEvent('themechange', { 
    detail: { theme, timestamp: Date.now() }
  }));
}

/**
 * Setup smooth transitions for theme changes
 * Adds transition styles to the document
 */
export function setupThemeTransitions(
  config: Partial<ThemeTransitionConfig> = {}
): void {
  const fullConfig = { ...defaultTransitionConfig, ...config };
  
  if (!fullConfig.enabled) {
    removeThemeTransitions();
    return;
  }
  
  const styleId = 'theme-transitions';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  const transitionValue = `all ${fullConfig.duration}ms ${fullConfig.easing}`;
  
  styleElement.textContent = `
    *,
    *::before,
    *::after {
      transition: background-color ${fullConfig.duration}ms ${fullConfig.easing},
                  border-color ${fullConfig.duration}ms ${fullConfig.easing},
                  color ${fullConfig.duration}ms ${fullConfig.easing},
                  fill ${fullConfig.duration}ms ${fullConfig.easing},
                  stroke ${fullConfig.duration}ms ${fullConfig.easing},
                  opacity ${fullConfig.duration}ms ${fullConfig.easing},
                  box-shadow ${fullConfig.duration}ms ${fullConfig.easing} !important;
    }
    
    /* Disable transitions for motion-sensitive users */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        transition: none !important;
      }
    }
    
    /* Specific exclusions for performance */
    .no-theme-transition,
    .no-theme-transition *,
    [class*="animate-"],
    [class*="animate-"] *,
    .loading-spinner,
    .loading-spinner * {
      transition: none !important;
    }
  `;
}

/**
 * Remove theme transition styles
 */
export function removeThemeTransitions(): void {
  const styleId = 'theme-transitions';
  const styleElement = document.getElementById(styleId);
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Generate CSS from theme for SSR or static export
 */
export function generateThemeCSS(theme: Theme): string {
  const variables = themeToCSSVariables(theme);
  const variableDeclarations = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  
  return `:root {\n${variableDeclarations}\n}`;
}

/**
 * Generate a complete stylesheet for a theme
 * Includes base styles using the theme variables
 */
export function generateCompleteStylesheet(theme: Theme): string {
  const cssVariables = generateThemeCSS(theme);
  
  return `${cssVariables}

/* Base styles using theme variables */
body {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--color-text);
}

a {
  color: var(--color-primary);
}

a:hover {
  color: var(--color-primary);
  opacity: 0.8;
}

button {
  border-radius: var(--radius-md);
}

input, textarea, select {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.text-muted {
  color: var(--color-text-muted);
}

.border-theme {
  border-color: var(--color-border);
}

.bg-surface {
  background-color: var(--color-surface);
}

.bg-primary {
  background-color: var(--color-primary);
}

.text-primary {
  color: var(--color-primary);
}
`;
}

/**
 * Parse CSS variables back to theme object
 * Useful for theme editor - reads current computed styles
 */
export function parseCSSVariablesToTheme(element: HTMLElement = document.documentElement): Partial<Theme> {
  const computedStyle = getComputedStyle(element);
  const theme: Partial<Theme> = {
    colors: {},
    fonts: {},
    borderRadius: {},
    shadows: {},
  } as Partial<Theme>;
  
  // Helper to get CSS variable
  const getVar = (name: string): string | undefined => {
    const value = computedStyle.getPropertyValue(name).trim();
    return value || undefined;
  };
  
  // Parse colors
  const colorKeys = ['primary', 'secondary', 'background', 'surface', 'text', 'textMuted', 'border', 'error', 'success', 'warning', 'info'];
  colorKeys.forEach(key => {
    const value = getVar(`--color-${key}`);
    if (value && theme.colors) {
      (theme.colors as unknown as Record<string, string>)[key] = value;
    }
  });
  
  // Parse fonts
  const fontHeading = getVar('--font-heading');
  const fontBody = getVar('--font-body');
  if (fontHeading || fontBody) {
    theme.fonts = {
      heading: fontHeading || '',
      body: fontBody || '',
    };
  }
  
  // Parse border radius
  const radiusKeys = ['sm', 'md', 'lg', 'xl'];
  radiusKeys.forEach(key => {
    const value = getVar(`--radius-${key}`);
    if (value && theme.borderRadius) {
      (theme.borderRadius as unknown as Record<string, string>)[key] = value;
    }
  });
  
  // Parse shadows
  const shadowKeys = ['sm', 'md', 'lg'];
  shadowKeys.forEach(key => {
    const value = getVar(`--shadow-${key}`);
    if (value && theme.shadows) {
      (theme.shadows as unknown as Record<string, string>)[key] = value;
    }
  });
  
  return theme;
}

/**
 * Validate color format
 * Supports hex, rgb, rgba, hsl, hsla, and CSS color names
 */
export function isValidColor(color: string): boolean {
  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexRegex = /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  
  // RGB/RGBA
  const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
  
  // HSL/HSLA
  const hslRegex = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/;
  const hslaRegex = /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/;
  
  // CSS color names (basic check)
  const cssColors = [
    'transparent', 'currentColor',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'purple', 'orange',
    'gray', 'grey', 'pink', 'brown', 'cyan', 'lime', 'indigo', 'teal',
  ];
  
  return hexRegex.test(color) ||
         rgbRegex.test(color) ||
         rgbaRegex.test(color) ||
         hslRegex.test(color) ||
         hslaRegex.test(color) ||
         cssColors.includes(color.toLowerCase());
}

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Get effective background luminance
 * Returns a value between 0 (black) and 1 (white)
 */
export function getLuminance(color: string): number {
  // Convert hex to RGB
  let r: number, g: number, b: number;
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match) {
      r = parseInt(match[0]);
      g = parseInt(match[1]);
      b = parseInt(match[2]);
    } else {
      return 0.5;
    }
  } else {
    return 0.5;
  }
  
  // Calculate luminance
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determine if text should be dark or light for contrast
 * Returns 'dark' or 'light' based on background luminance
 */
export function getContrastText(backgroundColor: string): 'dark' | 'light' {
  const luminance = getLuminance(backgroundColor);
  return luminance > 0.5 ? 'dark' : 'light';
}

/**
 * Calculate contrast ratio between two colors
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export default {
  applyThemeToCSS,
  themeToCSSVariables,
  generateThemeCSS,
  generateCompleteStylesheet,
  setupThemeTransitions,
  removeThemeTransitions,
  parseCSSVariablesToTheme,
  isValidColor,
  getLuminance,
  getContrastText,
  getContrastRatio,
};
