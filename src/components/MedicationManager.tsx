import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pill, Clock, Calendar, ChevronDown, ScanBarcode } from 'lucide-react';
import { MedicationScanner } from './inputs/MedicationScanner';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    sinceWhen: string;
}

interface MedicationManagerProps {
    value: Medication[];
    onChange: (medications: Medication[]) => void;
    error?: string;
}

const FREQUENCY_OPTIONS = [
    { value: '1-0-0', label: 'Morgens (1-0-0)' },
    { value: '0-1-0', label: 'Mittags (0-1-0)' },
    { value: '0-0-1', label: 'Abends (0-0-1)' },
    { value: '1-0-1', label: 'Morgens + Abends (1-0-1)' },
    { value: '1-1-1', label: '3x täglich (1-1-1)' },
    { value: '1-1-1-1', label: '4x täglich (1-1-1-1)' },
    { value: 'bei_bedarf', label: 'Bei Bedarf' },
    { value: 'woechentlich', label: 'Wöchentlich' },
    { value: 'monatlich', label: 'Monatlich' },
];

/**
 * Strukturierte Medikamenten-Eingabe
 * Ersetzt das alte Freitext-Feld (8900)
 */
export const MedicationManager: React.FC<MedicationManagerProps> = ({ value, onChange, error }) => {
    const { t } = useTranslation();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    const addMedication = () => {
        const newMed: Medication = {
            id: crypto.randomUUID(),
            name: '',
            dosage: '',
            frequency: '1-0-0',
            sinceWhen: '',
        };
        const updated = [...value, newMed];
        onChange(updated);
        setExpandedId(newMed.id);
    };

    const updateMedication = (id: string, field: keyof Medication, fieldValue: string) => {
        const updated = value.map(m => m.id === id ? { ...m, [field]: fieldValue } : m);
        onChange(updated);
    };

    const removeMedication = (id: string) => {
        onChange(value.filter(m => m.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">{t('Medikamenten-Liste')}</h3>
                    <p className="text-xs text-white/50">
                        {value.length === 0
                            ? t('medListEmpty', 'Bitte fügen Sie Ihre aktuellen Medikamente hinzu')
                            : `${value.length} ${t('medListCount', 'Medikament(e) eingetragen')}`}
                    </p>
                </div>
            </div>

            {/* Medikamenten-Karten */}
            <div className="space-y-3">
                {value.map((med, index) => (
                    <div
                        key={med.id}
                        className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all duration-200"
                    >
                        {/* Collapsed Header */}
                        <div
                            onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-emerald-400">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {med.name || t('Neues Medikament')}
                                </p>
                                {med.dosage && (
                                    <p className="text-xs text-white/50 truncate">
                                        {med.dosage} – {FREQUENCY_OPTIONS.find(f => f.value === med.frequency)?.label || med.frequency}
                                    </p>
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expandedId === med.id ? 'rotate-180' : ''}`} />
                            <button
                                onClick={(e) => { e.stopPropagation(); removeMedication(med.id); }}
                                aria-label={t('Medikament entfernen', 'Medikament entfernen')}
                                className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Expanded Form */}
                        {expandedId === med.id && (
                            <div className="px-3 pb-4 space-y-3 border-t border-white/5 pt-3">
                                {/* Name */}
                                <div>
                                    <label className="text-xs font-medium text-white/60 mb-1 block">
                                        {t('Medikament / Wirkstoff')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={med.name}
                                        onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                                        placeholder="z.B. Ramipril, Metformin"
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                        autoFocus
                                    />
                                </div>

                                {/* Dosierung */}
                                <div>
                                    <label className="text-xs font-medium text-white/60 mb-1 block">
                                        {t('Dosierung')}
                                    </label>
                                    <input
                                        type="text"
                                        value={med.dosage}
                                        onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                                        placeholder="z.B. 5mg, 500mg"
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>

                                {/* Häufigkeit */}
                                <div>
                                    <label className="text-xs font-medium text-white/60 mb-1 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> {t('Einnahmeschema')}
                                    </label>
                                    <select
                                        value={med.frequency}
                                        onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                                        aria-label={t('Einnahmeschema', 'Einnahmeschema')}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none"
                                    >
                                        {FREQUENCY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value} className="bg-gray-800">
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Seit wann */}
                                <div>
                                    <label className="text-xs font-medium text-white/60 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" /> {t('Seit wann?')}
                                    </label>
                                    <input
                                        type="text"
                                        value={med.sinceWhen}
                                        onChange={(e) => updateMedication(med.id, 'sinceWhen', e.target.value)}
                                        placeholder="z.B. seit 2020, seit 3 Monaten"
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Hinzufügen-Button */}
            <div className="flex gap-3">
                <button
                    onClick={addMedication}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-white/15 hover:border-emerald-500/40 text-white/50 hover:text-emerald-400 transition-all duration-200 hover:bg-emerald-500/5 group"
                >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('Manuell hinzufügen')}</span>
                </button>
                <button
                    onClick={() => setShowScanner(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/40 text-white/50 hover:text-blue-400 transition-all duration-200 hover:bg-blue-500/5 group"
                >
                    <ScanBarcode className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('Scannen')}</span>
                </button>
            </div>

            {/* Medication Scanner */}
            {showScanner && (
                <MedicationScanner
                    onResult={(data) => {
                        const newMed: Medication = {
                            id: crypto.randomUUID(),
                            name: data.name,
                            dosage: data.dosage || '',
                            frequency: '1-0-0',
                            sinceWhen: '',
                        };
                        onChange([...value, newMed]);
                        setExpandedId(newMed.id);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Error */}
            {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
            )}

            {/* Polypharmazie-Warnung */}
            {value.length > 5 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 mt-3">
                    <p className="text-xs text-yellow-300">
                        ⚠️ <strong>{t('Hinweis')}:</strong> {t('medPolyWarning', `Sie nehmen ${value.length} Medikamente ein. Bei mehr als 5 Medikamenten besteht ein erhöhtes Wechselwirkungsrisiko. Bitte besprechen Sie dies mit Ihrem Arzt.`)}
                    </p>
                </div>
            )}
        </div>
    );
};
