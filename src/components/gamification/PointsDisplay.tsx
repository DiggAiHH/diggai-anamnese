import { useEffect, useRef, useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { AchievementBadge } from './AchievementBadge';

interface RecentAchievement {
  type: string;
  points: number;
  earnedAt: string;
}

interface PointsDisplayProps {
  points: number;
  staffName?: string;
  recentAchievements?: RecentAchievement[];
  className?: string;
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

export const PointsDisplay: FC<PointsDisplayProps> = ({
  points,
  staffName,
  recentAchievements,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const displayPoints = useCountUp(points);
  const topAchievements = recentAchievements?.slice(0, 3) ?? [];

  return (
    <div
      className={`rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 overflow-hidden ${className}`}
    >
      {/* Points header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-8 text-center text-white">
        {staffName && (
          <p className="mb-1 text-sm font-medium text-blue-100">{staffName}</p>
        )}
        <p className="text-5xl font-extrabold tabular-nums tracking-tight">
          {displayPoints.toLocaleString(i18n.language)}
        </p>
        <p className="mt-1 text-sm text-blue-200">Punkte</p>
      </div>

      {/* Recent achievements */}
      <div className="px-5 py-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Letzte Erfolge
        </h4>

        {topAchievements.length > 0 ? (
          <div className="flex flex-col gap-2">
            {topAchievements.map((a, i) => (
              <AchievementBadge
                key={`${a.type}-${a.earnedAt}-${i}`}
                type={a.type}
                points={a.points}
                description={a.type.replaceAll('_', ' ')}
                earnedAt={a.earnedAt}
                size="sm"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            Noch keine Erfolge — sammle Punkte durch großartige Arbeit! 💪
          </p>
        )}
      </div>
    </div>
  );
};
