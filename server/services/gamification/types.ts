export type AchievementType =
  | 'TASK_COMPLETED'
  | 'PATIENT_RATING'
  | 'SPEED_BONUS'
  | 'ZERO_WAIT_DAY'
  | 'STREAK_7'
  | 'STREAK_30';

export type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface StaffAchievementRecord {
  id: string;
  staffId: string;
  type: AchievementType;
  points: number;
  description: string;
  earnedAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  praxisId: string;
  period: LeaderboardPeriod;
  staffId: string;
  totalPoints: number;
  rank: number;
  calculatedAt: Date;
}

export interface CreateAchievementInput {
  staffId: string;
  type: AchievementType;
  points: number;
  description: string;
}

export interface LeaderboardQuery {
  praxisId: string;
  period?: LeaderboardPeriod;
  limit?: number;
}

export const ACHIEVEMENT_POINTS: Record<AchievementType, number> = {
  TASK_COMPLETED: 10,
  PATIENT_RATING: 25,
  SPEED_BONUS: 15,
  ZERO_WAIT_DAY: 50,
  STREAK_7: 100,
  STREAK_30: 500,
};
