import { useState } from 'react';
import { BookTemplate, Search, Loader2 } from 'lucide-react';
import { useTherapyTemplates, useTherapyApplyTemplate } from '../../hooks/useApi';

interface TherapyTemplateSelectorProps {
    planId?: string;
    onSelect?: (templateId: string) => void;
    onApply?: (result: { addedMeasures: number }) => void;
    mode?: 'select' | 'apply';
}

export function TherapyTemplateSelector({ planId, onSelect, onApply, mode = 'select' }: TherapyTemplateSelectorProps) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const { data: templates, isLoading } = useTherapyTemplates(category || undefined);
    const applyTemplate = useTherapyApplyTemplate();

    const filtered = (templates || []).filter((t: any) =>
        !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
    );

    const categories = [...new Set((templates || []).map((t: any) => t.category))].filter(Boolean) as string[];

    const handleApply = (templateId: string) => {
        if (mode === 'apply' && planId) {
            applyTemplate.mutate({ templateId, planId }, {
                onSuccess: (data) => onApply?.(data),
            });
        } else {
            onSelect?.(templateId);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Template suchen..." className="w-full pl-9 pr-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm" />
                </div>
                <select value={category} onChange={e => setCategory(e.target.value)}
                    title="Kategorie filtern" className="px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm">
                    <option value="">Alle Kategorien</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lade Templates...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Keine Templates gefunden</div>
            ) : (
                <div className="grid gap-2">
                    {filtered.map((tpl: any) => (
                        <button key={tpl.id} onClick={() => handleApply(tpl.id)}
                            disabled={applyTemplate.isPending}
                            className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-left hover:border-blue-400 hover:shadow-sm transition-all w-full">
                            <BookTemplate className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{tpl.name}</span>
                                    {tpl.isDefault && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">Standard</span>}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{tpl.category} · {(tpl.measures?.length || 0)} Maßnahmen · {tpl.usageCount}× verwendet</div>
                                {tpl.icdCodes?.length > 0 && <div className="text-xs text-gray-400 mt-0.5">ICD: {tpl.icdCodes.join(', ')}</div>}
                                {tpl.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tpl.description}</p>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
