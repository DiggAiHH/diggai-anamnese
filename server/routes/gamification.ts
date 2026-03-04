import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  awardAchievement,
  getStaffAchievements,
  getLeaderboard,
  recalculateLeaderboard,
  getStaffPoints,
  getStats,
  ACHIEVEMENT_POINTS,
} from '../services/gamification';
import type { AchievementType, LeaderboardPeriod } from '../services/gamification';

const router = Router();

// ── Zod schemas ──────────────────────────────────────────────

const achievementTypeSchema = z.enum([
  'TASK_COMPLETED',
  'PATIENT_RATING',
  'SPEED_BONUS',
  'ZERO_WAIT_DAY',
  'STREAK_7',
  'STREAK_30',
]);

const leaderboardPeriodSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);

const awardAchievementBody = z.object({
  staffId: z.string().min(1),
  type: achievementTypeSchema,
  points: z.number().int().positive().optional(),
  description: z.string().min(1),
});

const recalculateBody = z.object({
  praxisId: z.string().min(1),
  period: leaderboardPeriodSchema,
});

const leaderboardQuerySchema = z.object({
  praxisId: z.string().min(1),
  period: leaderboardPeriodSchema.optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const statsQuerySchema = z.object({
  praxisId: z.string().min(1),
});

// ── Routes ───────────────────────────────────────────────────

// POST /achievement — award achievement
router.post('/achievement', async (req: Request, res: Response) => {
  try {
    const parsed = awardAchievementBody.parse(req.body);
    const points = parsed.points ?? ACHIEVEMENT_POINTS[parsed.type as AchievementType];

    const record = await awardAchievement({
      staffId: parsed.staffId,
      type: parsed.type as AchievementType,
      points,
      description: parsed.description,
    });

    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /staff/:staffId — get staff achievements
router.get('/staff/:staffId', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const records = await getStaffAchievements(staffId);
    res.json(records);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /leaderboard — get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const parsed = leaderboardQuerySchema.parse(req.query);
    const entries = await getLeaderboard({
      praxisId: parsed.praxisId,
      period: parsed.period as LeaderboardPeriod | undefined,
      limit: parsed.limit,
    });
    res.json(entries);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// POST /leaderboard/recalculate — recalculate leaderboard
router.post('/leaderboard/recalculate', async (req: Request, res: Response) => {
  try {
    const parsed = recalculateBody.parse(req.body);
    const entries = await recalculateLeaderboard(
      parsed.praxisId,
      parsed.period as LeaderboardPeriod,
    );
    res.json(entries);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /staff/:staffId/points — get total points
router.get('/staff/:staffId/points', async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const totalPoints = await getStaffPoints(staffId);
    res.json({ staffId, totalPoints });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /stats — get stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const parsed = statsQuerySchema.parse(req.query);
    const stats = await getStats(parsed.praxisId);
    res.json(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
