/**
 * AccessibilitySettings Component
 * 
 * Phase 5: Accessibility for Stressed Users
 * WCAG 2.2 AAA compliance + "Simple Mode" for cognitive impairment
 * 
 * Features:
 * - Simple Mode toggle (single question per screen)
 * - High Contrast toggle
 * - Reduced Motion toggle
 * - Font Size selector
 * - Extended session timeout option
 * - Cognitive accessibility features
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Eye, 
  Type, 
  Monitor, 
  Clock, 
  Layout,
  X,
  Check,
  Info,
  Accessibility,
  Brain
} from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToggleSettingOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  type: 'toggle';
  value: boolean;
  onChange: (value: boolean) => void;
}

interface SelectSettingOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  type: 'select';
  value: string;
  options?: { value: string; label: string }[];
  onChange: (value: string) => void;
}

type SettingOption = ToggleSettingOption | SelectSettingOption;

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Session store for Simple Mode
  const { simpleMode, setSimpleMode } = useSessionStore();
  
  // Local state for accessibility preferences
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('a11y-high-contrast') === 'true';
    }
    return false;
  });
  
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check system preference first
      const systemPrefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const stored = localStorage.getItem('a11y-reduced-motion');
      return stored !== null ? stored === 'true' : systemPrefersReduced;
    }
    return false;
  });
  
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('a11y-font-size') || '100';
    }
    return '100';
  });
  
  const [extendedTimeout, setExtendedTimeout] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('a11y-extended-timeout') === 'true';
    }
    return false;
  });
  
  const [cognitiveMode, setCognitiveMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('a11y-cognitive-mode') === 'true';
    }
    return false;
  });

  // Apply focus trap
  useFocusTrap(containerRef, {
    isActive: isOpen,
    onEscape: onClose,
    autoFocus: true,
  });

  // Apply settings to document
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Apply high contrast
    if (highContrast) {
      document.documentElement.classList.add('a11y-high-contrast');
    } else {
      document.documentElement.classList.remove('a11y-high-contrast');
    }
    
    // Apply reduced motion
    if (reducedMotion) {
      document.documentElement.classList.add('a11y-reduced-motion');
    } else {
      document.documentElement.classList.remove('a11y-reduced-motion');
    }
    
    // Apply font size
    document.documentElement.style.fontSize = `${fontSize}%`;
    
    // Apply cognitive mode (simplified UI)
    if (cognitiveMode) {
      document.documentElement.classList.add('a11y-cognitive-mode');
    } else {
      document.documentElement.classList.remove('a11y-cognitive-mode');
    }
  }, [highContrast, reducedMotion, fontSize, cognitiveMode]);

  // Save settings to localStorage
  const saveSetting = useCallback((key: string, value: boolean | string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`a11y-${key}`, String(value));
    }
  }, []);

  const handleHighContrastChange = useCallback((value: boolean) => {
    setHighContrast(value);
    saveSetting('high-contrast', value);
  }, [saveSetting]);

  const handleReducedMotionChange = useCallback((value: boolean) => {
    setReducedMotion(value);
    saveSetting('reduced-motion', value);
  }, [saveSetting]);

  const handleFontSizeChange = useCallback((value: string) => {
    setFontSize(value);
    saveSetting('font-size', value);
  }, [saveSetting]);

  const handleExtendedTimeoutChange = useCallback((value: boolean) => {
    setExtendedTimeout(value);
    saveSetting('extended-timeout', value);
  }, [saveSetting]);

  const handleCognitiveModeChange = useCallback((value: boolean) => {
    setCognitiveMode(value);
    saveSetting('cognitive-mode', value);
    // Cognitive mode also enables simple mode
    if (value && !simpleMode) {
      setSimpleMode(true);
    }
  }, [saveSetting, simpleMode, setSimpleMode]);

  const handleSimpleModeChange = useCallback((value: boolean) => {
    setSimpleMode(value);
    if (!value && cognitiveMode) {
      // Disabling simple mode also disables cognitive mode
      setCognitiveMode(false);
      saveSetting('cognitive-mode', false);
    }
  }, [setSimpleMode, cognitiveMode, saveSetting]);

  const settings: SettingOption[] = [
    {
      id: 'simple-mode',
      icon: <Layout className="w-5 h-5" aria-hidden="true" />,
      label: t('a11y.simpleMode.label', 'Einfach-Modus'),
      description: t('a11y.simpleMode.desc', 'Eine Frage pro Bildschirm für weniger Überforderung'),
      type: 'toggle',
      value: simpleMode,
      onChange: handleSimpleModeChange,
    },
    {
      id: 'cognitive-mode',
      icon: <Brain className="w-5 h-5" aria-hidden="true" />,
      label: t('a11y.cognitiveMode.label', 'Kognitive Unterstützung'),
      description: t('a11y.cognitiveMode.desc', 'Vereinfachte Sprache und klarere Struktur'),
      type: 'toggle',
      value: cognitiveMode,
      onChange: handleCognitiveModeChange,
    },
    {
      id: 'high-contrast',
      icon: <Eye className="w-5 h-5" aria-hidden="true" />,
      label: t('a11y.highContrast.label', 'Hoher Kontrast'),
      description: t('a11y.highContrast.desc', 'Maximaler Kontrast für bessere Lesbarkeit'),
      type: 'toggle',
      value: highContrast,
      onChange: handleHighContrastChange,
    },
    {
      id: 'font-size',
      icon: <Type className="w-5 h-5" aria-hidden="true" />,
      label: t('a11y.fontSize.label', 'Schriftgröße'),
      description: t('a11y.fontSize.desc', 'Textgröße anpassen'),
      type: 'select',
      value: fontSize,
      options: [
        { value: '85', label: t('a11y.fontSize.small', 'Klein') },
        { value: '100', label: t('a11y.fontSize.normal', 'Normal') },
        { value: '120', label: t('a11y.fontSize.large', 'Groß') },
        { value: '140', label: t('a11y.fontSize.xlarge', 'Sehr groß') },
      ],
      onChange: handleFontSizeChange,
    },
    {
      id: 'reduced-motion',
      icon: <Monitor className="w-5 h-5" aria-hidden="true" />,
      label: t('a11y.reducedMotion.label', 'Bewegung reduzieren'),
      description: t('a11y.reducedMotion.desc', 'Animationen minimieren'),
      type: 'toggle',
      value: reducedMotion,
      onChange: handleReducedMotionChange,
    },
    {
      id: 'extended-timeout',
      icon: <Clock className="w-5 h-5" aria-hidden="true" />,
      label: t('a11y.extendedTimeout.label', 'Längere Sitzung'),
      description: t('a11y.extendedTimeout.desc', 'Mehr Zeit zum Ausfüllen (30 Minuten)'),
      type: 'toggle',
      value: extendedTimeout,
      onChange: handleExtendedTimeoutChange,
    },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        background: 'rgba(0, 0, 0, 0.7)', 
        backdropFilter: 'blur(4px)' 
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
      aria-describedby="a11y-description"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
        style={{ 
          background: 'var(--bg-card)', 
          border: '2px solid var(--border-primary)' 
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <Accessibility className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 
                id="a11y-title"
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('a11y.title', 'Barrierefreiheit')}
              </h2>
              <p 
                id="a11y-description"
                className="text-sm mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('a11y.subtitle', 'Passen Sie die App an Ihre Bedürfnisse an')}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)] focus-visible:ring-opacity-50"
            style={{ 
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)'
            }}
            aria-label={t('a11y.close', 'Barrierefreiheitseinstellungen schließen')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Info Banner for Stressed Users */}
        <div 
          className="mb-6 p-4 rounded-xl"
          style={{ 
            background: 'var(--info-bg, rgba(94, 139, 158, 0.1))',
            border: '1px solid var(--info-border, rgba(94, 139, 158, 0.3))'
          }}
        >
          <div className="flex gap-3">
            <Info 
              className="w-5 h-5 flex-shrink-0 mt-0.5" 
              style={{ color: 'var(--info)' }}
              aria-hidden="true"
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('a11y.helpText', 
                'Wenn Sie sich überfordert fühlen, aktivieren Sie den Einfach-Modus. ' +
                'Dann wird nur eine Frage pro Seite angezeigt.'
              )}
            </p>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-4" role="group" aria-label={t('a11y.settingsGroup', 'Barrierefreiheitsoptionen')}>
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="p-4 rounded-xl transition-all"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: setting.value 
                        ? 'var(--primary)' 
                        : 'var(--bg-tertiary)',
                      color: setting.value ? 'white' : 'var(--text-muted)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {setting.icon}
                  </div>
                  <div className="min-w-0">
                    <label 
                      htmlFor={setting.id}
                      className="font-medium block truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {setting.label}
                    </label>
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {setting.description}
                    </p>
                  </div>
                </div>

                {setting.type === 'toggle' ? (
                  <button
                    id={setting.id}
                    role="switch"
                    aria-checked={setting.value as boolean}
                    onClick={() => setting.onChange(!(setting.value as boolean))}
                    className={`
                      relative w-14 h-8 rounded-full transition-all duration-300
                      focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)] focus-visible:ring-opacity-50
                      ${setting.value ? 'bg-[var(--primary)]' : 'bg-gray-300 dark:bg-gray-600'}
                    `}
                    style={{
                      minWidth: '56px',
                      minHeight: '32px'
                    }}
                  >
                    <span
                      className={`
                        absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md
                        transition-transform duration-300 flex items-center justify-center
                        ${setting.value ? 'translate-x-6' : 'translate-x-0'}
                      `}
                    >
                      {setting.value && (
                        <Check className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                ) : (
                  <select
                    id={setting.id}
                    value={setting.value as string}
                    onChange={(e) => setting.onChange(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm font-medium min-w-[100px] cursor-pointer"
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border-primary)'
                    }}
                  >
                    {setting.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* WCAG Compliance Note */}
        <div 
          className="mt-6 p-3 rounded-lg text-center text-xs"
          style={{ 
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)'
          }}
        >
          {t('a11y.wcagNote', 'WCAG 2.2 AAA konform • Für gestresste Nutzer optimiert')}
        </div>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
