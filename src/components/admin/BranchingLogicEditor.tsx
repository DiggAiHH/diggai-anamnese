import { useState } from 'react';
import { GitBranch, Plus, Trash2, ArrowRight } from 'lucide-react';

interface BranchRule {
  id: string;
  condition: string;      // e.g. 'answer == "Ja"'
  targetAtomId: string;   // next question ID
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'notEquals';
  value: string;
}

interface Props {
  rules: BranchRule[];
  availableAtoms: Array<{ id: string; questionText: string }>;
  onChange: (rules: BranchRule[]) => void;
}

const OPERATORS: { value: BranchRule['operator']; label: string }[] = [
  { value: 'equals', label: '= Gleich' },
  { value: 'notEquals', label: '≠ Ungleich' },
  { value: 'contains', label: '∋ Enthält' },
  { value: 'greater', label: '> Größer' },
  { value: 'less', label: '< Kleiner' },
];

let counter = 0;

export function BranchingLogicEditor({ rules, availableAtoms, onChange }: Props) {
  const [expanded, setExpanded] = useState(true);

  const addRule = () => {
    onChange([
      ...rules,
      {
        id: `rule_${Date.now()}_${counter++}`,
        condition: '',
        targetAtomId: availableAtoms[0]?.id || '',
        operator: 'equals',
        value: '',
      },
    ]);
  };

  const updateRule = (id: string, patch: Partial<BranchRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
      >
        <GitBranch className="w-4 h-4" />
        Branching-Logik ({rules.length} {rules.length === 1 ? 'Regel' : 'Regeln'})
      </button>

      {expanded && (
        <div className="space-y-2 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <span className="text-xs font-mono text-gray-400 pt-2">#{idx + 1}</span>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-600 font-medium">WENN</span>
                  <span className="text-gray-500">Antwort</span>
                  <select
                    value={rule.operator}
                    onChange={e => updateRule(rule.id, { operator: e.target.value as BranchRule['operator'] })}
                    className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                    aria-label={`Operator Regel ${idx + 1}`}
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    value={rule.value}
                    onChange={e => updateRule(rule.id, { value: e.target.value })}
                    placeholder="Wert..."
                    className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                    aria-label={`Wert Regel ${idx + 1}`}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">DANN</span>
                  <span className="text-gray-500">Gehe zu</span>
                  <select
                    value={rule.targetAtomId}
                    onChange={e => updateRule(rule.id, { targetAtomId: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                    aria-label={`Ziel Regel ${idx + 1}`}
                  >
                    {availableAtoms.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.id} — {a.questionText.slice(0, 60)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => removeRule(rule.id)}
                className="p-1 hover:text-red-600 text-gray-400 mt-1"
                aria-label={`Regel ${idx + 1} löschen`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={addRule}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Plus className="w-4 h-4" /> Neue Regel
          </button>
        </div>
      )}
    </div>
  );
}
