import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Alle Admin-Routen erfordern Admin-Rolle
router.use(requireAuth, requireRole('admin'));

// ─── Dashboard Stats ────────────────────────────────────────

router.get('/stats', async (_req, res) => {
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
                completedWithTime.reduce((sum, s) => {
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
        res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
    }
});

// ─── Sessions Timeline (für Charts) ────────────────────────

router.get('/sessions/timeline', async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
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
        res.status(500).json({ error: 'Timeline konnte nicht geladen werden' });
    }
});

// ─── Service Analytics (Pie Chart) ──────────────────────────

router.get('/analytics/services', async (_req, res) => {
    try {
        const services = await prisma.patientSession.groupBy({
            by: ['selectedService'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
        });

        res.json(services.map(s => ({
            service: s.selectedService,
            count: s._count.id,
        })));
    } catch (err) {
        console.error('[Admin] Services analytics error:', err);
        res.status(500).json({ error: 'Service-Analytik konnte nicht geladen werden' });
    }
});

// ─── Triage Analytics ───────────────────────────────────────

router.get('/analytics/triage', async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
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
        res.status(500).json({ error: 'Triage-Analytik konnte nicht geladen werden' });
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

router.get('/audit-log', async (req, res) => {
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
        res.status(500).json({ error: 'Audit-Log konnte nicht geladen werden' });
    }
});

// ─── User Management (CRUD) ────────────────────────────────

router.get('/users', async (_req, res) => {
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
        res.status(500).json({ error: 'Benutzerliste konnte nicht geladen werden' });
    }
});

const createUserSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(100),
    displayName: z.string().min(2).max(100),
    role: z.enum(['ARZT', 'MFA', 'ADMIN']),
});

router.post('/users', async (req, res) => {
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
            res.status(409).json({ error: 'Benutzername existiert bereits' });
            return;
        }
        console.error('[Admin] Create user error:', err);
        res.status(500).json({ error: 'Benutzer konnte nicht erstellt werden' });
    }
});

const updateUserSchema = z.object({
    displayName: z.string().min(2).max(100).optional(),
    role: z.enum(['ARZT', 'MFA', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(100).optional(),
    pin: z.string().length(4).regex(/^\d{4}$/).optional(),
});

router.put('/users/:id', async (req, res) => {
    try {
        const data = updateUserSchema.parse(req.body);
        const updateData: any = {};

        if (data.displayName) updateData.displayName = data.displayName;
        if (data.role) updateData.role = data.role;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);
        if (data.pin) updateData.pinHash = await bcrypt.hash(data.pin, 12);

        const user = await prisma.arztUser.update({
            where: { id: req.params.id },
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

router.delete('/users/:id', async (req, res) => {
    try {
        // Soft delete: deactivate instead of hard delete
        await prisma.arztUser.update({
            where: { id: req.params.id },
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

export default router;
