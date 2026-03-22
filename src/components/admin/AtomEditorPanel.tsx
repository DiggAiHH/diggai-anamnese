import { useState, useEffect } from 'react';
import { FileEdit, Save, Plus, Trash2 } from 'lucide-react';
import { useAtomDraftCreate } from '../../hooks/useOpsApi';
import { BranchingLogicEditor } from './BranchingLogicEditor';
import type { MedicalAtomAdmin } from '../../types/admin';

interface Props {
  atom: MedicalAtomAdmin;
  allAtoms: MedicalAtomAdmin[];
  onChange: (atom: MedicalAtomAdmin) => void;
}

const ANSWER_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'number', label: 'Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'scale', label: 'Skala' },
  { value: 'autocomplete', label: 'Autocomplete' },
];

export function AtomEditorPanel({ atom, allAtoms, onChange }: Props) {
  const createDraft = useAtomDraftCreate();
  const [options, setOptions] = useState<string[]>(atom.options || []);
  const [newOption, setNewOption] = useState('');

  // Sync options when atom changes
  useEffect(() => {
    setOptions(atom.options || []);
    setNewOption('');
  }, [atom.id, atom.options]);

  const update = (patch: Partial<MedicalAtomAdmin>) => {
    onChange({ ...atom, ...patch });
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    const next = [...options, newOption.trim()];
    setOptions(next);
    setNewOption('');
    update({ options: next });
  };

  const removeOption = (idx: number) => {
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    update({ options: next });
  };

  const handleSaveDraft = () => {
    createDraft.mutate({
      atomId: atom.id,
      draftData: { ...atom, options },
      changeNote: 'Bearbeitung über Atom-Editor',
    });
  };

  // Parse branching rules from atom.logic
  const branchRules = Array.isArray(atom.logic?.rules) ? atom.logic.rules as Array<{
    id: string; condition: string; targetAtomId: string;
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'notEquals';
    value: string;
  }> : [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileEdit className="w-4 h-4" /> Frage bearbeiten
        </h3>
        <span className="text-xs font-mono text-gray-500">{atom.id}</span>
      </div>

      {/* Question text */}
      <div>
        <label className="text-sm text-gray-500">Fragetext</label>
        <textarea
          value={atom.questionText || ''}
          onChange={e => update({ questionText: e.target.value })}
          rows={3}
          className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
          aria-label="Fragetext"
        />
      </div>

      {/* Type & Module */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-500">Antworttyp</label>
          <select
            value={atom.answerType || 'text'}
            onChange={e => update({ answerType: e.target.value })}
            className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
            aria-label="Antworttyp"
          >
            {ANSWER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500">Modul</label>
          <input
            value={atom.module || ''}
            onChange={e => update({ module: e.target.value })}
            className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
            aria-label="Modul"
          />
        </div>
      </div>

      {/* Options (for radio/checkbox) */}
      {(atom.answerType === 'radio' || atom.answerType === 'checkbox') && (
        <div>
          <label className="text-sm text-gray-500">Antwortoptionen</label>
          <div className="mt-1 space-y-1">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 rounded">{opt}</span>
                <button onClick={() => removeOption(i)} className="p-1 hover:text-red-600 text-gray-400" aria-label={`Option ${opt} löschen`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                placeholder="Neue Option..."
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                aria-label="Neue Option"
              />
              <button onClick={addOption} title="Option hinzufügen" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation rules */}
      {atom.answerType === 'number' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-500">Min</label>
            <input
              type="number"
              value={String(atom.logic?.min ?? '')}
              onChange={e => update({ logic: { ...atom.logic, min: e.target.value ? Number(e.target.value) : undefined } })}
              className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
              aria-label="Minimum"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Max</label>
            <input
              type="number"
              value={String(atom.logic?.max ?? '')}
              onChange={e => update({ logic: { ...atom.logic, max: e.target.value ? Number(e.target.value) : undefined } })}
              className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
              aria-label="Maximum"
            />
          </div>
        </div>
      )}

      {/* Flags */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atom.isRequired ?? true} onChange={e => update({ isRequired: e.target.checked })} />
          Pflichtfeld
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atom.isRedFlag ?? false} onChange={e => update({ isRedFlag: e.target.checked })} />
          Red-Flag
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atom.isPII ?? false} onChange={e => update({ isPII: e.target.checked })} />
          PII
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atom.isActive ?? true} onChange={e => update({ isActive: e.target.checked })} />
          Aktiv
        </label>
      </div>

      {/* Red-flag condition */}
      {atom.isRedFlag && (
        <div>
          <label className="text-sm text-gray-500">Red-Flag Bedingung</label>
          <input
            value={atom.redFlagCondition || ''}
            onChange={e => update({ redFlagCondition: e.target.value })}
            placeholder='z.B. answer == "Ja"'
            className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
            aria-label="Red-Flag Bedingung"
          />
        </div>
      )}

      {/* Branching Logic */}
      <BranchingLogicEditor
        rules={branchRules}
        availableAtoms={allAtoms.map(a => ({ id: a.id, questionText: a.questionText }))}
        onChange={rules => update({ logic: { ...atom.logic, rules } })}
      />

      {/* Save */}
      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleSaveDraft}
          disabled={createDraft.isPending}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {createDraft.isPending ? 'Speichern...' : 'Als Entwurf speichern'}
        </button>
      </div>
    </div>
  );
}
