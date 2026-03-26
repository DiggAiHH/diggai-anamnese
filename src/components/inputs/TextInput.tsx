import React, { memo, useCallback } from 'react';
import { VoiceInputButton } from './VoiceInput';
import { isSpeechSupported } from '../../utils/speechSupport';

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'email' | 'tel';
    className?: string;
}

/**
 * TextInput Component - Optimized with React.memo and useCallback
 * 
 * A text input component with optional voice input support.
 * Memoized to prevent unnecessary re-renders.
 */
export const TextInput: React.FC<TextInputProps> = memo(function TextInput({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = ''
}) {
    // Memoized voice transcript handler
    const handleVoiceTranscript = useCallback((text: string) => {
        onChange(value ? `${value} ${text}` : text);
    }, [value, onChange]);

    // Memoized change handler
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <div className="relative flex items-center gap-2">
            <input
                type={type}
                value={value}
                onChange={handleChange}
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
});

// Named export for backward compatibility
export default TextInput;
