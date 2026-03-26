import { useState } from 'react';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presets?: string[];
  error?: string;
  disabled?: boolean;
}

// Psychology-based color presets for healthcare
const DEFAULT_PRESETS = [
  // Primary - Trust & Calmness
  '#4A90E2', // Serene Blue
  '#2C5F8A', // Deep Trust Blue
  '#5E8B9E', // Dusty Blue
  
  // Secondary - Healing & Balance
  '#81B29A', // Sage Green
  '#A8D5BA', // Soft Mint
  '#C7C3E6', // Light Lavender
  
  // Neutrals - Comfort
  '#F5F1E7', // Warm Beige
  '#D9D9D9', // Misty Gray
  '#6B8BA4', // Muted Blue-Gray
  
  // Alerts - Anxiety Optimized (NO bright reds)
  '#E07A5F', // Soft Coral (critical)
  '#F4A261', // Warm Amber (warning)
  
  // Additional calming options
  '#7BA3B3', // Dusty Teal
  '#9BB0C0', // Soft Gray-Blue
  '#E8E2D4', // Warm Sand
  '#B8C4CC', // Cool Gray
];

export function ColorPicker({ 
  value, 
  onChange, 
  label,
  presets = DEFAULT_PRESETS,
  error,
  disabled = false,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);
  const [showCustom, setShowCustom] = useState(false);

  const isValidHex = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Auto-add # if missing
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }
    
    setCustomColor(newValue);
    
    if (isValidHex(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      
      {/* Color Presets Grid */}
      <div className="grid grid-cols-7 gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              if (disabled) return;
              onChange(color);
              setCustomColor(color);
            }}
            disabled={disabled}
            className="relative w-8 h-8 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)]"
            style={{ 
              backgroundColor: color,
              borderColor: value === color ? 'var(--text-primary)' : 'transparent',
              transform: value === color ? 'scale(1.1)' : 'scale(1)',
              opacity: disabled ? 0.5 : 1,
            }}
            title={color}
          >
            {value === color && (
              <Check 
                className="absolute inset-0 m-auto w-4 h-4"
                style={{ 
                  color: isLightColor(color) ? '#2C5F8A' : '#ffffff',
                  strokeWidth: 3
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Custom Color Input */}
      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-primary)]">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          disabled={disabled}
          className="text-sm transition-colors duration-200"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {showCustom ? 'Benutzerdefiniert ausblenden' : 'Eigene Farbe eingeben'}
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={isValidHex(customColor) ? customColor : '#4A90E2'}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onChange(e.target.value);
              }}
              disabled={disabled}
              className="w-10 h-10 rounded-lg border-2 border-[var(--border-primary)] cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={customColor}
              onChange={handleCustomChange}
              disabled={disabled}
              placeholder="#4A90E2"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] transition-colors duration-200 focus:outline-none focus:border-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            />
            {!isValidHex(customColor) && customColor.length > 1 && (
              <span className="text-xs mt-1 block" style={{ color: '#E07A5F' }}>
                Ungültiger Hex-Code
              </span>
            )}
          </div>
          <div 
            className="w-8 h-8 rounded-lg border-2 border-[var(--border-primary)]"
            style={{ 
              backgroundColor: isValidHex(customColor) ? customColor : '#4A90E2'
            }}
          />
        </div>
      )}

      {/* Color Psychology Info */}
      <div className="pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <p>Psychologie-basierte Farben für beruhigende Wirkung im medizinischen Kontext.</p>
      </div>

      {error && (
        <span className="text-xs block" style={{ color: '#E07A5F' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// Helper to determine if a color is light (for contrast)
function isLightColor(hex: string): boolean {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

export default ColorPicker;
