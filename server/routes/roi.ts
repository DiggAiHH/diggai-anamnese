import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    calculateTodayROI,
    getROIHistory,
    getROIConfig,
    setROIConfig,
    getROIProjection,
} from '../services/roiService';

const router = Router();

// All ROI routes require admin
router.use(requireAuth, requireRole('admin'));

// ─── GET /api/roi/today — Live daily ROI ────────────────────

router.get('/today', async (_req, res) => {
    try {
        const roi = await calculateTodayROI();
        res.json(roi);
    } catch (err) {
        console.error('[ROI] Today error:', err);
        res.status(500).json({ error: 'ROI konnte nicht berechnet werden' });
    }
});

// ─── GET /api/roi/history — Historical ROI ──────────────────

router.get('/history', async (req, res) => {
    try {
        const period = (req.query.period as string) || 'month';
        if (!['week', 'month', 'year'].includes(period)) {
            res.status(400).json({ error: 'period muss week, month oder year sein' });
            return;
        }
        const history = await getROIHistory(period as 'week' | 'month' | 'year');
        res.json(history);
    } catch (err) {
        console.error('[ROI] History error:', err);
        res.status(500).json({ error: 'ROI-Historie konnte nicht geladen werden' });
    }
});

// ─── GET /api/roi/config — Current parameters ───────────────

router.get('/config', (_req, res) => {
    res.json(getROIConfig());
});

// ─── PUT /api/roi/config — Update parameters ────────────────

const configSchema = z.object({
    mfaHourlyCost: z.number().min(0).optional(),
    avgManualIntakeMin: z.number().min(0).optional(),
    monthlyLicenseCost: z.number().min(0).optional(),
    workdaysPerMonth: z.number().min(1).max(31).optional(),
});

router.put('/config', async (req, res) => {
    try {
        const data = configSchema.parse(req.body);
        const config = setROIConfig(data);
        res.json(config);
    } catch (err) {
        console.error('[ROI] Config update error:', err);
        res.status(400).json({ error: 'Ungültige ROI-Konfiguration' });
    }
});

// ─── GET /api/roi/projection — 12-month projection ─────────

router.get('/projection', async (req, res) => {
    try {
        const months = parseInt(req.query.months as string) || 12;
        const projection = await getROIProjection(months);
        res.json(projection);
    } catch (err) {
        console.error('[ROI] Projection error:', err);
        res.status(500).json({ error: 'ROI-Prognose konnte nicht erstellt werden' });
    }
});

export default router;
