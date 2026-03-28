import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../db';
import { getAiConfig } from '../services/ai/ai-config';
import { optimizeBilling } from '../services/ai/billing-optimization.service';
import { processAmbientVoice } from '../services/ai/ambient-scribe.service';

const router = Router();

// Only medical staff and admins can access AI helper endpoints
router.use(requireAuth, requireRole('admin', 'arzt', 'mfa'));

async function ensurePhiSafeAiProvider() {
    const config = await getAiConfig();

    if (config.provider !== 'ollama') {
        throw new Error('PHI_UNSAFE_AI_PROVIDER');
    }
}

async function ensureTenantScopedSession(sessionId: string, tenantId: string | undefined) {
    if (!tenantId) {
        throw new Error('MISSING_TENANT_CONTEXT');
    }

    const session = await prisma.patientSession.findFirst({
        where: {
            id: sessionId,
            tenantId,
        },
        select: { id: true },
    });

    if (!session) {
        throw new Error('SESSION_NOT_FOUND');
    }
}

// ─── POST /api/ai/billing-optimization ────────────
router.post('/billing-optimization', async (req: Request, res: Response) => {
    try {
        const { clinicalNotes, sessionId } = req.body;
        const tenantId = req.tenantId || req.auth?.tenantId;

        if (!tenantId) {
            res.status(403).json({ error: 'Tenant-Kontext erforderlich' });
            return;
        }

        if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
            res.status(400).json({ error: 'sessionId parameter is required' });
            return;
        }

        if (typeof clinicalNotes !== 'string' || clinicalNotes.trim().length === 0) {
            res.status(400).json({ error: 'clinicalNotes parameter is required' });
            return;
        }

        await ensurePhiSafeAiProvider();
        await ensureTenantScopedSession(sessionId, tenantId);
        
        const suggestions = await optimizeBilling(clinicalNotes);
        res.json({ suggestions });
    } catch (err: any) {
        if (err instanceof Error && err.message === 'PHI_UNSAFE_AI_PROVIDER') {
            res.status(503).json({ error: 'KI-Verarbeitung für PHI ist nur mit lokalem Provider verfügbar' });
            return;
        }

        if (err instanceof Error && err.message === 'MISSING_TENANT_CONTEXT') {
            res.status(403).json({ error: 'Tenant-Kontext erforderlich' });
            return;
        }

        if (err instanceof Error && err.message === 'SESSION_NOT_FOUND') {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        console.error('[AI] Billing optimization error', {
            sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : 'unknown',
            errorName: err instanceof Error ? err.name : 'UnknownError',
        });
        res.status(500).json({ error: 'Abrechnungsanalyse fehlgeschlagen' });
    }
});

// ─── POST /api/ai/ambient-scribe ────────────
router.post('/ambient-scribe', async (req: Request, res: Response) => {
    try {
        const { transcript, sessionId } = req.body;
        const tenantId = req.tenantId || req.auth?.tenantId;

        if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
            res.status(400).json({ error: 'sessionId parameter is required' });
            return;
        }

        if (typeof transcript !== 'string' || transcript.trim().length === 0) {
            res.status(400).json({ error: 'transcript parameter is required' });
            return;
        }

        await ensurePhiSafeAiProvider();
        await ensureTenantScopedSession(sessionId, tenantId);
        
        const soapNote = await processAmbientVoice(transcript, sessionId);
        res.json({ soapNote });
    } catch (err: any) {
        if (err instanceof Error && err.message === 'PHI_UNSAFE_AI_PROVIDER') {
            res.status(503).json({ error: 'KI-Verarbeitung für PHI ist nur mit lokalem Provider verfügbar' });
            return;
        }

        if (err instanceof Error && err.message === 'MISSING_TENANT_CONTEXT') {
            res.status(403).json({ error: 'Tenant-Kontext erforderlich' });
            return;
        }

        if (err instanceof Error && err.message === 'SESSION_NOT_FOUND') {
            res.status(404).json({ error: 'Session nicht gefunden' });
            return;
        }

        console.error('[AI] Ambient scribe error', {
            sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : 'unknown',
            errorName: err instanceof Error ? err.name : 'UnknownError',
        });
        res.status(500).json({ error: 'SOAP-Notiz Generierung fehlgeschlagen' });
    }
});

export default router;
