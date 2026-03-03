import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Activity, Calendar, ChevronDown } from 'lucide-react';

interface Surgery {
    id: string;
    surgeryName: string;
    date: string;
    complications: string;
    notes: string;
}

interface SurgeryManagerProps {
    value: Surgery[];
    onChange: (surgeries: Surgery[]) => void;
    error?: string;
}

/**
 * Strukturierte OP-Eingabe (OP-Anamnese)
 */
export const SurgeryManager: React.FC<SurgeryManagerProps> = ({ value = [], onChange, error }) => {
    const { t } = useTranslation();
    const [expandedId, setExpandedId] = useState<string | null>(value.length > 0 ? null : null);

    const addSurgery = () => {
        const newSurgery: Surgery = {
            id: crypto.randomUUID(),
            surgeryName: '',
            date: '',
            complications: '',
            notes: '',
        };
        const updated = [...value, newSurgery];
        onChange(updated);
        setExpandedId(newSurgery.id);
    };

    const updateSurgery = (id: string, field: keyof Surgery, fieldValue: string) => {
        const updated = value.map(s => s.id === id ? { ...s, [field]: fieldValue } : s);
        onChange(updated);
    };

    const removeSurgery = (id: string) => {
        onChange(value.filter(s => s.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">{t('Operations-Historie')}</h3>
                    <p className="text-xs text-white/50">
                        {value.length === 0
                            ? t('opListEmpty', 'Bitte fügen Sie Ihre bisherigen Operationen hinzu')
                            : `${value.length} ${t('opListCount', 'Operation(en) eingetragen')}`}
                    </p>
                </div>
            </div>

            {/* OP-Karten */}
            <div className="space-y-3">
                {value.map((surg, index) => (
                    <div
                        key={surg.id}
                        className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all duration-200"
                    >
                        {/* Collapsed Header */}
                        <div
                            onClick={() => setExpandedId(expandedId === surg.id ? null : surg.id)}
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-blue-400">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {surg.surgeryName || t('Unbenannte OP')}
                                </p>
                                {surg.date && (
                                    <p className="text-xs text-white/50 truncate">
                                        {surg.date} {surg.complications ? ' (Komplikationen bekannt)' : ''}
                                    </p>
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expandedId === surg.id ? 'rotate-180' : ''}`} />
                            <button
                                onClick={(e) => { e.stopPropagation(); removeSurgery(surg.id); }}
                                aria-label={t('Operation entfernen', 'Operation entfernen')}
                                className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Expanded Form */}
                        {expandedId === surg.id && (
                            <div className="px-3 pb-4 space-y-3 border-t border-white/5 pt-3">
                                {/* Name */}
                                <div>
                                    <label className="text-xs font-medium text-white/60 mb-1 block">
                                        {t('Art der Operation')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={surg.surgeryName}
                                        onChange={(e) => updateSurgery(surg.id, 'surgeryName', e.target.value)}
                                        placeholder="z.B. Blinddarm-OP, Hüft-TEP"
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Datum */}
                                    <div>
                                        <label className="text-xs font-medium text-white/60 mb-1 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" /> {t('Wann?')}
                                        </label>
                                        <input
                                            type="text"
                                            value={surg.date}
                                            onChange={(e) => updateSurgery(surg.id, 'date', e.target.value)}
                                            placeholder="z.B. 2018"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>

                                    {/* Komplikationen */}
                                    <div>
                                        <label className="text-xs font-medium text-white/60 mb-1 block">
                                            {t('Komplikationen?')}
                                        </label>
                                        <input
                                            type="text"
                                            value={surg.complications}
                                            onChange={(e) => updateSurgery(surg.id, 'complications', e.target.value)}
                                            placeholder="z.B. keine, Nachblutung"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Notizen */}
                                <div>
                                    <label className="text-xs font-medium text-white/60 mb-1 block">
                                        {t('Sonstige Anmerkungen')}
                                    </label>
                                    <textarea
                                        value={surg.notes}
                                        onChange={(e) => updateSurgery(surg.id, 'notes', e.target.value)}
                                        placeholder="Optionale Details..."
                                        rows={2}
                                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Hinzufügen-Button */}
            <button
                onClick={addSurgery}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/40 text-white/50 hover:text-blue-400 transition-all duration-200 hover:bg-blue-500/5 group"
            >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">{t('Operation hinzufügen')}</span>
            </button>

            {/* Error */}
            {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
        </div>
    );
};
