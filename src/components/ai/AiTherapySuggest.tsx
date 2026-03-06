import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAiSuggestTherapy } from '../../hooks/useApi';

interface AiTherapySuggestProps {
    sessionId: string;
    onApply?: (suggestion: any) => void;
}

export function AiTherapySuggest({ sessionId, onApply }: AiTherapySuggestProps) {
    const { t } = useTranslation();
    const mutation = useAiSuggestTherapy();
    const [result, setResult] = useState<any>(null);

    const handleSuggest = () => {
        mutation.mutate(sessionId, {
            onSuccess: (data) => setResult(data),
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={handleSuggest}
                    disabled={mutation.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {t('ai.suggestTherapy', 'KI-Therapievorschlag')}
                </button>
                {result?.mode && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {result.mode === 'pro' ? 'KI Pro' : 'Regelbasiert'}
                    </span>
                )}
            </div>

            {mutation.isError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {t('ai.suggestError', 'KI-Vorschlag fehlgeschlagen')}
                </div>
            )}

            {result?.suggestion && (
                <div className="space-y-3 p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-medium text-gray-800 dark:text-gray-200">{result.suggestion.diagnosis}</h4>
                            {result.suggestion.icdCodes?.length > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">ICD-10: {result.suggestion.icdCodes.join(', ')}</p>
                            )}
                        </div>
                        {result.aiConfidence != null && (
                            <span className="text-xs text-gray-500">Konfidenz: {Math.round(result.aiConfidence * 100)}%</span>
                        )}
                    </div>

                    {result.suggestion.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{result.suggestion.summary}</p>
                    )}

                    {result.suggestion.measures?.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                {t('ai.suggestedMeasures', 'Vorgeschlagene Maßnahmen')} ({result.suggestion.measures.length})
                            </h5>
                            {result.suggestion.measures.map((m: any, i: number) => (
                                <div key={i} className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{m.type}</span>
                                        <span className="font-medium">{m.title}</span>
                                        {m.confidence != null && (
                                            <span className="text-xs text-gray-400">{Math.round(m.confidence * 100)}%</span>
                                        )}
                                    </div>
                                    {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
                                    {m.reasoning && <p className="text-xs text-gray-400 mt-0.5 italic">{m.reasoning}</p>}
                                </div>
                            ))}
                        </div>
                    )}

                    {result.suggestion.warnings?.length > 0 && (
                        <div className="space-y-1">
                            {result.suggestion.warnings.map((w: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    {w}
                                </div>
                            ))}
                        </div>
                    )}

                    {onApply && (
                        <button
                            onClick={() => onApply(result.suggestion)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                            <CheckCircle className="w-4 h-4" />
                            {t('ai.applySuggestion', 'Vorschlag übernehmen')}
                        </button>
                    )}

                    {result.durationMs != null && (
                        <p className="text-[10px] text-gray-400">
                            {result.aiModel} · {result.durationMs}ms
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
