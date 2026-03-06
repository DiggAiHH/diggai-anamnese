import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { evaluateAlertRules, generatePseudonym, anonymizeSession } from '../services/therapy';
import { aiEngine } from '../services/ai/ai-engine.service';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────

const createPlanSchema = z.object({
  sessionId: z.string().uuid(),
  patientId: z.string().uuid(),
  title: z.string().min(1).max(500),
  diagnosis: z.string().optional(),
  icdCodes: z.array(z.string()).optional().default([]),
  summary: z.string().optional(),
  templateId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

const updatePlanSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  diagnosis: z.string().optional(),
  icdCodes: z.array(z.string()).optional(),
  summary: z.string().optional(),
  targetEndDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
});

const createMeasureSchema = z.object({
  type: z.enum(['MEDICATION', 'PROCEDURE', 'REFERRAL', 'LAB_ORDER', 'IMAGING', 'LIFESTYLE', 'FOLLOW_UP', 'DOCUMENTATION', 'CUSTOM']),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.number().int().min(0).optional().default(0),
  medicationName: z.string().optional(),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  pzn: z.string().optional(),
  atcCode: z.string().optional(),
  referralTo: z.string().optional(),
  referralReason: z.string().optional(),
  referralUrgency: z.string().optional(),
  labParameters: z.array(z.string()).optional().default([]),
  scheduledDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  aiSuggested: z.boolean().optional().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
});

const updateMeasureSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.number().int().min(0).optional(),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  scheduledDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  arztApproved: z.boolean().optional(),
  arztModified: z.boolean().optional(),
});

const measureStatusSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'OVERDUE']),
});

const reorderSchema = z.object({
  measureIds: z.array(z.string().uuid()),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1),
  icdCodes: z.array(z.string()).optional().default([]),
  measures: z.array(z.object({
    type: z.enum(['MEDICATION', 'PROCEDURE', 'REFERRAL', 'LAB_ORDER', 'IMAGING', 'LIFESTYLE', 'FOLLOW_UP', 'DOCUMENTATION', 'CUSTOM']),
    title: z.string(),
    description: z.string().optional(),
    dosage: z.string().optional(),
    duration: z.string().optional(),
    priority: z.number().int().optional().default(0),
    referralTo: z.string().optional(),
    labParameters: z.array(z.string()).optional(),
  })),
  defaultDuration: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

const alertActionSchema = z.object({
  action: z.string().min(1),
});

const alertDismissSchema = z.object({
  reason: z.string().optional(),
});

// ─── Helper ─────────────────────────────────────────────────

function getPrisma(req: Request) {
  return (req as any).prisma || (globalThis as any).__prisma;
}

function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).user?.userId || '';
}

// ═══════════════════════════════════════════════════════════════
// 1. THERAPY PLANS
// ═══════════════════════════════════════════════════════════════

// POST /plans — Create new therapy plan
router.post('/plans', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const data = createPlanSchema.parse(req.body);
    const prisma = getPrisma(req);
    const userId = getUserId(req);

    const plan = await prisma.therapyPlan.create({
      data: {
        sessionId: data.sessionId,
        patientId: data.patientId,
        createdById: userId,
        title: data.title,
        diagnosis: data.diagnosis,
        icdCodes: data.icdCodes,
        summary: data.summary,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : null,
      },
      include: { measures: true, alerts: true },
    });

    // Apply template if specified
    if (data.templateId) {
      const template = await prisma.therapyTemplate.findUnique({ where: { id: data.templateId } });
      if (template?.measures && Array.isArray(template.measures)) {
        const measures = (template.measures as any[]).map((m, idx) => ({
          planId: plan.id,
          type: m.type,
          title: m.title,
          description: m.description || null,
          dosage: m.dosage || null,
          duration: m.duration || null,
          priority: m.priority ?? idx,
          referralTo: m.referralTo || null,
          labParameters: m.labParameters || [],
        }));
        await prisma.therapyMeasure.createMany({ data: measures });
        await prisma.therapyTemplate.update({ where: { id: data.templateId }, data: { usageCount: { increment: 1 } } });
      }
    }

    const fullPlan = await prisma.therapyPlan.findUnique({
      where: { id: plan.id },
      include: { measures: { orderBy: { priority: 'asc' } }, alerts: true },
    });

    res.status(201).json(fullPlan);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[therapy] create plan error:', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Therapieplans' });
  }
});

// GET /plans/:id — Get plan with measures + alerts
router.get('/plans/:id', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const plan = await prisma.therapyPlan.findUnique({
      where: { id: req.params.id },
      include: {
        measures: { orderBy: { priority: 'asc' } },
        alerts: { orderBy: { createdAt: 'desc' } },
        patient: { select: { id: true, patientNumber: true, gender: true, birthDate: true } },
        session: { select: { id: true, status: true, completedAt: true } },
      },
    });
    if (!plan) return res.status(404).json({ error: 'Therapieplan nicht gefunden' });
    res.json(plan);
  } catch (err: any) {
    console.error('[therapy] get plan error:', err);
    res.status(500).json({ error: 'Fehler beim Laden des Therapieplans' });
  }
});

// PUT /plans/:id — Update plan
router.put('/plans/:id', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const data = updatePlanSchema.parse(req.body);
    const prisma = getPrisma(req);
    const plan = await prisma.therapyPlan.update({
      where: { id: req.params.id },
      data: {
        ...data,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined,
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : undefined,
      },
      include: { measures: { orderBy: { priority: 'asc' } } },
    });
    res.json(plan);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[therapy] update plan error:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// DELETE /plans/:id — Soft/hard delete
router.delete('/plans/:id', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    await prisma.therapyPlan.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[therapy] delete plan error:', err);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// GET /plans/patient/:patientId — Plans by patient
router.get('/plans/patient/:patientId', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const plans = await prisma.therapyPlan.findMany({
      where: { patientId: req.params.patientId, status: { not: 'CANCELLED' } },
      include: { measures: { orderBy: { priority: 'asc' } }, _count: { select: { alerts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (err: any) {
    console.error('[therapy] patient plans error:', err);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /plans/session/:sessionId — Plans by session
router.get('/plans/session/:sessionId', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const plans = await prisma.therapyPlan.findMany({
      where: { sessionId: req.params.sessionId },
      include: { measures: { orderBy: { priority: 'asc' } }, alerts: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (err: any) {
    console.error('[therapy] session plans error:', err);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// PUT /plans/:id/status — Change plan status
router.put('/plans/:id/status', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const prisma = getPrisma(req);
    const updateData: any = { status };
    if (status === 'COMPLETED') updateData.actualEndDate = new Date();
    if (status === 'ACTIVE') updateData.lastReviewedAt = new Date();

    const plan = await prisma.therapyPlan.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(plan);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Statuswechsel' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. MEASURES
// ═══════════════════════════════════════════════════════════════

// POST /plans/:planId/measures — Add measure
router.post('/plans/:planId/measures', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const data = createMeasureSchema.parse(req.body);
    const prisma = getPrisma(req);
    const measure = await prisma.therapyMeasure.create({
      data: { planId: req.params.planId, ...data, scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null, dueDate: data.dueDate ? new Date(data.dueDate) : null },
    });
    res.status(201).json(measure);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Erstellen der Maßnahme' });
  }
});

// PUT /measures/:id — Update measure
router.put('/measures/:id', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const data = updateMeasureSchema.parse(req.body);
    const prisma = getPrisma(req);
    const measure = await prisma.therapyMeasure.update({
      where: { id: req.params.id },
      data: { ...data, scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
    res.json(measure);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// DELETE /measures/:id
router.delete('/measures/:id', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    await prisma.therapyMeasure.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// PUT /measures/:id/status — Update measure status
router.put('/measures/:id/status', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { status } = measureStatusSchema.parse(req.body);
    const prisma = getPrisma(req);
    const updateData: any = { status };
    if (status === 'COMPLETED') updateData.completedDate = new Date();
    const measure = await prisma.therapyMeasure.update({ where: { id: req.params.id }, data: updateData });
    res.json(measure);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Statuswechsel' });
  }
});

// PUT /plans/:planId/measures/reorder — Reorder measures
router.put('/plans/:planId/measures/reorder', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { measureIds } = reorderSchema.parse(req.body);
    const prisma = getPrisma(req);
    await prisma.$transaction(
      measureIds.map((id, idx) => prisma.therapyMeasure.update({ where: { id }, data: { priority: idx } }))
    );
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Umsortieren' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. TEMPLATES
// ═══════════════════════════════════════════════════════════════

// GET /templates — List all active templates
router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const category = req.query.category as string | undefined;
    const where: any = { isActive: true };
    if (category) where.category = category;
    const templates = await prisma.therapyTemplate.findMany({ where, orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }] });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Laden der Templates' });
  }
});

// GET /templates/:id
router.get('/templates/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const template = await prisma.therapyTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Template nicht gefunden' });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// POST /templates — Create template
router.post('/templates', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const data = createTemplateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const template = await prisma.therapyTemplate.create({
      data: { ...data, measures: data.measures as any, createdById: getUserId(req) },
    });
    res.status(201).json(template);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

// PUT /templates/:id
router.put('/templates/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const data = createTemplateSchema.partial().parse(req.body);
    const prisma = getPrisma(req);
    const template = await prisma.therapyTemplate.update({
      where: { id: req.params.id },
      data: { ...data, measures: data.measures ? (data.measures as any) : undefined },
    });
    res.json(template);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// DELETE /templates/:id — Deactivate
router.delete('/templates/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    await prisma.therapyTemplate.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Deaktivieren' });
  }
});

// POST /templates/:id/apply — Apply template to existing plan
router.post('/templates/:id/apply', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { planId } = z.object({ planId: z.string().uuid() }).parse(req.body);
    const prisma = getPrisma(req);
    const template = await prisma.therapyTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: 'Template nicht gefunden' });

    const measures = (template.measures as any[] || []).map((m: any, idx: number) => ({
      planId,
      type: m.type,
      title: m.title,
      description: m.description || null,
      dosage: m.dosage || null,
      duration: m.duration || null,
      priority: m.priority ?? idx,
      referralTo: m.referralTo || null,
      labParameters: m.labParameters || [],
    }));
    await prisma.therapyMeasure.createMany({ data: measures });
    await prisma.therapyTemplate.update({ where: { id: req.params.id }, data: { usageCount: { increment: 1 } } });
    res.json({ success: true, addedMeasures: measures.length });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Anwenden' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 4. AI STUBS (prepared for future AI integration)
// ═══════════════════════════════════════════════════════════════

// POST /ai/suggest — AI therapy suggestions
router.post('/ai/suggest', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);
    const result = await aiEngine.suggestTherapy(sessionId);
    res.json({
      available: true,
      mode: result.mode,
      aiModel: result.aiModel,
      aiConfidence: result.aiConfidence,
      aiPromptHash: result.aiPromptHash,
      durationMs: result.durationMs,
      suggestion: result.suggestion,
    });
  } catch (err: any) {
    console.error('[AI suggest] error:', err.message);
    res.status(500).json({ error: 'KI-Vorschlag fehlgeschlagen', details: err.message });
  }
});

// POST /ai/summarize/:sessionId — AI session summary
router.post('/ai/summarize/:sessionId', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const sessionId = z.string().uuid().parse(req.params.sessionId);
    const result = await aiEngine.summarizeSession(sessionId);
    res.json({
      available: true,
      mode: result.mode,
      aiModel: result.aiModel,
      durationMs: result.durationMs,
      summary: result.summary,
    });
  } catch (err: any) {
    console.error('[AI summarize] error:', err.message);
    res.status(500).json({ error: 'KI-Zusammenfassung fehlgeschlagen', details: err.message });
  }
});

// POST /ai/icd-suggest — AI ICD-10 code suggestions
router.post('/ai/icd-suggest', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { symptoms } = z.object({ symptoms: z.string().min(1) }).parse(req.body);
    const result = await aiEngine.suggestIcd(symptoms);
    res.json({
      available: true,
      mode: result.mode,
      suggestions: result.suggestions,
    });
  } catch (err: any) {
    console.error('[AI icd-suggest] error:', err.message);
    res.status(500).json({ error: 'ICD-Vorschlag fehlgeschlagen', details: err.message });
  }
});

// GET /ai/status — AI service status
router.get('/ai/status', requireAuth, async (_req: Request, res: Response) => {
  try {
    const status = await aiEngine.getStatus();
    res.json(status);
  } catch (err: any) {
    res.json({ available: false, provider: 'none', model: null, online: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5. CLINICAL ALERTS
// ═══════════════════════════════════════════════════════════════

// GET /alerts — List alerts (paginated, filterable)
router.get('/alerts', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;
    const severity = req.query.severity as string | undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = {};
    if (severity) where.severity = severity;
    if (unreadOnly) where.isRead = false;

    const [alerts, total] = await Promise.all([
      prisma.clinicalAlert.findMany({ where, skip, take: limit, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }], include: { patient: { select: { patientNumber: true, gender: true } } } }),
      prisma.clinicalAlert.count({ where }),
    ]);
    res.json({ alerts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Laden der Alerts' });
  }
});

// GET /alerts/patient/:patientId
router.get('/alerts/patient/:patientId', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const alerts = await prisma.clinicalAlert.findMany({
      where: { patientId: req.params.patientId, isDismissed: false },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// PUT /alerts/:id/read
router.put('/alerts/:id/read', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const alert = await prisma.clinicalAlert.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date(), readBy: getUserId(req) },
    });
    res.json(alert);
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Markieren' });
  }
});

// PUT /alerts/:id/dismiss
router.put('/alerts/:id/dismiss', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { reason } = alertDismissSchema.parse(req.body);
    const prisma = getPrisma(req);
    const alert = await prisma.clinicalAlert.update({
      where: { id: req.params.id },
      data: { isDismissed: true, dismissedAt: new Date(), dismissedBy: getUserId(req), dismissReason: reason || null },
    });
    res.json(alert);
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler beim Verwerfen' });
  }
});

// PUT /alerts/:id/action
router.put('/alerts/:id/action', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { action } = alertActionSchema.parse(req.body);
    const prisma = getPrisma(req);
    const alert = await prisma.clinicalAlert.update({
      where: { id: req.params.id },
      data: { actionTaken: action, actionTakenAt: new Date(), actionTakenBy: getUserId(req), isRead: true, readAt: new Date(), readBy: getUserId(req) },
    });
    res.json(alert);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    res.status(500).json({ error: 'Fehler beim Speichern der Aktion' });
  }
});

// POST /alerts/evaluate — Evaluate session against alert rules
router.post('/alerts/evaluate', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const { sessionId, patientId, planId } = z.object({
      sessionId: z.string().uuid(),
      patientId: z.string().uuid(),
      planId: z.string().uuid().optional(),
    }).parse(req.body);

    const prisma = getPrisma(req);
    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: { answers: true, triageEvents: true, patient: { select: { birthDate: true, gender: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Sitzung nicht gefunden' });

    const answers: Record<string, string | number> = {};
    for (const a of session.answers || []) {
      try { const p = JSON.parse(a.value); answers[a.atomId] = p.data ?? a.value; } catch { answers[a.atomId] = a.value; }
    }

    let patientAge: number | undefined;
    if (session.patient?.birthDate) {
      const bd = new Date(session.patient.birthDate);
      patientAge = new Date().getFullYear() - bd.getFullYear();
    }

    const triggered = evaluateAlertRules({
      answers,
      triageEvents: (session.triageEvents || []).map((t: any) => ({ level: t.level, atomId: t.atomId || '', message: t.message || '' })),
      patientAge,
      patientGender: session.patient?.gender || undefined,
    });

    const createdAlerts = [];
    for (const t of triggered) {
      const existing = await prisma.clinicalAlert.findFirst({
        where: { sessionId, triggerRule: t.ruleId, isDismissed: false },
      });
      if (existing) continue;
      const alert = await prisma.clinicalAlert.create({
        data: {
          sessionId, patientId, planId: planId || null,
          severity: t.severity, category: t.category,
          title: t.title, message: t.message,
          triggerField: t.triggerField, triggerValue: t.triggerValue, triggerRule: t.ruleId,
        },
      });
      createdAlerts.push(alert);
    }

    res.json({ evaluated: triggered.length, created: createdAlerts.length, alerts: createdAlerts });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[therapy] evaluate alerts error:', err);
    res.status(500).json({ error: 'Fehler bei der Alert-Evaluierung' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 6. ANONYMIZATION
// ═══════════════════════════════════════════════════════════════

// GET /anon/:patientId — Get or create pseudonym
router.get('/anon/:patientId', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    let anon = await prisma.anonPatientId.findUnique({ where: { patientId: req.params.patientId } });
    if (!anon) {
      anon = await prisma.anonPatientId.create({
        data: { patientId: req.params.patientId, pseudonym: generatePseudonym() },
      });
    }
    res.json(anon);
  } catch (err: any) {
    res.status(500).json({ error: 'Fehler bei der Anonymisierung' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 7. ANALYTICS
// ═══════════════════════════════════════════════════════════════

// GET /analytics — Therapy analytics
router.get('/analytics', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
    const since = new Date(Date.now() - days * 86400000);

    const [plans, alerts, measures] = await Promise.all([
      prisma.therapyPlan.findMany({ where: { createdAt: { gte: since } }, select: { status: true, icdCodes: true, aiGenerated: true, aiConfidence: true, createdAt: true, actualEndDate: true, startDate: true, _count: { select: { measures: true } } } }),
      prisma.clinicalAlert.findMany({ where: { createdAt: { gte: since } }, select: { severity: true, isRead: true, isDismissed: true, readAt: true, createdAt: true } }),
      prisma.therapyMeasure.findMany({ where: { createdAt: { gte: since } }, select: { type: true, arztModified: true } }),
    ]);

    const statusDist: any = { DRAFT: 0, ACTIVE: 0, PAUSED: 0, COMPLETED: 0, CANCELLED: 0 };
    const icdCount: Record<string, number> = {};
    let totalMeasures = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let aiCount = 0;
    let aiConfidenceSum = 0;
    let aiConfidenceCount = 0;

    for (const p of plans) {
      statusDist[p.status] = (statusDist[p.status] || 0) + 1;
      totalMeasures += p._count.measures;
      for (const icd of p.icdCodes) icdCount[icd] = (icdCount[icd] || 0) + 1;
      if (p.actualEndDate && p.startDate) {
        totalDuration += (new Date(p.actualEndDate).getTime() - new Date(p.startDate).getTime()) / 86400000;
        durationCount++;
      }
      if (p.aiGenerated) {
        aiCount++;
        if (p.aiConfidence != null) { aiConfidenceSum += p.aiConfidence; aiConfidenceCount++; }
      }
    }

    const measureTypes: any = {};
    let modifiedCount = 0;
    for (const m of measures) {
      measureTypes[m.type] = (measureTypes[m.type] || 0) + 1;
      if (m.arztModified) modifiedCount++;
    }

    const severityDist: any = { INFO: 0, WARNING: 0, CRITICAL: 0, EMERGENCY: 0 };
    let responseTimeSum = 0;
    let responseTimeCount = 0;
    let dismissedCount = 0;
    for (const a of alerts) {
      severityDist[a.severity] = (severityDist[a.severity] || 0) + 1;
      if (a.isDismissed) dismissedCount++;
      if (a.readAt && a.createdAt) {
        responseTimeSum += (new Date(a.readAt).getTime() - new Date(a.createdAt).getTime()) / 60000;
        responseTimeCount++;
      }
    }

    const topDiagnoses = Object.entries(icdCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([icd, count]) => ({
        icd, name: icd, count: count as number,
        percentage: plans.length ? Math.round(((count as number) / plans.length) * 100) : 0,
      }));

    res.json({
      period: `${days} Tage`,
      totalPlans: plans.length,
      statusDistribution: statusDist,
      topDiagnoses,
      measureTypes,
      avgMeasuresPerPlan: plans.length ? Math.round((totalMeasures / plans.length) * 10) / 10 : 0,
      avgPlanDurationDays: durationCount ? Math.round(totalDuration / durationCount) : 0,
      aiUsage: {
        aiGeneratedPlans: aiCount,
        avgAiConfidence: aiConfidenceCount ? Math.round((aiConfidenceSum / aiConfidenceCount) * 100) / 100 : 0,
        arztModificationRate: measures.length ? Math.round((modifiedCount / measures.length) * 100) : 0,
      },
      alertStats: {
        total: alerts.length,
        bySeverity: severityDist,
        avgResponseTimeMinutes: responseTimeCount ? Math.round(responseTimeSum / responseTimeCount) : 0,
        dismissRate: alerts.length ? Math.round((dismissedCount / alerts.length) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error('[therapy] analytics error:', err);
    res.status(500).json({ error: 'Fehler beim Berechnen der Analytik' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 8. PVS EXPORT
// ═══════════════════════════════════════════════════════════════

// POST /plans/:id/export-pvs — Export therapy plan to PVS
router.post('/plans/:id/export-pvs', requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const plan = await prisma.therapyPlan.findUnique({
      where: { id: req.params.id },
      include: { measures: { orderBy: { priority: 'asc' } }, patient: true, session: true },
    });
    if (!plan) return res.status(404).json({ error: 'Plan nicht gefunden' });

    // Mark as exported (actual PVS integration uses pvs routes)
    await prisma.therapyPlan.update({
      where: { id: req.params.id },
      data: { pvsExported: true, pvsExportedAt: new Date() },
    });

    res.json({ success: true, message: 'Plan als PVS-exportiert markiert', planId: plan.id });
  } catch (err: any) {
    console.error('[therapy] pvs export error:', err);
    res.status(500).json({ error: 'Fehler beim PVS-Export' });
  }
});

export default router;
