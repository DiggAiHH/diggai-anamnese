import { Calendar, FileText, Tag, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTherapyPlan } from '../../hooks/useApi';
import { TherapyMeasureCard } from './TherapyMeasureCard';
import { TherapyStatusBadge } from './TherapyStatusBadge';

export function TherapyPlanView({ planId }: { planId: string }) {
    const { t } = useTranslation();
    const { data: plan, isLoading } = useTherapyPlan(planId);

    if (isLoading) return <div className="animate-pulse p-4">{t('common.loading', 'Laden...')}</div>;
    if (!plan) return <div className="text-center py-8 text-gray-500">{t('therapy.notFound', 'Therapieplan nicht gefunden')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{plan.title}</h2>
                    {plan.diagnosis && (
                        <p className="text-sm text-gray-500 mt-1">{plan.diagnosis}</p>
                    )}
                </div>
                <TherapyStatusBadge status={plan.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem icon={Calendar} label={t('therapy.startDate', 'Startdatum')} value={new Date(plan.startDate).toLocaleDateString('de-DE')} />
                {plan.targetEndDate && (
                    <InfoItem icon={Calendar} label={t('therapy.targetEnd', 'Zieldatum')} value={new Date(plan.targetEndDate).toLocaleDateString('de-DE')} />
                )}
                {plan.icdCodes?.length > 0 && (
                    <InfoItem icon={Tag} label="ICD-10" value={plan.icdCodes.join(', ')} />
                )}
                <InfoItem icon={CheckCircle} label={t('therapy.measures', 'Maßnahmen')} value={String(plan.measures?.length || 0)} />
            </div>

            {plan.summary && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {t('therapy.summary', 'Zusammenfassung')}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{plan.summary}</p>
                </div>
            )}

            {plan.aiGenerated && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">KI</span>
                    {plan.aiModel && <span>Model: {plan.aiModel}</span>}
                    {plan.aiConfidence != null && <span>• Konfidenz: {Math.round(plan.aiConfidence * 100)}%</span>}
                </div>
            )}

            {plan.measures && plan.measures.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        {t('therapy.measuresTitle', 'Maßnahmen')} ({plan.measures.length})
                    </h3>
                    {plan.measures.map((measure: any) => (
                        <TherapyMeasureCard key={measure.id} measure={measure} />
                    ))}
                </div>
            )}
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    );
}
