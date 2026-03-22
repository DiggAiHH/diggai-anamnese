/**
 * Theme Editor Component
 * 
 * Admin UI for configuring tenant-specific white-label themes
 * Allows customization of colors, fonts, effects, and logo
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Theme, ThemeMode, ThemeTemplate, ThemeValidationError } from '../../../theme/types';
import { themeTemplates, mergeThemes, defaultLightTheme, generateDarkTheme } from '../../../theme/defaultThemes';
import { isValidColor } from '../../../theme/applyTheme';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { ThemePreview } from './ThemePreview';
import { TemplateGallery } from './TemplateGallery';

export interface ThemeEditorProps {
  /** Initial theme configuration */
  initialTheme?: Partial<Theme>;
  /** Current mode preference */
  initialMode?: ThemeMode;
  /** Whether patients can select their own theme */
  allowPatientSelection?: boolean;
  /** Save callback */
  onSave: (config: {
    theme: Partial<Theme>;
    mode: ThemeMode;
    allowPatientSelection: boolean;
  }) => Promise<void>;
  /** Reset callback */
  onReset?: () => Promise<void>;
  /** Cancel callback */
  onCancel?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Whether user has permission to edit */
  canEdit?: boolean;
}

type EditorTab = 'templates' | 'colors' | 'typography' | 'effects' | 'logo' | 'preview';

/**
 * Theme Editor Component
 * 
 * Comprehensive theme customization interface for admins
 */
export function ThemeEditor({
  initialTheme,
  initialMode = 'system',
  allowPatientSelection = false,
  onSave,
  onReset,
  onCancel,
  isLoading = false,
  canEdit = true,
}: ThemeEditorProps) {
  const { t } = useTranslation();
  
  // State
  const [activeTab, setActiveTab] = useState<EditorTab>('templates');
  const [theme, setTheme] = useState<Partial<Theme>>(initialTheme || {});
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [allowSelection, setAllowSelection] = useState(allowPatientSelection);
  const [errors, setErrors] = useState<ThemeValidationError[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  // Track changes
  useEffect(() => {
    const themeChanged = JSON.stringify(theme) !== JSON.stringify(initialTheme || {});
    const modeChanged = mode !== initialMode;
    const selectionChanged = allowSelection !== allowPatientSelection;
    setHasChanges(themeChanged || modeChanged || selectionChanged);
  }, [theme, mode, allowSelection, initialTheme, initialMode, allowPatientSelection]);

  // Validate theme
  useEffect(() => {
    const validationErrors: ThemeValidationError[] = [];
    
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (value && !isValidColor(value)) {
          validationErrors.push({
            field: `colors.${key}`,
            message: t('admin.theme.invalidColor', 'Invalid color format'),
            value,
          });
        }
      });
    }
    
    setErrors(validationErrors);
  }, [theme, t]);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: ThemeTemplate) => {
    setTheme({
      name: template.theme.name,
      colors: template.theme.colors,
      fonts: template.theme.fonts,
      borderRadius: template.theme.borderRadius,
      shadows: template.theme.shadows,
    });
    setActiveTab('colors');
  }, []);

  // Handle color change
  const handleColorChange = useCallback((key: string, value: string) => {
    setTheme(prev => ({
      ...prev,
      colors: {
        ...(prev.colors || {}),
        [key]: value,
      } as any,
    }));
  }, []);

  // Handle font change
  const handleFontChange = useCallback((key: 'heading' | 'body', value: string) => {
    setTheme(prev => ({
      ...prev,
      fonts: {
        ...(prev.fonts || {}),
        [key]: value,
      } as any,
    }));
  }, []);

  // Handle border radius change
  const handleRadiusChange = useCallback((key: string, value: string) => {
    setTheme(prev => ({
      ...prev,
      borderRadius: {
        ...(prev.borderRadius || {}),
        [key]: value,
      } as any,
    }));
  }, []);

  // Handle shadow change
  const handleShadowChange = useCallback((key: string, value: string) => {
    setTheme(prev => ({
      ...prev,
      shadows: {
        ...(prev.shadows || {}),
        [key]: value,
      } as any,
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (errors.length > 0) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await onSave({
        theme,
        mode,
        allowPatientSelection: allowSelection,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [errors, theme, mode, allowSelection, onSave]);

  // Handle reset
  const handleReset = useCallback(async () => {
    if (!onReset) return;
    
    if (window.confirm(t('admin.theme.resetConfirm', 'Reset theme to defaults?'))) {
      await onReset();
      setTheme({});
      setMode('system');
      setAllowSelection(false);
    }
  }, [onReset, t]);

  // Merged theme for preview
  const mergedTheme = mergeThemes(defaultLightTheme, theme);
  const darkTheme = mergeThemes(defaultLightTheme, generateDarkTheme(theme));

  // Tabs configuration
  const tabs: { id: EditorTab; label: string; icon: string }[] = [
    { id: 'templates', label: t('admin.theme.tabs.templates', 'Vorlagen'), icon: '🎨' },
    { id: 'colors', label: t('admin.theme.tabs.colors', 'Farben'), icon: '🎨' },
    { id: 'typography', label: t('admin.theme.tabs.typography', 'Schrift'), icon: '🔤' },
    { id: 'effects', label: t('admin.theme.tabs.effects', 'Effekte'), icon: '✨' },
    { id: 'logo', label: t('admin.theme.tabs.logo', 'Logo'), icon: '🖼️' },
    { id: 'preview', label: t('admin.theme.tabs.preview', 'Vorschau'), icon: '👁️' },
  ];

  return (
    <div className="theme-editor bg-[var(--color-surface)] rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            {t('admin.theme.title', 'Theme Editor')}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {t('admin.theme.subtitle', 'Passen Sie das Erscheinungsbild Ihrer Praxis an')}
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-2 text-amber-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {t('admin.theme.unsavedChanges', 'Ungespeicherte Änderungen')}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
              transition-colors border-b-2
              ${activeTab === tab.id
                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]'
              }
            `}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <TemplateGallery
            templates={themeTemplates}
            onSelect={handleSelectTemplate}
            currentTheme={theme}
          />
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mergedTheme.colors && Object.entries(mergedTheme.colors).map(([key, value]) => (
                <ColorPicker
                  key={key}
                  label={t(`admin.theme.colors.${key}`, key)}
                  value={value}
                  onChange={(newValue) => handleColorChange(key, newValue)}
                  error={errors.find(e => e.field === `colors.${key}`)?.message}
                  disabled={!canEdit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FontSelector
                label={t('admin.theme.fonts.heading', 'Überschriften-Schrift')}
                value={mergedTheme.fonts.heading}
                onChange={(value) => handleFontChange('heading', value)}
                disabled={!canEdit}
              />
              <FontSelector
                label={t('admin.theme.fonts.body', 'Fließtext-Schrift')}
                value={mergedTheme.fonts.body}
                onChange={(value) => handleFontChange('body', value)}
                disabled={!canEdit}
              />
            </div>
            
            {/* Typography Preview */}
            <div className="p-6 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
              <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: mergedTheme.fonts.heading }}>
                {t('admin.theme.typographyPreview.heading', 'Überschrift Beispiel')}
              </h1>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: mergedTheme.fonts.heading }}>
                {t('admin.theme.typographyPreview.subheading', 'Unterüberschrift')}
              </h2>
              <p className="text-base leading-relaxed" style={{ fontFamily: mergedTheme.fonts.body }}>
                {t('admin.theme.typographyPreview.body', 'Dies ist ein Beispiel für Fließtext. Die Schriftart und -größe können oben angepasst werden.')}
              </p>
            </div>
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && (
          <div className="space-y-6">
            {/* Border Radius */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">
                {t('admin.theme.borderRadius', 'Eckenradius')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mergedTheme.borderRadius && Object.entries(mergedTheme.borderRadius).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-xs text-[var(--color-text-muted)] uppercase">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleRadiusChange(key, e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm"
                      placeholder="8px"
                    />
                    <div 
                      className="h-8 bg-[var(--color-primary)]"
                      style={{ borderRadius: value }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">
                {t('admin.theme.shadows', 'Schatten')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mergedTheme.shadows && Object.entries(mergedTheme.shadows).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-xs text-[var(--color-text-muted)] uppercase">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleShadowChange(key, e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm font-mono text-xs"
                    />
                    <div 
                      className="h-16 bg-[var(--color-surface)] rounded-lg flex items-center justify-center"
                      style={{ boxShadow: value }}
                    >
                      <span className="text-xs text-[var(--color-text-muted)]">{key}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logo Tab */}
        {activeTab === 'logo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    {t('admin.theme.logoUrl', 'Logo URL')}
                  </label>
                  <input
                    type="url"
                    value={theme.logo?.url || ''}
                    onChange={(e) => setTheme(prev => ({
                      ...prev,
                      logo: {
                        ...prev.logo,
                        url: e.target.value,
                        width: prev.logo?.width || 180,
                        height: prev.logo?.height || 48,
                      },
                    }))}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm"
                    placeholder="https://example.com/logo.svg"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      {t('admin.theme.logoWidth', 'Breite (px)')}
                    </label>
                    <input
                      type="number"
                      value={theme.logo?.width || 180}
                      onChange={(e) => setTheme(prev => ({
                        ...prev,
                        logo: {
                          ...prev.logo,
                          width: parseInt(e.target.value) || 180,
                          height: prev.logo?.height || 48,
                          url: prev.logo?.url || '',
                        },
                      }))}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm"
                      min={1}
                      max={1000}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      {t('admin.theme.logoHeight', 'Höhe (px)')}
                    </label>
                    <input
                      type="number"
                      value={theme.logo?.height || 48}
                      onChange={(e) => setTheme(prev => ({
                        ...prev,
                        logo: {
                          ...prev.logo,
                          height: parseInt(e.target.value) || 48,
                          width: prev.logo?.width || 180,
                          url: prev.logo?.url || '',
                        },
                      }))}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm"
                      min={1}
                      max={500}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    {t('admin.theme.logoAlt', 'Alt-Text')}
                  </label>
                  <input
                    type="text"
                    value={theme.logo?.alt || ''}
                    onChange={(e) => setTheme(prev => ({
                      ...prev,
                      logo: {
                        ...prev.logo,
                        alt: e.target.value,
                        url: prev.logo?.url || '',
                        width: prev.logo?.width || 180,
                        height: prev.logo?.height || 48,
                      },
                    }))}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm"
                    placeholder="Praxis Logo"
                  />
                </div>
              </div>

              {/* Logo Preview */}
              <div className="flex items-center justify-center p-8 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
                {theme.logo?.url ? (
                  <img
                    src={theme.logo.url}
                    alt={theme.logo.alt || 'Logo Preview'}
                    width={Math.min(theme.logo.width || 180, 300)}
                    height={Math.min(theme.logo.height || 48, 100)}
                    className="max-w-full h-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center text-[var(--color-text-muted)]">
                    <span className="text-4xl">🖼️</span>
                    <p className="mt-2 text-sm">{t('admin.theme.noLogo', 'Kein Logo ausgewählt')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
              <span className="text-sm font-medium text-[var(--color-text)]">
                {t('admin.theme.previewMode', 'Vorschaumodus')}
              </span>
              <div className="flex bg-[var(--color-surface)] rounded-lg p-1 border border-[var(--color-border)]">
                <button
                  onClick={() => setPreviewMode('light')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === 'light'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  ☀️ {t('admin.theme.light', 'Hell')}
                </button>
                <button
                  onClick={() => setPreviewMode('dark')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === 'dark'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  🌙 {t('admin.theme.dark', 'Dunkel')}
                </button>
              </div>
            </div>

            <ThemePreview
              theme={previewMode === 'light' ? mergedTheme : darkTheme}
            />
          </div>
        )}
      </div>

      {/* Settings & Actions */}
      <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Settings */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--color-text)]">
                {t('admin.theme.defaultMode', 'Standard-Modus:')}
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ThemeMode)}
                disabled={!canEdit}
                className="px-3 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm"
              >
                <option value="system">{t('admin.theme.mode.system', 'System')}</option>
                <option value="light">{t('admin.theme.mode.light', 'Hell')}</option>
                <option value="dark">{t('admin.theme.mode.dark', 'Dunkel')}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowSelection}
                onChange={(e) => setAllowSelection(e.target.checked)}
                disabled={!canEdit}
                className="rounded border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text)]">
                {t('admin.theme.allowPatientSelection', 'Patienten dürfen Theme wählen')}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {onReset && (
              <button
                onClick={handleReset}
                disabled={isLoading || isSaving || !canEdit}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {t('admin.theme.reset', 'Zurücksetzen')}
              </button>
            )}
            
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isLoading || isSaving}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || errors.length > 0 || isLoading || isSaving || !canEdit}
              className="px-6 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('common.saving', 'Speichern...')}
                </>
              ) : (
                t('common.save', 'Speichern')
              )}
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-1">
              {t('admin.theme.validationErrors', 'Bitte korrigieren Sie die folgenden Fehler:')}
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {errors.map((error, idx) => (
                <li key={idx}>{error.field}: {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {saveError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {saveError}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThemeEditor;
