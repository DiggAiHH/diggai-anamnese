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
  praxisId: z.string().min(1),
  createdBy: z.string().min(1),
  prompt: z.string().min(1),
  language: z.string().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: any) => {
      const status = err.message?.startsWith('Form not found') ? 404 : 500;
      res.status(status).json({ error: err.message ?? 'Internal server error' });
    });
  };
}

// ── Routes ──────────────────────────────────────────────────────────

// GET /stats must be registered BEFORE /:id to avoid conflicts
router.get(
  '/stats',
  wrap(async (req, res) => {
    const praxisId = z.string().min(1).parse(req.query.praxisId);
    const stats = await getFormStats(praxisId);
    res.json(stats);
  }),
);

// POST / — create form
router.post(
  '/',
  wrap(async (req, res) => {
    const data = CreateFormSchema.parse(req.body);
    const form = await createForm(data);
    res.status(201).json(form);
  }),
);

// POST /ai-generate — AI generate form (requires auth + staff role)
router.post(
  '/ai-generate',
  requireAuth,
  requireRole('ARZT', 'MFA', 'ADMIN'),
  wrap(async (req, res) => {
    const data = AiGenerateSchema.parse(req.body);
    const form = await aiGenerate(data);
    res.status(201).json(form);
  }),
);

// GET /:id — get form
router.get(
  '/:id',
  wrap(async (req, res) => {
    const form = await getForm(req.params.id as string);
    res.json(form);
  }),
);

// GET / — list forms
router.get(
  '/',
  wrap(async (req, res) => {
    const praxisId = z.string().min(1).parse(req.query.praxisId);
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
  wrap(async (req, res) => {
    const data = UpdateFormSchema.parse(req.body);
    const form = await updateForm(req.params.id as string, data);
    res.json(form);
  }),
);

// DELETE /:id — soft delete
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const form = await deleteForm(req.params.id as string);
    res.json(form);
  }),
);

// POST /:id/publish — publish form
router.post(
  '/:id/publish',
  wrap(async (req, res) => {
    const form = await publishForm(req.params.id as string);
    res.json(form);
  }),
);

// POST /:id/usage — increment usage
router.post(
  '/:id/usage',
  wrap(async (req, res) => {
    const form = await incrementUsage(req.params.id as string);
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
      answers: z.record(z.unknown()),
      submittedAt: z.string().datetime().optional(),
    });
    const data = SubmitSchema.parse(req.body);
    const form = await submitForm(req.params.id as string, data);
    res.status(201).json(form);
  }),
);

export default router;
