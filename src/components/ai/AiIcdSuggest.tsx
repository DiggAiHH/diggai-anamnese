import { useState } from 'react';
import { Search, Loader2, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAiIcdSuggest } from '../../hooks/useApi';

interface AiIcdSuggestProps {
    initialSymptoms?: string;
    onSelect?: (code: string, display: string) => void;
}

export function AiIcdSuggest({ initialSymptoms, onSelect }: AiIcdSuggestProps) {
    const { t } = useTranslation();
    const mutation = useAiIcdSuggest();
    const [symptoms, setSymptoms] = useState(initialSymptoms || '');
    const [results, setResults] = useState<any[]>([]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!symptoms.trim()) return;
        mutation.mutate(symptoms, {
            onSuccess: (data) => setResults(data.suggestions || []),
        });
    };

    return (
        <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    placeholder={t('ai.enterSymptoms', 'Symptome eingeben...')}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    type="submit"
                    disabled={mutation.isPending || !symptoms.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {t('ai.suggestIcd', 'ICD vorschlagen')}
                </button>
            </form>

            {results.length > 0 && (
                <div className="space-y-1">
                    {results.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                            onClick={() => onSelect?.(item.code, item.display)}
                        >
                            <div className="flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-sm font-mono font-medium text-blue-700 dark:text-blue-400">{item.code}</span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{item.display}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.confidence != null && (
                                    <span className="text-xs text-gray-400">{Math.round(item.confidence * 100)}%</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
