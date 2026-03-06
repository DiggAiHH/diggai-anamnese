import { Router, type Request } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth';
import { t, parseLang } from '../i18n';

const router = Router();

/** Extract a route param as a guaranteed string (Express 5 compat) */
function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

// Alle Admin-Routen erfordern Admin-Rolle (except /permissions/check)
router.use(requireAuth);

// ─── Dashboard Stats ────────────────────────────────────────

router.get('/stats', requireRole('admin'), async (req, res) => {
    try {
        const [
            totalPatients,
            totalSessions,
            activeSessions,
            completedSessions,
            unresolvedTriageEvents,
            totalUsers,
        ] = await Promise.all([
            prisma.patient.count(),
            prisma.patientSession.count(),
            prisma.patientSession.count({ where: { status: 'ACTIVE' } }),
            prisma.patientSession.count({ where: { status: 'COMPLETED' } }),
            prisma.triageEvent.count({ where: { acknowledgedBy: null } }),
            prisma.arztUser.count(),
        ]);

        const completionRate = totalSessions > 0
            ? Math.round((completedSessions / totalSessions) * 100)
            : 0;

        // Avg completion time (completed sessions with completedAt set)
        const completedWithTime = await prisma.patientSession.findMany({
            where: { status: 'COMPLETED', completedAt: { not: null } },
            select: { createdAt: true, completedAt: true },
            take: 100,
            orderBy: { completedAt: 'desc' },
        });

        const avgCompletionMinutes = completedWithTime.length > 0
            ? Math.round(
                completedWithTime.reduce((sum: any, s: any) => {
                    const diff = (s.completedAt!.getTime() - s.createdAt.getTime()) / 60000;
                    return sum + diff;
                }, 0) / completedWithTime.length
            )
            : 0;

        // Sessions today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sessionsToday = await prisma.patientSession.count({
            where: { createdAt: { gte: today } },
        });

        res.json({
            totalPatients,
            totalSessions,
            activeSessions,
            completedSessions,
            sessionsToday,
            completionRate,
            avgCompletionMinutes,
            unresolvedTriageEvents,
            totalUsers,
        });
    } catch (err) {
        console.error('[Admin] Stats error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.stats.load_failed') });
    }
});

// ─── Sessions Timeline (für Charts) ────────────────────────

router.get('/sessions/timeline', requireRole('admin'), async (req, res) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const sessions = await prisma.patientSession.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true, status: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const timeline: Record<string, { total: number; completed: number; active: number }> = {};
        for (const session of sessions) {
            const day = session.createdAt.toISOString().split('T')[0];
            if (!timeline[day]) timeline[day] = { total: 0, completed: 0, active: 0 };
            timeline[day].total++;
            if (session.status === 'COMPLETED') timeline[day].completed++;
            if (session.status === 'ACTIVE') timeline[day].active++;
        }

        res.json(Object.entries(timeline).map(([date, data]) => ({ date, ...data })));
    } catch (err) {
        console.error('[Admin] Timeline error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.timeline.load_failed') });
    }
});

// ─── Service Analytics (Pie Chart) ──────────────────────────

router.get('/analytics/services', requireRole('admin'), async (req, res) => {
    try {
        const services = await prisma.patientSession.groupBy({
            by: ['selectedService'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
        });

        res.json(services.map((s: any) => ({
            service: s.selectedService,
            count: s._count.id,
        })));
    } catch (err) {
        console.error('[Admin] Services analytics error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.analytics.service_failed') });
    }
});

// ─── Triage Analytics ───────────────────────────────────────

router.get('/analytics/triage', requireRole('admin'), async (req, res) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const events = await prisma.triageEvent.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true, level: true, acknowledgedBy: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const timeline: Record<string, { critical: number; warning: number; acknowledged: number }> = {};
        for (const event of events) {
            const day = event.createdAt.toISOString().split('T')[0];
            if (!timeline[day]) timeline[day] = { critical: 0, warning: 0, acknowledged: 0 };
            if (event.level === 'CRITICAL') timeline[day].critical++;
            if (event.level === 'WARNING') timeline[day].warning++;
            if (event.acknowledgedBy) timeline[day].acknowledged++;
        }

        res.json(Object.entries(timeline).map(([date, data]) => ({ date, ...data })));
    } catch (err) {
        console.error('[Admin] Triage analytics error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.analytics.triage_failed') });
    }
});

// ─── Audit Log (paginiert + filterbar) ──────────────────────

const auditLogQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(25),
    action: z.string().optional(),
    userId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    search: z.string().optional(),
});

router.get('/audit-log', requireRole('admin'), requirePermission('admin_audit'), async (req, res) => {
    try {
        const query = auditLogQuerySchema.parse(req.query);
        const where: any = {};

        if (query.action) where.action = query.action;
        if (query.userId) where.userId = query.userId;
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
        }
        if (query.search) {
            where.OR = [
                { action: { contains: query.search } },
                { resource: { contains: query.search } },
                { userId: { contains: query.search } },
            ];
        }

        const [entries, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({
            entries,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        });
    } catch (err) {
        console.error('[Admin] Audit log error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.audit.load_failed') });
    }
});

// ─── User Management (CRUD) ────────────────────────────────

router.get('/users', requireRole('admin'), requirePermission('admin_users'), async (req, res) => {
    try {
        const users = await prisma.arztUser.findMany({
            select: {
                id: true,
                username: true,
                displayName: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: { select: { assignedSessions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    } catch (err) {
        console.error('[Admin] Users list error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.users.load_failed') });
    }
});

const createUserSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(100),
    displayName: z.string().min(2).max(100),
    role: z.enum(['ARZT', 'MFA', 'ADMIN']),
});

router.post('/users', requireRole('admin'), async (req, res) => {
    try {
        const data = createUserSchema.parse(req.body);
        const passwordHash = await bcrypt.hash(data.password, 12);

        const user = await prisma.arztUser.create({
            data: {
                username: data.username,
                passwordHash,
                displayName: data.displayName,
                role: data.role,
            },
            select: { id: true, username: true, displayName: true, role: true, createdAt: true },
        });

        res.status(201).json(user);
    } catch (err: any) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: t(parseLang(req.headers['accept-language']), 'errors.users.username_exists') });
            return;
        }
        console.error('[Admin] Create user error:', err);
        res.status(500).json({ error: t(parseLang(req.headers['accept-language']), 'errors.users.create_failed') });
    }
});

const updateUserSchema = z.object({
    displayName: z.string().min(2).max(100).optional(),
    role: z.enum(['ARZT', 'MFA', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(100).optional(),
    pin: z.string().length(4).regex(/^\d{4}$/).optional(),
});

router.put('/users/:id', requireRole('admin'), async (req, res) => {
    try {
        const data = updateUserSchema.parse(req.body);
        const updateData: any = {};

        if (data.displayName) updateData.displayName = data.displayName;
        if (data.role) updateData.role = data.role;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);
        if (data.pin) updateData.pinHash = await bcrypt.hash(data.pin, 12);

        const user = await prisma.arztUser.update({
            where: { id: param(req, 'id') },
            data: updateData,
            select: { id: true, username: true, displayName: true, role: true, isActive: true },
        });

        res.json(user);
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Benutzer nicht gefunden' });
            return;
        }
        console.error('[Admin] Update user error:', err);
        res.status(500).json({ error: 'Benutzer konnte nicht aktualisiert werden' });
    }
});

router.delete('/users/:id', requireRole('admin'), async (req, res) => {
    try {
        // Soft delete: deactivate instead of hard delete
        await prisma.arztUser.update({
            where: { id: param(req, 'id') },
            data: { isActive: false },
        });
        res.json({ success: true, message: 'Benutzer deaktiviert' });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Benutzer nicht gefunden' });
            return;
        }
        console.error('[Admin] Delete user error:', err);
        res.status(500).json({ error: 'Benutzer konnte nicht deaktiviert werden' });
    }
});

// ─── Permissions Management ─────────────────────────────────

// GET /api/admin/permissions — All available permissions
router.get('/permissions', requireRole('admin'), async (_req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ category: 'asc' }, { code: 'asc' }],
            include: { roles: { select: { role: true } } },
        });
        res.json(permissions);
    } catch (err) {
        console.error('[Admin] Permissions list error:', err);
        res.status(500).json({ error: 'Berechtigungen konnten nicht geladen werden' });
    }
});

// GET /api/admin/roles/:role/permissions — Permissions for a role
router.get('/roles/:role/permissions', requireRole('admin'), async (req, res) => {
    try {
        const rolePerms = await prisma.rolePermission.findMany({
            where: { role: param(req, 'role') },
            include: { permission: true },
        });
        res.json(rolePerms.map((rp: any) => rp.permission));
    } catch (err) {
        console.error('[Admin] Role permissions error:', err);
        res.status(500).json({ error: 'Rollen-Berechtigungen konnten nicht geladen werden' });
    }
});

// PUT /api/admin/roles/:role/permissions — Set role permissions (replace all)
const setRolePermsSchema = z.object({
    permissionIds: z.array(z.string()).min(0),
});

router.put('/roles/:role/permissions', requireRole('admin'), async (req, res) => {
    try {
        const { permissionIds } = setRolePermsSchema.parse(req.body);
        const role = param(req, 'role');
        const userId = (req as any).user?.userId || 'unknown';

        // Delete existing, then re-create
        await prisma.$transaction([
            prisma.rolePermission.deleteMany({ where: { role } }),
            ...permissionIds.map(permissionId =>
                prisma.rolePermission.create({
                    data: { role, permissionId, grantedBy: userId },
                })
            ),
        ]);

        res.json({ success: true, count: permissionIds.length });
    } catch (err) {
        console.error('[Admin] Set role permissions error:', err);
        res.status(400).json({ error: 'Berechtigungen konnten nicht gesetzt werden' });
    }
});

// PUT /api/admin/users/:id/permissions — Individual custom permissions
const setUserPermsSchema = z.object({
    permissionCodes: z.array(z.string()),
});

router.put('/users/:id/permissions', requireRole('admin'), async (req, res) => {
    try {
        const { permissionCodes } = setUserPermsSchema.parse(req.body);

        await prisma.arztUser.update({
            where: { id: param(req, 'id') },
            data: { customPermissions: JSON.stringify(permissionCodes) },
        });

        res.json({ success: true });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Benutzer nicht gefunden' });
            return;
        }
        console.error('[Admin] Set user permissions error:', err);
        res.status(400).json({ error: 'Berechtigungen konnten nicht gesetzt werden' });
    }
});

// GET /api/admin/permissions/check — Check own permission (any authenticated role)
router.get('/permissions/check', async (req, res) => {
    try {
        const code = req.query.code as string;
        if (!code) { res.status(400).json({ error: 'code parameter required' }); return; }

        const userRole = (req as any).user?.role;
        const userId = (req as any).user?.userId;

        if (userRole === 'admin') {
            res.json({ allowed: true });
            return;
        }

        // Check role permission
        const rolePerm = await prisma.rolePermission.findFirst({
            where: {
                role: userRole,
                permission: { code },
            },
        });

        if (rolePerm) {
            res.json({ allowed: true });
            return;
        }

        // Check custom permissions
        if (userId) {
            const user = await prisma.arztUser.findUnique({
                where: { id: userId },
                select: { customPermissions: true },
            });
            if (user?.customPermissions) {
                const customs: string[] = JSON.parse(user.customPermissions);
                if (customs.includes(code)) {
                    res.json({ allowed: true });
                    return;
                }
            }
        }

        res.json({ allowed: false });
    } catch (err) {
        console.error('[Admin] Permission check error:', err);
        res.json({ allowed: false });
    }
});

// ─── Content Admin CRUD ─────────────────────────────────────

// GET /api/admin/content — List all waiting content (admin view)
router.get('/content', requireRole('admin'), requirePermission('admin_content'), async (req, res) => {
    try {
        const type = req.query.type as string;
        const category = req.query.category as string;
        const where: any = {};
        if (type) where.type = type;
        if (category) where.category = category;

        const content = await prisma.waitingContent.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });
        res.json(content.map((c: any) => ({
            ...c,
            quizData: c.quizData ? JSON.parse(c.quizData) : null,
        })));
    } catch (err) {
        console.error('[Admin] Content list error:', err);
        res.status(500).json({ error: 'Content konnte nicht geladen werden' });
    }
});

// POST /api/admin/content — Create content
const createContentSchema = z.object({
    type: z.enum(['HEALTH_TIP', 'FUN_FACT', 'MINI_QUIZ', 'BREATHING_EXERCISE', 'SEASONAL_INFO', 'PRAXIS_NEWS']),
    category: z.string().max(50),
    title: z.string().min(2).max(200),
    body: z.string().min(5).max(5000),
    quizData: z.any().optional(),
    displayDurationSec: z.number().min(5).max(300).optional(),
    priority: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    seasonal: z.string().max(20).optional(),
    language: z.string().max(5).optional(),
});

router.post('/content', requireRole('admin'), async (req, res) => {
    try {
        const data = createContentSchema.parse(req.body);
        const content = await prisma.waitingContent.create({
            data: {
                ...data,
                quizData: data.quizData ? JSON.stringify(data.quizData) : null,
            },
        });
        res.status(201).json({ ...content, quizData: content.quizData ? JSON.parse(content.quizData) : null });
    } catch (err) {
        console.error('[Admin] Content create error:', err);
        res.status(400).json({ error: 'Content konnte nicht erstellt werden' });
    }
});

// PUT /api/admin/content/:id — Update content
router.put('/content/:id', requireRole('admin'), async (req, res) => {
    try {
        const data = createContentSchema.partial().parse(req.body);
        const updateData: any = { ...data };
        if (data.quizData !== undefined) {
            updateData.quizData = data.quizData ? JSON.stringify(data.quizData) : null;
        }

        const content = await prisma.waitingContent.update({
            where: { id: param(req, 'id') },
            data: updateData,
        });
        res.json({ ...content, quizData: content.quizData ? JSON.parse(content.quizData) : null });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Content nicht gefunden' }); return; }
        console.error('[Admin] Content update error:', err);
        res.status(400).json({ error: 'Content konnte nicht aktualisiert werden' });
    }
});

// DELETE /api/admin/content/:id — Delete content
router.delete('/content/:id', requireRole('admin'), async (req, res) => {
    try {
        await prisma.waitingContent.delete({ where: { id: param(req, 'id') } });
        res.json({ success: true });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Content nicht gefunden' }); return; }
        console.error('[Admin] Content delete error:', err);
        res.status(500).json({ error: 'Content konnte nicht gelöscht werden' });
    }
});

// POST /api/admin/content/seed — Seed default waiting content
router.post('/content/seed', requireRole('admin'), async (req, res) => {
    try {
        const { seedWaitingContent } = await import('../../prisma/seed-content');
        const created = await seedWaitingContent();
        res.json({ success: true, created });
    } catch (err) {
        console.error('[Admin] Content seed error:', err);
        res.status(500).json({ error: 'Seed fehlgeschlagen' });
    }
});

export default router;
