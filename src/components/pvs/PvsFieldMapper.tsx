import { useState } from 'react';
import { ArrowRight, Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePvsFieldMappings, usePvsUpdateFieldMapping } from '../../hooks/useApi';

interface FieldMapping {
    id: string;
    gdtField: string;
    diggaiModel: string;
    diggaiField: string;
    transform?: string;
}

export function PvsFieldMapper({ connectionId }: { connectionId: string }) {
    const { t } = useTranslation();
    const { data: mappings, isLoading } = usePvsFieldMappings(connectionId);
    const updateMapping = usePvsUpdateFieldMapping();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<FieldMapping>>({});

    if (isLoading) return <div className="animate-pulse p-4">{t('common.loading', 'Laden...')}</div>;

    const items: FieldMapping[] = mappings || [];

    const startEdit = (mapping: FieldMapping) => {
        setEditingId(mapping.id);
        setEditValues({ ...mapping });
    };

    const saveEdit = () => {
        if (editingId && editValues) {
            updateMapping.mutate({ connectionId, mappingId: editingId, data: editValues });
            setEditingId(null);
            setEditValues({});
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {t('pvs.fieldMapping', 'Feld-Mapping')}
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">{t('pvs.gdtField', 'GDT-Feld')}</th>
                            <th className="text-center py-2 px-3" />
                            <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">{t('pvs.diggaiField', 'DiggAI-Feld')}</th>
                            <th className="text-left py-2 px-3 text-gray-500 text-xs uppercase">{t('pvs.transform', 'Transformation')}</th>
                            <th className="text-right py-2 px-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(mapping => (
                            <tr key={mapping.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                {editingId === mapping.id ? (
                                    <>
                                        <td className="py-2 px-3">
                                            <input
                                                value={editValues.gdtField || ''}
                                                onChange={e => setEditValues({ ...editValues, gdtField: e.target.value })}
                                                aria-label="GDT-Feld"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                                            />
                                        </td>
                                        <td className="text-center"><ArrowRight className="w-4 h-4 text-gray-400 mx-auto" /></td>
                                        <td className="py-2 px-3">
                                            <input
                                                value={`${editValues.diggaiModel || ''}.${editValues.diggaiField || ''}`}
                                                onChange={e => {
                                                    const [model, ...rest] = e.target.value.split('.');
                                                    setEditValues({ ...editValues, diggaiModel: model, diggaiField: rest.join('.') });
                                                }}
                                                aria-label="DiggAI-Feld"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                                            />
                                        </td>
                                        <td className="py-2 px-3">
                                            <input
                                                value={editValues.transform || ''}
                                                onChange={e => setEditValues({ ...editValues, transform: e.target.value })}
                                                aria-label="Transformation"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <button onClick={saveEdit} title="Speichern" className="p-1 text-green-600 hover:bg-green-50 rounded dark:hover:bg-green-900/30">
                                                <Save className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} title="Abbrechen" className="p-1 text-gray-400 hover:bg-gray-100 rounded dark:hover:bg-gray-700">
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="py-2 px-3 font-mono text-xs">{mapping.gdtField}</td>
                                        <td className="text-center"><ArrowRight className="w-4 h-4 text-gray-400 mx-auto" /></td>
                                        <td className="py-2 px-3 font-mono text-xs">{mapping.diggaiModel}.{mapping.diggaiField}</td>
                                        <td className="py-2 px-3 text-xs text-gray-500">{mapping.transform || '-'}</td>
                                        <td className="py-2 px-3 text-right">
                                            <button onClick={() => startEdit(mapping)} className="text-xs text-blue-600 hover:underline">
                                                {t('common.edit', 'Bearbeiten')}
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
