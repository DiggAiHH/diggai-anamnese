import { useEffect, useRef, type FC } from 'react';

interface AchievementBadgeProps {
  type: string;
  points: number;
  description: string;
  earnedAt: string;
  size?: 'sm' | 'md' | 'lg';
}

const ICON_MAP: Record<string, string> = {
  TASK_COMPLETED: '✅',
  PATIENT_RATING: '⭐',
  SPEED_BONUS: '⚡',
  ZERO_WAIT_DAY: '🏆',
  STREAK_7: '🔥',
  STREAK_30: '💎',
};

const SIZE_CLASSES = {
  sm: { icon: 'text-lg', text: 'text-xs', pill: 'text-[10px] px-1.5 py-0.5', gap: 'gap-1.5', pad: 'p-2' },
  md: { icon: 'text-2xl', text: 'text-sm', pill: 'text-xs px-2 py-0.5', gap: 'gap-2', pad: 'p-3' },
  lg: { icon: 'text-4xl', text: 'text-base', pill: 'text-sm px-2.5 py-1', gap: 'gap-3', pad: 'p-4' },
} as const;

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Minute${diffMin !== 1 ? 'n' : ''}`;
  if (diffHrs < 24) return `vor ${diffHrs} Stunde${diffHrs !== 1 ? 'n' : ''}`;
  if (diffDays < 30) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}

function getGradient(points: number): string {
  if (points >= 100) return 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500';
  if (points >= 50) return 'bg-gradient-to-br from-gray-200 via-slate-300 to-gray-400';
  return 'bg-gradient-to-br from-orange-300 via-amber-600 to-orange-400';
}

export const AchievementBadge: FC<AchievementBadgeProps> = ({
  type,
  points,
  description,
  earnedAt,
  size = 'md',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // trigger mount animation
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  const s = SIZE_CLASSES[size];
  const icon = ICON_MAP[type] ?? '🎯';
  const gradient = getGradient(points);

  return (
    <div
      ref={ref}
      className={`${gradient} ${s.pad} rounded-xl shadow-md flex items-start ${s.gap} transition-all duration-500 ease-out`}
      style={{ opacity: 0, transform: 'translateY(8px)' }}
    >
      <span className={s.icon} role="img" aria-label={type}>
        {icon}
      </span>

      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`${s.pill} rounded-full bg-white/80 font-semibold text-gray-800 leading-none`}
          >
            +{points} Pkt
          </span>
          <span className={`${s.text} text-gray-600`}>{getRelativeTime(earnedAt)}</span>
        </div>
        <p className={`${s.text} text-gray-900 font-medium leading-snug truncate`}>
          {description}
        </p>
      </div>
    </div>
  );
};
