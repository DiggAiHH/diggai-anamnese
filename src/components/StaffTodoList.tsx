import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare, Square, Plus, Trash2, AlertTriangle, Clock,
  User, ChevronDown, ChevronRight, Edit3, X, Check
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  sessionId?: string;
  patientName?: string;
  createdAt: string;
  completedAt?: string;
  category: 'patient' | 'admin' | 'followup' | 'general';
}

interface StaffTodoListProps {
  currentUser: { id: string; displayName: string; role: string };
  className?: string;
}

// ─── Priority Config ────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Dringend', color: 'border-red-500/30 bg-red-500/10', badge: 'bg-red-500/20 text-red-400' },
  high: { label: '🟠 Hoch', color: 'border-orange-500/30 bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-400' },
  medium: { label: '🟡 Mittel', color: 'border-yellow-500/30 bg-yellow-500/10', badge: 'bg-yellow-500/20 text-yellow-400' },
  low: { label: '🟢 Niedrig', color: 'border-emerald-500/30 bg-emerald-500/10', badge: 'bg-emerald-500/20 text-emerald-400' },
};

const CATEGORY_CONFIG = {
  patient: { label: 'Patient', icon: <User className="w-3 h-3" />, color: 'text-blue-400' },
  admin: { label: 'Verwaltung', icon: <CheckSquare className="w-3 h-3" />, color: 'text-violet-400' },
  followup: { label: 'Nachsorge', icon: <Clock className="w-3 h-3" />, color: 'text-amber-400' },
  general: { label: 'Allgemein', icon: <CheckSquare className="w-3 h-3" />, color: 'text-emerald-400' },
};

// ─── Component ──────────────────────────────────────────────

export const StaffTodoList: React.FC<StaffTodoListProps> = ({ currentUser, className = '' }) => {
  const { t } = useTranslation();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<TodoItem['priority']>('medium');
  const [newCategory, setNewCategory] = useState<TodoItem['category']>('general');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // ─── CRUD Operations ──────────────────────────────────

  const addTodo = useCallback(() => {
    if (!newText.trim()) return;
    const todo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: newText.trim(),
      completed: false,
      priority: newPriority,
      category: newCategory,
      assignee: currentUser.displayName,
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => [todo, ...prev]);
    setNewText('');
    setShowAddForm(false);
  }, [newText, newPriority, newCategory, currentUser]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t
    ));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTodoText = useCallback((id: string, text: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    setEditingId(null);
  }, []);

  // ─── Filter & Sort ─────────────────────────────────────

  const filteredTodos = todos
    .filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
    urgent: todos.filter(t => !t.completed && t.priority === 'urgent').length,
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className={`rounded-2xl border border-[var(--border-primary)] bg-white/5 backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-3 text-[var(--text-primary)]">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
              <CheckSquare className="w-4 h-4 text-violet-400" />
            </div>
            {t('todo.title', 'Aufgaben')}
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('todo.add', 'Neue Aufgabe')}
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: t('todo.all', 'Alle'), count: stats.total },
            { key: 'active' as const, label: t('todo.active', 'Offen'), count: stats.active },
            { key: 'completed' as const, label: t('todo.completed', 'Erledigt'), count: stats.completed },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                filter === f.key
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-white/5 text-[var(--text-muted)] border border-transparent hover:bg-white/10'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
          {stats.urgent > 0 && (
            <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {stats.urgent} {t('todo.urgentLabel', 'dringend')}
            </div>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 border-b border-[var(--border-primary)] bg-violet-500/5 space-y-3">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder={t('todo.placeholder', 'Aufgabe beschreiben...')}
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500/50"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TodoItem['priority'])}
              className="px-2 py-1.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            >
              <option value="urgent">{PRIORITY_CONFIG.urgent.label}</option>
              <option value="high">{PRIORITY_CONFIG.high.label}</option>
              <option value="medium">{PRIORITY_CONFIG.medium.label}</option>
              <option value="low">{PRIORITY_CONFIG.low.label}</option>
            </select>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as TodoItem['category'])}
              className="px-2 py-1.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none"
            >
              <option value="patient">{CATEGORY_CONFIG.patient.label}</option>
              <option value="admin">{CATEGORY_CONFIG.admin.label}</option>
              <option value="followup">{CATEGORY_CONFIG.followup.label}</option>
              <option value="general">{CATEGORY_CONFIG.general.label}</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {t('todo.cancel', 'Abbrechen')}
            </button>
            <button
              onClick={addTodo}
              disabled={!newText.trim()}
              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50 transition-all"
            >
              {t('todo.save', 'Speichern')}
            </button>
          </div>
        </div>
      )}

      {/* Todo List */}
      <div className="divide-y divide-[var(--border-primary)]">
        {filteredTodos.length === 0 && (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-xs font-medium">
              {filter === 'completed'
                ? t('todo.noCompleted', 'Noch keine erledigten Aufgaben.')
                : t('todo.noTasks', 'Keine offenen Aufgaben. 🎉')}
            </p>
          </div>
        )}

        {filteredTodos.map(todo => {
          const priorityCfg = PRIORITY_CONFIG[todo.priority];
          const categoryCfg = CATEGORY_CONFIG[todo.category];
          const isExpanded = expandedId === todo.id;
          const isEditing = editingId === todo.id;

          return (
            <div
              key={todo.id}
              className={`p-4 transition-all ${todo.completed ? 'opacity-50' : ''} hover:bg-white/[0.02]`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="mt-0.5 shrink-0 text-[var(--text-muted)] hover:text-violet-400 transition-colors"
                >
                  {todo.completed
                    ? <CheckSquare className="w-5 h-5 text-emerald-400" />
                    : <Square className="w-5 h-5" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateTodoText(todo.id, editText);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 px-2 py-1 bg-[var(--bg-input)] border border-violet-500/50 rounded text-sm text-[var(--text-primary)] focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => updateTodoText(todo.id, editText)} className="text-emerald-400 hover:text-emerald-300">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-[var(--text-muted)] hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`text-sm ${todo.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'} cursor-pointer`}
                      onClick={() => setExpandedId(isExpanded ? null : todo.id)}
                    >
                      {todo.text}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${priorityCfg.badge}`}>
                      {priorityCfg.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-medium ${categoryCfg.color}`}>
                      {categoryCfg.icon}
                      {categoryCfg.label}
                    </span>
                    {todo.assignee && (
                      <span className="text-[9px] text-[var(--text-muted)]">
                        → {todo.assignee}
                      </span>
                    )}
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {new Date(todo.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && !isEditing && (
                    <div className="mt-2 text-[10px] text-[var(--text-muted)] space-y-1">
                      {todo.patientName && <p>Patient: {todo.patientName}</p>}
                      {todo.sessionId && <p>Session: {todo.sessionId.slice(0, 8)}...</p>}
                      {todo.completedAt && <p>{t('todo.completedAt', 'Erledigt am')}: {new Date(todo.completedAt).toLocaleString('de-DE')}</p>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingId(todo.id); setEditText(todo.text); }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                    title={t('todo.edit', 'Bearbeiten')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    title={t('todo.delete', 'Löschen')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add (always visible at bottom) */}
      {!showAddForm && (
        <div className="p-4 border-t border-[var(--border-primary)]">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border-primary)] text-xs text-[var(--text-muted)] hover:text-violet-400 hover:border-violet-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('todo.quickAdd', 'Aufgabe hinzufügen...')}
          </button>
        </div>
      )}
    </div>
  );
};
