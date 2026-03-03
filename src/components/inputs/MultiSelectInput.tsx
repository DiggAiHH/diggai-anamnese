import type { Option } from '../../types/question';
import { Check } from 'lucide-react';

interface MultiSelectInputProps {
    values: string[];
    onChange: (values: string[]) => void;
    options: Option[];
    className?: string;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({ values, onChange, options, className = '' }) => {
    const toggleOption = (optionValue: string) => {
        const newValues = values.includes(optionValue)
            ? values.filter((v) => v !== optionValue)
            : [...values, optionValue];
        onChange(newValues);
    };

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={`option-card w-full text-left ${values.includes(option.value) ? 'option-card-selected' : ''
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all border-2 ${values.includes(option.value)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                            {values.includes(option.value) && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-sm font-medium">{option.label}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};
