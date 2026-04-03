import React, { useState, useRef, useCallback, useEffect } from 'react';

interface TOTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function TOTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  autoFocus = true,
}: TOTPInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ensure value is padded to length
  const paddedValue = value.padEnd(length, '').slice(0, length);
  const digits = paddedValue.split('');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback((index: number, inputValue: string) => {
    if (disabled) return;
    
    // Only allow digits
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    const newValue = value.slice(0, index) + digit + value.slice(index + 1);
    onChange(newValue);

    // Auto-focus next input
    if (index < length - 1 && digit) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Check if complete
    if (newValue.length === length && onComplete) {
      onComplete(newValue);
    }
  }, [value, onChange, onComplete, length, disabled]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        // Clear current
        const newValue = value.slice(0, index) + value.slice(index + 1);
        onChange(newValue);
      } else if (index > 0) {
        // Move to previous and clear it
        const newValue = value.slice(0, index - 1) + value.slice(index);
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  }, [value, onChange, length, disabled]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;

    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === length && onComplete) {
        onComplete(pasted);
      }
      // Focus appropriate input
      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      setFocusedIndex(focusIndex);
    }
  }, [onChange, onComplete, length, disabled]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2" role="group" aria-label="TOTP Code Eingabe">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i] || ''}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(i)}
            className={`
              w-12 h-14 text-center text-xl font-bold rounded-lg border-2
              transition-all duration-200
              ${error 
                ? 'border-red-500 bg-red-50 text-red-700' 
                : focusedIndex === i
                  ? 'border-blue-500 bg-white text-gray-900 ring-2 ring-blue-200'
                  : 'border-gray-300 bg-white text-gray-900'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
              focus:outline-none
            `}
            aria-label={`Digit ${i + 1}`}
            data-testid={`totp-input-${i}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
