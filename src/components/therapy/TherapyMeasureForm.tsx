import { useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTherapyAddMeasure, useTherapyUpdateMeasure } from '../../hooks/useOpsApi';

const MEASURE_TYPES = [
    'MEDICATION', 'PROCEDURE', 'REFERRAL', 'LAB_ORDER',
    'IMAGING', 'LIFESTYLE', 'FOLLOW_UP', 'DOCUMENTATION', 'CUSTOM',
] as const;

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

interface TherapyMeasureFormProps {
    planId: string;
    measure?: any;
    onSaved?: () => void;
    onCancel?: () => void;
}

export function TherapyMeasureForm({ planId, measure, onSaved, onCancel }: TherapyMeasureFormProps) {
    const { t } = useTranslation();
    const addMeasure = useTherapyAddMeasure();
    const updateMeasure = useTherapyUpdateMeasure();
    const isEdit = !!measure;

    const [form, setForm] = useState({
        type: measure?.type || 'MEDICATION',
        title: measure?.title || '',
        description: measure?.description || '',
        priority: measure?.priority || 'NORMAL',
        medicationName: measure?.medicationName || '',
        dosage: measure?.dosage || '',
        duration: measure?.duration || '',
        pzn: measure?.pzn || '',
        atcCode: measure?.atcCode || '',
        referralTo: measure?.referralTo || '',
        referralReason: measure?.referralReason || '',
        referralUrgency: measure?.referralUrgency || 'NORMAL',
        labParameters: measure?.labParameters || '',
        scheduledDate: measure?.scheduledDate?.slice(0, 10) || '',
        dueDate: measure?.dueDate?.slice(0, 10) || '',
        notes: measure?.notes || '',
    });

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            type: form.type,
            title: form.title,
            description: form.description || undefined,
            priority: form.priority,
            notes: form.notes || undefined,
            scheduledDate: form.scheduledDate || undefined,
            dueDate: form.dueDate || undefined,
        };

        if (form.type === 'MEDICATION') {
            Object.assign(payload, {
                medicationName: form.medicationName || undefined,
                dosage: form.dosage || undefined,
                duration: form.duration || undefined,
                pzn: form.pzn || undefined,
                atcCode: form.atcCode || undefined,
            });
        }
        if (form.type === 'REFERRAL') {
            Object.assign(payload, {
                referralTo: form.referralTo || undefined,
                referralReason: form.referralReason || undefined,
                referralUrgency: form.referralUrgency,
            });
        }
        if (form.type === 'LAB_ORDER') {
            payload.labParameters = form.labParameters || undefined;
        }

        if (isEdit) {
            updateMeasure.mutate({ id: measure.id, ...payload }, { onSuccess: () => onSaved?.() });
        } else {
            addMeasure.mutate({ planId, ...payload }, { onSuccess: () => onSaved?.() });
        }
    };

    const isPending = addMeasure.isPending || updateMeasure.isPending;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label={t('therapy.measureType', 'Typ')}>
                    <select value={form.type} onChange={e => set('type', e.target.value)} title="Typ" className="input-field">
                        {MEASURE_TYPES.map(mt => (
                            <option key={mt} value={mt}>{t(`therapy.measureTypes.${mt}`, mt)}</option>
                        ))}
                    </select>
                </Field>
                <Field label={t('therapy.title', 'Titel')}>
                    <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titel eingeben" className="input-field" />
                </Field>
                <Field label={t('therapy.priority', 'Priorität')}>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)} title="Priorität" className="input-field">
                        {PRIORITIES.map(p => (
                            <option key={p} value={p}>{t(`therapy.priorities.${p}`, p)}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label={t('therapy.description', 'Beschreibung')}>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Beschreibung eingeben" className="input-field" />
            </Field>

            {form.type === 'MEDICATION' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label={t('therapy.medicationName', 'Medikament')}>
                        <input value={form.medicationName} onChange={e => set('medicationName', e.target.value)} placeholder="Medikamentenname" className="input-field" />
                    </Field>
                    <Field label={t('therapy.dosage', 'Dosierung')}>
                        <input value={form.dosage} onChange={e => set('dosage', e.target.value)} className="input-field" placeholder="z.B. 1-0-1" />
                    </Field>
                    <Field label={t('therapy.duration', 'Dauer')}>
                        <input value={form.duration} onChange={e => set('duration', e.target.value)} className="input-field" placeholder="z.B. 14 Tage" />
                    </Field>
                    <Field label="PZN">
                        <input value={form.pzn} onChange={e => set('pzn', e.target.value)} placeholder="z.B. 12345678" className="input-field" />
                    </Field>
                    <Field label="ATC-Code">
                        <input value={form.atcCode} onChange={e => set('atcCode', e.target.value)} placeholder="z.B. N02BE01" className="input-field" />
                    </Field>
                </div>
            )}

            {form.type === 'REFERRAL' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label={t('therapy.referralTo', 'Überweisung an')}>
                        <input value={form.referralTo} onChange={e => set('referralTo', e.target.value)} placeholder="Facharzt / Klinik" className="input-field" />
                    </Field>
                    <Field label={t('therapy.referralReason', 'Grund')}>
                        <input value={form.referralReason} onChange={e => set('referralReason', e.target.value)} placeholder="Überweisungsgrund" className="input-field" />
                    </Field>
                    <Field label={t('therapy.referralUrgency', 'Dringlichkeit')}>
                        <select value={form.referralUrgency} onChange={e => set('referralUrgency', e.target.value)} title="Dringlichkeit" className="input-field">
                            <option value="LOW">{t('therapy.urgency.LOW', 'Niedrig')}</option>
                            <option value="NORMAL">{t('therapy.urgency.NORMAL', 'Normal')}</option>
                            <option value="HIGH">{t('therapy.urgency.HIGH', 'Hoch')}</option>
                            <option value="URGENT">{t('therapy.urgency.URGENT', 'Dringend')}</option>
                        </select>
                    </Field>
                </div>
            )}

            {form.type === 'LAB_ORDER' && (
                <Field label={t('therapy.labParameters', 'Laborparameter')}>
                    <input value={form.labParameters} onChange={e => set('labParameters', e.target.value)} className="input-field" placeholder="z.B. HbA1c, TSH, Kreatinin" />
                </Field>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label={t('therapy.scheduledDate', 'Geplant am')}>
                    <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} title="Geplant am" className="input-field" />
                </Field>
                <Field label={t('therapy.dueDate', 'Fällig am')}>
                    <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} title="Fällig am" className="input-field" />
                </Field>
            </div>

            <Field label={t('therapy.notes', 'Notizen')}>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Zusätzliche Notizen" className="input-field" />
            </Field>

            <div className="flex items-center gap-2 pt-2">
                <button type="submit" disabled={isPending || !form.title} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isEdit ? t('common.save', 'Speichern') : t('therapy.addMeasure', 'Maßnahme hinzufügen')}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                        {t('common.cancel', 'Abbrechen')}
                    </button>
                )}
            </div>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
            <div className="mt-0.5">{children}</div>
        </label>
    );
}
