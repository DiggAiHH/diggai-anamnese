import crypto from 'crypto';
import type {
  PrivateEPARecord,
  EpaDocumentRecord,
  EpaShareRecord,
  AnonymizedExportRecord,
  DocumentType,
  CreateDocumentInput,
  CreateShareInput,
  CreateExportInput,
} from './types';

const prisma = (globalThis as any).__prisma;

// ─── EPA lifecycle ───────────────────────────────────────────────────

export async function getOrCreateEPA(
  patientId: string,
  consentVersion: string,
): Promise<PrivateEPARecord> {
  const existing = await prisma.privateEPA.findUnique({ where: { patientId } });
  if (existing) return existing;

  return prisma.privateEPA.create({
    data: {
      patientId,
      consentVersion,
      consentSignedAt: new Date(),
    },
  });
}

// ─── Documents ───────────────────────────────────────────────────────

export async function addDocument(
  input: CreateDocumentInput,
): Promise<EpaDocumentRecord> {
  return prisma.epaDocument.create({ data: input });
}

export async function getDocuments(
  epaId: string,
  type?: DocumentType,
): Promise<EpaDocumentRecord[]> {
  const where: Record<string, unknown> = { epaId };
  if (type) where.type = type;
  return prisma.epaDocument.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function getDocument(
  docId: string,
): Promise<EpaDocumentRecord | null> {
  return prisma.epaDocument.findUnique({ where: { id: docId } });
}

export async function deleteDocument(docId: string): Promise<void> {
  await prisma.epaDocument.delete({ where: { id: docId } });
}

// ─── Shares ──────────────────────────────────────────────────────────

export async function createShare(
  input: CreateShareInput,
): Promise<EpaShareRecord> {
  const accessToken = crypto.randomUUID();
  const expiresInHours = input.expiresInHours ?? 72;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return prisma.epaShare.create({
    data: {
      epaId: input.epaId,
      sharedWith: input.sharedWith,
      accessScope: input.accessScope,
      accessToken,
      expiresAt,
    },
  });
}

export async function getShares(epaId: string): Promise<EpaShareRecord[]> {
  return prisma.epaShare.findMany({
    where: {
      epaId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeShare(shareId: string): Promise<EpaShareRecord> {
  return prisma.epaShare.update({
    where: { id: shareId },
    data: { revokedAt: new Date() },
  });
}

export async function accessByToken(token: string): Promise<{
  epa: PrivateEPARecord;
  documents: EpaDocumentRecord[];
} | null> {
  const share: EpaShareRecord | null = await prisma.epaShare.findUnique({
    where: { accessToken: token },
  });

  if (!share) return null;
  if (share.revokedAt) return null;
  if (share.expiresAt < new Date()) return null;

  const epa: PrivateEPARecord = await prisma.privateEPA.findUnique({
    where: { id: share.epaId },
  });

  const documents: EpaDocumentRecord[] = await prisma.epaDocument.findMany({
    where: {
      epaId: share.epaId,
      type: { in: share.accessScope },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { epa, documents };
}

// ─── Anonymized exports ──────────────────────────────────────────────

function anonymizeContent(raw: string): string {
  let text = raw;
  // Replace patient names with generic placeholder
  text = text.replace(
    /\b[A-ZÄÖÜ][a-zäöüß]+\s[A-ZÄÖÜ][a-zäöüß]+\b/g,
    'Patient',
  );
  // Replace absolute dates (dd.mm.yyyy) with relative
  text = text.replace(/\b\d{2}\.\d{2}\.\d{4}\b/g, '[Datum]');
  // Remove UUIDs / IDs
  text = text.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[ID]',
  );
  return text;
}

export async function createAnonymizedExport(
  input: CreateExportInput,
): Promise<AnonymizedExportRecord> {
  // Load patient documents
  const epa = await prisma.privateEPA.findUnique({
    where: { patientId: input.patientId },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  });

  if (!epa) throw new Error('EPA not found for patient');

  const rawContent = JSON.stringify(epa.documents, null, 2);
  const anonymized = anonymizeContent(rawContent);

  const hash = crypto.createHash('sha256').update(anonymized).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return prisma.anonymizedExport.create({
    data: {
      patientId: input.patientId,
      exportType: input.exportType,
      content: anonymized,
      hash,
      expiresAt,
    },
  });
}

export async function getExport(
  exportId: string,
): Promise<AnonymizedExportRecord | null> {
  const record: AnonymizedExportRecord | null =
    await prisma.anonymizedExport.findUnique({ where: { id: exportId } });

  if (!record) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}
