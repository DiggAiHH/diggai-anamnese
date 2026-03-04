import type {
  CreateAchievementInput,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardQuery,
  StaffAchievementRecord,
} from './types';

function prisma() {
  const client = (globalThis as any).__prisma;
  if (!client) {
    throw new Error('Prisma client not initialised');
  }
  return client;
}

export async function awardAchievement(
  input: CreateAchievementInput,
): Promise<StaffAchievementRecord> {
  try {
    const record = await prisma().staffAchievement.create({
      data: {
        staffId: input.staffId,
        type: input.type,
        points: input.points,
        description: input.description,
        earnedAt: new Date(),
      },
    });
    return record as StaffAchievementRecord;
  } catch (error) {
    throw new Error(
      `Failed to award achievement: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getStaffAchievements(
  staffId: string,
): Promise<StaffAchievementRecord[]> {
  try {
    const records = await prisma().staffAchievement.findMany({
      where: { staffId },
      orderBy: { earnedAt: 'desc' },
    });
    return records as StaffAchievementRecord[];
  } catch (error) {
    throw new Error(
      `Failed to get staff achievements: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getLeaderboard(
  query: LeaderboardQuery,
): Promise<LeaderboardEntry[]> {
  try {
    const limit = query.limit ?? 10;
    const where: Record<string, unknown> = { praxisId: query.praxisId };
    if (query.period) {
      where.period = query.period;
    }

    const entries = await prisma().leaderboardEntry.findMany({
      where,
      orderBy: { rank: 'asc' },
      take: limit,
    });
    return entries as LeaderboardEntry[];
  } catch (error) {
    throw new Error(
      `Failed to get leaderboard: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function recalculateLeaderboard(
  praxisId: string,
  period: LeaderboardPeriod,
): Promise<LeaderboardEntry[]> {
  try {
    // Group achievements by staffId and sum points
    const grouped: { staffId: string; _sum: { points: number | null } }[] =
      await prisma().staffAchievement.groupBy({
        by: ['staffId'],
        where: { staffId: { not: undefined } },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
      });

    const now = new Date();
    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < grouped.length; i++) {
      const { staffId, _sum } = grouped[i];
      const totalPoints = _sum.points ?? 0;
      const rank = i + 1;

      const entry = await prisma().leaderboardEntry.upsert({
        where: {
          praxisId_period_staffId: {
            praxisId,
            period,
            staffId,
          },
        },
        update: {
          totalPoints,
          rank,
          calculatedAt: now,
        },
        create: {
          praxisId,
          period,
          staffId,
          totalPoints,
          rank,
          calculatedAt: now,
        },
      });

      entries.push(entry as LeaderboardEntry);
    }

    return entries;
  } catch (error) {
    throw new Error(
      `Failed to recalculate leaderboard: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getStaffPoints(staffId: string): Promise<number> {
  try {
    const result = await prisma().staffAchievement.aggregate({
      where: { staffId },
      _sum: { points: true },
    });
    return result._sum.points ?? 0;
  } catch (error) {
    throw new Error(
      `Failed to get staff points: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function getStats(praxisId: string): Promise<{
  totalAchievements: number;
  topAchiever: { staffId: string; totalPoints: number } | null;
  averagePoints: number;
}> {
  try {
    // Total achievements awarded across the praxis
    const totalAchievements = await prisma().staffAchievement.count();

    // Group by staff, sum points, order desc to find top achiever
    const grouped: { staffId: string; _sum: { points: number | null } }[] =
      await prisma().staffAchievement.groupBy({
        by: ['staffId'],
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 1,
      });

    const topAchiever =
      grouped.length > 0
        ? { staffId: grouped[0].staffId, totalPoints: grouped[0]._sum.points ?? 0 }
        : null;

    // Average points per staff member
    const avgResult = await prisma().staffAchievement.aggregate({
      _avg: { points: true },
    });
    const averagePoints = avgResult._avg.points ?? 0;

    return { totalAchievements, topAchiever, averagePoints };
  } catch (error) {
    throw new Error(
      `Failed to get stats: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
