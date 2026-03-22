/**
 * Font Selector Component
 * 
 * Select from system fonts or enter custom font
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SYSTEM_FONTS = [
  { name: 'Inter', value: 'Inter, system-ui, sans-serif', category: 'Sans Serif' },
  { name: 'Roboto', value: 'Roboto, system-ui, sans-serif', category: 'Sans Serif' },
  { name: 'Open Sans', value: '"Open Sans", system-ui, sans-serif', category: 'Sans Serif' },
  { name: 'Source Sans Pro', value: '"Source Sans Pro", system-ui, sans-serif', category: 'Sans Serif' },
  { name: 'Merriweather', value: 'Merriweather, Georgia, serif', category: 'Serif' },
  { name: 'Georgia', value: 'Georgia, "Times New Roman", serif', category: 'Serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif', category: 'Serif' },
  { name: 'System UI', value: 'system-ui, -apple-system, sans-serif', category: 'System' },
];

export function FontSelector({
  label,
  value,
  onChange,
  disabled = false,
}: FontSelectorProps) {
  const { t } = useTranslation();
  const [isCustom, setIsCustom] = useState(!SYSTEM_FONTS.some(f => f.value === value));
  const [customValue, setCustomValue] = useState(value);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange(newValue);
    }
  }, [onChange]);

  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const selectedFont = SYSTEM_FONTS.find(f => f.value === value);

  return (
    <div className="font-selector space-y-3">
      <label className="block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>

      <select
        value={isCustom ? 'custom' : (selectedFont ? value : 'custom')}
        onChange={handleSelectChange}
        disabled={disabled}
        className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm"
      >
        <optgroup label={t('admin.theme.systemFonts', 'System-Schriftarten')}>
          {SYSTEM_FONTS.filter(f => f.category !== 'System').map(font => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
        </optgroup>
        <option value="custom">
          {t('admin.theme.customFont', 'Benutzerdefiniert...')}
        </option>
      </select>

      {isCustom && (
        <input
          type="text"
          value={customValue}
          onChange={handleCustomChange}
          disabled={disabled}
          placeholder="'Custom Font', Arial, sans-serif"
          className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm font-mono"
        />
      )}

      {/* Font Preview */}
      <div className="p-4 bg-[var(--color-background)] rounded border border-[var(--color-border)]">
        <p 
          className="text-lg"
          style={{ fontFamily: isCustom ? customValue : value }}
        >
          {t('admin.theme.fontPreview', 'Aa Bb Cc Dd Ee Ff 123')}
        </p>
        <p 
          className="text-sm text-[var(--color-text-muted)] mt-1"
          style={{ fontFamily: isCustom ? customValue : value }}
        >
          {t('admin.theme.fontPreviewText', 'The quick brown fox jumps over the lazy dog')}
        </p>
      </div>
    </div>
  );
}

export default FontSelector;
