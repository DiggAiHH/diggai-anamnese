/**
 * Select — Premium Custom Dropdown
 *
 * Consistent design language matching Input.tsx:
 *  - rounded-xl border, CSS theme variables, framer-motion open/close
 *  - Keyboard navigation (arrow keys, enter, escape, home/end)
 *  - WCAG 2.1 accessible (role="combobox", aria-expanded, aria-activedescendant)
 *  - Touch-friendly hit targets (min 44px)
 *  - RTL-aware (Arabic / Farsi)
 */

import {
    useState,
    useRef,
    useId,
    useEffect,
    useCallback,
    forwardRef,
    type KeyboardEvent,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps {
    /** Currently selected value */
    value?: string;
    /** Called when the user selects an option */
    onChange: (value: string) => void;
    /** Option list */
    options: SelectOption[];
    /** Placeholder shown when no value is selected */
    placeholder?: string;
    /** Label rendered above the control */
    label?: string;
    /** Error message — turns the control red */
    error?: string | null;
    /** Helper text below the control */
    helperText?: string;
    /** Whether the control is disabled */
    disabled?: boolean;
    /** Extra classes forwarded to the wrapper div */
    className?: string;
    /** aria-label fallback if no label is provided */
    'aria-label'?: string;
    /** HTML id (auto-generated if omitted) */
    id?: string;
}

const dropdownVariants: Variants = {
    hidden: { opacity: 0, y: -6, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
    exit: {
        opacity: 0,
        y: -4,
        scale: 0.98,
        transition: { duration: 0.1, ease: 'easeIn' },
    },
};

const errorVariants: Variants = {
    hidden: { opacity: 0, y: -4 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const Select = forwardRef<HTMLDivElement, SelectProps>(
    (
        {
            value,
            onChange,
            options,
            placeholder = 'Bitte wählen…',
            label,
            error,
            helperText,
            disabled = false,
            className = '',
            'aria-label': ariaLabel,
            id: externalId,
        },
        ref,
    ) => {
        const autoId = useId();
        const id = externalId ?? `select-${autoId}`;
        const listboxId = `${id}-listbox`;

        const [isOpen, setIsOpen] = useState(false);
        const [focusedIndex, setFocusedIndex] = useState<number>(-1);

        const wrapperRef = useRef<HTMLDivElement>(null);
        const triggerRef = useRef<HTMLButtonElement>(null);
        const listRef = useRef<HTMLUListElement>(null);

        const selectedOption = options.find((o) => o.value === value);

        const enabledOptions = options.filter((o) => !o.disabled);

        // ── Close on outside click ────────────────────────────
        useEffect(() => {
            if (!isOpen) return;
            const handler = (e: MouseEvent) => {
                if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handler);
            return () => document.removeEventListener('mousedown', handler);
        }, [isOpen]);

        // ── Scroll focused item into view ─────────────────────
        useEffect(() => {
            if (!isOpen || focusedIndex < 0 || !listRef.current) return;
            const items = listRef.current.querySelectorAll<HTMLLIElement>('[role="option"]');
            items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
        }, [focusedIndex, isOpen]);

        // ── Handlers ──────────────────────────────────────────
        const handleToggle = useCallback(() => {
            if (disabled) return;
            setIsOpen((prev) => {
                if (!prev) {
                    const current = options.findIndex((o) => o.value === value);
                    setFocusedIndex(current >= 0 ? current : 0);
                }
                return !prev;
            });
        }, [disabled, options, value]);

        const handleSelect = useCallback(
            (optionValue: string) => {
                onChange(optionValue);
                setIsOpen(false);
                triggerRef.current?.focus();
            },
            [onChange],
        );

        const handleKeyDown = useCallback(
            (e: KeyboardEvent<HTMLButtonElement>) => {
                if (disabled) return;
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        if (isOpen && focusedIndex >= 0) {
                            const opt = enabledOptions[focusedIndex];
                            if (opt) handleSelect(opt.value);
                        } else {
                            setIsOpen(true);
                            const current = enabledOptions.findIndex((o) => o.value === value);
                            setFocusedIndex(current >= 0 ? current : 0);
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        setIsOpen(false);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        if (!isOpen) {
                            setIsOpen(true);
                            setFocusedIndex(0);
                        } else {
                            setFocusedIndex((i) => Math.min(i + 1, enabledOptions.length - 1));
                        }
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        if (!isOpen) {
                            setIsOpen(true);
                            setFocusedIndex(enabledOptions.length - 1);
                        } else {
                            setFocusedIndex((i) => Math.max(i - 1, 0));
                        }
                        break;
                    case 'Home':
                        e.preventDefault();
                        setFocusedIndex(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        setFocusedIndex(enabledOptions.length - 1);
                        break;
                    case 'Tab':
                        setIsOpen(false);
                        break;
                }
            },
            [disabled, isOpen, focusedIndex, enabledOptions, value, handleSelect],
        );

        // ── Border colour logic ───────────────────────────────
        const borderClass = error
            ? 'border-[#E07A5F] focus-visible:shadow-[0_0_0_4px_rgba(224,122,95,0.15)]'
            : isOpen
            ? 'border-[#4A90E2] shadow-[0_0_0_4px_rgba(74,144,226,0.12)]'
            : 'border-[var(--border-primary)] hover:border-[var(--border-hover)]';

        const activeFocusedValue = isOpen && focusedIndex >= 0
            ? enabledOptions[focusedIndex]?.value
            : undefined;

        return (
            <div ref={wrapperRef} className={`relative space-y-2 ${className}`}>
                {/* Label */}
                {label && (
                    <label
                        id={`${id}-label`}
                        htmlFor={id}
                        className="block text-sm font-medium transition-colors duration-200"
                        style={{ color: error ? '#C75A3E' : 'var(--text-secondary)' }}
                    >
                        {label}
                    </label>
                )}

                {/* Trigger button */}
                <div ref={ref} className="relative">
                    <button
                        ref={triggerRef}
                        id={id}
                        type="button"
                        role="combobox"
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        aria-controls={listboxId}
                        aria-labelledby={label ? `${id}-label` : undefined}
                        aria-label={!label ? (ariaLabel ?? placeholder) : undefined}
                        aria-activedescendant={
                            activeFocusedValue ? `${listboxId}-${activeFocusedValue}` : undefined
                        }
                        aria-invalid={error ? 'true' : 'false'}
                        disabled={disabled}
                        onClick={handleToggle}
                        onKeyDown={handleKeyDown}
                        className={`
                            w-full h-14 px-4 text-base text-left
                            bg-[var(--bg-input)]
                            border-2 ${borderClass}
                            rounded-xl
                            outline-none
                            transition-all duration-200 ease-out
                            flex items-center justify-between gap-2
                            disabled:opacity-50 disabled:cursor-not-allowed
                            cursor-pointer
                        `.trim()}
                    >
                        <span
                            className={
                                selectedOption
                                    ? 'text-[var(--text-primary)]'
                                    : 'text-[var(--text-muted)] opacity-70'
                            }
                        >
                            {selectedOption?.label ?? placeholder}
                        </span>

                        <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="shrink-0 text-[var(--text-muted)]"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </motion.span>
                    </button>

                    {/* Error indicator dot */}
                    {error && (
                        <span
                            className="absolute right-10 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#E07A5F]"
                            aria-hidden="true"
                        />
                    )}
                </div>

                {/* Dropdown listbox */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.ul
                            ref={listRef}
                            id={listboxId}
                            role="listbox"
                            aria-labelledby={label ? `${id}-label` : undefined}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={dropdownVariants}
                            className="
                                absolute left-0 right-0 z-50
                                mt-1
                                max-h-60 overflow-y-auto
                                bg-[var(--bg-card)]
                                border border-[var(--border-primary)]
                                rounded-xl
                                shadow-lg shadow-black/10
                                py-1
                                outline-none
                            "
                        >
                            {options.map((option, idx) => {
                                const isFocused = enabledOptions[focusedIndex]?.value === option.value;
                                const isSelected = option.value === value;

                                return (
                                    <li
                                        key={option.value}
                                        id={`${listboxId}-${option.value}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        aria-disabled={option.disabled}
                                        data-index={idx}
                                        onMouseDown={(e) => {
                                            e.preventDefault(); // prevent blur before select
                                            if (!option.disabled) handleSelect(option.value);
                                        }}
                                        onMouseEnter={() => {
                                            const enabledIdx = enabledOptions.findIndex(
                                                (o) => o.value === option.value,
                                            );
                                            if (enabledIdx >= 0) setFocusedIndex(enabledIdx);
                                        }}
                                        className={`
                                            flex items-center gap-3
                                            px-4 py-3
                                            text-sm
                                            cursor-pointer
                                            select-none
                                            transition-colors duration-100
                                            ${option.disabled
                                                ? 'opacity-40 cursor-not-allowed'
                                                : isFocused || isSelected
                                                ? 'bg-[var(--bg-input)] text-[var(--text-primary)]'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]'
                                            }
                                        `.trim()}
                                    >
                                        {/* Selection indicator */}
                                        <span
                                            className={`w-4 h-4 rounded-full shrink-0 transition-all duration-150 flex items-center justify-center ${
                                                isSelected
                                                    ? 'bg-[#4A90E2] border-2 border-[#4A90E2]'
                                                    : 'border-2 border-[var(--border-primary)]'
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                                            )}
                                        </span>

                                        {option.label}
                                    </li>
                                );
                            })}
                        </motion.ul>
                    )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.p
                            key="error"
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={errorVariants}
                            className="text-sm text-[#C75A3E] flex items-center gap-1.5"
                            role="alert"
                        >
                            <span className="inline-block w-1 h-1 rounded-full bg-[#E07A5F]" />
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Helper text */}
                {helperText && !error && (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {helperText}
                    </p>
                )}
            </div>
        );
    },
);

Select.displayName = 'Select';
