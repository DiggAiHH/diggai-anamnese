/**
 * White-Labeling Theme System - Types
 * 
 * DSGVO-konformes, tenant-spezifisches Branding für DiggAI Anamnese Platform
 */

export interface ThemeColors {
  /** Primary brand color - used for buttons, links, accents */
  primary: string;
  /** Secondary color - used for secondary actions */
  secondary: string;
  /** Background color - main page background */
  background: string;
  /** Surface color - cards, panels, elevated surfaces */
  surface: string;
  /** Primary text color */
  text: string;
  /** Muted/secondary text color */
  textMuted: string;
  /** Border color for dividers and outlines */
  border: string;
  /** Error state color */
  error: string;
  /** Success state color */
  success: string;
  /** Warning state color */
  warning: string;
  /** Info state color */
  info: string;
}

export interface ThemeFonts {
  /** Font family for headings */
  heading: string;
  /** Font family for body text */
  body: string;
  /** Base font size (optional, for fine-tuning) */
  baseSize?: string;
}

export interface ThemeBorderRadius {
  /** Small radius - inputs, small buttons */
  sm: string;
  /** Medium radius - cards, modals */
  md: string;
  /** Large radius - large cards, hero sections */
  lg: string;
  /** Extra large radius - special elements */
  xl: string;
}

export interface ThemeShadows {
  /** Small shadow - buttons, inputs */
  sm: string;
  /** Medium shadow - cards, dropdowns */
  md: string;
  /** Large shadow - modals, dialogs */
  lg: string;
}

export interface ThemeLogo {
  /** Logo image URL */
  url: string;
  /** Logo width in pixels */
  width: number;
  /** Logo height in pixels */
  height: number;
  /** Alt text for accessibility */
  alt?: string;
  /** Favicon URL (optional) */
  faviconUrl?: string;
}

export interface Theme {
  /** Theme identifier/name */
  name: string;
  /** Theme version for cache busting */
  version?: string;
  /** Color palette */
  colors: ThemeColors;
  /** Typography settings */
  fonts: ThemeFonts;
  /** Border radius scale */
  borderRadius: ThemeBorderRadius;
  /** Shadow definitions */
  shadows: ThemeShadows;
  /** Logo configuration (optional) */
  logo?: ThemeLogo;
  /** Custom CSS variables (optional extension) */
  customVariables?: Record<string, string>;
}

/** Theme display mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Tenant theme configuration stored in database */
export interface TenantThemeConfig {
  /** Tenant identifier */
  tenantId: string;
  /** Theme configuration (partial - merges with defaults) */
  config: Partial<Theme>;
  /** Whether to use system preference */
  respectSystemPreference: boolean;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Updated by user ID */
  updatedBy?: string;
}

/** Theme context value for React */
export interface ThemeContextValue {
  /** Current active theme (merged) */
  theme: Theme;
  /** Current display mode */
  mode: ThemeMode;
  /** Set display mode */
  setMode: (mode: ThemeMode) => void;
  /** Whether currently in dark mode */
  isDark: boolean;
  /** Toggle between light/dark */
  toggleDarkMode: () => void;
  /** Update tenant-specific theme overrides */
  updateTenantTheme: (overrides: Partial<Theme>) => void;
  /** Tenant-specific overrides (if any) */
  tenantOverrides: Partial<Theme>;
  /** Whether theme is ready (loaded from backend) */
  isReady: boolean;
  /** Loading state */
  isLoading: boolean;
}

/** CSS Variable mapping for theme application */
export type CSSVariableMap = Record<string, string>;

/** Theme validation error */
export interface ThemeValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/** Theme validation result */
export interface ThemeValidationResult {
  valid: boolean;
  errors: ThemeValidationError[];
}

/** Predefined theme templates */
export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  theme: Theme;
  preview: string;
  category: 'medical' | 'modern' | 'classic' | 'minimal';
}

/** Theme editor state */
export interface ThemeEditorState {
  draft: Partial<Theme>;
  original: Partial<Theme>;
  hasChanges: boolean;
  isValid: boolean;
  errors: ThemeValidationError[];
  activeTab: 'colors' | 'typography' | 'effects' | 'logo';
}

/** Theme transition configuration */
export interface ThemeTransitionConfig {
  /** Enable smooth transitions between themes */
  enabled: boolean;
  /** Transition duration in milliseconds */
  duration: number;
  /** CSS easing function */
  easing: string;
}

/** Color scheme for medical accessibility compliance */
export interface MedicalColorScheme {
  /** High contrast mode for vision impairments */
  highContrast: boolean;
  /** Color blind friendly palette */
  colorBlindFriendly: boolean;
  /** WCAG compliance level */
  wcagLevel: 'AA' | 'AAA';
}

/** Complete white-label configuration for a tenant */
export interface WhiteLabelConfig {
  /** Tenant identifier */
  tenantId: string;
  /** Light mode theme */
  lightTheme: Partial<Theme>;
  /** Dark mode theme (optional - uses auto-generated if not set) */
  darkTheme?: Partial<Theme>;
  /** Default mode preference */
  defaultMode: ThemeMode;
  /** Custom CSS (admin-only, validated) */
  customCSS?: string;
  /** Medical accessibility settings */
  medicalColors?: MedicalColorScheme;
  /** Enable patient theme selection */
  allowPatientThemeSelection: boolean;
}
