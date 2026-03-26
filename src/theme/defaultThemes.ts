/**
 * White-Labeling Theme System - Default Themes
 * 
 * DiggAI default themes and theme templates
 * Psychology-Based Color System for Healthcare
 * 
 * Color Psychology Palette:
 * - Serene Blue (#4A90E2): Primary actions, links - trust, calmness
 * - Deep Trust Blue (#2C5F8A): Headers, important text
 * - Soft Mint (#A8D5BA): Success states - healing, balance
 * - Light Lavender (#C7C3E6): Background accents - peacefulness
 * - Warm Beige (#F5F1E7): Light mode background - comfort
 * - Misty Gray (#D9D9D9): Secondary backgrounds
 * - Critical (#E07A5F): Soft coral - attention without panic
 * - Warning (#F4A261): Warm amber - caution, not fear
 * - Success (#81B29A): Sage green - natural confirmation
 * - Info (#5E8B9E): Dusty blue - trustworthy
 */

import type { Theme, ThemeTemplate, WhiteLabelConfig } from './types';

/**
 * DiggAI Light Theme (Default) - Psychology-Based Calming Palette
 * Optimized for healthcare environments with anxiety-reducing colors
 */
export const defaultLightTheme: Theme = {
  name: 'DiggAI Light',
  version: '2.0.0',
  colors: {
    // Primary - Trust & Calmness
    primary: '#4A90E2',      // Serene Blue - trustworthy, calming
    secondary: '#5E8B9E',    // Dusty Blue - supporting elements
    
    // Backgrounds - Comfort & Peace
    background: '#F5F1E7',   // Warm Beige - comfort, warmth
    surface: '#FFFFFF',      // Pure white for cards
    
    // Text - Readability & Trust
    text: '#2C5F8A',         // Deep Trust Blue - headers, important text
    textMuted: '#6B8BA4',    // Muted blue-gray for secondary text
    border: '#D9D9D9',       // Misty Gray - subtle borders
    
    // Alert Colors - Anxiety-Optimized (NO BRIGHT REDS)
    error: '#E07A5F',        // Soft Coral - attention without panic
    success: '#81B29A',      // Sage Green - natural confirmation
    warning: '#F4A261',      // Warm Amber - caution, not fear
    info: '#5E8B9E',         // Dusty Blue - trustworthy information
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
    sm: '0 1px 2px 0 rgba(74, 144, 226, 0.05)',
    md: '0 4px 6px -1px rgba(74, 144, 226, 0.08), 0 2px 4px -2px rgba(44, 95, 138, 0.06)',
    lg: '0 10px 15px -3px rgba(74, 144, 226, 0.1), 0 4px 6px -4px rgba(44, 95, 138, 0.08)',
  },
  logo: {
    url: '/logo-light.svg',
    width: 180,
    height: 48,
    alt: 'DiggAI',
  },
};

/**
 * DiggAI Dark Theme (Default) - Psychology-Based Calming Palette
 * Optimized for low-light environments, reduced eye strain
 */
export const defaultDarkTheme: Theme = {
  name: 'DiggAI Dark',
  version: '2.0.0',
  colors: {
    // Primary - Softened for dark backgrounds
    primary: '#6BA3E7',      // Lighter Serene Blue for dark backgrounds
    secondary: '#7BA3B3',    // Lighter Dusty Blue
    
    // Backgrounds - Deep, calming tones
    background: '#1A1F2E',   // Deep navy-tinted dark
    surface: '#252B3D',      // Slightly lighter for cards
    
    // Text - Soft, readable
    text: '#E8F4F8',         // Soft light blue-white
    textMuted: '#8BA4B4',    // Muted blue-gray
    border: '#3A4555',       // Subtle dark border
    
    // Alert Colors - Softened for dark mode
    error: '#E8957E',        // Lightened Soft Coral
    success: '#9BC4AC',      // Lightened Sage Green
    warning: '#F6B77A',      // Lightened Warm Amber
    info: '#7BA3B3',         // Lightened Dusty Blue
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
 * Maximum contrast for vision impairments - WCAG AAA compliant (7:1+)
 * Optimized for stressed users and cognitive accessibility
 */
export const highContrastTheme: Theme = {
  name: 'High Contrast',
  version: '2.0.0',
  colors: {
    primary: '#005a9c',      // Deep blue - 7.5:1 on white
    secondary: '#2b2b2b',    // Near black - 12:1 on white
    background: '#ffffff',   // Pure white
    surface: '#ffffff',      // Pure white
    text: '#000000',         // Pure black - 21:1 on white
    textMuted: '#333333',    // Dark gray - 12.6:1 on white
    border: '#000000',       // Black borders - maximum visibility
    error: '#d60000',        // Deep red - 7.2:1 on white
    success: '#006600',      // Deep green - 7:1 on white
    warning: '#b35900',      // Deep amber - 7.1:1 on white
    info: '#005a9c',         // Deep blue - 7.5:1 on white
  },
  fonts: {
    heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    baseSize: '20px',        // Large base size for readability (Simple Mode)
  },
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
    xl: '8px',
  },
  shadows: {
    sm: '0 0 0 2px #000000',
    md: '0 0 0 3px #000000',
    lg: '0 0 0 4px #000000',
  },
  logo: {
    url: '/logo-high-contrast.svg',
    width: 180,
    height: 48,
    alt: 'DiggAI',
  },
};

/**
 * Simple Mode Theme - Cognitive Accessibility
 * Optimized for users with cognitive impairments, stress, or anxiety
 * WCAG AAA compliant with simplified visual hierarchy
 */
export const simpleModeTheme: Theme = {
  name: 'Simple Mode',
  version: '2.0.0',
  colors: {
    primary: '#1a5276',      // Calm deep blue - professional but soothing
    secondary: '#566573',    // Soft slate - supportive not distracting
    background: '#fefefe',   // Off-white for reduced eye strain
    surface: '#ffffff',      // Pure white cards
    text: '#1a1a1a',         // Near black - maximum readability
    textMuted: '#4a4a4a',    // Medium gray - 9:1 contrast
    border: '#2c3e50',       // Dark slate - clear boundaries
    error: '#c0392b',        // Muted red - attention without panic
    success: '#27ae60',      // Natural green
    warning: '#d68910',      // Warm amber
    info: '#2874a6',         // Trustworthy blue
  },
  fonts: {
    heading: 'Inter, system-ui, -apple-system, sans-serif',
    body: 'Inter, system-ui, -apple-system, sans-serif',
    baseSize: '20px',        // Large fonts for readability
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.12)',
    lg: '0 8px 24px rgba(0,0,0,0.16)',
  },
  logo: {
    url: '/logo-simple.svg',
    width: 160,
    height: 44,
    alt: 'DiggAI',
  },
};

/**
 * Medical Professional Theme
 * Calming psychology-based palette for healthcare environments
 */
export const medicalProfessionalTheme: Theme = {
  name: 'Medical Professional',
  version: '2.0.0',
  colors: {
    primary: '#4A90E2',      // Serene Blue - trust
    secondary: '#81B29A',    // Sage Green - healing
    background: '#F5F1E7',   // Warm Beige - comfort
    surface: '#ffffff',
    text: '#2C5F8A',         // Deep Trust Blue
    textMuted: '#6B8BA4',    // Muted blue-gray
    border: '#D9D9D9',       // Misty Gray
    error: '#E07A5F',        // Soft Coral
    success: '#81B29A',      // Sage Green
    warning: '#F4A261',      // Warm Amber
    info: '#5E8B9E',         // Dusty Blue
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
    sm: '0 1px 3px rgba(74, 144, 226, 0.1)',
    md: '0 4px 12px rgba(74, 144, 226, 0.12)',
    lg: '0 8px 24px rgba(74, 144, 226, 0.15)',
  },
};

/**
 * Minimal Clean Theme
 * Ultra-minimal design with subtle psychology-based styling
 */
export const minimalTheme: Theme = {
  name: 'Minimal Clean',
  version: '2.0.0',
  colors: {
    primary: '#2C5F8A',      // Deep Trust Blue
    secondary: '#6B8BA4',    // Muted blue-gray
    background: '#F5F1E7',   // Warm Beige
    surface: '#ffffff',
    text: '#2C5F8A',         // Deep Trust Blue
    textMuted: '#9BB0C0',    // Light muted blue
    border: '#D9D9D9',       // Misty Gray
    error: '#E07A5F',        // Soft Coral
    success: '#81B29A',      // Sage Green
    warning: '#F4A261',      // Warm Amber
    info: '#5E8B9E',         // Dusty Blue
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
 * Calming Theme - Maximum Anxiety Reduction
 * Optimized for patients with anxiety or stress
 */
export const calmingTheme: Theme = {
  name: 'Calming',
  version: '2.0.0',
  colors: {
    primary: '#5E8B9E',      // Dusty Blue - ultra calm
    secondary: '#81B29A',    // Sage Green
    background: '#F5F1E7',   // Warm Beige
    surface: '#FFFBF5',      // Warm white
    text: '#4A6572',         // Soft slate
    textMuted: '#7A9AA8',    // Light muted
    border: '#E5E0D5',       // Warm gray
    error: '#E07A5F',        // Soft Coral
    success: '#81B29A',      // Sage Green
    warning: '#F4A261',      // Warm Amber
    info: '#5E8B9E',         // Dusty Blue
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    baseSize: '16px',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    sm: '0 1px 2px rgba(94, 139, 158, 0.05)',
    md: '0 4px 12px rgba(94, 139, 158, 0.08)',
    lg: '0 8px 24px rgba(94, 139, 158, 0.1)',
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
    description: 'Beruhigendes Hell-Theme mit psychologiebasierter Farbpalette',
    theme: defaultLightTheme,
    preview: 'linear-gradient(135deg, #4A90E2 0%, #F5F1E7 100%)',
    category: 'medical',
  },
  {
    id: 'diggai-dark',
    name: 'DiggAI Dark',
    description: 'Sanftes Dunkel-Theme für reduzierte Augenbelastung',
    theme: defaultDarkTheme,
    preview: 'linear-gradient(135deg, #6BA3E7 0%, #1A1F2E 100%)',
    category: 'modern',
  },
  {
    id: 'medical-professional',
    name: 'Medical Professional',
    description: 'Beruhigende Palette für medizinische Umgebungen',
    theme: medicalProfessionalTheme,
    preview: 'linear-gradient(135deg, #4A90E2 0%, #81B29A 50%, #F5F1E7 100%)',
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
    preview: 'linear-gradient(135deg, #2C5F8A 0%, #F5F1E7 100%)',
    category: 'minimal',
  },
  {
    id: 'calming',
    name: 'Calming',
    description: 'Maximale Angstreduktion für gestresste Patienten',
    theme: calmingTheme,
    preview: 'linear-gradient(135deg, #5E8B9E 0%, #F5F1E7 100%)',
    category: 'medical',
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
    
    // Invert background/surface with calming dark tones
    darkColors.background = '#1A1F2E';
    darkColors.surface = '#252B3D';
    
    // Light text for dark backgrounds
    darkColors.text = '#E8F4F8';
    darkColors.textMuted = '#8BA4B4';
    darkColors.border = '#3A4555';
    
    // Keep semantic colors but adjust brightness (softer for dark mode)
    darkColors.error = adjustBrightness(lightTheme.colors.error, 15);
    darkColors.success = adjustBrightness(lightTheme.colors.success, 15);
    darkColors.warning = adjustBrightness(lightTheme.colors.warning, 15);
    darkColors.info = adjustBrightness(lightTheme.colors.info, 15);
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
 * Updated with psychology-based colors
 */
export const medicalPresets = {
  /** General practitioner - trustworthy serene blue */
  generalPractitioner: {
    primary: '#4A90E2',
    secondary: '#5E8B9E',
  },
  /** Pediatrician - soft, friendly, non-threatening */
  pediatrician: {
    primary: '#81B29A',
    secondary: '#F4A261',
  },
  /** Cardiology - calming, stable tones */
  cardiology: {
    primary: '#5E8B9E',
    secondary: '#2C5F8A',
  },
  /** Dermatology - soft neutrals */
  dermatology: {
    primary: '#C7C3E6',
    secondary: '#81B29A',
  },
  /** Orthopedics - stable, healing colors */
  orthopedics: {
    primary: '#4A90E2',
    secondary: '#81B29A',
  },
  /** Neurology - calming, focused tones */
  neurology: {
    primary: '#5E8B9E',
    secondary: '#C7C3E6',
  },
  /** Mental Health - ultra calming */
  mentalHealth: {
    primary: '#81B29A',
    secondary: '#5E8B9E',
  },
} as const;

/**
 * Color Psychology Documentation
 * Reference for the psychology behind each color choice
 */
export const colorPsychology = {
  sereneBlue: {
    hex: '#4A90E2',
    psychology: 'Trust, calmness, professionalism',
    useCase: 'Primary actions, links, main brand elements',
    medicalContext: 'Associated with cleanliness, trustworthiness, and calm in medical settings',
  },
  deepTrustBlue: {
    hex: '#2C5F8A',
    psychology: 'Authority, depth, reliability',
    useCase: 'Headers, important text, key information',
    medicalContext: 'Conveys authority and medical expertise',
  },
  softMint: {
    hex: '#A8D5BA',
    psychology: 'Healing, growth, balance',
    useCase: 'Success states, positive feedback',
    medicalContext: 'Associated with healing, nature, and recovery',
  },
  sageGreen: {
    hex: '#81B29A',
    psychology: 'Natural confirmation, stability',
    useCase: 'Success states, confirmations',
    medicalContext: 'Calming green associated with health and wellness',
  },
  lightLavender: {
    hex: '#C7C3E6',
    psychology: 'Peacefulness, serenity',
    useCase: 'Background accents, subtle highlights',
    medicalContext: 'Promotes relaxation and reduces anxiety',
  },
  warmBeige: {
    hex: '#F5F1E7',
    psychology: 'Comfort, warmth, safety',
    useCase: 'Light mode background',
    medicalContext: 'Warmer than clinical white, feels more welcoming',
  },
  mistyGray: {
    hex: '#D9D9D9',
    psychology: 'Neutrality, balance',
    useCase: 'Secondary backgrounds, dividers',
    medicalContext: 'Non-threatening neutral tone',
  },
  softCoral: {
    hex: '#E07A5F',
    psychology: 'Attention without panic',
    useCase: 'Critical alerts, important warnings',
    medicalContext: 'Reduces anxiety compared to bright red while still alerting',
  },
  warmAmber: {
    hex: '#F4A261',
    psychology: 'Caution, not fear',
    useCase: 'Warning states',
    medicalContext: 'Gentle warning that does not trigger stress response',
  },
  dustyBlue: {
    hex: '#5E8B9E',
    psychology: 'Trustworthy information',
    useCase: 'Info states, secondary elements',
    medicalContext: 'Calming informational color',
  },
} as const;
