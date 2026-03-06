import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

interface LeaderboardEntry {
  staffId: string;
  staffName?: string;
  totalPoints: number;
  rank: number;
  avatarUrl?: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  period: string;
  loading?: boolean;
}

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
};

const MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const RANK_BG: Record<number, string> = {
  1: 'bg-yellow-50 border-l-4 border-yellow-400',
  2: 'bg-gray-50 border-l-4 border-gray-300',
  3: 'bg-orange-50 border-l-4 border-orange-300',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-6 rounded bg-gray-200" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200" />
          <div className="h-4 w-28 rounded bg-gray-200" />
        </div>
      </td>
      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-14 rounded bg-gray-200" /></td>
    </tr>
  );
}

export const LeaderboardTable: FC<LeaderboardTableProps> = ({
  entries,
  period,
  loading = false,
}) => {
  const { i18n } = useTranslation();
  const periodLabel = PERIOD_LABELS[period] ?? period;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 sm:px-6">
        <h3 className="text-lg font-bold text-gray-900">Bestenliste</h3>
        <p className="text-sm text-gray-500">{periodLabel}</p>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2 w-12">#</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 text-right">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                  Noch keine Einträge für diesen Zeitraum
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const medal = MEDAL[entry.rank];
                const rankBg = RANK_BG[entry.rank] ?? '';
                const zebra = !rankBg && idx % 2 === 1 ? 'bg-gray-50/60' : '';
                return (
                  <tr
                    key={entry.staffId}
                    className={`${rankBg} ${zebra} transition-colors hover:bg-blue-50/40`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {medal ?? entry.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                            {(entry.staffName ?? entry.staffId).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {entry.staffName ?? entry.staffId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {entry.totalPoints.toLocaleString(i18n.language)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="block sm:hidden divide-y divide-gray-100">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="h-5 w-5 rounded bg-gray-200" />
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-3 w-14 rounded bg-gray-200" />
              </div>
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-400">
            Noch keine Einträge für diesen Zeitraum
          </div>
        ) : (
          entries.map((entry) => {
            const medal = MEDAL[entry.rank];
            const rankBg = RANK_BG[entry.rank] ?? '';
            return (
              <div
                key={entry.staffId}
                className={`${rankBg} flex items-center gap-3 px-4 py-3 transition-colors hover:bg-blue-50/40`}
              >
                <span className="min-w-[1.5rem] text-center font-medium text-gray-700">
                  {medal ?? entry.rank}
                </span>
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    {(entry.staffName ?? entry.staffId).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {entry.staffName ?? entry.staffId}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.totalPoints.toLocaleString(i18n.language)} Punkte
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
