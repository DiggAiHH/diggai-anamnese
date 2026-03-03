import type { Option } from '../../types/question';

interface RadioInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
}

export const RadioInput: React.FC<RadioInputProps> = ({ value, onChange, options, className = '' }) => {
    return (
        <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`option-card flex-1 min-w-[140px] text-left ${value === option.value ? 'option-card-selected' : ''
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${value === option.value
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                            {value === option.value && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                        </div>
                        <span className="text-sm font-medium">{option.label}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};
