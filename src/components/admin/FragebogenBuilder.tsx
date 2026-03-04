import React, { useState } from 'react';
import { Layers, GripVertical, ToggleLeft, ToggleRight, Plus, FileEdit, Trash2, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAtomsReorder, useAtomToggle, useAtomDraftCreate, useAtomDraftsList, useAtomDraftPublish, useAtomDraftDelete } from '../../hooks/useApi';

export function FragebogenBuilder() {
    const { data: atomsData, isLoading } = useQuery({
        queryKey: ['atoms', 'all'],
        queryFn: () => api.getAtoms(),
    });
    const { data: draftsData } = useAtomDraftsList('DRAFT');

    const reorder = useAtomsReorder();
    const toggle = useAtomToggle();
    const createDraft = useAtomDraftCreate();
    const publishDraft = useAtomDraftPublish();
    const deleteDraft = useAtomDraftDelete();

    const [selectedAtom, setSelectedAtom] = useState<any>(null);
    const [showDrafts, setShowDrafts] = useState(false);
    const [moduleFilter, setModuleFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const atoms = (atomsData?.atoms || []) as any[];
    const drafts = (draftsData?.drafts || []) as any[];

    const filteredAtoms = atoms.filter((a: any) => {
        if (moduleFilter && a.module !== moduleFilter) return false;
        if (searchTerm && !a.questionText?.toLowerCase().includes(searchTerm.toLowerCase()) && !a.id?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const modules = [...new Set(atoms.map((a: any) => a.module).filter(Boolean))];

    const handleToggle = (id: string, isActive: boolean) => {
        toggle.mutate({ id, isActive: !isActive });
    };

    const handleSaveDraft = () => {
        if (!selectedAtom) return;
        createDraft.mutate({
            atomId: selectedAtom.id,
            draftData: selectedAtom,
            changeNote: 'Bearbeitung über Fragebogen-Builder',
        });
    };

    if (isLoading) return <div className="animate-pulse p-8">Lade Fragebogen...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="w-5 h-5" /> Fragebogen-Builder</h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowDrafts(!showDrafts)} className={`px-3 py-2 text-sm rounded-lg ${showDrafts ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        Entwürfe ({drafts.length})
                    </button>
                </div>
            </div>

            {showDrafts && drafts.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800 space-y-2">
                    <h3 className="font-semibold text-sm">Unveröffentlichte Entwürfe</h3>
                    {drafts.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border">
                            <div>
                                <div className="text-sm font-medium">{d.draftData?.questionText || d.atomId || 'Neuer Entwurf'}</div>
                                <div className="text-xs text-gray-500">{d.changeNote} — {new Date(d.createdAt).toLocaleDateString('de-DE')}</div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => publishDraft.mutate(d.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"><Upload className="w-3 h-3 inline mr-1" />Veröffentlichen</button>
                                <button onClick={() => deleteDraft.mutate(d.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Frage suchen..." className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                    <option value="">Alle Module</option>
                    {modules.map(m => <option key={m as string} value={m as string}>{m as string}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Atom List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[600px] overflow-y-auto">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 font-semibold text-sm">Fragen ({filteredAtoms.length})</div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredAtoms.map((atom: any) => (
                            <div key={atom.id} onClick={() => setSelectedAtom({ ...atom })}
                                className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedAtom?.id === atom.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''}`}>
                                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                <span className="text-xs font-mono text-gray-400 w-16 flex-shrink-0">{atom.id}</span>
                                <span className="text-sm flex-1 truncate">{atom.questionText}</span>
                                <button onClick={e => { e.stopPropagation(); handleToggle(atom.id, atom.isActive !== false); }}
                                    className={`flex-shrink-0 ${atom.isActive !== false ? 'text-green-500' : 'text-gray-300'}`}>
                                    {atom.isActive !== false ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Atom Editor */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    {selectedAtom ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2"><FileEdit className="w-4 h-4" /> Frage bearbeiten</h3>
                                <span className="text-xs font-mono text-gray-400">ID: {selectedAtom.id}</span>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Fragetext</label>
                                <textarea value={selectedAtom.questionText || ''} onChange={e => setSelectedAtom({ ...selectedAtom, questionText: e.target.value })} rows={3}
                                    className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-gray-500">Antworttyp</label>
                                    <select value={selectedAtom.answerType || 'text'} onChange={e => setSelectedAtom({ ...selectedAtom, answerType: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                                        <option value="text">Text</option>
                                        <option value="radio">Radio</option>
                                        <option value="checkbox">Checkbox</option>
                                        <option value="number">Zahl</option>
                                        <option value="date">Datum</option>
                                        <option value="scale">Skala</option>
                                        <option value="autocomplete">Autocomplete</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Modul</label>
                                    <input value={selectedAtom.module || ''} onChange={e => setSelectedAtom({ ...selectedAtom, module: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={selectedAtom.isRequired ?? true} onChange={e => setSelectedAtom({ ...selectedAtom, isRequired: e.target.checked })} />
                                    Pflichtfeld
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={selectedAtom.isRedFlag ?? false} onChange={e => setSelectedAtom({ ...selectedAtom, isRedFlag: e.target.checked })} />
                                    Red-Flag
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={selectedAtom.isPII ?? false} onChange={e => setSelectedAtom({ ...selectedAtom, isPII: e.target.checked })} />
                                    PII
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={selectedAtom.isActive ?? true} onChange={e => setSelectedAtom({ ...selectedAtom, isActive: e.target.checked })} />
                                    Aktiv
                                </label>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveDraft} disabled={createDraft.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                    Als Entwurf speichern
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400">
                            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Wählen Sie eine Frage aus der Liste</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
