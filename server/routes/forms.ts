// ── CustomForm / FormBuilder Routes ─────────────────────────────────

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createForm,
  getForm,
  listForms,
  updateForm,
  deleteForm,
  aiGenerate,
  publishForm,
  incrementUsage,
  getFormStats,
  submitForm,
} from '../services/forms';

const router = Router();

// ── Zod Schemas ─────────────────────────────────────────────────────

const QuestionTypeEnum = z.enum([
  'TEXT', 'TEXTAREA', 'SELECT', 'MULTI_SELECT',
  'RADIO', 'CHECKBOX', 'DATE', 'NUMBER', 'SCALE', 'FILE',
]);

const FormQuestionSchema = z.object({
  id: z.string().min(1),
  type: QuestionTypeEnum,
  label: z.string().min(1),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  validation: z.record(z.string(), z.any()).optional(),
  conditionalOn: z.object({
    questionId: z.string(),
    value: z.any(),
  }).optional(),
});

const AgeRangeSchema = z.object({
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
}).optional();

const CreateFormSchema = z.object({
  praxisId: z.string().min(1),
  createdBy: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(FormQuestionSchema).min(1),
  logic: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  ageRange: AgeRangeSchema,
});

const UpdateFormSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  questions: z.array(FormQuestionSchema).optional(),
  logic: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  ageRange: AgeRangeSchema,
  isActive: z.boolean().optional(),
});

const AiGenerateSchema = z.object({
  prompt: z.string().min(1),
  language: z.string().optional(),
});

const CreateFormBodySchema = CreateFormSchema.omit({ praxisId: true, createdBy: true });

// ── Helpers ─────────────────────────────────────────────────────────

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: any) => {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Ungültige Eingabedaten', details: err.flatten() });
        return;
      }

      const status = err.message?.startsWith('Form not found') || err.message?.startsWith('Session not found')
        ? 404
        : err.message === 'Missing tenant context' || err.message === 'Missing authenticated user'
          ? 401
          : err.message === 'Session mismatch' || err.message === 'Missing patient session context'
            ? 403
            : err.message === 'No valid answers provided'
              ? 400
            : 500;

      const error = err.message?.startsWith('Form not found')
        ? 'Form not found'
        : err.message?.startsWith('Session not found')
          ? 'Session not found'
          : err.message === 'Missing tenant context'
            ? 'Missing tenant context'
            : err.message === 'Missing authenticated user'
              ? 'Missing authenticated user'
              : err.message === 'Session mismatch'
                ? 'Session mismatch'
                : err.message === 'Missing patient session context'
                  ? 'Missing patient session context'
                    : err.message === 'No valid answers provided'
                      ? 'No valid answers provided'
                  : 'Internal server error';

      res.status(status).json({ error });
    });
  };
}

function requireTenantId(req: Request): string {
  if (!req.tenantId) {
    throw new Error('Missing tenant context');
  }

  return req.tenantId;
}

function requireAuthUserId(req: Request): string {
  if (!req.auth?.userId) {
    throw new Error('Missing authenticated user');
  }

  return req.auth.userId;
}

// ── Routes ──────────────────────────────────────────────────────────

// GET /stats must be registered BEFORE /:id to avoid conflicts
router.get(
  '/stats',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const praxisId = requireTenantId(req);
    const stats = await getFormStats(praxisId);
    res.json(stats);
  }),
);

// POST / — create form
router.post(
  '/',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const data = CreateFormBodySchema.parse(req.body);
    const form = await createForm({
      ...data,
      praxisId: requireTenantId(req),
      createdBy: requireAuthUserId(req),
    });
    res.status(201).json(form);
  }),
);

// POST /ai-generate — AI generate form (requires auth + staff role)
router.post(
  '/ai-generate',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const data = AiGenerateSchema.parse(req.body);
    const form = await aiGenerate({
      ...data,
      praxisId: requireTenantId(req),
      createdBy: requireAuthUserId(req),
    });
    res.status(201).json(form);
  }),
);

// GET /:id — get form
router.get(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const form = await getForm(req.params.id as string, {
      praxisId: requireTenantId(req),
      requireActive: req.auth?.role === 'patient',
    });
    res.json(form);
  }),
);

// GET / — list forms
router.get(
  '/',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const praxisId = requireTenantId(req);
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === 'true'
        : undefined;
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    const forms = await listForms(praxisId, { isActive, tag });
    res.json(forms);
  }),
);

// PATCH /:id — update form
router.patch(
  '/:id',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const data = UpdateFormSchema.parse(req.body);
    const form = await updateForm(req.params.id as string, data, { praxisId: requireTenantId(req) });
    res.json(form);
  }),
);

// DELETE /:id — soft delete
router.delete(
  '/:id',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const form = await deleteForm(req.params.id as string, { praxisId: requireTenantId(req) });
    res.json(form);
  }),
);

// POST /:id/publish — publish form
router.post(
  '/:id/publish',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const form = await publishForm(req.params.id as string, { praxisId: requireTenantId(req) });
    res.json(form);
  }),
);

// POST /:id/usage — increment usage
router.post(
  '/:id/usage',
  requireAuth,
  requireRole('arzt', 'mfa', 'admin'),
  wrap(async (req, res) => {
    const form = await incrementUsage(req.params.id as string, { praxisId: requireTenantId(req) });
    res.json(form);
  }),
);

// POST /:id/submit — Submit form answers
router.post(
  '/:id/submit',
  requireAuth,
  wrap(async (req, res) => {
    const SubmitSchema = z.object({
      sessionId: z.string().min(1),
      answers: z.record(z.string(), z.unknown()),
      submittedAt: z.string().datetime().optional(),
    });
    const data = SubmitSchema.parse(req.body);
    if (req.auth?.role === 'patient') {
      if (!req.auth.sessionId) {
        throw new Error('Missing patient session context');
      }

      if (req.auth.sessionId !== data.sessionId) {
        throw new Error('Session mismatch');
      }
    }

    const form = await submitForm(req.params.id as string, data, {
      praxisId: requireTenantId(req),
      requireActive: true,
      requesterRole: req.auth?.role,
      requesterSessionId: req.auth?.sessionId,
    });
    res.status(201).json(form);
  }),
);

export default router;
