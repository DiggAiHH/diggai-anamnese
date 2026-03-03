import { VoiceInputButton } from './VoiceInput';
import { isSpeechSupported } from '../../utils/speechSupport';
import { useCallback } from 'react';

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'email' | 'tel';
    className?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder, type = 'text', className = '' }) => {
    const handleVoiceTranscript = useCallback((text: string) => {
        onChange(value ? `${value} ${text}` : text);
    }, [value, onChange]);

    return (
        <div className="relative flex items-center gap-2">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`input-base ${className} ${isSpeechSupported() ? 'pr-12' : ''}`}
                autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'name'}
            />
            {type === 'text' && (
                <VoiceInputButton
                    onTranscript={handleVoiceTranscript}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                />
            )}
        </div>
    );
};
