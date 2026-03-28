import { useState, useReducer, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { Plus, Trash2, GripVertical, Eye, Save, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useFormAiGenerate, useFormCreate, useFormGet, useFormUpdate } from '../../hooks/useApi';
import { useStaffSession } from '../../hooks/useStaffSession';
import { resolvePraxisId } from '../../lib/praxisContext';

/* ── Types ── */

const QUESTION_TYPES = [
  'TEXT',
  'TEXTAREA',
  'SELECT',
  'MULTI_SELECT',
  'RADIO',
  'CHECKBOX',
  'DATE',
  'NUMBER',
  'SCALE',
  'FILE',
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

const TYPES_WITH_OPTIONS: QuestionType[] = ['SELECT', 'MULTI_SELECT', 'RADIO'];

interface ConditionalOn {
  questionId: string;
  value: string;
}

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string;
  placeholder: string;
  conditionalOn: ConditionalOn | null;
}

interface FormMeta {
  name: string;
  description: string;
  tags: string;
}

interface FormState {
  meta: FormMeta;
  questions: Question[];
  selectedId: string | null;
}

interface PersistedFormQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  conditionalOn?: ConditionalOn | null;
}

interface PersistedForm {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  questions?: PersistedFormQuestion[];
}

/* ── Reducer ── */

type Action =
  | { type: 'SET_META'; field: keyof FormMeta; value: string }
  | { type: 'ADD_QUESTION' }
  | { type: 'REMOVE_QUESTION'; id: string }
  | { type: 'UPDATE_QUESTION'; id: string; patch: Partial<Question> }
  | { type: 'SELECT_QUESTION'; id: string | null }
  | { type: 'HYDRATE_FORM'; value: FormState }
  | { type: 'MOVE_QUESTION'; fromIdx: number; toIdx: number };

function uid(): string {
  return crypto.randomUUID?.() ?? `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newQuestion(): Question {
  return {
    id: uid(),
    label: '',
    type: 'TEXT',
    required: false,
    options: '',
    placeholder: '',
    conditionalOn: null,
  };
}

function formReducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET_META':
      return { ...state, meta: { ...state.meta, [action.field]: action.value } };

    case 'ADD_QUESTION': {
      const q = newQuestion();
      return { ...state, questions: [...state.questions, q], selectedId: q.id };
    }

    case 'REMOVE_QUESTION': {
      const next = state.questions.filter((q) => q.id !== action.id);
      return {
        ...state,
        questions: next,
        selectedId: state.selectedId === action.id ? (next[0]?.id ?? null) : state.selectedId,
      };
    }

    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.id ? { ...q, ...action.patch } : q,
        ),
      };

    case 'SELECT_QUESTION':
      return { ...state, selectedId: action.id };

    case 'HYDRATE_FORM':
      return action.value;

    case 'MOVE_QUESTION': {
      const qs = [...state.questions];
      const [moved] = qs.splice(action.fromIdx, 1);
      qs.splice(action.toIdx, 0, moved);
      return { ...state, questions: qs };
    }

    default:
      return state;
  }
}

const initialState: FormState = {
  meta: { name: '', description: '', tags: '' },
  questions: [],
  selectedId: null,
};

function toFormState(form: PersistedForm): FormState {
  const questions = (form.questions ?? []).map((question) => ({
    id: question.id,
    label: question.label,
    type: question.type,
    required: question.required,
    options: (question.options ?? []).join(', '),
    placeholder: question.placeholder ?? '',
    conditionalOn: question.conditionalOn ?? null,
  }));

  return {
    meta: {
      name: form.name,
      description: form.description ?? '',
      tags: (form.tags ?? []).join(', '),
    },
    questions,
    selectedId: questions[0]?.id ?? null,
  };
}

/* ── Sub-components ── */

function QuestionListItem({
  question,
  index,
  total,
  isSelected,
  onSelect,
  onRemove,
  onMove,
}: {
  question: Question;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
      }`}
      onClick={onSelect}
    >
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMove(index, index - 1);
          }}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
          aria-label="Nach oben"
        >
          ▲
        </button>
        <GripVertical className="h-3.5 w-3.5 text-gray-400" />
        <button
          type="button"
          disabled={index === total - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMove(index, index + 1);
          }}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
          aria-label="Nach unten"
        >
          ▼
        </button>
      </div>

      <span className="flex-1 truncate">
        {question.label || <span className="italic text-gray-400">Frage {index + 1}</span>}
      </span>

      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {question.type}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 text-red-400 hover:text-red-600"
        aria-label="Frage entfernen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function QuestionEditor({
  question,
  allQuestions,
  dispatch,
}: {
  question: Question;
  allQuestions: Question[];
  dispatch: React.Dispatch<Action>;
}) {
  const update = (patch: Partial<Question>) =>
    dispatch({ type: 'UPDATE_QUESTION', id: question.id, patch });

  const otherQuestions = allQuestions.filter((q) => q.id !== question.id);
  const showOptions = TYPES_WITH_OPTIONS.includes(question.type);

  return (
    <div className="space-y-5">
      {/* Label */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Fragentext
        </label>
        <input
          type="text"
          value={question.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="z. B. Haben Sie Allergien?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Type + Required */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Typ
          </label>
          <select
            value={question.type}
            onChange={(e) => update({ type: e.target.value as QuestionType })}
            aria-label="Fragetyp"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 pb-1">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => update({ required: e.target.checked })}
              className="peer sr-only"
              title="Pflichtfeld umschalten"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700" />
          </label>
          <span className="text-sm text-gray-700 dark:text-gray-300">Pflichtfeld</span>
        </div>
      </div>

      {/* Options */}
      {showOptions && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Optionen <span className="text-xs text-gray-400">(kommagetrennt)</span>
          </label>
          <input
            type="text"
            value={question.options}
            onChange={(e) => update({ options: e.target.value })}
            placeholder="Option A, Option B, Option C"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}

      {/* Placeholder */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Platzhalter
        </label>
        <input
          type="text"
          value={question.placeholder}
          onChange={(e) => update({ placeholder: e.target.value })}
          placeholder="Platzhaltertext…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Conditional logic */}
      <fieldset className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Bedingte Anzeige
        </legend>

        {otherQuestions.length === 0 ? (
          <p className="text-xs text-gray-400">Fügen Sie weitere Fragen hinzu, um Bedingungen zu setzen.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Abhängig von Frage</label>
              <select
                value={question.conditionalOn?.questionId ?? ''}
                onChange={(e) => {
                  const qId = e.target.value;
                  update({
                    conditionalOn: qId ? { questionId: qId, value: question.conditionalOn?.value ?? '' } : null,
                  });
                }}
                aria-label="Abhängig von Frage"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">— Keine —</option>
                {otherQuestions.map((oq) => (
                  <option key={oq.id} value={oq.id}>
                    {oq.label || `Frage (${oq.id.slice(0, 6)})`}
                  </option>
                ))}
              </select>
            </div>

            {question.conditionalOn?.questionId && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Wenn Antwort gleich</label>
                <input
                  type="text"
                  value={question.conditionalOn.value}
                  onChange={(e) =>
                    update({
                      conditionalOn: {
                        questionId: question.conditionalOn!.questionId,
                        value: e.target.value,
                      },
                    })
                  }
                  placeholder="Erwarteter Wert"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}

/* ── Preview renderer ── */

function PreviewField({ question }: { question: Question }) {
  const opts = question.options
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const base =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  switch (question.type) {
    case 'TEXTAREA':
      return <textarea rows={3} placeholder={question.placeholder} className={base} readOnly />;
    case 'SELECT':
    case 'MULTI_SELECT':
      return (
        <select className={base} disabled aria-label="Auswahl Vorschau">
          <option>{question.placeholder || '— Auswählen —'}</option>
          {opts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case 'RADIO':
      return (
        <div className="flex flex-col gap-1.5">
          {opts.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" name={question.id} disabled /> {o}
            </label>
          ))}
        </div>
      );
    case 'CHECKBOX':
      return <input type="checkbox" disabled className="h-5 w-5 rounded" title="Checkbox Vorschau" />;
    case 'DATE':
      return <input type="date" className={base} disabled title="Datum Vorschau" />;
    case 'NUMBER':
      return <input type="number" placeholder={question.placeholder} className={base} disabled />;
    case 'SCALE':
      return (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">1</span>
          <input type="range" min={1} max={10} className="flex-1" disabled title="Skala Vorschau" />
          <span className="text-xs text-gray-500">10</span>
        </div>
      );
    case 'FILE':
      return <input type="file" disabled className="text-sm text-gray-500" title="Datei Vorschau" />;
    default:
      return <input type="text" placeholder={question.placeholder} className={base} disabled />;
  }
}

/* ── Main component ── */

export function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const praxisId = resolvePraxisId();
  const hydratedFormIdRef = useRef<string | null>(null);
  const staffSession = useStaffSession();
  const formQuery = useFormGet(formId ?? '');
  const formCreateMutation = useFormCreate();
  const formUpdateMutation = useFormUpdate();
  const formAiGenerateMutation = useFormAiGenerate();
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [preview, setPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!formId || !formQuery.data || hydratedFormIdRef.current === formId) {
      return;
    }

    dispatch({ type: 'HYDRATE_FORM', value: toFormState(formQuery.data as PersistedForm) });
    hydratedFormIdRef.current = formId;
    setErrors([]);
  }, [formId, formQuery.data]);

  const selected = state.questions.find((q) => q.id === state.selectedId) ?? null;

  /* ── Validation & Save ── */
  const validate = useCallback((): string[] => {
    const errs: string[] = [];
    if (!state.meta.name.trim()) errs.push('Formularname ist erforderlich.');
    if (state.questions.length === 0) errs.push('Mindestens eine Frage ist erforderlich.');
    state.questions.forEach((q, i) => {
      if (!q.label.trim()) errs.push(`Frage ${i + 1}: Fragentext fehlt.`);
      if (TYPES_WITH_OPTIONS.includes(q.type) && !q.options.trim()) {
        errs.push(`Frage ${i + 1} (${q.type}): Optionen fehlen.`);
      }
    });
    return errs;
  }, [state]);

  const handleSave = async () => {
    const errs = validate();
    const currentUserId = staffSession.data?.id;
    if (!currentUserId) {
      errs.push('Angemeldeter Mitarbeiter konnte nicht ermittelt werden.');
    }

    setErrors(errs);
    if (errs.length > 0) return;

    const payload = {
      name: state.meta.name,
      description: state.meta.description || undefined,
      tags: state.meta.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      questions: state.questions.map(({ id, label, type, required, options, placeholder, conditionalOn }) => ({
        id,
        label,
        type,
        required,
        options: TYPES_WITH_OPTIONS.includes(type)
          ? options.split(',').map((o) => o.trim()).filter(Boolean)
          : [],
        placeholder: placeholder || undefined,
        ...(conditionalOn ? { conditionalOn } : {}),
      })),
    };

    try {
      setStatusMessage(null);
      if (formId) {
        await formUpdateMutation.mutateAsync({ id: formId, ...payload });
      } else {
        await formCreateMutation.mutateAsync({
          praxisId,
          createdBy: currentUserId!,
          ...payload,
        });
      }
      setErrors([]);
      setStatusMessage('Formular gespeichert.');
    } catch (error) {
      setStatusMessage(null);
      setErrors([error instanceof Error ? error.message : 'Formular konnte nicht gespeichert werden.']);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!staffSession.data?.id) {
      setErrors(['Angemeldeter Mitarbeiter konnte nicht ermittelt werden.']);
      return;
    }

    try {
      const generatedForm = await formAiGenerateMutation.mutateAsync({
        praxisId,
        createdBy: staffSession.data.id,
        prompt: aiPrompt.trim(),
        language: 'de',
      });

      dispatch({ type: 'HYDRATE_FORM', value: toFormState(generatedForm as PersistedForm) });
      hydratedFormIdRef.current = formId ?? null;
      setErrors([]);
      setStatusMessage('KI-Formular übernommen.');
      setShowAi(false);
      setAiPrompt('');
    } catch (error) {
      setStatusMessage(null);
      setErrors([error instanceof Error ? error.message : 'KI-Formular konnte nicht generiert werden.']);
    }
  };

  /* ── Preview mode ── */
  if (preview) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vorschau: {state.meta.name || 'Unbenanntes Formular'}
          </h1>
          <button
            type="button"
            onClick={() => setPreview(false)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" /> Editor
          </button>
        </div>

        {state.meta.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{state.meta.description}</p>
        )}

        {state.questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">
              {i + 1}. {q.label || '(kein Text)'}
              {q.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            <PreviewField question={q} />
          </div>
        ))}

        {state.questions.length === 0 && (
          <p className="text-center text-sm text-gray-400">Keine Fragen vorhanden.</p>
        )}
      </div>
    );
  }

  /* ── Editor mode ── */
  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Formular-Builder</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAi((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" /> KI-Formular generieren
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" /> Vorschau
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" /> Speichern
          </button>
        </div>
      </header>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mx-6 mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400">
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {statusMessage && (
        <div className="mx-6 mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {statusMessage}
        </div>
      )}

      {/* AI prompt modal */}
      {showAi && (
        <div className="mx-6 mt-3 rounded-lg border border-purple-300 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/20">
          <label className="mb-1 block text-sm font-medium text-purple-800 dark:text-purple-300">
            Beschreiben Sie das gewünschte Formular:
          </label>
          <textarea
            rows={3}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="z. B. Erstelle ein Aufnahmeformular für orthopädische Patienten…"
            className="mb-2 w-full rounded-lg border border-purple-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-purple-600 dark:bg-gray-800 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAiGenerate}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              Generieren
            </button>
            <button
              type="button"
              onClick={() => setShowAi(false)}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 lg:w-80">
          {/* Meta */}
          <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-700">
            <input
              type="text"
              value={state.meta.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                dispatch({ type: 'SET_META', field: 'name', value: e.target.value })
              }
              placeholder="Formularname *"
              aria-label="Formularname *"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <textarea
              rows={2}
              value={state.meta.description}
              onChange={(e) =>
                dispatch({ type: 'SET_META', field: 'description', value: e.target.value })
              }
              placeholder="Beschreibung"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <input
              type="text"
              value={state.meta.tags}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                dispatch({ type: 'SET_META', field: 'tags', value: e.target.value })
              }
              placeholder="Tags (kommagetrennt)"
              aria-label="Tags (kommagetrennt)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Question list */}
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {state.questions.map((q, i) => (
              <QuestionListItem
                key={q.id}
                question={q}
                index={i}
                total={state.questions.length}
                isSelected={q.id === state.selectedId}
                onSelect={() => dispatch({ type: 'SELECT_QUESTION', id: q.id })}
                onRemove={() => dispatch({ type: 'REMOVE_QUESTION', id: q.id })}
                onMove={(from, to) => dispatch({ type: 'MOVE_QUESTION', fromIdx: from, toIdx: to })}
              />
            ))}
          </div>

          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              type="button"
              onClick={() => dispatch({ type: 'ADD_QUESTION' })}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              <Plus className="h-4 w-4" /> Frage hinzufügen
            </button>
          </div>
        </aside>

        {/* Main editor area */}
        <main className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <QuestionEditor question={selected} allQuestions={state.questions} dispatch={dispatch} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {state.questions.length === 0
                  ? 'Klicken Sie auf „Frage hinzufügen", um zu beginnen.'
                  : 'Wählen Sie eine Frage aus der Liste aus.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
