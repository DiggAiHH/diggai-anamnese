import React, { memo, useCallback } from 'react';
import type { Option } from '../../types/question';
import { useTranslation } from 'react-i18next';

interface SelectInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
    label?: string;
}

/**
 * SelectInput Component - Optimized with React.memo and useCallback
 * 
 * A dropdown select component for single-select options.
 * Memoized to prevent unnecessary re-renders when parent updates.
 */
export const SelectInput: React.FC<SelectInputProps> = memo(function SelectInput({
    value,
    onChange,
    options,
    className = '',
    label
}) {
    const { t } = useTranslation();

    // Memoized change handler to prevent recreating function on each render
    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <select
            value={value || ''}
            onChange={handleChange}
            className={`input-base ${className}`}
            title={label || t('select.default', 'Auswahl')}
            aria-label={label || t('select.default', 'Auswahl')}
        >
            <option value="" disabled>{t('select.placeholder', 'Bitte wählen...')}</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
});

// Named export for backward compatibility
export default SelectInput;
