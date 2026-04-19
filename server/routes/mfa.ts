import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { decryptEncryptedPackage, PackageError } from '../services/export/package.service';
import { importEncryptedPackagePayload } from '../services/export/package-import.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

/**
 * GET /api/mfa/sessions
 * Alle Sessions abrufen (für MFA Übersicht)
 */
router.get('/sessions', requireAuth, requireRole('mfa', 'admin'), async (_req: Request, res: Response) => {
    try {
        const req = _req;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        // Server-side pagination + filtering
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const skip = (page - 1) * limit;
        const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
        const triageFilter = typeof req.query.triage === 'string' ? req.query.triage : undefined;

        const where = {
            tenantId: resolvedTenant.tenantId,
            ...(statusFilter && { status: statusFilter }),
            ...(triageFilter === 'critical' && {
                triageEvents: { some: { level: 'CRITICAL', acknowledgedBy: null } },
            }),
        };

        const [sessions, total] = await Promise.all([
            prisma.patientSession.findMany({
                where,
                include: {
                    assignedArzt: {
                        select: {
                            id: true,
                            displayName: true,
                        }
                    },
                    _count: {
                        select: { answers: true }
                    },
                    triageEvents: {
                        where: { level: 'CRITICAL', acknowledgedBy: null },
                        select: { id: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.patientSession.count({ where }),
        ]);

        const result = sessions.map(s => ({
            id: s.id,
            selectedService: s.selectedService,
            status: s.status,
            createdAt: s.createdAt,
            totalAnswers: s._count.answers,
            unresolvedCritical: s.triageEvents.length,
            assignedArzt: s.assignedArzt,
        }));

        res.json({
            sessions: result,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err: unknown) {
        console.error('[MFA] Sessions-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * GET /api/mfa/doctors
 * Liste aller verfügbaren Ärzte abrufen
 */
router.get('/doctors', requireAuth, requireRole('mfa', 'admin'), async (_req: Request, res: Response) => {
    try {
        const req = _req;
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const doctors = await prisma.arztUser.findMany({
            where: {
                tenantId: resolvedTenant.tenantId,
                role: 'ARZT',
            },
            select: {
                id: true,
                displayName: true,
                username: true,
            }
        });
        res.json({ doctors });
    } catch (err: unknown) {
        console.error('[MFA] Doctors-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * POST /api/mfa/sessions/:id/assign
 * Einer Session einen Arzt zuweisen
 */
router.post('/sessions/:id/assign', requireAuth, requireRole('mfa', 'admin'), async (req: Request, res: Response) => {
    try {
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }

        const { id } = req.params;
        const assignSchema = z.object({ arztId: z.string().uuid() });
        const parseResult = assignSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: 'Gültige ArztId (UUID) erforderlich' });
            return;
        }
        const { arztId } = parseResult.data;

        const doctor = await prisma.arztUser.findUnique({
            where: {
                id_tenantId: {
                    id: arztId,
                    tenantId: resolvedTenant.tenantId,
                },
            },
            select: {
                id: true,
                role: true,
            },
        });

        if (!doctor || doctor.role !== 'ARZT') {
            res.status(404).json({ error: 'Arzt nicht gefunden' });
            return;
        }

        const sessionExists = await prisma.patientSession.findFirst({
            where: {
                id: id as string,
                tenantId: resolvedTenant.tenantId,
            },
            select: { id: true },
        });

        if (!sessionExists) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        const session = await prisma.patientSession.update({
            where: { id: id as string },
            data: { assignedArztId: arztId },
            include: { assignedArzt: true }
        });

        res.json({ success: true, session });
    } catch (err: unknown) {
        console.error('[MFA] Assignment-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

router.post('/imports', requireAuth, requireRole('mfa', 'admin'), upload.single('file'), async (req: Request, res: Response) => {
    try {
        const resolvedTenant = resolveEffectiveTenant(req);
        if (!resolvedTenant.ok) {
            res.status(resolvedTenant.status).json(resolvedTenant.body);
            return;
        }
        const tenantId = resolvedTenant.tenantId;

        if (!req.file?.buffer) {
            res.status(400).json({ error: 'Es wurde keine JSON-Datei hochgeladen', code: 'PACKAGE_FILE_REQUIRED' });
            return;
        }

        let parsedPackage: unknown;
        try {
            parsedPackage = JSON.parse(req.file.buffer.toString('utf-8'));
        } catch {
            res.status(400).json({ error: 'Die hochgeladene Datei ist kein gültiges JSON-Paket', code: 'PACKAGE_JSON_INVALID' });
            return;
        }

        const decrypted = await decryptEncryptedPackage(parsedPackage, tenantId);
        const result = await importEncryptedPackagePayload({
            tenantId,
            checksum: decrypted.package.checksum,
            payload: decrypted.payload,
            importedByUserId: req.auth?.userId || null,
            sourceFilename: req.file.originalname,
        });

        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: req.auth?.userId || null,
                action: 'IMPORT_PACKAGE',
                resource: `sessions/${result.sessionId}`,
                metadata: JSON.stringify({
                    packageId: result.packageId,
                    sessionId: result.sessionId,
                    status: result.status,
                }),
            },
        });

        res.json(result);
    } catch (err: unknown) {
        if (err instanceof PackageError) {
            res.status(err.status).json({ error: err.message, code: err.code });
            return;
        }

        console.error('[MFA] Import-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// ── Klaproth Pipeline: Bearbeitet-Status (PENDING ↔ PROCESSED) ──

const processedSchema = z.object({
    processedStatus: z.enum(['PENDING', 'PROCESSED']),
});

router.patch('/sessions/:id/processed', requireAuth, requireRole('mfa', 'arzt', 'admin'), async (req: Request, res: Response) => {
    try {
        const tenantResult = resolveEffectiveTenant(req);
        if (!tenantResult.ok) {
            res.status(tenantResult.status).json(tenantResult.body);
            return;
        }

        const parsed = processedSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Ungültiger Status', details: parsed.error.issues });
            return;
        }

        const sessionId = req.params.id as string;
        const userId = typeof req.auth?.userId === 'string' ? req.auth.userId : undefined;

        const session = await prisma.patientSession.findFirst({
            where: { id: sessionId, tenantId: tenantResult.tenantId },
        });

        if (!session) {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        const updated = await prisma.patientSession.update({
            where: { id: sessionId },
            data: {
                processedStatus: parsed.data.processedStatus,
                processedAt: parsed.data.processedStatus === 'PROCESSED' ? new Date() : null,
                processedBy: parsed.data.processedStatus === 'PROCESSED' ? userId : null,
            },
        });

        res.json({
            success: true,
            processedStatus: updated.processedStatus,
            processedAt: updated.processedAt,
        });
    } catch (err) {
        console.error('[MFA] Processed-Status-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
