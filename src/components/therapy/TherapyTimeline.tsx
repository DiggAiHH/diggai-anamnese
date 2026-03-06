import { Calendar, CheckCircle, Clock, Pause, XCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TherapyStatusBadge } from './TherapyStatusBadge';

interface TimelineEvent {
    id: string;
    date: string;
    type: 'created' | 'status_change' | 'measure_added' | 'measure_completed' | 'ai_suggestion' | 'alert' | 'review';
    title: string;
    description?: string;
    status?: string;
    actor?: string;
}

const EVENT_ICONS: Record<string, { icon: any; color: string }> = {
    created: { icon: Calendar, color: 'text-blue-500' },
    status_change: { icon: ArrowRight, color: 'text-yellow-500' },
    measure_added: { icon: Clock, color: 'text-green-500' },
    measure_completed: { icon: CheckCircle, color: 'text-green-600' },
    ai_suggestion: { icon: Clock, color: 'text-purple-500' },
    alert: { icon: XCircle, color: 'text-red-500' },
    review: { icon: Pause, color: 'text-indigo-500' },
};

export function TherapyTimeline({ events }: { planId: string; events: TimelineEvent[] }) {
    const { t, i18n } = useTranslation();

    if (!events || events.length === 0) {
        return (
            <div className="text-center py-6 text-gray-400 text-sm">
                {t('therapy.noTimeline', 'Noch keine Ereignisse vorhanden')}
            </div>
        );
    }

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {events.map((event, idx) => {
                    const config = EVENT_ICONS[event.type] || EVENT_ICONS.created;
                    const Icon = config.icon;
                    const isLast = idx === events.length - 1;

                    return (
                        <li key={event.id}>
                            <div className="relative pb-8">
                                {!isLast && (
                                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                                )}
                                <div className="relative flex items-start space-x-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 ring-8 ring-white dark:ring-gray-900 ${config.color}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                                            {event.status && <TherapyStatusBadge status={event.status} size="xs" />}
                                        </div>
                                        {event.description && (
                                            <p className="mt-0.5 text-xs text-gray-500">{event.description}</p>
                                        )}
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {new Date(event.date).toLocaleString(i18n.language)}
                                            {event.actor && <span> · {event.actor}</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
