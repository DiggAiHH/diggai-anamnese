import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth';
import { processWunschboxEntry, generateExportSpec } from '../services/wunschboxService';
import { prisma } from '../db';

const router = Router();

function param(req: { params: Record<string, string | string[] | undefined> }, key: string): string {
    const value = req.params[key];
    return Array.isArray(value) ? value[0] : value ?? '';
}

function getAuthenticatedUserId(req: { auth?: { userId?: string } }) {
    return req.auth?.userId;
}

function resolveEffectiveTenant(req: Request):
    | { ok: true; tenantId: string }
    | { ok: false; status: 400 | 403; body: { error: string; code: 'TENANT_CONTEXT_REQUIRED' | 'TENANT_SCOPE_VIOLATION' } } {
    const authTenantId = req.auth?.tenantId;
    const requestTenantId = req.tenantId;

    if (authTenantId && requestTenantId && authTenantId !== requestTenantId) {
        return {
            ok: false,
            status: 403,
            body: {
                error: 'Tenant-Konflikt',
                code: 'TENANT_SCOPE_VIOLATION',
            },
        };
    }

    const tenantId = requestTenantId || authTenantId;
    if (!tenantId) {
        return {
            ok: false,
            status: 400,
            body: {
                error: 'Tenant-Kontext fehlt',
                code: 'TENANT_CONTEXT_REQUIRED',
            },
        };
    }

    return { ok: true, tenantId };
}

function parseAiParsedChanges(aiParsedChanges: string | null | undefined) {
    if (!aiParsedChanges) {
        return null;
    }

    try {
        return JSON.parse(aiParsedChanges);
    } catch {
        return null;
    }
}

// ─── POST /api/wunschbox — Submit a wish ────────────────────

const submitSchema = z.object({
    text: z.string().trim().min(10).max(5000),
});

router.post('/', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const { text } = submitSchema.parse(req.body);
        const userId = getAuthenticatedUserId(req);
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const entry = await prisma.wunschboxEntry.create({
            data: {
                tenantId: resolvedTenant.tenantId,
                submittedBy: userId,
                originalText: text,
            },
        });

        res.status(201).json(entry);
    } catch (err) {
        console.error('[Wunschbox] Submit error:', err);
        res.status(400).json({ error: 'Wunsch konnte nicht eingereicht werden' });
    }
});

// ─── GET /api/wunschbox — List all (admin) ──────────────────

router.get('/', requireAuth, requireRole('admin'), requirePermission('admin_wunschbox'), async (req, res) => {
    try {
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
        const status = req.query.status as string | undefined;

        const where: Record<string, unknown> = { tenantId: resolvedTenant.tenantId };
        if (status) where.status = status;

        const [entries, total] = await Promise.all([
            prisma.wunschboxEntry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.wunschboxEntry.count({ where }),
        ]);

        res.json({
            entries: entries.map((e: any) => ({
                ...e,
                aiParsedChanges: parseAiParsedChanges(e.aiParsedChanges),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[Wunschbox] List error:', err);
        res.status(500).json({ error: 'Wünsche konnten nicht geladen werden' });
    }
});

// ─── GET /api/wunschbox/my — Own wishes ─────────────────────

router.get('/my', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const entries = await prisma.wunschboxEntry.findMany({
            where: {
                tenantId: resolvedTenant.tenantId,
                submittedBy: userId,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(entries.map((e: any) => ({
            ...e,
            aiParsedChanges: parseAiParsedChanges(e.aiParsedChanges),
        })));
    } catch (err) {
        console.error('[Wunschbox] My error:', err);
        res.status(500).json({ error: 'Wünsche konnten nicht geladen werden' });
    }
});

// ─── POST /api/wunschbox/:id/process — AI processing ───────

router.post('/:id/process', requireAuth, requireRole('admin'), requirePermission('admin_wunschbox'), async (req, res) => {
    try {
        const id = param(req, 'id');
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const parsed = await processWunschboxEntry(id, { tenantId: resolvedTenant.tenantId });
        const entry = await prisma.wunschboxEntry.findUnique({ where: { id } });
        if (!entry || entry.tenantId !== resolvedTenant.tenantId) {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        res.json({ ...entry, aiParsedChanges: parsed });
    } catch (err: any) {
        if (err.message?.includes('nicht gefunden')) {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        console.error('[Wunschbox] Process error:', err);
        res.status(500).json({ error: 'KI-Verarbeitung fehlgeschlagen' });
    }
});

// ─── PUT /api/wunschbox/:id/review — Change status ─────────

const reviewSchema = z.object({
    status: z.enum(['PENDING', 'AI_PROCESSED', 'REVIEWED', 'APPROVED', 'REJECTED', 'IMPLEMENTED']),
    adminNotes: z.string().max(2000).optional(),
});

router.put('/:id/review', requireAuth, requireRole('admin'), requirePermission('admin_wunschbox'), async (req, res) => {
    try {
        const data = reviewSchema.parse(req.body);
        const userId = getAuthenticatedUserId(req);
        const id = param(req, 'id');
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const existingEntry = await prisma.wunschboxEntry.findUnique({ where: { id } });
        if (!existingEntry || existingEntry.tenantId !== resolvedTenant.tenantId) {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }

        const entry = await prisma.wunschboxEntry.update({
            where: { id },
            data: {
                status: data.status,
                adminNotes: data.adminNotes,
                reviewedAt: new Date(),
                reviewedBy: userId,
            },
        });
        res.json({ ...entry, aiParsedChanges: parseAiParsedChanges(entry.aiParsedChanges) });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        console.error('[Wunschbox] Review error:', err);
        res.status(400).json({ error: 'Review fehlgeschlagen' });
    }
});

// ─── POST /api/wunschbox/:id/export — Generate spec ────────

router.post('/:id/export', requireAuth, requireRole('admin'), requirePermission('admin_wunschbox'), async (req, res) => {
    try {
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const spec = await generateExportSpec(param(req, 'id'), { tenantId: resolvedTenant.tenantId });
        res.json({ spec: JSON.parse(spec) });
    } catch (err: any) {
        if (err.message?.includes('nicht gefunden')) {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        console.error('[Wunschbox] Export error:', err);
        res.status(500).json({ error: 'Export fehlgeschlagen' });
    }
});

export default router;
