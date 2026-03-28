import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, Check, AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useFormGet, useFormSubmit } from '../../hooks/useApi';
import { useSessionStore } from '../../store/sessionStore';

/* ── Types ── */

type QuestionType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'DATE'
  | 'NUMBER'
  | 'SCALE'
  | 'FILE';

interface ConditionalOn {
  questionId: string;
  value: string;
}

interface FormQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  placeholder: string;
  conditionalOn: ConditionalOn | null;
}

interface FormRunnerPageProps {
  /** Optional external questions array. Falls back to built-in sample. */
  questions?: FormQuestion[];
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

function normalizeQuestions(questions: PersistedFormQuestion[]): FormQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    label: question.label,
    type: question.type,
    required: question.required,
    options: question.options ?? [],
    placeholder: question.placeholder ?? '',
    conditionalOn: question.conditionalOn ?? null,
  }));
}

/* ── Sample form ── */

const SAMPLE_QUESTIONS: FormQuestion[] = [
  {
    id: 'q1',
    label: 'Wie ist Ihr vollständiger Name?',
    type: 'TEXT',
    required: true,
    options: [],
    placeholder: 'Vor- und Nachname',
    conditionalOn: null,
  },
  {
    id: 'q2',
    label: 'Bitte beschreiben Sie Ihre aktuellen Beschwerden.',
    type: 'TEXTAREA',
    required: true,
    options: [],
    placeholder: 'Beschreiben Sie Ihre Symptome möglichst genau…',
    conditionalOn: null,
  },
  {
    id: 'q3',
    label: 'Welche Vorerkrankungen haben Sie?',
    type: 'MULTI_SELECT',
    required: false,
    options: ['Diabetes', 'Bluthochdruck', 'Asthma', 'Herzerkrankung', 'Keine'],
    placeholder: '',
    conditionalOn: null,
  },
  {
    id: 'q4',
    label: 'Nehmen Sie regelmäßig Medikamente ein?',
    type: 'RADIO',
    required: true,
    options: ['Ja', 'Nein'],
    placeholder: '',
    conditionalOn: null,
  },
  {
    id: 'q5',
    label: 'Welche Medikamente nehmen Sie ein?',
    type: 'TEXTAREA',
    required: true,
    options: [],
    placeholder: 'Name, Dosis, Häufigkeit…',
    conditionalOn: { questionId: 'q4', value: 'Ja' },
  },
];

/* ── Field renderer ── */

function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: FormQuestion;
  value: string | string[];
  onChange: (val: string | string[]) => void;
  error: boolean;
}) {
  const base = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
    error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-gray-600'
  }`;

  switch (question.type) {
    case 'TEXTAREA':
      return (
        <textarea
          rows={4}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className={base}
        />
      );

    case 'SELECT':
      return (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          aria-label={question.label}
          className={base}
        >
          <option value="">{question.placeholder || '— Bitte wählen —'}</option>
          {question.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );

    case 'MULTI_SELECT': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-col gap-2">
          {question.options.map((o) => {
            const checked = selected.includes(o);
            return (
              <label
                key={o}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((s) => s !== o) : [...selected, o])
                  }
                  title={o}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{o}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'RADIO':
      return (
        <div className="flex flex-col gap-2">
          {question.options.map((o) => (
            <label
              key={o}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <input
                type="radio"
                name={question.id}
                checked={value === o}
                onChange={() => onChange(o)}
                title={o}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{o}</span>
            </label>
          ))}
        </div>
      );

    case 'CHECKBOX':
      return (
        <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : '')}
            title={question.label}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Ja
        </label>
      );

    case 'DATE':
      return (
        <input
          type="date"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          title={question.label}
          className={base}
        />
      );

    case 'NUMBER':
      return (
        <input
          type="number"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className={base}
        />
      );

    case 'SCALE': {
      const num = Number(value) || 5;
      return (
        <div className="space-y-2">
          <input
            type="range"
            min={1}
            max={10}
            value={num}
            onChange={(e) => onChange(e.target.value)}
            title={question.label}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={num === i + 1 ? 'font-bold text-blue-600' : ''}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case 'FILE':
      return (
        <input
          type="file"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
          title={question.label}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400 dark:file:bg-blue-900/30 dark:file:text-blue-400"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className={base}
        />
      );
  }
}

/* ── Main component ── */

export function FormRunnerPage({ questions: externalQuestions }: FormRunnerPageProps) {
  const { formId } = useParams<{ formId: string }>();
  const sessionId = useSessionStore((state) => state.sessionId);
  const formQuery = useFormGet(formId ?? '');
  const submitMutation = useFormSubmit();

  const questions = useMemo(() => {
    if (externalQuestions) {
      return externalQuestions;
    }

    const loadedQuestions = Array.isArray((formQuery.data as { questions?: PersistedFormQuestion[] } | null)?.questions)
      ? normalizeQuestions(((formQuery.data as { questions?: PersistedFormQuestion[] }).questions ?? []))
      : null;

    if (loadedQuestions) {
      return loadedQuestions;
    }

    return formId ? [] : SAMPLE_QUESTIONS;
  }, [externalQuestions, formId, formQuery.data]);

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Visibility: evaluate conditional logic */
  const visibleQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (!q.conditionalOn) return true;
        const depAnswer = answers[q.conditionalOn.questionId];
        if (Array.isArray(depAnswer)) return depAnswer.includes(q.conditionalOn.value);
        return depAnswer === q.conditionalOn.value;
      }),
    [questions, answers],
  );

  /* Progress */
  const answeredCount = useMemo(
    () =>
      visibleQuestions.filter((q) => {
        const a = answers[q.id];
        if (Array.isArray(a)) return a.length > 0;
        return !!a;
      }).length,
    [visibleQuestions, answers],
  );
  const progressPct = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;

  /* Handlers */
  const updateAnswer = useCallback((qId: string, val: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    setFieldErrors((prev) => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    const errs = new Set<string>();

    visibleQuestions.forEach((q) => {
      if (!q.required) return;
      const a = answers[q.id];
      const empty = !a || (Array.isArray(a) && a.length === 0);
      if (empty) errs.add(q.id);
    });

    setFieldErrors(errs);

    if (errs.size > 0) return;

    const result: Record<string, string | string[]> = {};
    visibleQuestions.forEach((q) => {
      if (answers[q.id] !== undefined) result[q.id] = answers[q.id];
    });

    if (!formId) {
      setSubmitError(null);
      setSubmitted(true);
      return;
    }

    if (!sessionId) {
      setSubmitError('Sitzung nicht verfügbar.');
      return;
    }

    try {
      setSubmitError(null);
      await submitMutation.mutateAsync({
        formId,
        sessionId,
        answers: result,
        submittedAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Formular konnte nicht übermittelt werden.');
    }
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Vielen Dank!
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ihre Antworten wurden erfolgreich übermittelt.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
              setFieldErrors(new Set());
            }}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Neues Formular starten
          </button>
        </div>
      </div>
    );
  }

  /* ── Form view ── */
  if (formId && formQuery.isLoading) {
    return <div className="mx-auto max-w-2xl p-6 text-sm text-gray-500 dark:text-gray-400">Formular wird geladen…</div>;
  }

  if (formId && formQuery.error) {
    return <div className="mx-auto max-w-2xl p-6 text-sm text-red-600 dark:text-red-400">Formular konnte nicht geladen werden.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {answeredCount} / {visibleQuestions.length} beantwortet
          </span>
          <span>{progressPct}%</span>
        </div>
        <progress
          max={100}
          value={progressPct}
          className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-blue-600 [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-blue-600 dark:[&::-webkit-progress-bar]:bg-gray-700"
        />
      </div>

      {/* Questions */}
      {visibleQuestions.map((q, i) => {
        const hasError = fieldErrors.has(q.id);

        return (
          <div
            key={q.id}
            className={`rounded-xl border bg-white p-6 shadow-sm transition-colors dark:bg-gray-800 ${
              hasError
                ? 'border-red-400 dark:border-red-600'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <label className="mb-3 flex items-start gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                {i + 1}
              </span>
              <span>
                {q.label}
                {q.required && <span className="ml-1 text-red-500">*</span>}
              </span>
            </label>

            <div className="ml-8">
              <QuestionField
                question={q}
                value={answers[q.id] ?? (q.type === 'MULTI_SELECT' ? [] : '')}
                onChange={(val) => updateAnswer(q.id, val)}
                error={hasError}
              />

              {hasError && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Dieses Feld ist erforderlich.
                </p>
              )}
            </div>
          </div>
        );
      })}

      {visibleQuestions.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">Keine Fragen vorhanden.</p>
      )}

      {submitError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400">
          {submitError}
        </div>
      )}

      {/* Submit */}
      {visibleQuestions.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Absenden <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
