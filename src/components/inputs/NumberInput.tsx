interface NumberInputProps {
    value: number | undefined;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    placeholder?: string;
    className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min, max, placeholder, className = '' }) => {
    return (
        <input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
                const num = parseFloat(e.target.value);
                if (!isNaN(num)) {
                    onChange(num);
                }
            }}
            min={min}
            max={max}
            placeholder={placeholder}
            className={`input-base ${className}`}
        />
    );
};
