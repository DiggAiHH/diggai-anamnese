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

interface QuestionRendererProps {
    question: Question;
    value: unknown;
    onAnswer: (value: unknown) => void;
    error?: string | null;
}

const formatValue = (value: unknown): string => {
    if (value === undefined || value === null || value === '') return '-';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
};

import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function QuestionRenderer({ question, value, onAnswer, error }: QuestionRendererProps) {
    const { t } = useTranslation();

    const translatedOptions = question.options?.map(opt => ({
        ...opt,
        label: t(opt.label)
    })) || [];

    const renderInput = () => {
        const errorClass = error ? 'input-error' : '';
        const placeholder = question.placeholder ? t(question.placeholder) : undefined;

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
                    />
                );

            case 'radio':
                return (
                    <RadioInput
                        options={translatedOptions}
                        value={value as string | undefined}
                        onChange={onAnswer}
                        className={errorClass}
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

    return (
        <div className={`question-container animate-fade-in ${error ? 'border-red-500/50' : ''}`}>
            <div className="mb-6">
                <h2 className="question-title">
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
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center animate-fade-in shadow-inner shadow-blue-500/5">
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

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
