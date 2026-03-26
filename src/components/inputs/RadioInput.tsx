import React, { memo } from 'react';
import type { Option } from '../../types/question';

interface RadioInputProps {
    value: string | undefined;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
    simpleMode?: boolean;  // Phase 3: Progressive disclosure support
}

/**
 * RadioInput Component - Phase 3: Layout & Whitespace
 * 
 * Psychology-Based Design:
 * - 48px minimum touch targets (WCAG 2.5.5)
 * - 20px border radius for friendly, approachable UI
 * - Miller's Law: Max 3-4 options visible for stressed users (simpleMode)
 * - Adequate spacing (16px gap) for reduced cognitive load
 * 
 * Simple Mode Enhancements:
 * - Larger touch targets (min-h-[56px] instead of min-h-[48px])
 * - More vertical padding
 * - Larger radio indicators
 * - Single column layout for focus
 */
export const RadioInput: React.FC<RadioInputProps> = memo(function RadioInput({
    value,
    onChange,
    options,
    className = '',
    simpleMode = false
}) {
    // Miller's Law: Limit options in simple mode for stressed users
    const visibleOptions = simpleMode ? options.slice(0, 4) : options;

    return (
        <div 
            className={`
                flex flex-col 
                ${simpleMode 
                    ? 'gap-4'  /* More spacing in simple mode */
                    : 'gap-3 sm:grid sm:grid-cols-2'  /* Standard spacing, 2-column on larger screens */
                } 
                ${className}
            `}
        >
            {visibleOptions.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`
                        option-card text-left transition-all duration-200
                        ${simpleMode 
                            ? 'min-h-[56px] p-5 rounded-[20px]'  /* Larger touch target, more padding, 20px radius */
                            : 'min-h-[48px] p-4 rounded-[16px]'   /* Standard touch target, 16px radius */
                        }
                        ${value === option.value 
                            ? 'option-card-selected bg-blue-500/10 border-blue-500/50' 
                            : 'bg-[var(--bg-input)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                        }
                        border-2
                    `}
                >
                    <div className="flex items-center gap-4">
                        {/* Radio Indicator */}
                        <div 
                            className={`
                                rounded-full border-2 flex items-center justify-center transition-all shrink-0
                                ${simpleMode ? 'w-6 h-6' : 'w-5 h-5'}
                                ${value === option.value
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-300'
                                }
                            `}
                        >
                            {value === option.value && (
                                <div className={`${simpleMode ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-white`} />
                            )}
                        </div>
                        
                        {/* Label */}
                        <span className={`font-medium ${simpleMode ? 'text-base' : 'text-sm'}`}>
                            {option.label}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
});

// Named export for backward compatibility
export default RadioInput;
