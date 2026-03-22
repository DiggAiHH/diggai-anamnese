// ═══════════════════════════════════════════════════════════════
// Modul 7: Anonymous Feedback Form
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeedbackSubmit } from '../../hooks/useApi';
import { toast } from '../../store/toastStore';
import { hapticSelect, hapticSuccess, hapticWarning } from '../../utils/haptics';

interface AnonymousFeedbackFormProps {
  praxisId: string;
  sessionId?: string;
  onSubmit?: (data: FeedbackPayload) => void | Promise<void>;
}

interface FeedbackPayload {
  praxisId: string;
  sessionId?: string;
  rating: number;
  text?: string;
  categories?: string[];
}

const CATEGORIES = [
  { key: 'wartezeit', icon: '⏰', label: 'Wartezeit' },
  { key: 'kommunikation', icon: '💬', label: 'Kommunikation' },
  { key: 'freundlichkeit', icon: '😊', label: 'Freundlichkeit' },
  { key: 'organisation', icon: '📋', label: 'Organisation' },
  { key: 'hygiene', icon: '🧼', label: 'Hygiene' },
  { key: 'kompetenz', icon: '🎓', label: 'Kompetenz' },
];

export function AnonymousFeedbackForm({ praxisId, sessionId, onSubmit }: AnonymousFeedbackFormProps) {
  const { t } = useTranslation();
  const submitFeedback = useFeedbackSubmit();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const ratingLabel = useMemo(() => {
    if (rating <= 0) return t('feedback.rating_hint', 'Tippen Sie auf die Sterne für eine schnelle Bewertung.');
    if (rating <= 2) return t('feedback.rating_low', 'Danke für Ihre Ehrlichkeit — was können wir konkret verbessern?');
    if (rating === 3) return t('feedback.rating_mid', 'Fast da — was hätte Ihren Besuch noch angenehmer gemacht?');
    return t('feedback.rating_high', 'Wunderbar — was hat besonders gut funktioniert?');
  }, [rating, t]);

  const quickCommentChips = useMemo(() => {
    if (rating <= 0) return [];
    if (rating <= 2) {
      return [
        t('feedback.quick_wait', 'Wartezeit war zu lang'),
        t('feedback.quick_unclear', 'Ablauf war unklar'),
        t('feedback.quick_info', 'Ich hätte gern mehr Infos bekommen'),
      ];
    }
    if (rating === 3) {
      return [
        t('feedback.quick_okay', 'Insgesamt okay'),
        t('feedback.quick_room', 'Wartebereich war angenehm'),
        t('feedback.quick_better_info', 'Etwas mehr Orientierung wäre hilfreich'),
      ];
    }
    return [
      t('feedback.quick_friendly', 'Sehr freundliches Team'),
      t('feedback.quick_fast', 'Schneller Ablauf'),
      t('feedback.quick_clear', 'Alles war klar erklärt'),
    ];
  }, [rating, t]);

  const toggleCategory = (key: string) => {
    hapticSelect();
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const appendQuickComment = (snippet: string) => {
    hapticSelect();
    setText(prev => {
      if (prev.includes(snippet)) return prev;
      return prev.trim() ? `${prev.trim()} ${snippet}.` : `${snippet}.`;
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      hapticWarning();
      toast.warning(t('feedback.rating_required', 'Bitte wählen Sie zuerst eine Bewertung aus.'));
      return;
    }

    setLoading(true);
    const data: FeedbackPayload = {
      praxisId,
      sessionId,
      rating,
      text: text.trim() || undefined,
      categories: selectedCategories,
    };

    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        await submitFeedback.mutateAsync(data);
      }
      hapticSuccess();
      setSubmitted(true);
      toast.success(t('feedback.saved', 'Vielen Dank für Ihr Feedback.'));
    } catch {
      hapticWarning();
      toast.error(t('feedback.submit_error', 'Feedback konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut.'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <span className="text-3xl">💚</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {t('feedback.thanks', 'Vielen Dank!')}
        </h2>
        <p className="text-[var(--text-secondary)]">
          {t('feedback.thanks_sub', 'Ihr Feedback hilft uns, besser zu werden.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {t('feedback.title', 'Wie war Ihr Besuch?')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('feedback.anonymous_notice', 'Ihre Bewertung ist vollständig anonym.')}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {t('feedback.fast_hint', 'Dauert unter 10 Sekunden — ein Stern reicht, Details sind optional.')}
        </p>
      </div>

      {/* Star rating */}
      <div className="space-y-3">
        <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => {
              hapticSelect();
              setRating(star);
            }}
            aria-label={`${star} von 5 Sternen`}
            title={`${star} von 5 Sternen`}
            className="text-4xl transition-transform hover:scale-110 focus:outline-none"
          >
            {star <= (hoverRating || rating) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
        <p className="text-center text-sm font-medium text-[var(--text-secondary)]">{ratingLabel}</p>
      </div>

      {quickCommentChips.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {t('feedback.quick_pick', 'Schnell auswählen')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickCommentChips.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => appendQuickComment(chip)}
                className="px-3 py-2 rounded-full text-sm border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
          {t('feedback.categories_label', 'Was möchten Sie bewerten?')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                selectedCategories.includes(cat.key)
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{t(`feedback.cat_${cat.key}`, cat.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Free text */}
      <div>
        <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
          {t('feedback.comment_label', 'Möchten Sie noch etwas mitteilen?')}
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('feedback.comment_placeholder', 'Optional: Ihr Kommentar...')}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">{text.length}/1000</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || loading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
      >
        {loading ? t('feedback.submitting', 'Wird gesendet…') : t('feedback.submit', 'Feedback absenden')}
      </button>

      {!submitted && rating > 0 && (
        <p className="text-center text-xs text-[var(--text-tertiary)]">
          {t('feedback.closing_note', 'Danke — Ihr Feedback hilft uns, Wartezeit, Kommunikation und Organisation gezielt zu verbessern.')}
        </p>
      )}
    </div>
  );
}

export default AnonymousFeedbackForm;
