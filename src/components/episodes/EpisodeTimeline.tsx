/**
 * EpisodeTimeline — Zeigt die Verlaufshistorie einer Episode als vertikale Zeitleiste.
 *
 * Dargestellt werden:
 * - Sitzungen (mit Status und Service)
 * - Verlaufsnotizen (Arzt, MFA, Patient, System, KI)
 * - Triage-Events
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  AlertTriangle,
  MessageSquare,
  Bot,
  User,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface TimelineSession {
  id: string;
  status: string;
  selectedService: string;
  createdAt: string;
  completedAt?: string | null;
  answers?: { atomId: string; answeredAt: string }[];
  triageEvents?: { level: string; message: string; createdAt: string }[];
}

interface TimelineNote {
  id: string;
  type: string;
  content: string;
  authorName?: string | null;
  visibleToPatient: boolean;
  createdAt: string;
}

interface EpisodeTimelineProps {
  sessions: TimelineSession[];
  notes: TimelineNote[];
  className?: string;
}

type TimelineItem =
  | { kind: 'session'; data: TimelineSession; date: Date }
  | { kind: 'note'; data: TimelineNote; date: Date }
  | { kind: 'triage'; data: { level: string; message: string; sessionId: string }; date: Date };

function noteIcon(type: string) {
  switch (type) {
    case 'ARZT_NOTIZ':
      return <User className="h-4 w-4 text-blue-600" />;
    case 'MFA_NOTIZ':
      return <Shield className="h-4 w-4 text-green-600" />;
    case 'PATIENT_FEEDBACK':
      return <MessageSquare className="h-4 w-4 text-purple-600" />;
    case 'AI_SUMMARY':
      return <Bot className="h-4 w-4 text-amber-600" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'SUBMITTED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

export const EpisodeTimeline: React.FC<EpisodeTimelineProps> = ({
  sessions,
  notes,
  className,
}) => {
  const { t } = useTranslation();

  // Merge sessions, notes, and triage events into a unified timeline
  const items: TimelineItem[] = [];

  for (const session of sessions) {
    items.push({
      kind: 'session',
      data: session,
      date: new Date(session.createdAt),
    });

    for (const te of session.triageEvents ?? []) {
      items.push({
        kind: 'triage',
        data: { ...te, sessionId: session.id },
        date: new Date(te.createdAt),
      });
    }
  }

  for (const note of notes) {
    items.push({
      kind: 'note',
      data: note,
      date: new Date(note.createdAt),
    });
  }

  // Sort descending (newest first)
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500 dark:text-gray-400', className)}>
        {t('episode.noEpisodes')}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={`${item.kind}-${idx}`} className="relative pl-10">
            {/* Dot */}
            <div
              className={cn(
                'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
                item.kind === 'triage'
                  ? 'bg-red-500'
                  : item.kind === 'session'
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
              )}
            />

            {item.kind === 'session' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">
                      {item.data.selectedService}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor(item.data.status))}>
                      {item.data.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.date.toLocaleDateString('de-DE')}
                  </span>
                </div>
                {item.data.answers && item.data.answers.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.data.answers.length} {t('episode.sessions')}
                  </p>
                )}
                {item.data.completedAt && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="h-3 w-3" />
                    {new Date(item.data.completedAt).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            )}

            {item.kind === 'triage' && (
              <div className={cn(
                'rounded-lg border p-3',
                item.data.level === 'CRITICAL'
                  ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                  : 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
              )}>
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn('h-4 w-4', item.data.level === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600')}
                  />
                  <span className="text-sm font-medium">
                    {item.data.level}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.date.toLocaleDateString('de-DE')}
                  </span>
                </div>
                <p className="text-sm mt-1">{item.data.message}</p>
              </div>
            )}

            {item.kind === 'note' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {noteIcon(item.data.type)}
                    <span className="text-sm font-medium">
                      {t(`episode.noteType.${item.data.type}`)}
                    </span>
                    {item.data.authorName && (
                      <span className="text-xs text-gray-500">
                        — {item.data.authorName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {item.date.toLocaleDateString('de-DE')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {item.data.content}
                </p>
                {item.data.visibleToPatient && (
                  <span className="inline-block mt-1 text-xs text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                    Für Patient sichtbar
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
