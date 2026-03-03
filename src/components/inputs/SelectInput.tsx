import type { Option } from '../../types/question';
import { useTranslation } from 'react-i18next';

interface SelectInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
    label?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({ value, onChange, options, className = '', label }) => {
    const { t } = useTranslation();
    return (
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
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
};
