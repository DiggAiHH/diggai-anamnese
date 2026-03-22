/**
 * White-Labeling Theme System - Default Themes
 * 
 * DiggAI default themes and theme templates
 */

import type { Theme, ThemeTemplate, WhiteLabelConfig } from './types';

/**
 * DiggAI Light Theme (Default)
 * Medical-grade accessibility with clean, professional appearance
 */
export const defaultLightTheme: Theme = {
  name: 'DigiAI Light',
  version: '1.0.0',
  colors: {
    primary: '#2563eb',      // Professional blue - trustworthy, medical
    secondary: '#64748b',    // Slate gray - supporting elements
    background: '#f8fafc',   // Very light gray - easy on eyes
    surface: '#ffffff',      // Pure white for cards
    text: '#0f172a',         // Dark slate - maximum readability
    textMuted: '#64748b',    // Medium gray for secondary text
    border: '#e2e8f0',       // Light border
    error: '#dc2626',        // Red - medical error standard
    success: '#16a34a',      // Green - success indicator
    warning: '#d97706',      // Amber - warning state
    info: '#0891b2',         // Cyan - informational
  },
  fonts: {
    heading: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    baseSize: '16px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  },
  logo: {
    url: '/logo-light.svg',
    width: 180,
    height: 48,
    alt: 'DiggAI',
  },
};

/**
 * DiggAI Dark Theme (Default)
 * Optimized for low-light environments, reduced eye strain
 */
export const defaultDarkTheme: Theme = {
  name: 'DigiAI Dark',
  version: '1.0.0',
  colors: {
    primary: '#60a5fa',      // Lighter blue for dark backgrounds
    secondary: '#94a3b8',    // Lighter gray
    background: '#0f172a',   // Dark slate background
    surface: '#1e293b',      // Slightly lighter for cards
    text: '#f1f5f9',         // Very light gray - maximum contrast
    textMuted: '#94a3b8',    // Medium gray for secondary
    border: '#334155',       // Dark border
    error: '#f87171',        // Light red for visibility
    success: '#4ade80',      // Light green
    warning: '#fbbf24',      // Light amber
    info: '#22d3ee',         // Light cyan
  },
  fonts: {
    heading: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    baseSize: '16px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
  },
  logo: {
    url: '/logo-dark.svg',
    width: 180,
    height: 48,
    alt: 'DiggAI',
  },
};

/**
 * High Contrast Theme (Accessibility)
 * Maximum contrast for vision impairments - WCAG AAA compliant
 */
export const highContrastTheme: Theme = {
  name: 'High Contrast',
  version: '1.0.0',
  colors: {
    primary: '#005fcc',      // Deep blue
    secondary: '#404040',    // Dark gray
    background: '#ffffff',   // Pure white
    surface: '#ffffff',      // Pure white
    text: '#000000',         // Pure black
    textMuted: '#404040',    // Dark gray
    border: '#000000',       // Black borders
    error: '#cc0000',        // Deep red
    success: '#006600',      // Deep green
    warning: '#cc7700',      // Deep amber
    info: '#0066cc',         // Deep blue
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
    baseSize: '18px',        // Larger base size for readability
  },
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
    xl: '8px',
  },
  shadows: {
    sm: '0 0 0 1px #000000',
    md: '0 0 0 2px #000000',
    lg: '0 0 0 3px #000000',
  },
};

/**
 * Medical Professional Theme
 * Calming teal/medical green palette for healthcare environments
 */
export const medicalProfessionalTheme: Theme = {
  name: 'Medical Professional',
  version: '1.0.0',
  colors: {
    primary: '#0d9488',      // Teal - calming medical color
    secondary: '#6366f1',    // Indigo accent
    background: '#f0fdfa',   // Very light teal tint
    surface: '#ffffff',
    text: '#134e4a',         // Dark teal text
    textMuted: '#5eead4',    // Muted teal
    border: '#ccfbf1',       // Light teal border
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  fonts: {
    heading: '"Source Sans Pro", system-ui, sans-serif',
    body: '"Source Sans Pro", system-ui, sans-serif',
    baseSize: '16px',
  },
  borderRadius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
  },
  shadows: {
    sm: '0 1px 3px rgba(13, 148, 136, 0.1)',
    md: '0 4px 12px rgba(13, 148, 136, 0.12)',
    lg: '0 8px 24px rgba(13, 148, 136, 0.15)',
  },
};

/**
 * Minimal Clean Theme
 * Ultra-minimal design with subtle styling
 */
export const minimalTheme: Theme = {
  name: 'Minimal Clean',
  version: '1.0.0',
  colors: {
    primary: '#18181b',      // Near black
    secondary: '#71717a',    // Medium gray
    background: '#fafafa',   // Off-white
    surface: '#ffffff',
    text: '#09090b',         // Almost black
    textMuted: '#a1a1aa',    // Light gray
    border: '#e4e4e7',       // Subtle border
    error: '#dc2626',
    success: '#16a34a',
    warning: '#ca8a04',
    info: '#2563eb',
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
    baseSize: '16px',
  },
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
    xl: '8px',
  },
  shadows: {
    sm: '0 0 0 transparent',
    md: '0 1px 3px rgba(0, 0, 0, 0.05)',
    lg: '0 4px 6px rgba(0, 0, 0, 0.07)',
  },
};

/**
 * Theme Templates Collection
 * Pre-configured themes for quick selection
 */
export const themeTemplates: ThemeTemplate[] = [
  {
    id: 'diggai-light',
    name: 'DiggAI Light',
    description: 'Standard helles Theme mit professioneller Blau-Palette',
    theme: defaultLightTheme,
    preview: 'linear-gradient(135deg, #2563eb 0%, #f8fafc 100%)',
    category: 'medical',
  },
  {
    id: 'diggai-dark',
    name: 'DiggAI Dark',
    description: 'Optimert für dunkle Umgebungen mit reduzierter Augenbelastung',
    theme: defaultDarkTheme,
    preview: 'linear-gradient(135deg, #60a5fa 0%, #0f172a 100%)',
    category: 'modern',
  },
  {
    id: 'medical-teal',
    name: 'Medical Professional',
    description: 'Beruhigende Teal-Palette für medizinische Umgebungen',
    theme: medicalProfessionalTheme,
    preview: 'linear-gradient(135deg, #0d9488 0%, #f0fdfa 100%)',
    category: 'medical',
  },
  {
    id: 'high-contrast',
    name: 'Hoher Kontrast',
    description: 'Maximale Lesbarkeit für Sehbeeinträchtigungen (WCAG AAA)',
    theme: highContrastTheme,
    preview: 'linear-gradient(135deg, #000000 0%, #ffffff 100%)',
    category: 'medical',
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Ultra-minimales Design mit subtiler Gestaltung',
    theme: minimalTheme,
    preview: 'linear-gradient(135deg, #18181b 0%, #fafafa 100%)',
    category: 'minimal',
  },
];

/**
 * Generate dark theme from light theme
 * Automatically creates a dark variant from a light theme configuration
 */
export function generateDarkTheme(lightTheme: Partial<Theme>): Partial<Theme> {
  const darkColors: Record<string, string> = {};
  
  if (lightTheme.colors) {
    // Lighten primary for dark background visibility
    darkColors.primary = adjustBrightness(lightTheme.colors.primary, 20);
    darkColors.secondary = adjustBrightness(lightTheme.colors.secondary, 30);
    
    // Invert background/surface
    darkColors.background = '#0f172a';
    darkColors.surface = '#1e293b';
    
    // Light text for dark backgrounds
    darkColors.text = '#f8fafc';
    darkColors.textMuted = '#94a3b8';
    darkColors.border = '#334155';
    
    // Keep semantic colors but adjust brightness
    darkColors.error = adjustBrightness(lightTheme.colors.error, 20);
    darkColors.success = adjustBrightness(lightTheme.colors.success, 20);
    darkColors.warning = adjustBrightness(lightTheme.colors.warning, 20);
    darkColors.info = adjustBrightness(lightTheme.colors.info, 20);
  }
  
  return {
    name: `${lightTheme.name || 'Custom'} Dark`,
    colors: darkColors as unknown as Theme['colors'],
    fonts: lightTheme.fonts,
    borderRadius: lightTheme.borderRadius,
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    },
  };
}

/**
 * Adjust color brightness
 * Simple hex color brightness adjustment
 */
function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Adjust brightness
  const adjust = (channel: number): number => {
    const adjusted = channel + (channel * percent / 100);
    return Math.min(255, Math.max(0, Math.round(adjusted)));
  };
  
  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);
  
  // Convert back to hex
  const toHex = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Merge themes - tenant overrides with defaults
 * Deep merges tenant-specific theme with default theme
 */
export function mergeThemes(
  defaultTheme: Theme,
  overrides?: Partial<Theme>
): Theme {
  if (!overrides) return defaultTheme;
  
  return {
    ...defaultTheme,
    ...overrides,
    colors: {
      ...defaultTheme.colors,
      ...overrides.colors,
    },
    fonts: {
      ...defaultTheme.fonts,
      ...overrides.fonts,
    },
    borderRadius: {
      ...defaultTheme.borderRadius,
      ...overrides.borderRadius,
    },
    shadows: {
      ...defaultTheme.shadows,
      ...overrides.shadows,
    },
    logo: overrides.logo ?? defaultTheme.logo,
  };
}

/**
 * Default white-label configuration
 */
export const defaultWhiteLabelConfig: WhiteLabelConfig = {
  tenantId: 'default',
  lightTheme: {},
  darkTheme: undefined,
  defaultMode: 'system',
  allowPatientThemeSelection: false,
};

/**
 * Theme presets for common medical practices
 */
export const medicalPresets = {
  /** General practitioner - trustworthy blue */
  generalPractitioner: {
    primary: '#2563eb',
    secondary: '#64748b',
  },
  /** Pediatrician - friendly, calming colors */
  pediatrician: {
    primary: '#0d9488',
    secondary: '#f59e0b',
  },
  /** Cardiology - heart-healthy red tones */
  cardiology: {
    primary: '#dc2626',
    secondary: '#7c2d12',
  },
  /** Dermatology - skin-tone neutrals */
  dermatology: {
    primary: '#d97706',
    secondary: '#92400e',
  },
  /** Orthopedics - strong, stable colors */
  orthopedics: {
    primary: '#059669',
    secondary: '#374151',
  },
  /** Neurology - brain-focused purple tones */
  neurology: {
    primary: '#7c3aed',
    secondary: '#4c1d95',
  },
} as const;
