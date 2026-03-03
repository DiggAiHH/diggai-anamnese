import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Baby, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SchwangerschaftCheckProps {
    onAnswer: (value: string) => void;
    initialValue?: string;
}

/**
 * Schwangerschafts-Check
 * Wird automatisch eingefügt wenn gender === 'W' && Alter 15-50
 */
export const SchwangerschaftCheck: React.FC<SchwangerschaftCheckProps> = ({ onAnswer, initialValue }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string>(initialValue || '');

    const options = [
        { value: 'ja', label: t('Ja, möglicherweise'), icon: Baby, color: 'text-pink-400 bg-pink-500/20' },
        { value: 'nein', label: t('Nein'), icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/20' },
        { value: 'weiss_nicht', label: t('Weiß nicht'), icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/20' },
    ];

    const handleSelect = (value: string) => {
        setSelected(value);
        onAnswer(value);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <Baby className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">{t('Schwangerschafts-Abfrage')}</h3>
                    <p className="text-sm text-white/50">{t('schwangerschaftRelevant', 'Diese Information ist medizinisch relevant')}</p>
                </div>
            </div>

            {/* Hinweis */}
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
                <p className="text-sm text-pink-200/80 leading-relaxed">
                    {t('schwangerschaftHinweis', 'Bestimmte Medikamente und Untersuchungen können in der Schwangerschaft kontraindiziert sein. Bitte beantworten Sie die Frage ehrlich – Ihre Angabe wird vertraulich behandelt.')}
                </p>
            </div>

            {/* Optionen */}
            <div className="space-y-3">
                {options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selected === opt.value;

                    return (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${isSelected
                                    ? 'border-pink-500/50 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${opt.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                {opt.label}
                            </span>
                            <div className="ml-auto">
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${isSelected
                                        ? 'border-pink-400 bg-pink-400'
                                        : 'border-white/20'
                                    }`}>
                                    {isSelected && (
                                        <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Warnung bei "Ja" oder "Weiß nicht" */}
            {(selected === 'ja' || selected === 'weiss_nicht') && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-yellow-300">{t('Wichtiger Hinweis')}</p>
                            <p className="text-sm text-yellow-200/80 mt-1">
                                {selected === 'ja'
                                    ? t('schwangerschaftJa', 'Bitte informieren Sie Ihren Arzt VOR einer Untersuchung oder Medikamentenverordnung über die mögliche Schwangerschaft.')
                                    : t('schwangerschaftWeissNicht', 'Es wird empfohlen, vor bestimmten Untersuchungen oder Medikamenten einen Schwangerschaftstest durchzuführen.')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
