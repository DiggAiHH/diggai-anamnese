/**
 * Color Picker Component
 * 
 * Accessible color input with preview and validation
 */

import React, { useState, useCallback } from 'react';
import { isValidColor } from '../../../theme/applyTheme';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#0f172a', '#374151', '#6b7280', '#9ca3af',
];

export function ColorPicker({
  label,
  value,
  onChange,
  error,
  disabled = false,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (isValidColor(newValue)) {
      onChange(newValue);
    }
  }, [onChange]);

  const handlePresetClick = useCallback((color: string) => {
    setInputValue(color);
    onChange(color);
    setIsOpen(false);
  }, [onChange]);

  const isValid = isValidColor(inputValue);

  return (
    <div className="color-picker">
      <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase mb-2">
        {label}
      </label>
      
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Color Preview Button */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`
              w-10 h-10 rounded-lg border-2 shadow-sm flex-shrink-0
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
              ${error ? 'border-red-500' : 'border-[var(--color-border)]'}
              transition-transform
            `}
            style={{ backgroundColor: isValid ? value : 'transparent' }}
            aria-label={`${label} auswählen`}
          >
            {!isValid && (
              <span className="text-red-500 text-lg">!</span>
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            className={`
              flex-1 px-3 py-2 bg-[var(--color-background)] border rounded text-sm font-mono uppercase
              ${error || !isValid ? 'border-red-500' : 'border-[var(--color-border)]'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            placeholder="#3b82f6"
          />

          {/* Native Color Picker */}
          <input
            type="color"
            value={isValid ? value : '#000000'}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            disabled={disabled}
            className="w-10 h-10 p-0 border-0 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Preset Colors Popup */}
        {isOpen && !disabled && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 w-64">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className={`
                      w-8 h-8 rounded border-2 transition-transform hover:scale-110
                      ${value === color ? 'border-[var(--color-primary)] scale-110' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: color }}
                    aria-label={`Farbe ${color}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

export default ColorPicker;
