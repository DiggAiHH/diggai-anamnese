import React, { memo, useCallback } from 'react';
import { VoiceInputButton } from './VoiceInput';

interface TextAreaInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
}

/**
 * TextAreaInput Component - Optimized with React.memo and useCallback
 * 
 * A textarea component with optional voice input support.
 * Memoized to prevent unnecessary re-renders.
 */
export const TextAreaInput: React.FC<TextAreaInputProps> = memo(function TextAreaInput({
    value,
    onChange,
    placeholder,
    className = '',
    rows = 4,
}) {
    // Memoized handlers
    const handleVoiceTranscript = useCallback((text: string) => {
        onChange(value ? `${value} ${text}` : text);
    }, [value, onChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <div className="relative">
            <textarea
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                rows={rows}
                className={`input-base resize-y min-h-[100px] ${className}`}
            />
            <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                className="absolute right-2 top-2"
            />
        </div>
    );
});

// Named export for backward compatibility
export default TextAreaInput;
