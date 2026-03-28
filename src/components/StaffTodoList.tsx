import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare, Square, Plus, Trash2, AlertTriangle, Clock,
  User, Edit3, X, Check
} from 'lucide-react';
import apiClient from '../api/client';

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
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const todoQueryKey = ['staff-todos', currentUser.id] as const;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<TodoItem['priority']>('medium');
  const [newCategory, setNewCategory] = useState<TodoItem['category']>('general');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);

  const normalizeTodo = useCallback((todo: TodoItem): TodoItem => ({
    ...todo,
    assignee: todo.assignee || currentUser.displayName,
  }), [currentUser.displayName]);

  const todoQuery = useQuery<TodoItem[]>({
    queryKey: todoQueryKey,
    queryFn: async () => {
      const res = await apiClient.get('/todos');
      return res.data as TodoItem[];
    },
  });

  const createTodoMutation = useMutation({
    mutationFn: async (payload: Pick<TodoItem, 'text' | 'priority' | 'category'>) => {
      const res = await apiClient.post('/todos', payload);
      return res.data as TodoItem;
    },
    onMutate: () => {
      setOperationError(null);
    },
    onSuccess: (createdTodo) => {
      queryClient.setQueryData<TodoItem[]>(todoQueryKey, (previousTodos = []) => [
        normalizeTodo(createdTodo),
        ...previousTodos,
      ]);
      setNewText('');
      setShowAddForm(false);
    },
    onError: (err) => {
      console.error('[StaffTodoList] create error:', err);
      setOperationError(t('todo.createError', 'Aufgabe konnte nicht erstellt werden.'));
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Pick<TodoItem, 'text' | 'completed'>> }) => {
      const res = await apiClient.put(`/todos/${id}`, payload);
      return res.data as TodoItem;
    },
    onMutate: () => {
      setOperationError(null);
    },
    onSuccess: (updatedTodo) => {
      queryClient.setQueryData<TodoItem[]>(todoQueryKey, (previousTodos = []) =>
        previousTodos.map(todo => (todo.id === updatedTodo.id ? normalizeTodo(updatedTodo) : todo))
      );
      setEditingId(null);
    },
    onError: (err) => {
      console.error('[StaffTodoList] update error:', err);
      setOperationError(t('todo.updateError', 'Aufgabe konnte nicht aktualisiert werden.'));
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/todos/${id}`);
      return id;
    },
    onMutate: () => {
      setOperationError(null);
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<TodoItem[]>(todoQueryKey, (previousTodos = []) =>
        previousTodos.filter(todo => todo.id !== deletedId)
      );
    },
    onError: (err) => {
      console.error('[StaffTodoList] delete error:', err);
      setOperationError(t('todo.deleteError', 'Aufgabe konnte nicht gelöscht werden.'));
    },
  });

  const todos = todoQuery.data ?? [];

  // ─── CRUD Operations ──────────────────────────────────

  const addTodo = useCallback(async () => {
    if (!newText.trim()) return;
    createTodoMutation.mutate({
        text: newText.trim(),
        priority: newPriority,
        category: newCategory,
      });
  }, [createTodoMutation, newCategory, newPriority, newText]);

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    updateTodoMutation.mutate({ id, payload: { completed: !todo.completed } });
  }, [todos, updateTodoMutation]);

  const deleteTodo = useCallback(async (id: string) => {
    deleteTodoMutation.mutate(id);
  }, [deleteTodoMutation]);

  const updateTodoText = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return;
    updateTodoMutation.mutate({ id, payload: { text: text.trim() } });
  }, [updateTodoMutation]);

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

  const visibleError = operationError ?? (todoQuery.error ? t('todo.fetchError', 'Aufgaben konnten nicht geladen werden.') : null);

  // ─── Render ────────────────────────────────────────────

  return (
    <div className={`rounded-2xl border border-(--border-primary) bg-white/5 backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-(--border-primary)">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-3 text-(--text-primary)">
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
                  : 'bg-white/5 text-(--text-muted) border border-transparent hover:bg-white/10'
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

        {visibleError && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {visibleError}
          </div>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 border-b border-(--border-primary) bg-violet-500/5 space-y-3">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            aria-label={t('todo.placeholder', 'Aufgabe beschreiben...')}
            placeholder={t('todo.placeholder', 'Aufgabe beschreiben...')}
            className="w-full px-3 py-2.5 bg-(--bg-input) border border-(--border-primary) rounded-xl text-sm text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:border-violet-500/50"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TodoItem['priority'])}
              aria-label={t('todo.priority', 'Priorität')}
              className="px-2 py-1.5 bg-(--bg-input) border border-(--border-primary) rounded-lg text-xs text-(--text-primary) focus:outline-none"
            >
              <option value="urgent">{PRIORITY_CONFIG.urgent.label}</option>
              <option value="high">{PRIORITY_CONFIG.high.label}</option>
              <option value="medium">{PRIORITY_CONFIG.medium.label}</option>
              <option value="low">{PRIORITY_CONFIG.low.label}</option>
            </select>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as TodoItem['category'])}
              aria-label={t('todo.category', 'Kategorie')}
              className="px-2 py-1.5 bg-(--bg-input) border border-(--border-primary) rounded-lg text-xs text-(--text-primary) focus:outline-none"
            >
              <option value="patient">{CATEGORY_CONFIG.patient.label}</option>
              <option value="admin">{CATEGORY_CONFIG.admin.label}</option>
              <option value="followup">{CATEGORY_CONFIG.followup.label}</option>
              <option value="general">{CATEGORY_CONFIG.general.label}</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-(--text-muted) hover:text-(--text-secondary) transition-colors"
            >
              {t('todo.cancel', 'Abbrechen')}
            </button>
            <button
              onClick={addTodo}
              disabled={!newText.trim() || createTodoMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50 transition-all"
            >
              {t('todo.save', 'Speichern')}
            </button>
          </div>
        </div>
      )}

      {/* Todo List */}
      <div className="divide-y divide-(--border-primary)">
        {filteredTodos.length === 0 && (
          <div className="p-8 text-center text-(--text-muted)">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-xs font-medium">
              {todoQuery.isLoading
                ? t('todo.loading', 'Aufgaben werden geladen...')
                : filter === 'completed'
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
              className={`p-4 transition-all ${todo.completed ? 'opacity-50' : ''} hover:bg-white/2`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  aria-label={todo.completed ? t('todo.markOpen', 'Als offen markieren') : t('todo.markDone', 'Als erledigt markieren')}
                  className="mt-0.5 shrink-0 text-(--text-muted) hover:text-violet-400 transition-colors"
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
                        aria-label={t('todo.edit', 'Bearbeiten')}
                        className="flex-1 px-2 py-1 bg-(--bg-input) border border-violet-500/50 rounded text-sm text-(--text-primary) focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => updateTodoText(todo.id, editText)} aria-label={t('todo.save', 'Speichern')} className="text-emerald-400 hover:text-emerald-300">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} aria-label={t('todo.cancel', 'Abbrechen')} className="text-(--text-muted) hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`text-sm ${todo.completed ? 'line-through text-(--text-muted)' : 'text-(--text-primary)'} cursor-pointer`}
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
                      <span className="text-[9px] text-(--text-muted)">
                        → {todo.assignee}
                      </span>
                    )}
                    <span className="text-[9px] text-(--text-muted)">
                      {new Date(todo.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && !isEditing && (
                    <div className="mt-2 text-[10px] text-(--text-muted) space-y-1">
                      {todo.patientName && <p>Patient: {todo.patientName}</p>}
                      {todo.sessionId && <p>Session: {todo.sessionId.slice(0, 8)}...</p>}
                      {todo.completedAt && <p>{t('todo.completedAt', 'Erledigt am')}: {new Date(todo.completedAt).toLocaleString(i18n.language)}</p>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingId(todo.id); setEditText(todo.text); }}
                    className="p-1.5 text-(--text-muted) hover:text-blue-400 transition-colors"
                    title={t('todo.edit', 'Bearbeiten')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 text-(--text-muted) hover:text-red-400 transition-colors"
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
        <div className="p-4 border-t border-(--border-primary)">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-(--border-primary) text-xs text-(--text-muted) hover:text-violet-400 hover:border-violet-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('todo.quickAdd', 'Aufgabe hinzufügen...')}
          </button>
        </div>
      )}
    </div>
  );
};
