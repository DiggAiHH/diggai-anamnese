import React, { memo, useCallback, useState } from 'react';
import type { Option } from '../../types/question';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface MultiSelectInputProps {
    values: string[];
    onChange: (values: string[]) => void;
    options: Option[];
    className?: string;
    maxVisibleOptions?: number;  // Phase 3: Miller's Law - limit visible options
}

/**
 * MultiSelectInput Component - Phase 3: Layout & Whitespace
 * 
 * Psychology-Based Design:
 * - 48px minimum touch targets (WCAG 2.5.5)
 * - 20px border radius for friendly, approachable UI
 * - Miller's Law: Max 7±2 options, max 4 for stressed users
 * - Clear visual feedback with checkmarks
 * - Adequate spacing (16px gap) for reduced cognitive load
 * 
 * @param maxVisibleOptions - Maximum number of options to show (default: 7, simpleMode: 4)
 */
export const MultiSelectInput: React.FC<MultiSelectInputProps> = memo(function MultiSelectInput({
    values,
    onChange,
    options,
    className = '',
    maxVisibleOptions = 7  // Default to Miller's Law max (7)
}) {
    const [showAll, setShowAll] = useState(false);

    const visibleOptions = showAll ? options : options.slice(0, maxVisibleOptions);
    const hiddenCount = options.length - maxVisibleOptions;

    // Memoized toggle handler to prevent recreating function on each render
    const toggleOption = useCallback((optionValue: string) => {
        const newValues = values.includes(optionValue)
            ? values.filter((v) => v !== optionValue)
            : [...values, optionValue];
        onChange(newValues);
    }, [values, onChange]);

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleOption(option.value)}
                        className={`
                            option-card w-full text-left transition-all duration-200
                            min-h-[48px] p-4 rounded-[16px]
                            ${values.includes(option.value)
                                ? 'option-card-selected bg-blue-500/10 border-blue-500/50'
                                : 'bg-[var(--bg-input)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                            }
                            border-2
                        `}
                    >
                        <div className="flex items-center gap-3">
                            {/* Checkbox Indicator */}
                            <div
                                className={`
                                    w-5 h-5 rounded flex items-center justify-center transition-all border-2 shrink-0
                                    ${values.includes(option.value)
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300'
                                    }
                                `}
                            >
                                {values.includes(option.value) && (
                                    <Check className="w-3.5 h-3.5 text-white" />
                                )}
                            </div>

                            {/* Label */}
                            <span className="text-sm font-medium">{option.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Expand / collapse button — clickable, not just a label */}
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setShowAll(prev => !prev)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-sm text-[var(--text-secondary)] font-medium transition-all duration-200"
                    aria-expanded={showAll}
                >
                    {showAll ? (
                        <>
                            <ChevronUp className="w-4 h-4" aria-hidden="true" />
                            Weniger anzeigen
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            +{hiddenCount} weitere anzeigen
                        </>
                    )}
                </button>
            )}

            {/* Selected count indicator for accessibility */}
            {values.length > 0 && (
                <div className="text-xs text-blue-400 font-medium">
                    {values.length} {values.length === 1 ? 'Option ausgewählt' : 'Optionen ausgewählt'}
                </div>
            )}
        </div>
    );
});

// Named export for backward compatibility
export default MultiSelectInput;
