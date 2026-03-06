import { useState } from 'react';
import { FileText, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAiSummarizeSession } from '../../hooks/useApi';

interface AiSessionSummaryProps {
    sessionId: string;
}

export function AiSessionSummary({ sessionId }: AiSessionSummaryProps) {
    const { t } = useTranslation();
    const mutation = useAiSummarizeSession();
    const [result, setResult] = useState<any>(null);

    const handleSummarize = () => {
        mutation.mutate(sessionId, {
            onSuccess: (data) => setResult(data),
        });
    };

    return (
        <div className="space-y-4">
            <button
                onClick={handleSummarize}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {t('ai.summarize', 'KI-Zusammenfassung')}
            </button>

            {mutation.isError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {t('ai.summaryError', 'Zusammenfassung fehlgeschlagen')}
                </div>
            )}

            {result?.summary && (
                <div className="p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                            {result.mode === 'pro' ? 'KI Pro' : 'Regelbasiert'}
                        </span>
                        {result.aiModel && <span>{result.aiModel}</span>}
                        {result.durationMs != null && <span>· {result.durationMs}ms</span>}
                    </div>

                    {result.summary.chiefComplaint && (
                        <Section title={t('ai.chiefComplaint', 'Hauptbeschwerde')} content={result.summary.chiefComplaint} />
                    )}
                    {result.summary.historyOfPresentIllness && (
                        <Section title={t('ai.history', 'Anamnese')} content={result.summary.historyOfPresentIllness} />
                    )}
                    {result.summary.assessment && (
                        <Section title={t('ai.assessment', 'Einschätzung')} content={result.summary.assessment} />
                    )}
                    {result.summary.relevantHistory?.length > 0 && (
                        <ListSection title={t('ai.relevantFindings', 'Relevante Befunde')} items={result.summary.relevantHistory} />
                    )}
                    {result.summary.medications?.length > 0 && (
                        <ListSection title={t('ai.medications', 'Medikation')} items={result.summary.medications} />
                    )}
                    {result.summary.suggestedIcdCodes?.length > 0 && (
                        <div>
                            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">ICD-10</h5>
                            <div className="flex gap-1 flex-wrap">
                                {result.summary.suggestedIcdCodes.map((code: string) => (
                                    <span key={code} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{code}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {result.summary.redFlags?.length > 0 && (
                        <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <h5 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">Red Flags</h5>
                            {result.summary.redFlags.map((flag: string, i: number) => (
                                <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />{flag}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ title, content }: { title: string; content: string }) {
    return (
        <div>
            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-0.5">{title}</h5>
            <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
        </div>
    );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-0.5">{title}</h5>
            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    );
}
