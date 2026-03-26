import React, { memo, useCallback } from 'react';

interface NumberInputProps {
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    placeholder?: string;
    className?: string;
}

/**
 * NumberInput Component - Optimized with React.memo and useCallback
 * 
 * A number input component with min/max validation.
 * Memoized to prevent unnecessary re-renders.
 */
export const NumberInput: React.FC<NumberInputProps> = memo(function NumberInput({
    value,
    onChange,
    min,
    max,
    placeholder,
    className = ''
}) {
    // Memoized change handler
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) {
            onChange(num);
        }
    }, [onChange]);

    return (
        <input
            type="number"
            value={value ?? ''}
            onChange={handleChange}
            min={min}
            max={max}
            placeholder={placeholder}
            className={`input-base ${className}`}
        />
    );
});

// Named export for backward compatibility
export default NumberInput;
