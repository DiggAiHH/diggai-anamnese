import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Heart, Eye } from 'lucide-react';

interface WaitingContentItem {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  likeCount: number;
  viewCount: number;
}

interface HealthTipCarouselProps {
  items: WaitingContentItem[];
  onView?: (contentId: string) => void;
  onLike?: (contentId: string) => void;
}

export const HealthTipCarousel: React.FC<HealthTipCarouselProps> = ({
  items,
  onView,
  onLike,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  // Auto-rotate every 30 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [items.length]);

  // Track view when current item changes
  useEffect(() => {
    if (items[currentIndex]) {
      onView?.(items[currentIndex].id);
    }
  }, [currentIndex, items, onView]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const handleLike = useCallback((contentId: string) => {
    if (liked.has(contentId)) return;
    setLiked((prev) => new Set(prev).add(contentId));
    onLike?.(contentId);
  }, [liked, onLike]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          {t('waiting.noContent', 'Keine Inhalte verfügbar')}
        </p>
      </div>
    );
  }

  const item = items[currentIndex];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden">
        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {item.type === 'HEALTH_TIP' && t('waiting.healthTip', 'Gesundheitstipp')}
              {item.type === 'FUN_FACT' && t('waiting.funFact', 'Wussten Sie?')}
              {item.type === 'SEASONAL_INFO' && t('waiting.seasonal', 'Saisonal')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {currentIndex + 1}/{items.length}
            </span>
          </div>

          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {item.title}
          </h3>

          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-40 object-cover rounded-xl mb-3"
              loading="lazy"
            />
          )}

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {item.body}
          </p>
        </div>

        {/* Footer: nav + actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
              aria-label={t('waiting.prev', 'Vorheriger')}
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
              aria-label={t('waiting.next', 'Nächster')}
            >
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <Eye className="w-3 h-3" /> {item.viewCount}
            </span>
            <button
              onClick={() => handleLike(item.id)}
              className={`flex items-center gap-1 text-[10px] transition-colors ${
                liked.has(item.id)
                  ? 'text-rose-400'
                  : 'text-[var(--text-muted)] hover:text-rose-400'
              }`}
            >
              <Heart className={`w-3 h-3 ${liked.has(item.id) ? 'fill-current' : ''}`} />
              {item.likeCount + (liked.has(item.id) ? 1 : 0)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
