import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface DateInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    className?: string;
}

/**
 * DateInput Component - Optimized with React.memo and useCallback
 * 
 * A date input component with i18n support.
 * Memoized to prevent unnecessary re-renders.
 */
export const DateInput: React.FC<DateInputProps> = memo(function DateInput({
    value,
    onChange,
    className = ''
}) {
    const { t } = useTranslation();

    // Memoized change handler
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <input
            type="date"
            value={value || ''}
            onChange={handleChange}
            className={`input-base ${className}`}
            aria-label={t('date.label', 'Datum')}
            title={t('date.enterDate', 'Datum eingeben')}
        />
    );
});

// Named export for backward compatibility
export default DateInput;
