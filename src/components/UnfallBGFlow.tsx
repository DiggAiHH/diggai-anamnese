import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Building2, MapPin, Calendar, FileText, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

interface UnfallBGData {
    beruf: string;
    arbeitgeber: string;
    arbeitgeberAdresse: string;
    berufsgenossenschaft: string;
    unfalltag: string;
    unfallzeit: string;
    unfallart: string;
    unfallort: string;
    unfallhergang: string;
    verletzungsart: string;
    ersthelfer: string;
    erstversorgung: string;
}

interface UnfallBGFlowProps {
    onComplete: (data: UnfallBGData) => void;
    onBack: () => void;
}

const BG_OPTIONS = [
    { value: 'bg_bau', label: 'BG BAU – Berufsgenossenschaft der Bauwirtschaft' },
    { value: 'bg_etem', label: 'BG ETEM – Energie Textil Elektro Medienerzeugnisse' },
    { value: 'bg_holz', label: 'BGHM – Holz und Metall' },
    { value: 'bg_nahrung', label: 'BGN – Nahrungsmittel und Gastgewerbe' },
    { value: 'bg_handel', label: 'BGHW – Handel und Warenlogistik' },
    { value: 'bg_transport', label: 'BG Verkehr – Transport und Verkehrswirtschaft' },
    { value: 'bg_gesundheit', label: 'BGW – Gesundheitsdienst und Wohlfahrtspflege' },
    { value: 'bg_verwaltung', label: 'VBG – Verwaltungs-Berufsgenossenschaft' },
    { value: 'bg_rci', label: 'BG RCI – Rohstoffe und chemische Industrie' },
    { value: 'unbekannt', label: 'Unbekannt / Andere' },
];

const UNFALL_ART_OPTIONS = [
    { value: 'arbeitsunfall', label: 'Arbeitsunfall' },
    { value: 'wegeunfall', label: 'Wegeunfall' },
    { value: 'schulunfall', label: 'Schulunfall' },
    { value: 'sonstiges', label: 'Sonstiges' },
];

/**
 * Unfall/BG-Flow – Sequenzielle Abfrage aller erforderlichen BG-Daten
 * Wird eingebettet wenn Service = 'Unfallfolgen'
 */
export const UnfallBGFlow: React.FC<UnfallBGFlowProps> = ({ onComplete, onBack }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [data, setData] = useState<UnfallBGData>({
        beruf: '', arbeitgeber: '', arbeitgeberAdresse: '',
        berufsgenossenschaft: '', unfalltag: '', unfallzeit: '',
        unfallart: '', unfallort: '', unfallhergang: '',
        verletzungsart: '', ersthelfer: '', erstversorgung: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: keyof UnfallBGData, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    // Schritte definieren
    const steps = [
        {
            title: t('unfallbg.step1_title', 'Beruf & Arbeitgeber'),
            icon: Building2,
            fields: ['beruf', 'arbeitgeber', 'arbeitgeberAdresse'],
            validate: () => {
                const e: Record<string, string> = {};
                if (!data.beruf.trim()) e.beruf = t('unfallbg.error_beruf', 'Beruf ist ein Pflichtfeld');
                if (!data.arbeitgeber.trim()) e.arbeitgeber = t('unfallbg.error_arbeitgeber', 'Arbeitgeber ist ein Pflichtfeld');
                return e;
            },
            render: () => (
                <div className="space-y-4">
                    <InputField label={t('unfallbg.label_beruf', 'Welchen Beruf üben Sie aus? *')} value={data.beruf}
                        onChange={(v) => updateField('beruf', v)} placeholder={t('unfallbg.placeholder_beruf', 'z.B. Elektriker')} error={errors.beruf} />
                    <InputField label={t('unfallbg.label_arbeitgeber', 'Name des Arbeitgebers *')} value={data.arbeitgeber}
                        onChange={(v) => updateField('arbeitgeber', v)} placeholder={t('unfallbg.placeholder_arbeitgeber', 'Firma GmbH')} error={errors.arbeitgeber} />
                    <InputField label={t('unfallbg.label_arbeitgeber_adresse', 'Adresse des Arbeitgebers')} value={data.arbeitgeberAdresse}
                        onChange={(v) => updateField('arbeitgeberAdresse', v)} placeholder={t('unfallbg.placeholder_adresse', 'Straße, PLZ Ort')} />
                </div>
            ),
        },
        {
            title: t('unfallbg.step2_title', 'Berufsgenossenschaft'),
            icon: HardHat,
            fields: ['berufsgenossenschaft'],
            validate: () => {
                const e: Record<string, string> = {};
                if (!data.berufsgenossenschaft) e.berufsgenossenschaft = t('unfallbg.error_bg', 'Bitte wählen Sie eine BG aus');
                return e;
            },
            render: () => (
                <div className="space-y-3">
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                        {t('unfallbg.bg_question', 'Welche Berufsgenossenschaft ist für Sie zuständig?')}
                    </p>
                    {BG_OPTIONS.map(opt => (
                        <button key={opt.value}
                            onClick={() => updateField('berufsgenossenschaft', opt.value)}
                            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${data.berufsgenossenschaft === opt.value
                                ? 'border-orange-500/50 bg-orange-500/10 text-[var(--text-primary)]'
                                : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                                }`}>
                            <span className="text-sm">{opt.label}</span>
                        </button>
                    ))}
                    {errors.berufsgenossenschaft && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />{errors.berufsgenossenschaft}
                        </p>
                    )}
                </div>
            ),
        },
        {
            title: t('unfallbg.step3_title', 'Unfalldaten'),
            icon: Calendar,
            fields: ['unfalltag', 'unfallzeit', 'unfallart'],
            validate: () => {
                const e: Record<string, string> = {};
                if (!data.unfalltag) e.unfalltag = t('unfallbg.error_unfalltag', 'Unfalltag ist ein Pflichtfeld');
                return e;
            },
            render: () => (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="unfalltag" className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">{t('unfallbg.label_unfalltag', 'Unfalltag *')}</label>
                        <input id="unfalltag" type="date" value={data.unfalltag}
                            onChange={(e) => updateField('unfalltag', e.target.value)}
                            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-orange-500/50 transition-all" />
                        {errors.unfalltag && <p className="text-xs text-red-400 mt-1">{errors.unfalltag}</p>}
                    </div>
                    <div>
                        <label htmlFor="unfallzeit" className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">{t('unfallbg.label_unfallzeit', 'Unfallzeit (ungefähr)')}</label>
                        <input id="unfallzeit" type="time" value={data.unfallzeit}
                            onChange={(e) => updateField('unfallzeit', e.target.value)}
                            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-orange-500/50 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">{t('unfallbg.label_unfallart', 'Art des Unfalls')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {UNFALL_ART_OPTIONS.map(opt => (
                                <button key={opt.value}
                                    onClick={() => updateField('unfallart', opt.value)}
                                    className={`p-3 rounded-xl border text-sm transition-all duration-200 ${data.unfallart === opt.value
                                        ? 'border-orange-500/50 bg-orange-500/10 text-[var(--text-primary)]'
                                        : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                                        }`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: t('unfallbg.step4_title', 'Unfallhergang'),
            icon: MapPin,
            fields: ['unfallort', 'unfallhergang', 'verletzungsart'],
            validate: () => {
                const e: Record<string, string> = {};
                if (!data.unfallort.trim()) e.unfallort = t('unfallbg.error_unfallort', 'Unfallort ist ein Pflichtfeld');
                if (!data.unfallhergang.trim()) e.unfallhergang = t('unfallbg.error_hergang', 'Bitte beschreiben Sie den Hergang');
                if (!data.verletzungsart.trim()) e.verletzungsart = t('unfallbg.error_verletzung', 'Bitte beschreiben Sie die Verletzung');
                return e;
            },
            render: () => (
                <div className="space-y-4">
                    <InputField label={t('unfallbg.label_unfallort', 'Unfallort *')} value={data.unfallort}
                        onChange={(v) => updateField('unfallort', v)} placeholder={t('unfallbg.placeholder_unfallort', 'z.B. Baustelle Hauptstraße 5')} error={errors.unfallort} />
                    <TextareaField label={t('unfallbg.label_hergang', 'Unfallhergang (Beschreibung) *')} value={data.unfallhergang}
                        onChange={(v) => updateField('unfallhergang', v)} placeholder={t('unfallbg.placeholder_hergang', 'Wie ist der Unfall passiert?')} error={errors.unfallhergang} />
                    <TextareaField label={t('unfallbg.label_verletzung', 'Art der Verletzung *')} value={data.verletzungsart}
                        onChange={(v) => updateField('verletzungsart', v)} placeholder={t('unfallbg.placeholder_verletzung', 'z.B. Schnittwunde am rechten Unterarm')} error={errors.verletzungsart} />
                </div>
            ),
        },
        {
            title: t('unfallbg.step5_title', 'Erstversorgung'),
            icon: FileText,
            fields: ['ersthelfer', 'erstversorgung'],
            validate: () => ({}),
            render: () => (
                <div className="space-y-4">
                    <InputField label={t('unfallbg.label_ersthelfer', 'Name des Ersthelfers (falls vorhanden)')} value={data.ersthelfer}
                        onChange={(v) => updateField('ersthelfer', v)} placeholder={t('unfallbg.placeholder_optional', 'Optional')} />
                    <div>
                        <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">{t('unfallbg.label_erstversorgung', 'Erstversorgung erfolgt?')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['ja', 'nein'].map(val => (
                                <button key={val}
                                    onClick={() => updateField('erstversorgung', val)}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${data.erstversorgung === val
                                        ? 'border-orange-500/50 bg-orange-500/10 text-[var(--text-primary)]'
                                        : 'border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                                        }`}>
                                    {val === 'ja' ? t('unfallbg.yes', 'Ja') : t('unfallbg.no', 'Nein')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    const currentStep = steps[step];
    const isLast = step === steps.length - 1;

    const handleNext = () => {
        const validationErrors = currentStep.validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        if (isLast) {
            onComplete(data);
        } else {
            setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        if (step === 0) {
            onBack();
        } else {
            setStep(s => s - 1);
        }
    };

    return (
        <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                {steps.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${i === step ? 'bg-orange-500/20 text-orange-400' :
                                i < step ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'
                                }`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`w-6 h-0.5 ${i < step ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Titel */}
            <div>
                <h3 className="text-lg font-semibold text-white">{currentStep.title}</h3>
                <p className="text-sm text-white/50">{t('unfallbg.step_of', 'Schritt {{current}} von {{total}} – Unfallmeldung (BG)', { current: step + 1, total: steps.length })}</p>
            </div>

            {/* Content */}
            {currentStep.render()}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button onClick={handleBack}
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> {t('unfallbg.back', 'Zurück')}
                </button>
                <button onClick={handleNext}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20">
                    {isLast ? t('unfallbg.finish', 'Abschließen') : t('unfallbg.next', 'Weiter')} <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ─── Hilfskomponenten ───────────────────────────────────────

const InputField: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; error?: string;
}> = ({ label, value, onChange, placeholder, error }) => (
    <div>
        <label className="text-xs font-medium text-white/60 mb-1.5 block">{label}</label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder-white/30 focus:outline-none transition-all ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-orange-500/50'
                }`} />
        {error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
    </div>
);

const TextareaField: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; error?: string;
}> = ({ label, value, onChange, placeholder, error }) => (
    <div>
        <label className="text-xs font-medium text-white/60 mb-1.5 block">{label}</label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
            placeholder={placeholder}
            className={`w-full px-3 py-2.5 bg-white/5 border rounded-lg text-sm text-white placeholder-white/30 focus:outline-none transition-all resize-none ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-orange-500/50'
                }`} />
        {error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
    </div>
);
