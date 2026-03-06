import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { useAtomToggle, useAtomsReorder } from '../../hooks/useApi';
import type { MedicalAtomAdmin } from '../../types/admin';

interface Props {
  atoms: MedicalAtomAdmin[];
  selectedAtomId: string | null;
  onSelect: (atom: MedicalAtomAdmin) => void;
}

function SortableAtomRow({
  atom,
  isSelected,
  onSelect,
  onToggle,
}: {
  atom: MedicalAtomAdmin;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: atom.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
      }`}
    >
      <button {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing" aria-label="Ziehen zum Sortieren">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </button>
      <span className="text-xs font-mono text-gray-500 w-16 flex-shrink-0 truncate">{atom.id}</span>
      <span className="text-sm flex-1 truncate">{atom.questionText}</span>
      {atom.module && (
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 flex-shrink-0">
          {atom.module}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className={`flex-shrink-0 ${atom.isActive !== false ? 'text-green-500' : 'text-gray-400'}`}
        aria-label={atom.isActive !== false ? 'Deaktivieren' : 'Aktivieren'}
      >
        {atom.isActive !== false ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
      </button>
    </div>
  );
}

export function AtomListPanel({ atoms, selectedAtomId, onSelect }: Props) {
  const toggle = useAtomToggle();
  const reorder = useAtomsReorder();
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const modules = [...new Set(atoms.map(a => a.module).filter(Boolean))];

  const filtered = atoms.filter(a => {
    if (moduleFilter && a.module !== moduleFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return a.questionText?.toLowerCase().includes(q) || a.id?.toLowerCase().includes(q);
    }
    return true;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = filtered.findIndex(a => a.id === active.id);
      const newIdx = filtered.findIndex(a => a.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      // Build reorder payload
      const reordered = [...filtered];
      const [moved] = reordered.splice(oldIdx, 1);
      reordered.splice(newIdx, 0, moved);

      const orders = reordered.map((a, i) => ({ id: a.id, orderIndex: i }));
      reorder.mutate(orders);
    },
    [filtered, reorder]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[600px]">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <span className="font-semibold text-sm">Fragen ({filtered.length})</span>
      </div>

      <div className="flex gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Suche..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          aria-label="Modul filtern"
        >
          <option value="">Alle Module</option>
          {modules.map(m => <option key={m as string} value={m as string}>{m as string}</option>)}
        </select>
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(a => a.id)} strategy={verticalListSortingStrategy}>
            {filtered.map(atom => (
              <SortableAtomRow
                key={atom.id}
                atom={atom}
                isSelected={selectedAtomId === atom.id}
                onSelect={() => onSelect(atom)}
                onToggle={() => toggle.mutate({ id: atom.id, isActive: !(atom.isActive !== false) })}
              />
            ))}
          </SortableContext>
        </DndContext>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">Keine Fragen gefunden</div>
        )}
      </div>
    </div>
  );
}
