import React from 'react';
import { Edit3, User, Activity, ShieldAlert, Pill, FileText, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Question, Answer } from '../types/question';

interface AnswerSummaryProps {
    questions: Question[];
    answers: Record<string, Answer>;
    activePathIds: string[];
    onEdit: (questionId: string) => void;
    colorClass: string;
    bgClass: string;
    borderClass: string;
}

interface SummaryGroup {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    questionIds: string[];
}

export const AnswerSummary: React.FC<AnswerSummaryProps> = ({
    questions,
    answers,
    activePathIds,
    onEdit,
    colorClass,
}) => {
    const { t } = useTranslation();
    // Define clinical groupings
    const groups: SummaryGroup[] = [
        {
            title: t('Personalien & Kontakt'),
            icon: User,
            color: 'text-blue-400',
            questionIds: ['0000', '0001', '0011', '0002', '0003', '2000', '2001', '3000', '3001', '3002', '3002a', '3003', '3004', '3005', '9010', '9011']
        },
        {
            title: t('Aktuelles Anliegen'),
            icon: Activity,
            color: 'text-rose-400',
            questionIds: ['1000', '1001', '1002', '1003', 'RES-100', 'RES-101', 'RES-102', 'RES-103', 'AU-100', 'AU-101', 'AU-102', 'AU-103']
        },
        {
            title: t('Medizinische Vorgeschichte'),
            icon: ShieldAlert,
            color: 'text-orange-400',
            questionIds: ['4000', '4100', '4100-FT', '4110', '4110-FT', '4120', '4121', '4122', '4130', '4131', '8000', '8000-FT', '8800', '8900']
        },
        {
            title: t('Risikofaktoren & Chronik'),
            icon: Pill,
            color: 'text-emerald-400',
            questionIds: ['5000', '5001', '5002', '5002-FT', '5003', '7000', '7001', '7001-FT', '7002', '7002-FT']
        },
        {
            title: t('Allergien & Implantate'),
            icon: FileText,
            color: 'text-indigo-400',
            questionIds: ['6000', '6001', '6001-FT', '6002', '6003', '6003-FT', '6004', '6005', '6006', '6007', '6007-FT']
        }
    ];

    const formatValue = (value: unknown): string => {
        if (value === undefined || value === null || value === '') return '-';
        if (Array.isArray(value)) return value.join(', ');
        if (value instanceof Date) return value.toLocaleDateString('de-DE');
        return String(value);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8 print:space-y-4 print:text-black">
            {/* Header for Print */}
            <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-tight">{t('Medizinische Anamnese - Zusammenfassung')}</h1>
                <p className="text-sm text-gray-600">{t('summary.createdAt', 'Erstellt am')}: {new Date().toLocaleString('de-DE')}</p>
            </div>

            <div className="flex items-center justify-between mb-2 print:hidden">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${colorClass}`} />
                    {t('Ihre Angaben im Überblick')}
                </h3>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-sm"
                >
                    <Printer className="w-4 h-4" />
                    {t('Drucken / PDF')}
                </button>
            </div>

            <div className="space-y-6">
                {groups.map((group) => {
                    const groupQuestions = group.questionIds.filter(id => activePathIds.includes(id));
                    if (groupQuestions.length === 0) return null;

                    return (
                        <div key={group.title} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] overflow-hidden print:border-black print:bg-transparent">
                            <div className="px-5 py-3 bg-[var(--bg-card-hover)] border-b border-[var(--border-primary)] flex items-center gap-3 print:bg-gray-100 print:text-black print:border-black">
                                <group.icon className={`w-4 h-4 ${group.color} print:text-black`} />
                                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] print:text-black">
                                    {group.title}
                                </h4>
                            </div>
                            <div className="divide-y divide-[var(--border-primary)] print:divide-black">
                                {groupQuestions.map((id) => {
                                    const question = questions.find(q => q.id === id);
                                    const answer = answers[id];
                                    if (!question || !answer) return null;

                                    return (
                                        <div
                                            key={id}
                                            className="group px-6 py-4 flex items-center justify-between gap-4 hover:bg-[var(--bg-card-hover)] transition-colors print:py-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-500 mb-0.5 print:text-gray-700">
                                                    {question.question}
                                                </p>
                                                <p className="text-sm text-[var(--text-primary)] font-medium print:text-black">
                                                    {formatValue(answer.value)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => onEdit(id)}
                                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all print:hidden"
                                                title={t('Bearbeiten')}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer for Print */}
            <div className="hidden print:block pt-12 text-center text-xs text-gray-500">
                <p>{t('summaryPrintFooter', 'Diese Zusammenfassung wurde digital durch den Patienten erstellt.')}</p>
                <div className="mt-8 flex justify-around">
                    <div className="w-48 border-t border-black pt-2">{t('Patient Unterschrift')}</div>
                    <div className="w-48 border-t border-black pt-2">{t('Arzt Unterschrift / Datum')}</div>
                </div>
            </div>
        </div>
    );
};
