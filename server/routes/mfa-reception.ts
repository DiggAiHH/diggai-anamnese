import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  confirmReceptionDispatch,
  getReceptionInboxDetail,
  listReceptionInbox,
  markReceptionInboxCompleted,
  markReceptionInboxProcessed,
  markReceptionInboxRead,
  sendPracticeInboxCopy,
  sendReceptionResponse,
} from '../services/mfa/receptionInbox.service';

const router = Router();

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

const responsePayloadSchema = z.object({
  templateKey: z.enum([
    'received',
    'in_review',
    'completed',
    'callback',
    'termin_confirmed',
    'rezept_ready_pickup',
    'rezept_ready_post',
    'au_issued',
    'ueberweisung_ready',
    'bg_unfall_registered',
    'befund_available',
    'befund_appointment_needed',
    'rückruf_scheduled',
  ]),
  customNote: z.string().trim().max(2000).optional().nullable(),
  mode: z.enum(['auto', 'smtp', 'manual']).default('auto'),
});

const confirmPayloadSchema = z.object({
  kind: z.enum(['practice-copy', 'response']),
});

router.use(requireAuth, requireRole('mfa', 'admin'));

router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const result = await listReceptionInbox(resolvedTenant.tenantId);
    res.json(result);
  } catch (error) {
    console.error('[MFA Reception] Inbox-Fehler:', error);
    res.status(500).json({ error: 'Posteingang konnte nicht geladen werden' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const result = await listReceptionInbox(resolvedTenant.tenantId);
    res.json(result.stats);
  } catch (error) {
    console.error('[MFA Reception] Stats-Fehler:', error);
    res.status(500).json({ error: 'Kennzahlen konnten nicht geladen werden' });
  }
});

router.get('/inbox/:sessionId', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const detail = await getReceptionInboxDetail(resolvedTenant.tenantId, req.params.sessionId as string);
    res.json(detail);
  } catch (error) {
    if (error instanceof Error && error.message === 'Session not found') {
      res.status(404).json({ error: 'Sitzung nicht gefunden' });
      return;
    }

    console.error('[MFA Reception] Detail-Fehler:', error);
    res.status(500).json({ error: 'Anfrage konnte nicht geladen werden' });
  }
});

router.post('/inbox/:sessionId/read', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    await markReceptionInboxRead(resolvedTenant.tenantId, req.params.sessionId as string, req.auth?.userId || '');
    res.json({ success: true });
  } catch (error) {
    console.error('[MFA Reception] Read-Fehler:', error);
    res.status(500).json({ error: 'Lesestatus konnte nicht aktualisiert werden' });
  }
});

router.post('/inbox/:sessionId/process', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    await markReceptionInboxProcessed(resolvedTenant.tenantId, req.params.sessionId as string, req.auth?.userId || '');
    res.json({ success: true });
  } catch (error) {
    console.error('[MFA Reception] Process-Fehler:', error);
    res.status(500).json({ error: 'Bearbeitungsstatus konnte nicht aktualisiert werden' });
  }
});

router.post('/inbox/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    await markReceptionInboxCompleted(resolvedTenant.tenantId, req.params.sessionId as string, req.auth?.userId || '');
    res.json({ success: true });
  } catch (error) {
    console.error('[MFA Reception] Complete-Fehler:', error);
    res.status(500).json({ error: 'Anliegen konnte nicht abgeschlossen werden' });
  }
});

router.post('/inbox/:sessionId/practice-copy', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const result = await sendPracticeInboxCopy({
      tenantId: resolvedTenant.tenantId,
      sessionId: req.params.sessionId as string,
      userId: req.auth?.userId || null,
    });

    res.json(result);
  } catch (error) {
    console.error('[MFA Reception] Practice-Copy-Fehler:', error);
    res.status(500).json({ error: 'Praxis-Mail konnte nicht vorbereitet werden' });
  }
});

router.post('/inbox/:sessionId/respond', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const payload = responsePayloadSchema.parse(req.body || {});
    const result = await sendReceptionResponse({
      tenantId: resolvedTenant.tenantId,
      sessionId: req.params.sessionId as string,
      userId: req.auth?.userId || null,
      templateKey: payload.templateKey,
      customNote: payload.customNote,
      mode: payload.mode,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Ungültige Antwortdaten', details: error.issues });
      return;
    }

    console.error('[MFA Reception] Response-Fehler:', error);
    res.status(500).json({ error: 'Antwort konnte nicht vorbereitet werden' });
  }
});

router.post('/inbox/:sessionId/confirm', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const payload = confirmPayloadSchema.parse(req.body || {});
    await confirmReceptionDispatch({
      tenantId: resolvedTenant.tenantId,
      sessionId: req.params.sessionId as string,
      userId: req.auth?.userId || null,
      kind: payload.kind,
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Ungültige Bestätigung', details: error.issues });
      return;
    }

    console.error('[MFA Reception] Confirm-Fehler:', error);
    res.status(500).json({ error: 'Bestätigung konnte nicht gespeichert werden' });
  }
});

const smsPayloadSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{6,14}$/, 'E.164-Format erforderlich (+49...)'),
  body: z.string().trim().min(1).max(160),
});

router.post('/inbox/:sessionId/sms', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const payload = smsPayloadSchema.parse(req.body || {});
    const { sendSms, isSmsAvailable } = await import('../services/sms.service');

    if (!isSmsAvailable()) {
      res.status(503).json({ error: 'SMS nicht konfiguriert (TWILIO_* Umgebungsvariablen fehlen)' });
      return;
    }

    const result = await sendSms({ to: payload.to, body: payload.body });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Ungültige SMS-Daten', details: error.issues });
      return;
    }

    console.error('[MFA Reception] SMS-Fehler:', error);
    res.status(500).json({ error: 'SMS konnte nicht gesendet werden' });
  }
});

const starfacePayloadSchema = z.object({
  callee: z.string().trim().min(5).max(30),
  caller: z.string().trim().optional(),
});

router.post('/inbox/:sessionId/starface-callback', async (req: Request, res: Response) => {
  try {
    const resolvedTenant = resolveEffectiveTenant(req);
    if (!resolvedTenant.ok) {
      res.status(resolvedTenant.status).json(resolvedTenant.body);
      return;
    }

    const payload = starfacePayloadSchema.parse(req.body || {});
    const { initiateClick2Dial, isStarfaceAvailable } = await import('../services/starface.service');

    if (!isStarfaceAvailable()) {
      res.status(503).json({ error: 'Starface nicht konfiguriert (STARFACE_* Umgebungsvariablen fehlen)' });
      return;
    }

    const result = await initiateClick2Dial({ callee: payload.callee, caller: payload.caller });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Ungültige Rückrufdaten', details: error.issues });
      return;
    }

    console.error('[MFA Reception] Starface-Fehler:', error);
    res.status(500).json({ error: 'Rückruf konnte nicht initiiert werden' });
  }
});

export default router;