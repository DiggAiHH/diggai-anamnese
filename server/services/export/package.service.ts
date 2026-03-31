import { randomBytes, randomUUID, createHash, generateKeyPairSync } from 'crypto';
import { z } from 'zod';
import { FlattenedEncrypt, flattenedDecrypt, importPKCS8, importSPKI } from 'jose';
import { prisma } from '../../db';
import { config } from '../../config';
import { decryptVersioned, encryptVersioned, hashEmail } from '../encryption';
import type { NormalizedSessionExport } from './session-export.service';

const PACKAGE_VERSION = 'anamnese-package-v1';
const PACKAGE_TYPE = 'application/vnd.diggai.anamnese+json';
const PACKAGE_ALG = 'RSA-OAEP-256';
const PACKAGE_ENC = 'A256GCM';
const LINK_PURPOSE = 'PATIENT_DOWNLOAD';
const DEFAULT_LINK_TTL_HOURS = parseInt(process.env.PACKAGE_LINK_TTL_HOURS || '24', 10);
const DEFAULT_RSA_MODULUS_LENGTH = process.env.NODE_ENV === 'test' ? '2048' : '4096';
const PACKAGE_RSA_MODULUS_LENGTH = parseInt(process.env.PACKAGE_RSA_MODULUS_LENGTH || DEFAULT_RSA_MODULUS_LENGTH, 10);

const PackageSchema = z.object({
  version: z.literal(PACKAGE_VERSION),
  packageId: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  exportedAt: z.string().datetime(),
  kid: z.string().min(1),
  alg: z.literal(PACKAGE_ALG),
  enc: z.literal(PACKAGE_ENC),
  wrappedKey: z.string().min(1),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  tag: z.string().min(1),
  checksum: z.string().length(64),
});

const PackagePayloadSchema = z.object({
  packageId: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  exportedAt: z.string().datetime(),
  patient: z.object({
    name: z.string(),
    gender: z.string().nullable(),
    birthDate: z.string().datetime().nullable(),
    insuranceType: z.string().nullable(),
    email: z.string().email().nullable(),
  }),
  service: z.string().min(1),
  status: z.string().min(1),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  answers: z.array(z.object({
    atomId: z.string().min(1),
    questionText: z.string(),
    section: z.string(),
    value: z.unknown(),
    displayValue: z.string(),
    answeredAt: z.string().datetime(),
  })),
  triageEvents: z.array(z.object({
    level: z.string(),
    atomId: z.string(),
    message: z.string(),
    createdAt: z.string().datetime(),
  })),
});

export type EncryptedAnamnesePackage = z.infer<typeof PackageSchema>;
export type EncryptedPackagePayload = z.infer<typeof PackagePayloadSchema>;

export interface PracticeKeyDescriptor {
  kid: string;
  algorithm: string;
  publicKeyPem: string;
  createdAt: Date;
}

export interface CreatePackageResult {
  package: EncryptedAnamnesePackage;
  payload: EncryptedPackagePayload;
}

export interface MfaImportResult {
  status: 'imported' | 'already_imported';
  packageId: string;
  sessionId: string;
  preview: EncryptedPackagePayload;
}

export class PackageError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function hashValue(value: string): string {
  return createHash('sha256')
    .update(`diggai-export:${config.encryptionKey}:${value}`)
    .digest('hex');
}

function buildProtectedHeader(kid: string) {
  return {
    alg: PACKAGE_ALG,
    enc: PACKAGE_ENC,
    kid,
    typ: PACKAGE_TYPE,
  };
}

function encodeProtectedHeader(kid: string): string {
  return Buffer.from(JSON.stringify(buildProtectedHeader(kid)), 'utf-8').toString('base64url');
}

function stripChecksum(pkg: EncryptedAnamnesePackage): Omit<EncryptedAnamnesePackage, 'checksum'> {
  const { checksum: _checksum, ...rest } = pkg;
  return rest;
}

function computeChecksum(pkg: Omit<EncryptedAnamnesePackage, 'checksum'>): string {
  return createHash('sha256')
    .update(JSON.stringify(pkg))
    .digest('hex');
}

function serializePayload(exportData: NormalizedSessionExport, packageId: string, exportedAt: string): EncryptedPackagePayload {
  return {
    packageId,
    tenantId: exportData.tenantId,
    sessionId: exportData.sessionId,
    exportedAt,
    patient: {
      name: exportData.patient.name,
      gender: exportData.patient.gender,
      birthDate: exportData.patient.birthDate ? exportData.patient.birthDate.toISOString() : null,
      insuranceType: exportData.patient.insuranceType,
      email: exportData.patientEmail,
    },
    service: exportData.service,
    status: exportData.status,
    createdAt: exportData.createdAt.toISOString(),
    completedAt: exportData.completedAt ? exportData.completedAt.toISOString() : null,
    answers: exportData.answers.map((answer) => ({
      atomId: answer.atomId,
      questionText: answer.questionText,
      section: answer.section,
      value: answer.rawValue,
      displayValue: answer.displayValue,
      answeredAt: answer.answeredAt.toISOString(),
    })),
    triageEvents: exportData.triageEvents.map((event) => ({
      level: event.level,
      atomId: event.atomId,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

async function loadActivePracticeKeyRecord(tenantId: string) {
  const existing = await prisma.practiceEncryptionKey.findFirst({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: PACKAGE_RSA_MODULUS_LENGTH,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const encryptedPrivateKey = encryptVersioned(privateKey);

  return prisma.practiceEncryptionKey.create({
    data: {
      tenantId,
      kid: `kid_${randomUUID()}`,
      algorithm: PACKAGE_ALG,
      publicKeyPem: publicKey,
      encryptedPrivateKey: encryptedPrivateKey.ciphertext,
      encryptionVersion: encryptedPrivateKey.version,
      isActive: true,
    },
  });
}

export async function ensureActivePracticeKeyDescriptor(tenantId: string): Promise<PracticeKeyDescriptor> {
  const key = await loadActivePracticeKeyRecord(tenantId);
  return {
    kid: key.kid,
    algorithm: key.algorithm,
    publicKeyPem: key.publicKeyPem,
    createdAt: key.createdAt,
  };
}

export async function createEncryptedPackage(
  exportData: NormalizedSessionExport,
  options: { packageId?: string } = {},
): Promise<CreatePackageResult> {
  const practiceKey = await loadActivePracticeKeyRecord(exportData.tenantId);
  const exportedAt = new Date().toISOString();
  const packageId = options.packageId || randomUUID();
  const payload = serializePayload(exportData, packageId, exportedAt);
  const publicKey = await importSPKI(practiceKey.publicKeyPem, PACKAGE_ALG);

  const jwe = await new FlattenedEncrypt(Buffer.from(JSON.stringify(payload), 'utf-8'))
    .setProtectedHeader(buildProtectedHeader(practiceKey.kid))
    .encrypt(publicKey);

  if (!jwe.encrypted_key || !jwe.iv || !jwe.tag) {
    throw new PackageError(500, 'PACKAGE_ENCRYPTION_FAILED', 'Das Exportpaket konnte nicht vollständig verschlüsselt werden');
  }

  const pkgWithoutChecksum = {
    version: PACKAGE_VERSION,
    packageId,
    tenantId: exportData.tenantId,
    sessionId: exportData.sessionId,
    exportedAt,
    kid: practiceKey.kid,
    alg: PACKAGE_ALG,
    enc: PACKAGE_ENC,
    wrappedKey: jwe.encrypted_key,
    iv: jwe.iv,
    ciphertext: jwe.ciphertext,
    tag: jwe.tag,
  } satisfies Omit<EncryptedAnamnesePackage, 'checksum'>;

  const pkg = {
    ...pkgWithoutChecksum,
    checksum: computeChecksum(pkgWithoutChecksum),
  } satisfies EncryptedAnamnesePackage;

  return { package: pkg, payload };
}

export async function decryptEncryptedPackage(
  candidate: unknown,
  tenantId: string,
): Promise<{ package: EncryptedAnamnesePackage; payload: EncryptedPackagePayload }> {
  const pkg = PackageSchema.parse(candidate);

  if (pkg.tenantId !== tenantId) {
    throw new PackageError(403, 'PACKAGE_TENANT_MISMATCH', 'Das Paket gehört zu einem anderen Mandanten');
  }

  const expectedChecksum = computeChecksum(stripChecksum(pkg));
  if (expectedChecksum !== pkg.checksum) {
    throw new PackageError(400, 'PACKAGE_CHECKSUM_INVALID', 'Das Paket wurde verändert oder beschädigt');
  }

  const key = await prisma.practiceEncryptionKey.findFirst({
    where: {
      tenantId,
      kid: pkg.kid,
    },
  });

  if (!key) {
    throw new PackageError(400, 'PACKAGE_KEY_NOT_FOUND', 'Für dieses Paket wurde kein passender Praxisschlüssel gefunden');
  }

  const privateKeyPem = decryptVersioned(key.encryptedPrivateKey, key.encryptionVersion || 1);
  const privateKey = await importPKCS8(privateKeyPem, PACKAGE_ALG);
  const decrypted = await flattenedDecrypt({
    protected: encodeProtectedHeader(pkg.kid),
    encrypted_key: pkg.wrappedKey,
    iv: pkg.iv,
    ciphertext: pkg.ciphertext,
    tag: pkg.tag,
  }, privateKey);

  const payload = PackagePayloadSchema.parse(JSON.parse(Buffer.from(decrypted.plaintext).toString('utf-8')));

  if (payload.packageId !== pkg.packageId || payload.sessionId !== pkg.sessionId || payload.tenantId !== pkg.tenantId) {
    throw new PackageError(400, 'PACKAGE_PAYLOAD_INVALID', 'Paket-Metadaten und Nutzdaten stimmen nicht überein');
  }

  return { package: pkg, payload };
}

export async function createSecureExportLink(params: {
  tenantId: string;
  sessionId: string;
  recipientEmail: string | null;
  packageId?: string;
  ttlHours?: number;
}) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (params.ttlHours || DEFAULT_LINK_TTL_HOURS) * 60 * 60 * 1000);
  const packageId = params.packageId || randomUUID();

  await prisma.secureExportLink.create({
    data: {
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      packageId,
      tokenHash: hashValue(token),
      recipientEmailHash: params.recipientEmail ? hashEmail(params.recipientEmail) : null,
      purpose: LINK_PURPOSE,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    packageId,
  };
}

export async function consumeSecureExportLink(token: string, ipAddress?: string | null) {
  const tokenHash = hashValue(token);
  const link = await prisma.secureExportLink.findUnique({
    where: { tokenHash },
  });

  if (!link) {
    throw new PackageError(404, 'PACKAGE_LINK_NOT_FOUND', 'Der Download-Link ist ungültig');
  }

  if (link.usedAt) {
    throw new PackageError(410, 'PACKAGE_LINK_ALREADY_USED', 'Der Download-Link wurde bereits verwendet');
  }

  if (link.expiresAt.getTime() <= Date.now()) {
    throw new PackageError(410, 'PACKAGE_LINK_EXPIRED', 'Der Download-Link ist abgelaufen');
  }

  const updateResult = await prisma.secureExportLink.updateMany({
    where: {
      id: link.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      usedAt: new Date(),
      usedByIpHash: ipAddress ? hashValue(ipAddress) : null,
    },
  });

  if (updateResult.count === 0) {
    throw new PackageError(410, 'PACKAGE_LINK_ALREADY_USED', 'Der Download-Link ist nicht mehr verfügbar');
  }

  return link;
}
