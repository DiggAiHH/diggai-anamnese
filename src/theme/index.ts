/**
 * White-Labeling Theme System - Main Export
 * 
 * DiggAI Anamnese Platform - Theme System
 * DSGVO-konformes, tenant-spezifisches Branding
 */

// Types
export type {
  Theme,
  ThemeColors,
  ThemeFonts,
  ThemeBorderRadius,
  ThemeShadows,
  ThemeLogo,
  ThemeMode,
  ThemeContextValue,
  TenantThemeConfig,
  ThemeTemplate,
  ThemeEditorState,
  ThemeValidationResult,
  ThemeValidationError,
  ThemeTransitionConfig,
  MedicalColorScheme,
  WhiteLabelConfig,
  CSSVariableMap,
} from './types';

// Default themes and utilities
export {
  defaultLightTheme,
  defaultDarkTheme,
  highContrastTheme,
  medicalProfessionalTheme,
  minimalTheme,
  simpleModeTheme,
  themeTemplates,
  generateDarkTheme,
  mergeThemes,
  defaultWhiteLabelConfig,
  medicalPresets,
} from './defaultThemes';

// Theme provider and hooks
export {
  ThemeProvider,
  useTheme,
  useThemeClasses,
  useThemeCSS,
} from './ThemeProvider';

// CSS variable utilities
export {
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
  defaultTransitionConfig,
} from './applyTheme';

// Re-export for convenience
export { default } from './ThemeProvider';
