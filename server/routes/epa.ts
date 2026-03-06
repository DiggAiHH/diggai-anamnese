import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  getOrCreateEPA,
  addDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  createShare,
  getShares,
  revokeShare,
  accessByToken,
  createAnonymizedExport,
  getExport,
} from '../services/epa';

const router = Router();

// All ePA routes require authentication (patient data — must be protected)
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
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ error: message });
}

// ─── EPA ─────────────────────────────────────────────────────────────

router.get('/:patientId', async (req: Request, res: Response) => {
  try {
    const { consentVersion } = ConsentQuerySchema.parse(req.query);
    const epa = await getOrCreateEPA(req.params.patientId as string, consentVersion);
    res.json(epa);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Documents ───────────────────────────────────────────────────────

router.post('/:patientId/documents', async (req: Request, res: Response) => {
  try {
    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0');
    const body = CreateDocumentSchema.parse(req.body);
    const doc = await addDocument({ ...body, epaId: epa.id });
    res.status(201).json(doc);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:patientId/documents', async (req: Request, res: Response) => {
  try {
    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0');
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
    const doc = await getDocument(req.params.docId as string);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/document/:docId', async (req: Request, res: Response) => {
  try {
    await deleteDocument(req.params.docId as string);
    res.status(204).end();
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Shares ──────────────────────────────────────────────────────────

router.post('/:patientId/shares', async (req: Request, res: Response) => {
  try {
    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0');
    const body = CreateShareSchema.parse(req.body);
    const share = await createShare({ ...body, epaId: epa.id });
    res.status(201).json(share);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:patientId/shares', async (req: Request, res: Response) => {
  try {
    const epa = await getOrCreateEPA(req.params.patientId as string, '1.0');
    const shares = await getShares(epa.id);
    res.json(shares);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/share/:shareId/revoke', async (req: Request, res: Response) => {
  try {
    const share = await revokeShare(req.params.shareId as string);
    res.json(share);
  } catch (err) {
    handleError(res, err);
  }
});

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

// ─── Anonymized exports ─────────────────────────────────────────────

router.post('/export/anonymized', async (req: Request, res: Response) => {
  try {
    const body = CreateExportSchema.parse(req.body);
    const exp = await createAnonymizedExport(body);
    res.status(201).json(exp);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/export/:exportId', async (req: Request, res: Response) => {
  try {
    const exp = await getExport(req.params.exportId as string);
    if (!exp) return res.status(404).json({ error: 'Export not found or expired' });
    res.json(exp);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
