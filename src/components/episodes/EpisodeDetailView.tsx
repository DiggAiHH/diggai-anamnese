/**
 * EpisodeDetailView — Detailansicht einer einzelnen Episode.
 *
 * Zeigt Patientenpräferenzen & -wünsche, Personalisierungseinstellungen,
 * Verlaufsnotizen-Timeline und Aktionen (Notiz hinzufügen, Status ändern).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Settings,
  Tag,
  Target,
  User,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useEpisodeDetail,
  useUpdateEpisode,
  useAddEpisodeNote,
} from '../../hooks/useApi';
import { EpisodeTimeline } from './EpisodeTimeline';

interface EpisodeDetailViewProps {
  episodeId: string;
  className?: string;
}

const NOTE_TYPES = ['ARZT_NOTIZ', 'MFA_NOTIZ', 'AI_SUMMARY'] as const;

export const EpisodeDetailView: React.FC<EpisodeDetailViewProps> = ({
  episodeId,
  className,
}) => {
  const { t } = useTranslation();
  const { data: episode, isLoading } = useEpisodeDetail(episodeId);
  const updateMutation = useUpdateEpisode(episodeId);
  const addNoteMutation = useAddEpisodeNote(episodeId);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<string>('ARZT_NOTIZ');
  const [noteVisibleToPatient, setNoteVisibleToPatient] = useState(false);

  if (isLoading) {
    return (
      <div className={cn('px-4 py-6 text-center text-gray-400 text-sm animate-pulse', className)}>
        Lade Episodendetails...
      </div>
    );
  }

  if (!episode) {
    return (
      <div className={cn('px-4 py-6 text-center text-gray-400 text-sm', className)}>
        Episode nicht gefunden
      </div>
    );
  }

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(
      {
        type: noteType,
        content: noteContent.trim(),
        visibleToPatient: noteVisibleToPatient,
      },
      {
        onSuccess: () => {
          setNoteContent('');
          setShowNoteForm(false);
        },
      }
    );
  };

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({ status: newStatus });
  };

  return (
    <div className={cn('bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800', className)}>
      <div className="p-4 space-y-4">
        {/* Patient Wishes & Goals Section */}
        {(episode.patientGoals || episode.patientWishes || (episode.preferences?.length > 0)) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-400" />
              {t('episode.personalization')}
            </h4>

            <div className="space-y-2">
              {episode.patientGoals && (
                <div className="flex gap-2">
                  <Target className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 font-medium">{t('episode.patientGoals')}:</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{episode.patientGoals}</p>
                  </div>
                </div>
              )}

              {episode.patientWishes && (
                <div className="flex gap-2">
                  <MessageCircle className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 font-medium">{t('episode.patientWishes')}:</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{episode.patientWishes}</p>
                  </div>
                </div>
              )}

              {episode.communicationPref && (
                <div className="flex gap-2">
                  <Settings className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 font-medium">{t('episode.communicationPref')}:</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {t(`episode.communicationPref.${episode.communicationPref}`)}
                    </p>
                  </div>
                </div>
              )}

              {episode.preferredArzt && (
                <div className="flex gap-2">
                  <User className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500 font-medium">{t('episode.preferredArzt')}:</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{episode.preferredArzt.displayName}</p>
                  </div>
                </div>
              )}

              {/* Active Preferences */}
              {episode.preferences?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500 font-medium">{t('episode.preferences')}:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {episode.preferences.map((pref: { category: string; key: string; value: string }, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full"
                      >
                        <Tag className="h-3 w-3" />
                        {pref.key}: {pref.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Consent reminder */}
              <p className="text-xs text-amber-500 mt-1 italic">
                {t('episode.consentNote')}
              </p>
            </div>
          </div>
        )}

        {/* ICD Codes & Diagnosis */}
        {(episode.icdCodes?.length > 0 || episode.primaryDiagnosis) && (
          <div className="flex items-center gap-2 flex-wrap">
            {episode.icdCodes?.map((code: string) => (
              <span key={code} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-mono">
                {code}
              </span>
            ))}
            {episode.primaryDiagnosis && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                — {episode.primaryDiagnosis}
              </span>
            )}
          </div>
        )}

        {/* AI & Arzt Summary */}
        {(episode.summaryAI || episode.summaryArzt) && (
          <div className="space-y-2">
            {episode.summaryAI && (
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('episode.summaryAI')}:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{episode.summaryAI}</p>
              </div>
            )}
            {episode.summaryArzt && (
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{t('episode.summaryArzt')}:</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{episode.summaryArzt}</p>
              </div>
            )}
          </div>
        )}

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {episode.status !== 'CLOSED' && episode.status !== 'CANCELLED' && (
            <>
              {episode.status === 'OPEN' && (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Aktivieren
                </button>
              )}
              {episode.status === 'ACTIVE' && (
                <button
                  onClick={() => handleStatusChange('FOLLOW_UP')}
                  className="px-2 py-1 text-xs bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                  → {t('episode.status.FOLLOW_UP')}
                </button>
              )}
              <button
                onClick={() => handleStatusChange('PAUSED')}
                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                {t('episode.status.PAUSED')}
              </button>
              <button
                onClick={() => handleStatusChange('CLOSED')}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                {t('episode.close')}
              </button>
            </>
          )}
          {episode.status === 'CLOSED' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {t('episode.reopen')}
            </button>
          )}
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('episode.timeline')}
            </h4>
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-3 w-3" />
              {t('episode.addNote')}
            </button>
          </div>

          {/* Add Note Form */}
          {showNoteForm && (
            <div className="mb-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800"
                >
                  {NOTE_TYPES.map((nt) => (
                    <option key={nt} value={nt}>
                      {t(`episode.noteType.${nt}`)}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={noteVisibleToPatient}
                    onChange={(e) => setNoteVisibleToPatient(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Für Patient sichtbar
                </label>
              </div>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Verlaufsnotiz eingeben..."
                rows={3}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowNoteForm(false)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  {addNoteMutation.isPending ? '...' : t('episode.addNote')}
                </button>
              </div>
            </div>
          )}

          <EpisodeTimeline
            sessions={episode.sessions ?? []}
            notes={episode.notes ?? []}
          />
        </div>
      </div>
    </div>
  );
};
