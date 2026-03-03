import { useTranslation } from 'react-i18next';

interface DateInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, className = '' }) => {
    const { t } = useTranslation();
    return (
        <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`input-base ${className}`}
            aria-label={t('date.label', 'Datum')}
            title={t('date.enterDate', 'Datum eingeben')}
        />
    );
};
