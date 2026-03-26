// ─── Usage API Routes ───────────────────────────────────────
// Endpoints für Leistungs-Tracking, Zusammenfassung und Rechnung.

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { getUsageToday, getUsageByPeriod } from '../services/serviceUsageService';
import { generateDailySummary, getDailySummaries, getInvoiceForDate } from '../services/summaryService';

const router = Router();

// All usage routes require auth + admin/arzt role
router.use(requireAuth, requireRole('admin', 'arzt'));

// ─── GET /api/usage/today — Live usage for today ────────────

router.get('/today', async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId || req.auth?.tenantId || 'default';
        const usage = await getUsageToday(tenantId);
        res.json(usage);
    } catch (err) {
        console.error('[Usage] Today error:', err);
        res.status(500).json({ error: 'Nutzungsdaten konnten nicht geladen werden' });
    }
});

// ─── GET /api/usage/summary — Summary with period/custom range

const summaryQuerySchema = z.object({
    period: z.enum(['day', 'week', 'month', 'year']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
});

router.get('/summary', async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId || req.auth?.tenantId || 'default';
        const { period, from: fromStr, to: toStr } = summaryQuerySchema.parse(req.query);

        let fromDate: Date;
        let toDate: Date;

        if (fromStr && toStr) {
            fromDate = new Date(fromStr);
            toDate = new Date(toStr);
            toDate.setHours(23, 59, 59, 999);
        } else {
            toDate = new Date();
            toDate.setHours(23, 59, 59, 999);
            fromDate = new Date();
            fromDate.setHours(0, 0, 0, 0);

            switch (period) {
                case 'week':
                    fromDate.setDate(fromDate.getDate() - 7);
                    break;
                case 'month':
                    fromDate.setMonth(fromDate.getMonth() - 1);
                    break;
                case 'year':
                    fromDate.setFullYear(fromDate.getFullYear() - 1);
                    break;
                default: // 'day' or undefined
                    break;
            }
        }

        const usage = await getUsageByPeriod(tenantId, fromDate, toDate);
        const summaries = await getDailySummaries(tenantId, fromDate, toDate);

        res.json({
            usage,
            dailySummaries: summaries,
            period: period || 'custom',
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
        });
    } catch (err) {
        console.error('[Usage] Summary error:', err);
        res.status(500).json({ error: 'Zusammenfassung konnte nicht erstellt werden' });
    }
});

// ─── GET /api/usage/breakdown — Service type breakdown ──────

router.get('/breakdown', async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId || req.auth?.tenantId || 'default';
        const { from: fromStr, to: toStr } = req.query as Record<string, string>;

        let fromDate: Date;
        let toDate: Date;

        if (fromStr && toStr) {
            fromDate = new Date(fromStr);
            toDate = new Date(toStr);
            toDate.setHours(23, 59, 59, 999);
        } else {
            fromDate = new Date();
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date();
            toDate.setHours(23, 59, 59, 999);
        }

        const usage = await getUsageByPeriod(tenantId, fromDate, toDate);
        res.json({
            breakdown: usage.breakdown,
            totalActions: usage.totalActions,
            totalTimeSavedMin: usage.totalTimeSavedMin,
            totalCostSaving: usage.totalCostSaving,
        });
    } catch (err) {
        console.error('[Usage] Breakdown error:', err);
        res.status(500).json({ error: 'Aufschlüsselung konnte nicht erstellt werden' });
    }
});

// ─── GET /api/usage/invoice/:date — Invoice for specific date

router.get('/invoice/:date', async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId || req.auth?.tenantId || 'default';
        const date = new Date(req.params.date as string);

        if (isNaN(date.getTime())) {
            res.status(400).json({ error: 'Ungültiges Datum. Format: YYYY-MM-DD' });
            return;
        }

        const summary = await getInvoiceForDate(tenantId, date);
        res.json(summary);
    } catch (err) {
        console.error('[Usage] Invoice error:', err);
        res.status(500).json({ error: 'Rechnung konnte nicht erstellt werden' });
    }
});

// ─── POST /api/usage/generate-summary — Manually trigger daily summary

router.post('/generate-summary', async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId || req.auth?.tenantId || 'default';
        const { date } = req.body;
        const targetDate = date ? new Date(date) : new Date();

        const summary = await generateDailySummary(tenantId, targetDate);
        res.json(summary);
    } catch (err) {
        console.error('[Usage] Generate summary error:', err);
        res.status(500).json({ error: 'Zusammenfassung konnte nicht generiert werden' });
    }
});

export default router;
