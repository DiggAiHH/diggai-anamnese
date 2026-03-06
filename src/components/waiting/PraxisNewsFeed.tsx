import React from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WaitingContentItem {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
}

interface PraxisNewsFeedProps {
  items: WaitingContentItem[];
}

export const PraxisNewsFeed: React.FC<PraxisNewsFeedProps> = ({ items }) => {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-8 text-center">
        <Newspaper className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-muted)]">
          {t('waiting.noNews', 'Keine Praxis-Neuigkeiten')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden"
        >
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-32 object-cover"
              loading="lazy"
            />
          )}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {t('waiting.praxisNews', 'Praxis-News')}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
              {item.title}
            </h3>

            <div className="text-sm text-[var(--text-secondary)] leading-relaxed prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{item.body}</ReactMarkdown>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};
