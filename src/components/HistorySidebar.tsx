import React from 'react';
import { CheckCircle2, ChevronRight, History, Edit3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import type { Question, Answer } from '../types/question';

interface HistorySidebarProps {
    questions: Question[];
    answers: Record<string, Answer>;
    activePathIds: string[];
    currentQuestionId: string | null;
    onJumpToQuestion: (questionId: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    questions,
    answers,
    activePathIds,
    currentQuestionId,
    onJumpToQuestion,
    isOpen,
    onToggle
}) => {
    const { t } = useTranslation();
    const answeredCount = activePathIds.filter(id => answers[id]).length;
    const progress = Math.round((answeredCount / Math.max(activePathIds.length, 1)) * 100);

    const formatValue = (value: unknown): string => {
        if (value === undefined || value === null || value === '') return '-';
        if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-';
        if (value instanceof Date) return value.toLocaleDateString('de-DE');
        const str = String(value);
        return str.length > 25 ? str.substring(0, 22) + '...' : str;
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out transform w-80
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:w-72 xl:w-80 ${isOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full lg:hidden'} h-full flex flex-col`}
        >
            {/* Glass Background */}
            <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-xl border-r border-[var(--border-primary)]" />

            {/* Sidebar Content */}
            <div className="relative h-full flex flex-col">
                <div className="p-6 pb-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <History className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{t('Verlauf', 'Verlauf')}</h2>
                        </div>
                        <button
                            onClick={onToggle}
                            aria-label={t('Toggle sidebar')}
                            aria-expanded={isOpen}
                            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                        >
                            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Simple Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{t('Fortschritt', 'Fortschritt')}</span>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--bg-input)] rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('Fortschritt', 'Fortschritt')}>
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Answer List */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 custom-scrollbar">
                    {activePathIds.map((id, index) => {
                        const question = questions.find(q => q.id === id);
                        const answer = answers[id];
                        const isActive = currentQuestionId === id;
                        const isAnswered = !!answer;

                        if (!question) return null;

                        return (
                            <button
                                key={id}
                                onClick={() => onJumpToQuestion(id)}
                                disabled={!isAnswered && !isActive}
                                className={`w-full group text-left p-3 rounded-xl transition-all duration-300 border
                                    ${isActive
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : isAnswered
                                            ? 'bg-[var(--bg-card)] border-[var(--border-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)]'
                                            : 'opacity-40 border-transparent'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-colors
                                        ${isActive
                                            ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                                            : isAnswered
                                                ? 'bg-green-500/20 border-green-500/40'
                                                : 'border-white/10'
                                        }`}
                                    >
                                        {isAnswered ? (
                                            <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-green-400'}`} />
                                        ) : (
                                            <span className="text-[10px] font-bold text-white/40">{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate mb-0.5 transition-colors
                                            ${isActive ? 'text-blue-400' : 'text-gray-400'}`}
                                        >
                                            {question.question}
                                        </p>
                                        {isAnswered && (
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                                                    {formatValue(answer.value)}
                                                </p>
                                                <Edit3 className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Info */}
                <div className="p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-4">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{t('security', 'Sicherheit')}</p>
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[11px]">{t('encryptionActive', 'Verschlüsselte Übertragung aktiv')}</span>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[var(--border-primary)]/50 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <NavLink to="/impressum" className="hover:text-blue-400 transition-colors">{t('landing.impressum', 'Impressum')}</NavLink>
                        <NavLink to="/datenschutz" className="hover:text-blue-400 transition-colors">{t('landing.datenschutz', 'Datenschutz')}</NavLink>
                    </div>
                </div>
            </div>
        </aside>
    );
};
