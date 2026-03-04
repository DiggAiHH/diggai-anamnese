import { useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAdminContentList, useAdminContentCreate, useAdminContentUpdate, useAdminContentDelete } from '../../hooks/useApi';
import type { WaitingContentItem } from '../../types/admin';

const CONTENT_TYPES = ['HEALTH_TIP', 'FUN_FACT', 'MINI_QUIZ', 'BREATHING_EXERCISE', 'SEASONAL_INFO', 'PRAXIS_NEWS'];

interface ContentForm {
    type: string;
    category: string;
    title: string;
    body: string;
    displayDurationSec: number;
    priority: number;
    isActive: boolean;
    seasonal: string;
    language: string;
}

const emptyForm: ContentForm = {
    type: 'HEALTH_TIP', category: 'allgemein', title: '', body: '',
    displayDurationSec: 15, priority: 50, isActive: true, seasonal: '', language: 'de',
};

export function WaitingContentTab() {
    const [typeFilter, setTypeFilter] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<ContentForm>({ ...emptyForm });

    const { data: content, isLoading } = useAdminContentList({ type: typeFilter || undefined });
    const create = useAdminContentCreate();
    const update = useAdminContentUpdate();
    const del = useAdminContentDelete();

    const handleCreate = () => {
        create.mutate(form, {
            onSuccess: () => { setShowForm(false); setForm({ ...emptyForm }); },
        });
    };

    const handleUpdate = () => {
        if (!editingId) return;
        update.mutate({ id: editingId, ...form }, {
            onSuccess: () => { setEditingId(null); setShowForm(false); setForm({ ...emptyForm }); },
        });
    };

    const startEdit = (item: WaitingContentItem) => {
        setForm({
            type: item.type, category: item.category || '', title: item.title, body: item.body,
            displayDurationSec: item.displayDurationSec || 15, priority: item.priority || 50,
            isActive: item.isActive !== false, seasonal: item.seasonal || '', language: item.language || 'de',
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const items = (content || []) as WaitingContentItem[];

    if (isLoading) return <div className="animate-pulse p-8">Lade Content...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5" /> Wartezeit-Content</h2>
                <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...emptyForm }); }}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> Neuer Content
                </button>
            </div>

            {/* Type filter */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!typeFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Alle</button>
                {CONTENT_TYPES.map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        {t.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* Create/Edit form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-blue-700 space-y-4">
                    <h3 className="font-semibold">{editingId ? 'Content bearbeiten' : 'Neuen Content erstellen'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} aria-label="Content-Typ" className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                            {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input placeholder="Kategorie (z.B. allgemein)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                    </div>
                    <input placeholder="Titel" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                    <textarea placeholder="Inhalt" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs text-gray-500">Dauer (Sek)</label>
                            <input type="number" value={form.displayDurationSec} onChange={e => setForm({ ...form, displayDurationSec: parseInt(e.target.value) })} aria-label="Dauer in Sekunden" className="w-full mt-1 px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Priorität</label>
                            <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} aria-label="Priorität" className="w-full mt-1 px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Saison</label>
                            <select value={form.seasonal} onChange={e => setForm({ ...form, seasonal: e.target.value })} aria-label="Saison" className="w-full mt-1 px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                                <option value="">Keine</option>
                                <option value="spring">Frühling</option>
                                <option value="summer">Sommer</option>
                                <option value="autumn">Herbst</option>
                                <option value="winter">Winter</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Sprache</label>
                            <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} aria-label="Sprache" className="w-full mt-1 px-2 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                                <option value="de">Deutsch</option>
                                <option value="en">English</option>
                                <option value="tr">Türkçe</option>
                                <option value="ar">العربية</option>
                                <option value="ru">Русский</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={editingId ? handleUpdate : handleCreate} disabled={create.isPending || update.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                            {editingId ? 'Aktualisieren' : 'Erstellen'}
                        </button>
                        <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm">Abbrechen</button>
                    </div>
                </div>
            )}

            {/* Content list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Titel</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Typ</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Kategorie</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">Views</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">Likes</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item: WaitingContentItem) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3">
                                    <div className="font-medium truncate max-w-[200px]">{item.title}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{item.category}</td>
                                <td className="px-4 py-3 text-center">{item.viewCount || 0}</td>
                                <td className="px-4 py-3 text-center">{item.likeCount || 0}</td>
                                <td className="px-4 py-3 text-center">
                                    {item.isActive !== false ? (
                                        <Eye className="w-4 h-4 text-green-500 mx-auto" />
                                    ) : (
                                        <EyeOff className="w-4 h-4 text-gray-300 mx-auto" />
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right space-x-1">
                                    <button onClick={() => startEdit(item)} title="Bearbeiten" aria-label="Bearbeiten" className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => update.mutate({ id: item.id, isActive: item.isActive === false })} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded">
                                        {item.isActive !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => { if (confirm('Content wirklich löschen?')) del.mutate(item.id); }} title="Löschen" aria-label="Löschen" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">Kein Content vorhanden</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
