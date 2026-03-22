/**
 * ChunkedQuestionnaire - UX-Fix #2: Reduziert Cognitive Load
 * 
 * Problem (Meta-Synthese): 270+ Fragen auf einmal = 65% Abbruchrate
 * Lösung: Chunking in 10-Fragen-Blöcke mit Fortschrittsanzeige
 * Erwarteter Impact: Abbruchrate 65% -> 35%
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Save, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'date';
  question: string;
  options?: string[];
  required?: boolean;
  category: string;
}

interface ChunkedQuestionnaireProps {
  questions: Question[];
  chunkSize?: number;
  sessionId: string;
  patientId: string;
  onComplete: (answers: Record<string, any>) => void;
  onSaveProgress?: (answers: Record<string, any>, currentChunk: number) => void;
}

interface SavedProgress {
  answers: Record<string, any>;
  currentChunk: number;
  timestamp: number;
}

const CHUNK_SIZE = 10;
const AUTO_SAVE_INTERVAL = 30000; // 30 Sekunden

export function ChunkedQuestionnaire({
  questions,
  chunkSize = CHUNK_SIZE,
  sessionId,
  onComplete,
  onSaveProgress
}: ChunkedQuestionnaireProps) {
  const { t } = useTranslation();
  const [currentChunk, setCurrentChunk] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const totalChunks = Math.ceil(questions.length / chunkSize);
  const currentQuestions = questions.slice(
    currentChunk * chunkSize,
    (currentChunk + 1) * chunkSize
  );

  // Fortschritt laden beim Mount
  useEffect(() => {
    loadProgress();
  }, []);

  // Auto-Save alle 30 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress(false);
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [answers, currentChunk]);

  // Speichern im localStorage (Backup)
  const saveProgress = useCallback(async (showFeedback = true) => {
    if (showFeedback) setIsSaving(true);

    const progress: SavedProgress = {
      answers,
      currentChunk,
      timestamp: Date.now()
    };

    // LocalStorage Backup
    localStorage.setItem(`anamnese_progress_${sessionId}`, JSON.stringify(progress));

    // Server-Side Speicherung (falls verfügbar)
    if (onSaveProgress) {
      try {
        await onSaveProgress(answers, currentChunk);
      } catch (error) {
        console.error('Server save failed, using localStorage:', error);
      }
    }

    setLastSaved(new Date());
    if (showFeedback) setIsSaving(false);
  }, [answers, currentChunk, sessionId, onSaveProgress]);

  // Fortschritt laden
  const loadProgress = useCallback(async () => {
    setIsLoading(true);

    try {
      // Versuche vom Server zu laden
      const response = await fetch(`/api/anamnese/progress/${sessionId}`);
      if (response.ok) {
        const serverProgress = await response.json();
        setAnswers(serverProgress.answers || {});
        setCurrentChunk(serverProgress.currentChunk || 0);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.log('Server load failed, trying localStorage');
    }

    // Fallback: LocalStorage
    const saved = localStorage.getItem(`anamnese_progress_${sessionId}`);
    if (saved) {
      const progress: SavedProgress = JSON.parse(saved);
      // Prüfe ob nicht älter als 7 Tage
      if (Date.now() - progress.timestamp < 7 * 24 * 60 * 60 * 1000) {
        setAnswers(progress.answers || {});
        setCurrentChunk(progress.currentChunk || 0);
      }
    }

    setIsLoading(false);
  }, [sessionId]);

  // Antwort aktualisieren
  const handleAnswer = useCallback((questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  }, []);

  // Nächster Chunk
  const handleNext = useCallback(async () => {
    await saveProgress(false);

    if (currentChunk < totalChunks - 1) {
      setCurrentChunk(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Letzter Chunk -> Abschließen
      onComplete(answers);
    }
  }, [currentChunk, totalChunks, answers, onComplete, saveProgress]);

  // Vorheriger Chunk
  const handlePrevious = useCallback(() => {
    if (currentChunk > 0) {
      setCurrentChunk(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentChunk]);

  // Fortschritt berechnen
  const progress = ((currentChunk + 1) / totalChunks) * 100;
  const answeredQuestions = Object.keys(answers).length;
  const totalAnsweredPercent = (answeredQuestions / questions.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
        <span className="ml-3 text-[var(--text-secondary)]">
          {t('questionnaire.loading', 'Lade Fortschritt...')}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {t('questionnaire.step', 'Schritt {{current}} von {{total}}', {
              current: currentChunk + 1,
              total: totalChunks
            })}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">
            {Math.round(totalAnsweredPercent)}% {t('questionnaire.completed', 'abgeschlossen')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Category Indicator */}
        {currentQuestions[0]?.category && (
          <div className="mt-3 text-sm font-medium text-[var(--accent-primary)]">
            {currentQuestions[0].category}
          </div>
        )}
      </div>

      {/* Fragen */}
      <div className="space-y-6 mb-8">
        {currentQuestions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={currentChunk * chunkSize + index + 1}
            value={answers[question.id]}
            onChange={(value) => handleAnswer(question.id, value)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-[var(--border-color)]">
        <button
          onClick={handlePrevious}
          disabled={currentChunk === 0}
          className="flex items-center px-6 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          {t('questionnaire.back', 'Zurück')}
        </button>

        {/* Auto-Save Indicator */}
        <div className="flex items-center text-sm text-[var(--text-secondary)]">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('questionnaire.saving', 'Speichern...')}
            </>
          ) : lastSaved ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('questionnaire.saved_at', 'Gespeichert um {{time}}', {
                time: lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
              })}
            </>
          ) : null}
        </div>

        <button
          onClick={handleNext}
          className="flex items-center px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors"
        >
          {currentChunk === totalChunks - 1 ? (
            t('questionnaire.complete', 'Abschließen')
          ) : (
            <>
              {t('questionnaire.next', 'Weiter')}
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </div>

      {/* "Speichern & Später Fortfahren" Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => saveProgress(true)}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] underline transition-colors"
        >
          {t('questionnaire.save_and_continue_later', 'Speichern & Später fortfahren')}
        </button>
      </div>

      {/* Time Estimate */}
      <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
        {t('questionnaire.time_estimate', 'Noch etwa {{minutes}} Minuten', {
          minutes: Math.ceil((totalChunks - currentChunk - 1) * 2)
        })}
      </div>
    </div>
  );
}

// Einzelne Fragen-Komponente
interface QuestionCardProps {
  question: Question;
  index: number;
  value: any;
  onChange: (value: any) => void;
}

function QuestionCard({ question, index, value, onChange }: QuestionCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
      <label className="block mb-4">
        <span className="text-sm text-[var(--text-secondary)] mr-2">#{index}</span>
        <span className="text-[var(--text-primary)] font-medium">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>

      {question.type === 'text' && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          placeholder="Ihre Antwort..."
        />
      )}

      {question.type === 'select' && question.options && (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="">{t('questionnaire.select_option', 'Bitte wählen...')}</option>
          {question.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}

      {question.type === 'radio' && question.options && (
        <div className="space-y-2">
          {question.options.map((option) => (
            <label
              key={option}
              className="flex items-center p-3 bg-[var(--bg-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="w-4 h-4 text-[var(--accent-primary)] border-[var(--border-color)] focus:ring-[var(--accent-primary)]"
              />
              <span className="ml-3 text-[var(--text-primary)]">{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'checkbox' && question.options && (
        <div className="space-y-2">
          {question.options.map((option) => {
            const selectedValues = (value as string[]) || [];
            return (
              <label
                key={option}
                className="flex items-center p-3 bg-[var(--bg-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, option]);
                    } else {
                      onChange(selectedValues.filter(v => v !== option));
                    }
                  }}
                  className="w-4 h-4 text-[var(--accent-primary)] border-[var(--border-color)] rounded focus:ring-[var(--accent-primary)]"
                />
                <span className="ml-3 text-[var(--text-primary)]">{option}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'date' && (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
      )}
    </div>
  );
}

export default ChunkedQuestionnaire;
