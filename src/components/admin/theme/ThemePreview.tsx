/**
 * Theme Preview Component
 * 
 * Live preview of theme with sample UI components
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme } from '../../../theme/types';

interface ThemePreviewProps {
  theme: Theme;
}

export function ThemePreview({ theme }: ThemePreviewProps) {
  const { t } = useTranslation();

  return (
    <div 
      className="theme-preview rounded-lg border border-[var(--color-border)] overflow-hidden"
      style={{
        '--color-primary': theme.colors.primary,
        '--color-secondary': theme.colors.secondary,
        '--color-background': theme.colors.background,
        '--color-surface': theme.colors.surface,
        '--color-text': theme.colors.text,
        '--color-text-muted': theme.colors.textMuted,
        '--color-border': theme.colors.border,
        '--color-error': theme.colors.error,
        '--color-success': theme.colors.success,
        '--color-warning': theme.colors.warning,
        '--color-info': theme.colors.info,
        '--font-heading': theme.fonts.heading,
        '--font-body': theme.fonts.body,
        '--radius-sm': theme.borderRadius.sm,
        '--radius-md': theme.borderRadius.md,
        '--radius-lg': theme.borderRadius.lg,
        '--radius-xl': theme.borderRadius.xl,
        '--shadow-sm': theme.shadows.sm,
        '--shadow-md': theme.shadows.md,
        '--shadow-lg': theme.shadows.lg,
      } as React.CSSProperties}
    >
      {/* Sample Navigation */}
      <nav className="px-6 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {theme.logo?.url ? (
              <img 
                src={theme.logo.url} 
                alt={theme.logo.alt || 'Logo'}
                width={theme.logo.width}
                height={theme.logo.height}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-bold" style={{ fontFamily: theme.fonts.heading, color: theme.colors.primary }}>
                {theme.name}
              </span>
            )}
            <div className="hidden sm:flex items-center gap-4 ml-8">
              <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                {t('admin.theme.preview.nav.dashboard', 'Dashboard')}
              </span>
              <span className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t('admin.theme.preview.nav.patients', 'Patienten')}
              </span>
              <span className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t('admin.theme.preview.nav.settings', 'Einstellungen')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
          </div>
        </div>
      </nav>

      {/* Sample Content */}
      <div className="p-6 space-y-6" style={{ backgroundColor: theme.colors.background }}>
        {/* Header Section */}
        <div>
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: theme.fonts.heading, color: theme.colors.text }}
          >
            {t('admin.theme.preview.welcome', 'Willkommen in Ihrer Praxis')}
          </h1>
          <p style={{ fontFamily: theme.fonts.body, color: theme.colors.textMuted }}>
            {t('admin.theme.preview.subtitle', 'Hier ist eine Vorschau Ihres angepassten Themes')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primary Card */}
          <div 
            className="p-4"
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <h3 
              className="font-semibold mb-1"
              style={{ fontFamily: theme.fonts.heading, color: '#ffffff' }}
            >
              {t('admin.theme.preview.cards.primary', 'Primär')}
            </h3>
            <p className="text-sm opacity-90" style={{ color: '#ffffff' }}>
              {t('admin.theme.preview.cards.primaryText', 'Hauptfarbe für wichtige Elemente')}
            </p>
          </div>

          {/* Surface Card */}
          <div 
            className="p-4 border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.md,
              boxShadow: theme.shadows.sm,
            }}
          >
            <h3 
              className="font-semibold mb-1"
              style={{ fontFamily: theme.fonts.heading, color: theme.colors.text }}
            >
              {t('admin.theme.preview.cards.surface', 'Oberfläche')}
            </h3>
            <p className="text-sm" style={{ color: theme.colors.textMuted }}>
              {t('admin.theme.preview.cards.surfaceText', 'Karten und Panels')}
            </p>
          </div>

          {/* Info Card */}
          <div 
            className="p-4"
            style={{
              backgroundColor: theme.colors.info,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <h3 
              className="font-semibold mb-1"
              style={{ fontFamily: theme.fonts.heading, color: '#ffffff' }}
            >
              {t('admin.theme.preview.cards.info', 'Info')}
            </h3>
            <p className="text-sm opacity-90" style={{ color: '#ffffff' }}>
              {t('admin.theme.preview.cards.infoText', 'Informationen und Hinweise')}
            </p>
          </div>
        </div>

        {/* Form Elements */}
        <div 
          className="p-6 border space-y-4"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.md,
          }}
        >
          <h3 
            className="font-semibold mb-4"
            style={{ fontFamily: theme.fonts.heading, color: theme.colors.text }}
          >
            {t('admin.theme.preview.form.title', 'Beispielformular')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1"
                style={{ color: theme.colors.text }}
              >
                {t('admin.theme.preview.form.name', 'Name')}
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.text,
                }}
                placeholder={t('admin.theme.preview.form.namePlaceholder', 'Max Mustermann')}
              />
            </div>
            <div>
              <label 
                className="block text-sm font-medium mb-1"
                style={{ color: theme.colors.text }}
              >
                {t('admin.theme.preview.form.email', 'E-Mail')}
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.text,
                }}
                placeholder={t('admin.theme.preview.form.emailPlaceholder', 'max@beispiel.de')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded"
              style={{ accentColor: theme.colors.primary }}
            />
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>
              {t('admin.theme.preview.form.checkbox', 'Ich stimme den Bedingungen zu')}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="px-4 py-2 text-white font-medium"
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.md,
              }}
            >
              {t('admin.theme.preview.form.submit', 'Absenden')}
            </button>
            <button
              className="px-4 py-2 font-medium border"
              style={{
                backgroundColor: 'transparent',
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.md,
                color: theme.colors.text,
              }}
            >
              {t('admin.theme.preview.form.cancel', 'Abbrechen')}
            </button>
          </div>
        </div>

        {/* Alert Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Success Alert */}
          <div 
            className="p-4 flex items-start gap-3"
            style={{
              backgroundColor: `${theme.colors.success}15`,
              border: `1px solid ${theme.colors.success}30`,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <span style={{ color: theme.colors.success }}>✓</span>
            <div>
              <p className="font-medium" style={{ color: theme.colors.success }}>
                {t('admin.theme.preview.alerts.success', 'Erfolg')}
              </p>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t('admin.theme.preview.alerts.successText', 'Die Aktion wurde erfolgreich ausgeführt')}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          <div 
            className="p-4 flex items-start gap-3"
            style={{
              backgroundColor: `${theme.colors.error}15`,
              border: `1px solid ${theme.colors.error}30`,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <span style={{ color: theme.colors.error }}>✕</span>
            <div>
              <p className="font-medium" style={{ color: theme.colors.error }}>
                {t('admin.theme.preview.alerts.error', 'Fehler')}
              </p>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t('admin.theme.preview.alerts.errorText', 'Es ist ein Fehler aufgetreten')}
              </p>
            </div>
          </div>

          {/* Warning Alert */}
          <div 
            className="p-4 flex items-start gap-3"
            style={{
              backgroundColor: `${theme.colors.warning}15`,
              border: `1px solid ${theme.colors.warning}30`,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <span style={{ color: theme.colors.warning }}>⚠</span>
            <div>
              <p className="font-medium" style={{ color: theme.colors.warning }}>
                {t('admin.theme.preview.alerts.warning', 'Warnung')}
              </p>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t('admin.theme.preview.alerts.warningText', 'Bitte überprüfen Sie Ihre Eingaben')}
              </p>
            </div>
          </div>

          {/* Info Alert */}
          <div 
            className="p-4 flex items-start gap-3"
            style={{
              backgroundColor: `${theme.colors.info}15`,
              border: `1px solid ${theme.colors.info}30`,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <span style={{ color: theme.colors.info }}>ℹ</span>
            <div>
              <p className="font-medium" style={{ color: theme.colors.info }}>
                {t('admin.theme.preview.alerts.info', 'Info')}
              </p>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {t('admin.theme.preview.alerts.infoText', 'Neue Funktionen verfügbar')}
              </p>
            </div>
          </div>
        </div>

        {/* Typography Showcase */}
        <div 
          className="p-6 border space-y-4"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.borderRadius.lg,
          }}
        >
          <h2 style={{ fontFamily: theme.fonts.heading, color: theme.colors.text }}>
            {t('admin.theme.preview.typography.heading1', 'Überschrift 1')}
          </h2>
          <h3 style={{ fontFamily: theme.fonts.heading, color: theme.colors.text }}>
            {t('admin.theme.preview.typography.heading2', 'Überschrift 2')}
          </h3>
          <h4 style={{ fontFamily: theme.fonts.heading, color: theme.colors.text }}>
            {t('admin.theme.preview.typography.heading3', 'Überschrift 3')}
          </h4>
          <p style={{ fontFamily: theme.fonts.body, color: theme.colors.text }}>
            {t('admin.theme.preview.typography.body', 'Dies ist ein Beispiel für normalen Fließtext. Die Schriftart kann oben angepasst werden, um das Erscheinungsbild Ihrer Praxis zu individualisieren.')}
          </p>
          <p style={{ fontFamily: theme.fonts.body, color: theme.colors.textMuted }}>
            {t('admin.theme.preview.typography.muted', 'Dies ist ausgegrauter Text für sekundäre Informationen und Hinweise.')}
          </p>
          <a 
            href="#"
            style={{ fontFamily: theme.fonts.body, color: theme.colors.primary }}
            onClick={(e) => e.preventDefault()}
          >
            {t('admin.theme.preview.typography.link', 'Das ist ein Link')}
          </a>
        </div>
      </div>
    </div>
  );
}

export default ThemePreview;
