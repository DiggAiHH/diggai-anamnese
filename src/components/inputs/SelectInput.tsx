import { memo } from 'react';
import type { Option } from '../../types/question';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';

interface SelectInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
    label?: string;
}

/**
 * SelectInput Component — Questionnaire single-select wrapper.
 * Delegates to the premium <Select> from the UI library.
 */
export const SelectInput = memo(function SelectInput({
    value,
    onChange,
    options,
    className = '',
    label
}: SelectInputProps) {
    const { t } = useTranslation();

    return (
        <Select
            value={value ?? ''}
            onChange={onChange}
            options={options}
            placeholder={t('select.placeholder', 'Bitte wählen…')}
            label={label}
            aria-label={label ?? t('select.default', 'Auswahl')}
            className={className}
        />
    );
});

// Named export for backward compatibility
export default SelectInput;
