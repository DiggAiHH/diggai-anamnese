import React, { useState } from 'react';
import { Plus, Save, FileText, Loader2, ChevronDown, BookTemplate } from 'lucide-react';
import { useTherapyCreatePlan, useTherapyAddMeasure, useTherapyUpdatePlan } from '../../hooks/useApi';
import { TherapyMeasureCard } from './TherapyMeasureCard';
import { TherapyTemplateSelector } from './TherapyTemplateSelector';

interface TherapyPlanBuilderProps {
    sessionId: string;
    patientId: string;
    onCreated?: (plan: any) => void;
}

const MEASURE_TYPES = [
    { value: 'MEDICATION', label: 'Medikament' },
    { value: 'PROCEDURE', label: 'Maßnahme' },
    { value: 'REFERRAL', label: 'Überweisung' },
    { value: 'LAB_ORDER', label: 'Laborauftrag' },
    { value: 'IMAGING', label: 'Bildgebung' },
    { value: 'LIFESTYLE', label: 'Lifestyle' },
    { value: 'FOLLOW_UP', label: 'Nachsorge' },
    { value: 'DOCUMENTATION', label: 'Dokumentation' },
    { value: 'CUSTOM', label: 'Sonstige' },
];

export function TherapyPlanBuilder({ sessionId, patientId, onCreated }: TherapyPlanBuilderProps) {
    const [step, setStep] = useState<'info' | 'measures' | 'template'>('info');
    const [title, setTitle] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [icdCodes, setIcdCodes] = useState('');
    const [summary, setSummary] = useState('');
    const [createdPlan, setCreatedPlan] = useState<any>(null);

    // Measure form
    const [showMeasureForm, setShowMeasureForm] = useState(false);
    const [measureType, setMeasureType] = useState('MEDICATION');
    const [measureTitle, setMeasureTitle] = useState('');
    const [measureDesc, setMeasureDesc] = useState('');
    const [measureDosage, setMeasureDosage] = useState('');
    const [measureDuration, setMeasureDuration] = useState('');
    const [measureReferral, setMeasureReferral] = useState('');
    const [measureNotes, setMeasureNotes] = useState('');

    const createPlan = useTherapyCreatePlan();
    const addMeasure = useTherapyAddMeasure();
    const updatePlan = useTherapyUpdatePlan();

    const handleCreatePlan = () => {
        const codes = icdCodes.split(',').map(c => c.trim()).filter(Boolean);
        createPlan.mutate({
            sessionId,
            patientId,
            title: title || 'Therapieplan',
            diagnosis: diagnosis || undefined,
            icdCodes: codes.length > 0 ? codes : undefined,
            summary: summary || undefined,
        }, {
            onSuccess: (plan) => {
                setCreatedPlan(plan);
                setStep('measures');
                onCreated?.(plan);
            },
        });
    };

    const handleAddMeasure = () => {
        if (!createdPlan || !measureTitle.trim()) return;
        addMeasure.mutate({
            planId: createdPlan.id,
            type: measureType,
            title: measureTitle,
            description: measureDesc || undefined,
            dosage: measureDosage || undefined,
            duration: measureDuration || undefined,
            referralTo: measureReferral || undefined,
            notes: measureNotes || undefined,
        }, {
            onSuccess: (measure) => {
                setCreatedPlan((prev: any) => ({ ...prev, measures: [...(prev.measures || []), measure] }));
                resetMeasureForm();
            },
        });
    };

    const resetMeasureForm = () => {
        setMeasureTitle('');
        setMeasureDesc('');
        setMeasureDosage('');
        setMeasureDuration('');
        setMeasureReferral('');
        setMeasureNotes('');
        setShowMeasureForm(false);
    };

    const handleTemplateApplied = (result: { addedMeasures: number }) => {
        setStep('measures');
    };

    return (
        <div className="space-y-5">
            {/* Step 1: Plan Info */}
            {step === 'info' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Neuen Therapieplan erstellen
                    </h3>

                    <div>
                        <label className="block text-sm font-medium mb-1">Titel *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="z.B. Behandlung akuter Infekt"
                            className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Diagnose</label>
                            <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                                placeholder="Freitext-Diagnose"
                                className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ICD-10 Codes (kommagetrennt)</label>
                            <input type="text" value={icdCodes} onChange={e => setIcdCodes(e.target.value)}
                                placeholder="J06.9, R50.9"
                                className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm font-mono" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Zusammenfassung</label>
                        <textarea value={summary} onChange={e => setSummary(e.target.value)}
                            placeholder="Optionale Zusammenfassung..."
                            className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm h-20 resize-none" />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleCreatePlan} disabled={!title.trim() || createPlan.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                            {createPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Plan erstellen
                        </button>
                        <button onClick={() => setStep('template')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                            <BookTemplate className="w-4 h-4" /> Aus Template erstellen
                        </button>
                    </div>
                </div>
            )}

            {/* Template selection */}
            {step === 'template' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Template auswählen</h3>
                        <button onClick={() => setStep('info')} className="text-sm text-gray-500 hover:text-gray-700">← Zurück</button>
                    </div>
                    <TherapyTemplateSelector
                        planId={createdPlan?.id}
                        mode={createdPlan ? 'apply' : 'select'}
                        onSelect={(templateId) => {
                            createPlan.mutate({
                                sessionId, patientId,
                                title: title || 'Therapieplan (Template)',
                                diagnosis: diagnosis || undefined,
                                templateId,
                            }, {
                                onSuccess: (plan) => {
                                    setCreatedPlan(plan);
                                    setStep('measures');
                                    onCreated?.(plan);
                                },
                            });
                        }}
                        onApply={handleTemplateApplied}
                    />
                </div>
            )}

            {/* Step 2: Measures */}
            {step === 'measures' && createdPlan && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                            Maßnahmen — {createdPlan.title}
                        </h3>
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                            {createdPlan.status}
                        </span>
                    </div>

                    {/* Existing measures */}
                    {(createdPlan.measures || []).length > 0 ? (
                        <div className="space-y-2">
                            {createdPlan.measures.map((m: any) => (
                                <TherapyMeasureCard key={m.id} measure={m} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-400 text-sm">Noch keine Maßnahmen hinzugefügt</div>
                    )}

                    {/* Add measure form */}
                    {showMeasureForm ? (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-sm">Neue Maßnahme</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Typ</label>
                                    <select value={measureType} onChange={e => setMeasureType(e.target.value)}
                                        className="w-full px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm">
                                        {MEASURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Titel *</label>
                                    <input type="text" value={measureTitle} onChange={e => setMeasureTitle(e.target.value)}
                                        placeholder="z.B. Ibuprofen 400mg"
                                        className="w-full px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                </div>
                            </div>
                            {(measureType === 'MEDICATION') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Dosierung</label>
                                        <input type="text" value={measureDosage} onChange={e => setMeasureDosage(e.target.value)}
                                            placeholder="3x täglich 1 Tablette"
                                            className="w-full px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">Dauer</label>
                                        <input type="text" value={measureDuration} onChange={e => setMeasureDuration(e.target.value)}
                                            placeholder="7 Tage"
                                            className="w-full px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                    </div>
                                </div>
                            )}
                            {measureType === 'REFERRAL' && (
                                <div>
                                    <label className="block text-xs font-medium mb-1">Überweisung an</label>
                                    <input type="text" value={measureReferral} onChange={e => setMeasureReferral(e.target.value)}
                                        placeholder="Facharzt / Einrichtung"
                                        className="w-full px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium mb-1">Beschreibung</label>
                                <input type="text" value={measureDesc} onChange={e => setMeasureDesc(e.target.value)}
                                    placeholder="Optional..."
                                    className="w-full px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAddMeasure} disabled={!measureTitle.trim() || addMeasure.isPending}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                                    {addMeasure.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Hinzufügen
                                </button>
                                <button onClick={resetMeasureForm} className="px-3 py-1.5 rounded-lg border dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowMeasureForm(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center">
                            <Plus className="w-4 h-4" /> Maßnahme hinzufügen
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
