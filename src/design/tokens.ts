/**
 * Design Tokens — Centralized design system constants.
 * Colors reference CSS custom properties from index.css.
 * Spacing, radii, shadows are fixed values.
 */

// ─── Pastel Tokens ──────────────────────────────────────────
// M2 (Arzt-Feedback 2026-05-03): einheitlicher Pastell-Ton fuer Compliance-Pills.
// CSS-Variablen werden in index.css unter :root gesetzt; siehe TrustBadgeBar.
export const pastel = {
  compliance: '#E8F0FE',         // Lavendel-light
  complianceBorder: '#C9D9F4',
} as const;

// ─── Spacing ────────────────────────────────────────────────
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

// ─── Border Radius ──────────────────────────────────────────
export const radii = {
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ─── Shadows ────────────────────────────────────────────────
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  glow: '0 0 20px rgba(59, 130, 246, 0.3)',
  'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
  // Phase 6: Soft, diffused shadows for trust-building
  soft: '0 8px 32px rgba(44, 95, 138, 0.08)',
  'soft-lg': '0 12px 48px rgba(44, 95, 138, 0.12)',
  'glass': '0 8px 32px rgba(44, 95, 138, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
} as const;

// ─── Transitions ────────────────────────────────────────────
export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Z-Index Scale ──────────────────────────────────────────
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
} as const;

// ─── Breakpoints ────────────────────────────────────────────
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ─── Typography ─────────────────────────────────────────────
export const typography = {
  fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// ─── Component Variants ─────────────────────────────────────
// Phase 6: Extended with calming variants
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'calm' | 'success' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'glass' | 'interactive' | 'calm';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Phase 6: Calming Color Palette for Healthcare
export const calmingColors = {
  calm: '#4A90E2',      // Serene blue - trust, calmness
  success: '#81B29A',   // Sage green - healing, confirmation
  warning: '#F4A261',   // Warm amber - caution without fear
  danger: '#E07A5F',    // Soft coral - attention without panic
  info: '#5E8B9E',      // Dusty blue - trustworthy information
} as const;
