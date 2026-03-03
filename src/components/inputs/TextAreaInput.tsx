import { VoiceInputButton } from './VoiceInput';
import { useCallback } from 'react';

interface TextAreaInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const TextAreaInput: React.FC<TextAreaInputProps> = ({ value, onChange, placeholder, className = '' }) => {
    const handleVoiceTranscript = useCallback((text: string) => {
        onChange(value ? `${value} ${text}` : text);
    }, [value, onChange]);

    return (
        <div className="relative">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className={`input-base resize-y min-h-[100px] ${className}`}
            />
            <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                className="absolute right-2 top-2"
            />
        </div>
    );
};
