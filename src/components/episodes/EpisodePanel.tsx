/**
 * EpisodePanel — Hauptkomponente für Behandlungsepisoden.
 *
 * Zeigt alle Episoden eines Patienten mit Zusammenfassung, Präferenzen
 * und Verlauf. Wird im Arzt-Dashboard eingebettet.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Heart,
  MessageCircle,
  CalendarDays,
  Tag,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  usePatientEpisodes,
  useCreateEpisode,
  useUpdateEpisode,
  useAddEpisodeNote,
} from '../../hooks/useApi';
import { EpisodeTimeline } from './EpisodeTimeline';
import { EpisodeDetailView } from './EpisodeDetailView';

interface EpisodePanelProps {
  patientId: string;
  className?: string;
}

interface EpisodeSummary {
  id: string;
  type: string;
  status: string;
  title: string;
  description?: string | null;
  lastActivityAt: string;
  openedAt: string;
  closedAt?: string | null;
  icdCodes: string[];
  sessions: {
    id: string;
    status: string;
    selectedService: string;
    createdAt: string;
    completedAt?: string | null;
  }[];
  preferences: {
    category: string;
    key: string;
    value: string;
  }[];
  _count: {
    sessions: number;
    notes: number;
  };
}

const TYPE_COLORS: Record<string, string> = {
  AKUT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CHRONISCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  VORSORGE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  NACHSORGE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  REZEPT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  AU: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  UEBERWEISUNG: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  BERATUNG: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FOLLOW_UP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export const EpisodePanel: React.FC<EpisodePanelProps> = ({
  patientId,
  className,
}) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active'>('active');

  const { data, isLoading } = usePatientEpisodes(
    patientId,
    filter === 'active' ? undefined : undefined
  );
  const episodes: EpisodeSummary[] = data?.episodes ?? [];

  const activeEpisodes = episodes.filter(
    (e) => !['CLOSED', 'CANCELLED'].includes(e.status)
  );
  const closedEpisodes = episodes.filter(
    (e) => ['CLOSED', 'CANCELLED'].includes(e.status)
  );
  const displayedEpisodes = filter === 'active' ? activeEpisodes : episodes;

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-semibold">{t('episode.titlePlural')}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {activeEpisodes.length} {t('episode.active').toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 text-xs">
            <button
              onClick={() => setFilter('active')}
              className={cn(
                'px-2 py-1 rounded-l-md transition-colors',
                filter === 'active'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {t('episode.active')}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-2 py-1 rounded-r-md transition-colors',
                filter === 'all'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {t('episode.all')}
            </button>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('episode.newEpisode')}
          </button>
        </div>
      </div>

      {/* Create Form (inline) */}
      {showCreate && (
        <CreateEpisodeForm
          patientId={patientId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Episodes List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm animate-pulse">
            Lade Episoden...
          </div>
        ) : displayedEpisodes.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            {t('episode.noEpisodes')}
          </div>
        ) : (
          displayedEpisodes.map((ep) => (
            <div key={ep.id}>
              {/* Episode Row */}
              <button
                onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {expandedId === ep.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{ep.title}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full shrink-0', TYPE_COLORS[ep.type] ?? 'bg-gray-100')}>
                      {t(`episode.type.${ep.type}`)}
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full shrink-0', STATUS_COLORS[ep.status] ?? 'bg-gray-100')}>
                      {t(`episode.status.${ep.status}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {ep.icdCodes.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {ep.icdCodes.join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(ep.openedAt).toLocaleDateString('de-DE')}
                    </span>
                    <span>
                      {ep._count.sessions} {t('episode.sessions')}
                    </span>
                    {ep.preferences.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-pink-400" />
                        {ep.preferences.length}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Detail */}
              {expandedId === ep.id && (
                <EpisodeDetailView episodeId={ep.id} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Inline Create Form ─────────────────────────────────────

interface CreateEpisodeFormProps {
  patientId: string;
  onClose: () => void;
}

const EPISODE_TYPES = [
  'AKUT', 'CHRONISCH', 'VORSORGE', 'NACHSORGE',
  'REZEPT', 'AU', 'UEBERWEISUNG', 'BERATUNG',
] as const;

const CreateEpisodeForm: React.FC<CreateEpisodeFormProps> = ({ patientId, onClose }) => {
  const { t } = useTranslation();
  const createMutation = useCreateEpisode();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>('AKUT');
  const [description, setDescription] = useState('');
  const [patientGoals, setPatientGoals] = useState('');
  const [patientWishes, setPatientWishes] = useState('');
  const [communicationPref, setCommunicationPref] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMutation.mutate(
      {
        patientId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        patientGoals: patientGoals.trim() || undefined,
        patientWishes: patientWishes.trim() || undefined,
        communicationPref: communicationPref || undefined,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-200 dark:border-gray-800 p-4 bg-blue-50/50 dark:bg-blue-900/10">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">{t('episode.create')}</h4>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Title */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('episode.episodeName')} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('episode.episodeNamePlaceholder')}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('episode.type')}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500"
          >
            {EPISODE_TYPES.map((t2) => (
              <option key={t2} value={t2}>
                {t(`episode.type.${t2}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Communication Preference */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('episode.communicationPref')}
          </label>
          <select
            value={communicationPref}
            onChange={(e) => setCommunicationPref(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">—</option>
            <option value="app">{t('episode.communicationPref.app')}</option>
            <option value="telefon">{t('episode.communicationPref.telefon')}</option>
            <option value="email">{t('episode.communicationPref.email')}</option>
            <option value="persoenlich">{t('episode.communicationPref.persoenlich')}</option>
          </select>
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('episode.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('episode.descriptionPlaceholder')}
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Patient Goals */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('episode.patientGoals')}
          </label>
          <textarea
            value={patientGoals}
            onChange={(e) => setPatientGoals(e.target.value)}
            placeholder={t('episode.patientGoalsPlaceholder')}
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Patient Wishes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('episode.patientWishes')}
          </label>
          <textarea
            value={patientWishes}
            onChange={(e) => setPatientWishes(e.target.value)}
            placeholder={t('episode.patientWishesPlaceholder')}
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Consent note */}
      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
        <MessageCircle className="h-3 w-3" />
        {t('episode.consentNote')}
      </p>

      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('common.cancel', 'Abbrechen')}
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createMutation.isPending}
          className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? '...' : t('episode.create')}
        </button>
      </div>
    </form>
  );
};
