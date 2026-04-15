import type { Question } from '../types/question';
import { TextInput } from './inputs/TextInput';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { MultiSelectInput } from './inputs/MultiSelectInput';
import { RadioInput } from './inputs/RadioInput';
import { DateInput } from './inputs/DateInput';
import { TextAreaInput } from './inputs/TextAreaInput';
import { FileInput } from './inputs/FileInput';
import { BgAccidentForm } from './inputs/BgAccidentForm';

/**
 * QuestionRenderer - Phase 3: Layout & Whitespace
 * 
 * Supports Progressive Disclosure via simpleMode:
 * - Simple Mode: Single question per screen, larger inputs, more whitespace
 * - Normal Mode: Standard density for regular users
 * 
 * Psychology-Based Design:
 * - 48px minimum touch targets (WCAG 2.5.5)
 * - 20px border radius for friendly UI
 * - Adequate spacing to reduce cognitive load
 */
interface QuestionRendererProps {
    question: Question;
    value: unknown;
    onAnswer: (value: unknown) => void;
    error?: string | null;
    simpleMode?: boolean;  // Phase 3: Progressive disclosure
}

const formatValue = (value: unknown): string => {
    if (value === undefined || value === null || value === '') return '-';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
};

import { AlertCircle, Lock, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import React, { useState, useCallback, useMemo } from 'react';

export const QuestionRenderer = React.memo(function QuestionRenderer({ question, value, onAnswer, error, simpleMode = false }: QuestionRendererProps) {
    const { t } = useTranslation();
    const [showHelp, setShowHelp] = useState(false);
    const [showWhy, setShowWhy] = useState(false);
    const toggleHelp = useCallback(() => setShowHelp(prev => !prev), []);
    const toggleWhy = useCallback(() => setShowWhy(prev => !prev), []);

    const translatedOptions = useMemo(() => question.options?.map(opt => ({
        ...opt,
        label: t(opt.label)
    })) || [], [question.options, t]);

    const renderInput = () => {
        const errorClass = error ? 'input-error' : '';
        const placeholder = question.placeholder ? t(question.placeholder) : undefined;

        // Simple Mode: Pass simpleMode prop to inputs for enhanced spacing
        const inputProps = simpleMode ? { simpleMode: true } : {};

        switch (question.type) {
            case 'text':
            case 'email':
            case 'tel':
                return (
                    <TextInput
                        value={(value as string) || ''}
                        onChange={onAnswer}
                        placeholder={placeholder}
                        type={question.type}
                        className={errorClass}
                    />
                );

            case 'number':
                return (
                    <NumberInput
                        value={value as number | undefined}
                        onChange={onAnswer}
                        min={question.validation?.min}
                        max={question.validation?.max}
                        placeholder={placeholder}
                        className={errorClass}
                    />
                );

            case 'select':
                return (
                    <SelectInput
                        options={translatedOptions}
                        value={value as string | undefined}
                        onChange={onAnswer}
                        className={errorClass}
                    />
                );

            case 'multiselect':
                return (
                    <MultiSelectInput
                        options={translatedOptions}
                        values={(value as string[]) || []}
                        onChange={onAnswer}
                        className={errorClass}
                        maxVisibleOptions={simpleMode ? 4 : 7}  /* Miller's Law: Max 4 for stressed users */
                    />
                );

            case 'radio':
                return (
                    <RadioInput
                        options={translatedOptions}
                        value={value as string | undefined}
                        onChange={onAnswer}
                        className={errorClass}
                        simpleMode={simpleMode}
                    />
                );

            case 'date':
                return (
                    <DateInput
                        value={value as string | undefined}
                        onChange={onAnswer}
                        className={errorClass}
                    />
                );

            case 'file':
                return (
                    <FileInput
                        value={value as string | undefined}
                        onChange={onAnswer}
                        className={errorClass}
                    />
                );

            case 'textarea':
                return (
                    <TextAreaInput
                        value={(value as string) || ''}
                        onChange={onAnswer}
                        placeholder={placeholder}
                        className={errorClass}
                        rows={simpleMode ? 4 : 3}  /* More space in simple mode */
                    />
                );

            case 'bg-form':
                return (
                    <BgAccidentForm
                        value={value as any}
                        onChange={onAnswer}
                        className={errorClass}
                    />
                );

            default:
                return <div className="text-red-500">{t('validation.unknownType', { type: question.type, defaultValue: 'Unbekannter Frage-Typ: {{type}}' })}</div>;
        }
    };

    // Simple Mode: Don't show title here (shown in parent), focus on input only
    if (simpleMode) {
        return (
            <div className={`animate-fade-in ${error ? 'border-red-500/50' : ''}`}>
                <div>
                    {question.logic?.computed ? (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-[20px] p-8 text-center animate-fade-in shadow-inner shadow-blue-500/5">
                            <span className="text-4xl font-bold text-blue-400 tracking-tight">
                                {formatValue(value)}
                            </span>
                            {question.placeholder && (
                                <span className="text-sm text-gray-400 ml-2">{t(question.placeholder)}</span>
                            )}
                        </div>
                    ) : (
                        renderInput()
                    )}
                </div>

                {/* Trust Signals: helpText + whyWeAsk + sensitive badge */}
                <TrustSignals
                    question={question}
                    showHelp={showHelp}
                    showWhy={showWhy}
                    toggleHelp={toggleHelp}
                    toggleWhy={toggleWhy}
                    t={t}
                />

                {error && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-[16px] flex items-center gap-3 text-red-400 text-sm animate-fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    // Normal Mode: Standard layout with title
    return (
        <div className={`question-container animate-fade-in ${error ? 'border-red-500/50' : ''}`}>
            <div className="mb-6">
                <h2 className="question-title">
                    {question.sensitive && (
                        <Lock className="w-4 h-4 inline-block mr-1.5 text-[#4A90E2] shrink-0" aria-hidden="true" />
                    )}
                    {t(question.question)}
                    {question.validation?.required && (
                        <span className="text-red-400 ml-1">*</span>
                    )}
                </h2>
                {question.description && (
                    <p className="question-description">{t(question.description)}</p>
                )}
            </div>

            <div>
                {question.logic?.computed ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-[20px] p-6 text-center animate-fade-in shadow-inner shadow-blue-500/5">
                        <span className="text-3xl font-bold text-blue-400 tracking-tight">
                            {formatValue(value)}
                        </span>
                        {question.placeholder && (
                            <span className="text-sm text-gray-400 ml-2">{t(question.placeholder)}</span>
                        )}
                    </div>
                ) : (
                    renderInput()
                )}
            </div>

            {/* Trust Signals */}
            <TrustSignals
                question={question}
                showHelp={showHelp}
                showWhy={showWhy}
                toggleHelp={toggleHelp}
                toggleWhy={toggleWhy}
                t={t}
            />

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-[16px] flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
});

/**
 * TrustSignals — Inline transparency elements for medical questions
 *
 * Forschungsgrundlage:
 * - Transparency enhances trust (Joinson et al. 2010): Explaining "why we ask" raises form completion 11%
 * - Health Literacy: 47% of adults have limited health literacy (Berkman et al. 2011)
 * - Progressive Disclosure: Show medical explanations on demand, not by default
 */
interface TrustSignalsProps {
    question: Question;
    showHelp: boolean;
    showWhy: boolean;
    toggleHelp: () => void;
    toggleWhy: () => void;
    t: TFunction;
}

function TrustSignals({ question, showHelp, showWhy, toggleHelp, toggleWhy, t }: TrustSignalsProps) {
    const hasSignals = question.helpText || question.whyWeAsk || question.sensitive;
    if (!hasSignals) return null;

    return (
        <div className="mt-3 space-y-2">
            {/* Sensitive field badge */}
            {question.sensitive && (
                <div className="flex items-center gap-1.5 text-xs text-[#4A90E2]">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    <span>{t('trust.encrypted', 'Ihre Antwort wird verschlüsselt gespeichert')}</span>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                {/* Help text toggle */}
                {question.helpText && (
                    <button
                        type="button"
                        onClick={toggleHelp}
                        className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[#4A90E2] transition-colors"
                        aria-expanded={showHelp}
                    >
                        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t('trust.helpButton', 'Was bedeutet das?')}</span>
                        {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                )}

                {/* Why we ask toggle */}
                {question.whyWeAsk && (
                    <button
                        type="button"
                        onClick={toggleWhy}
                        className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[#4A90E2] transition-colors"
                        aria-expanded={showWhy}
                    >
                        <span>{t('trust.whyButton', 'Warum fragen wir das?')}</span>
                        {showWhy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {/* Expandable help text panel */}
            {showHelp && question.helpText && (
                <div className="p-3 bg-[rgba(74,144,226,0.08)] border border-[rgba(74,144,226,0.15)] rounded-xl text-xs text-[var(--text-secondary)] animate-fade-in">
                    {t(question.helpText)}
                </div>
            )}

            {/* Expandable why-we-ask panel */}
            {showWhy && question.whyWeAsk && (
                <div className="p-3 bg-[rgba(129,178,154,0.08)] border border-[rgba(129,178,154,0.15)] rounded-xl text-xs text-[var(--text-secondary)] animate-fade-in">
                    {t(question.whyWeAsk)}
                </div>
            )}
        </div>
    );
}

export default QuestionRenderer;
