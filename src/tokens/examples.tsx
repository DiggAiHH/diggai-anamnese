/**
 * Design Tokens - Usage Examples
 * 
 * Diese Datei zeigt verschiedene Möglichkeiten, Design Tokens zu verwenden.
 * Dies ist nur eine Beispieldatei und kann nach Bedarf angepasst werden.
 */

import React from 'react';
import {
  // Farben
  colorPrimary500,
  colorSemanticSuccess,
  colorSemanticError,
  colorNeutral0,
  colorNeutral900,
  // Abstände
  spacing4,
  spacing2,
  spacing8,
  // Schriften
  fontSizeBase,
  fontWeightSemibold,
  fontFamilySans,
  // Radien
  radiusMd,
  radiusFull,
  // Schatten
  shadowMd,
  // Opazität
  opacity50,
  // Z-Index
  zIndexModal,
  // Helper Funktion
  getToken,
} from './tokens.types';

// ============================================
// Beispiel 1: Inline Styles mit Token-Konstanten
// ============================================

export function ButtonInlineStyles() {
  return (
    <button
      style={{
        backgroundColor: colorPrimary500,
        color: colorNeutral0,
        padding: `${spacing2} ${spacing4}`,
        borderRadius: radiusMd,
        fontSize: fontSizeBase,
        fontWeight: fontWeightSemibold,
        fontFamily: fontFamilySans,
        boxShadow: shadowMd,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Primary Button
    </button>
  );
}

// ============================================
// Beispiel 2: CSS-in-JS (z.B. styled-components)
// ============================================

// Mit CSS-in-JS Bibliotheken
const buttonStyles = {
  backgroundColor: colorPrimary500,
  color: colorNeutral0,
  padding: spacing4,
  borderRadius: radiusMd,
};

// ============================================
// Beispiel 3: Tailwind CSS mit Token-Referenzen
// ============================================

export function ButtonTailwind() {
  // Tailwind Klassen verwenden, die auf CSS Variablen basieren
  return (
    <button className="bg-primary-500 text-neutral-0 px-spacing-4 py-spacing-2 rounded-radius-md shadow-md font-semibold">
      Primary Button
    </button>
  );
}

// ============================================
// Beispiel 4: Dynamischer Token-Lookup
// ============================================

export function DynamicTokenExample({ severity }: { severity: 'success' | 'error' | 'warning' }) {
  // Verwende getToken() für dynamische Token-Pfade
  const colorMap = {
    success: getToken('color.semantic.success'),
    error: getToken('color.semantic.error'),
    warning: getToken('color.semantic.warning'),
  };

  return (
    <div
      style={{
        backgroundColor: colorMap[severity],
        padding: spacing4,
        borderRadius: radiusMd,
        opacity: opacity50,
        zIndex: zIndexModal,
      }}
    >
      Alert Message
    </div>
  );
}

// ============================================
// Beispiel 5: Komponente mit Token-Props
// ============================================

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
}

export function Card({ children, variant = 'default' }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: colorNeutral0,
        color: colorNeutral900,
        padding: spacing8,
        borderRadius: radiusMd,
        boxShadow: variant === 'elevated' ? shadowMd : 'none',
        fontFamily: fontFamilySans,
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// Beispiel 6: Dark Mode Support
// ============================================

export function ThemedComponent() {
  return (
    <div
      style={{
        // Verwende CSS Variablen für Theme-Support
        backgroundColor: 'var(--token-color-neutral-0)',
        color: 'var(--token-color-neutral-900)',
        padding: 'var(--token-spacing-4)',
      }}
      className="dark:bg-neutral-900 dark:text-neutral-0"
    >
      Themed Content
    </div>
  );
}

// ============================================
// Beispiel 7: Responsive Design
// ============================================

export function ResponsiveComponent() {
  return (
    <div
      style={{
        padding: spacing4,
        // Responsive Padding mit Media Queries
        '@media (min-width: 768px)': {
          padding: spacing8,
        },
      } as React.CSSProperties}
    >
      Responsive Content
    </div>
  );
}

// ============================================
// Beispiel 8: Komplexes Layout
// ============================================

export function LayoutExample() {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing4,
        padding: spacing8,
        backgroundColor: colorNeutral0,
        borderRadius: radiusMd,
        boxShadow: shadowMd,
      }}
    >
      <div
        style={{
          flex: 1,
          padding: spacing4,
          backgroundColor: colorPrimary500,
          color: colorNeutral0,
          borderRadius: radiusMd,
          fontSize: fontSizeBase,
        }}
      >
        Left Column
      </div>
      <div
        style={{
          flex: 1,
          padding: spacing4,
          backgroundColor: colorSemanticSuccess,
          color: colorNeutral0,
          borderRadius: radiusFull,
          fontSize: fontSizeBase,
        }}
      >
        Right Column
      </div>
    </div>
  );
}

// ============================================
// Beispiel 9: Form Elements
// ============================================

export function FormExample() {
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: spacing4 }}>
      <input
        type="text"
        placeholder="Enter text..."
        style={{
          padding: spacing2,
          borderRadius: radiusMd,
          border: `1px solid var(--token-color-neutral-300)`,
          fontSize: fontSizeBase,
          fontFamily: fontFamilySans,
        }}
      />
      <button
        type="submit"
        style={{
          padding: `${spacing2} ${spacing4}`,
          backgroundColor: colorPrimary500,
          color: colorNeutral0,
          borderRadius: radiusMd,
          border: 'none',
          cursor: 'pointer',
          fontSize: fontSizeBase,
          fontWeight: fontWeightSemibold,
        }}
      >
        Submit
      </button>
    </form>
  );
}

// ============================================
// Best Practices
// ============================================

/**
 * ✅ DO:
 * - Verwende semantische Tokens (color.semantic.success)
 * - Importiere Token-Konstanten für Type-Safety
 * - Verwende getToken() für dynamische Pfade
 * - Kombiniere Tokens mit Tailwind CSS
 * 
 * ❌ DON'T:
 * - Hartkodiere Werte (color: '#0066cc')
 * - Importiere Tokens direkt aus tokens.json
 * - Verändere generierte Dateien manuell
 * - Verwende Token-Werte für Berechnungen
 */

export default {
  ButtonInlineStyles,
  ButtonTailwind,
  DynamicTokenExample,
  Card,
  ThemedComponent,
  ResponsiveComponent,
  LayoutExample,
  FormExample,
};
