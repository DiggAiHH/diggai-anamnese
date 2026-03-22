import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  getOrCreateEPA,
  addDocument,
  getDocuments,
  getDocumentScoped,
  deleteDocumentScoped,
  createShare,
  getShares,
  revokeShareScoped,
  accessByToken,
  createAnonymizedExport,
  getExportScoped,
} from '../services/epa';

const router = Router();

// ─── Public access (no auth) ────────────────────────────────────────

router.get('/access/:token', async (req: Request, res: Response) => {
  try {
    const result = await accessByToken(req.params.token as string);
    if (!result) return res.status(404).json({ error: 'Invalid or expired token' });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// All other ePA routes require authentication (patient data — must be protected)
router.use(requireAuth);

// ─── Zod schemas ─────────────────────────────────────────────────────

const DocumentTypeEnum = z.enum([
  'ANAMNESE',
  'BEFUND',
  'LABOR',
  'BILD',
  'OP_BERICHT',
]);

const ExportTypeEnum = z.enum([
  'FULL_HISTORY',
  'LAST_VISIT',
  'MEDICATION_PLAN',
]);

const ExportFormatEnum = z.enum(['MARKDOWN', 'JSON', 'PDF']);

const CreateDocumentSchema = z.object({
  type: DocumentTypeEnum,
  title: z.string().min(1),
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
  createdBy: z.string().min(1),
  validUntil: z.coerce.date().optional(),
});

const CreateShareSchema = z.object({
  sharedWith: z.string().min(1),
  accessScope: z.array(z.string()).min(1),
  expiresInHours: z.number().positive().default(72),
});

const CreateExportSchema = z.object({
  patientId: z.string().min(1),
  exportType: ExportTypeEnum,
  format: ExportFormatEnum.optional(),
});

const ConsentQuerySchema = z.object({
  consentVersion: z.string().min(1).default('1.0'),
});

// ─── Helpers ─────────────────────────────────────────────────────────

function handleError(res: Response, err: unknown) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.issues });
  }

  if (typeof err === 'object' && err !== null) {
    const maybeStatus = Reflect.get(err, 'status');
    const maybeCode = Reflect.get(err, 'code');
    if (typeof maybeStatus === 'number' && maybeStatus >= 400 && maybeStatus < 600) {
      if (typeof maybeCode === 'string') {
        return res.status(maybeStatus).json({ error: 'Forbidden', code: maybeCode });
      }
      return res.status(maybeStatus).json({ error: 'Internal server error' });
    }
  }

  return res.status(500).json({ error: 'Internal server error' });
}

function getEffectiveTenantId(req: Request, res: Response): string | null {
  const authTenantId = req.auth?.tenantId;
  const requestTenantId = req.tenantId;

  if (requestTenantId && authTenantId && requestTenantId !== authTenantId) {
    res.status(403).json({
      error: 'Tenant scope violation',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    return null;
  }

  const tenantId = requestTenantId || authTenantId;
  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant context required',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    return null;
  }

  return tenantId;
}

// ─── EPA ─────────────────────────────────────────────────────────────

router.get('/:patientId', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const { consentVersion } = ConsentQuerySchema.parse(req.query);
    const epa = await getOrCreateEPA(req.params.patientId as string, consentVersion, { tenantId });
    res.json(epa);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Documents ───────────────────────────────────────────────────────

router.post('/:patientId/documents', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0', { tenantId });
    const body = CreateDocumentSchema.parse(req.body);
    const doc = await addDocument({ ...body, epaId: epa.id });
    res.status(201).json(doc);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:patientId/documents', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0', { tenantId });
    const type = req.query.type
      ? DocumentTypeEnum.parse(req.query.type)
      : undefined;
    const docs = await getDocuments(epa.id, type);
    res.json(docs);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/document/:docId', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const doc = await getDocumentScoped(req.params.docId as string, { tenantId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/document/:docId', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const deleted = await deleteDocumentScoped(req.params.docId as string, { tenantId });
    if (!deleted) return res.status(404).json({ error: 'Document not found' });
    res.status(204).end();
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Shares ──────────────────────────────────────────────────────────

router.post('/:patientId/shares', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0', { tenantId });
    const body = CreateShareSchema.parse(req.body);
    const share = await createShare({ ...body, epaId: epa.id });
    res.status(201).json(share);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:patientId/shares', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0', { tenantId });
    const shares = await getShares(epa.id);
    res.json(shares);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/share/:shareId/revoke', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const share = await revokeShareScoped(req.params.shareId as string, { tenantId });
    if (!share) return res.status(404).json({ error: 'Share not found' });
    res.json(share);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Anonymized exports ─────────────────────────────────────────────

router.post('/export/anonymized', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const body = CreateExportSchema.parse(req.body);
    const exp = await createAnonymizedExport(body, { tenantId });
    res.status(201).json(exp);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/export/:exportId', async (req: Request, res: Response) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const exp = await getExportScoped(req.params.exportId as string, { tenantId });
    if (!exp) return res.status(404).json({ error: 'Export not found or expired' });
    res.json(exp);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
