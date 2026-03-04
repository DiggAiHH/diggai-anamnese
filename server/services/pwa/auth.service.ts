// ─── Modul 5: Patient Portal PWA — Auth Service ─────────────
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

import type {
  PatientRegistrationData,
  PatientLoginRequest,
  PatientLoginResponse,
  PatientAccountData,
  PwaJwtPayload,
} from './types';

// ─── Constants ──────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'dev-pwa-secret';
const TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

// ─── Prisma helper ──────────────────────────────────────────

function getPrisma() {
  const prisma = (globalThis as any).__prisma;
  if (!prisma) {
    throw new Error('Prisma client not initialised');
  }
  return prisma;
}

// ─── Helpers ────────────────────────────────────────────────

function toAccountData(record: any): PatientAccountData {
  return {
    id: record.id,
    patientId: record.patientId,
    email: record.email ?? null,
    phone: record.phone ?? null,
    isActive: record.isActive,
    isVerified: record.isVerified,
    verifiedAt: record.verifiedAt ?? null,
    lastLoginAt: record.lastLoginAt ?? null,
    loginCount: record.loginCount,
    locale: record.locale,
    notifyEmail: record.notifyEmail,
    notifyPush: record.notifyPush,
    notifySms: record.notifySms,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function signToken(accountId: string, patientId: string): { token: string; expiresAt: string } {
  const payload: PwaJwtPayload = {
    accountId,
    patientId,
    role: 'patient_portal',
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  // Decode to read actual expiry
  const decoded = jwt.decode(token) as PwaJwtPayload;
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return { token, expiresAt };
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Register a new PatientAccount.
 * The patient must already exist (identified by patientNumber + birthDate).
 */
export async function registerPatient(data: PatientRegistrationData): Promise<PatientAccountData> {
  const prisma = getPrisma();

  // 1. Look up the existing Patient record
  const patient = await prisma.patient.findFirst({
    where: {
      patientNumber: data.patientNumber,
      birthDate: new Date(data.birthDate),
    },
  });

  if (!patient) {
    throw new Error('Kein Patient mit dieser Patientennummer und Geburtsdatum gefunden.');
  }

  // 2. Check for existing account
  const existing = await prisma.patientAccount.findUnique({
    where: { patientId: patient.id },
  });

  if (existing) {
    throw new Error('Für diesen Patienten existiert bereits ein Konto.');
  }

  // 3. Hash password (and optional PIN)
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const pinHash = data.pin ? await bcrypt.hash(data.pin, BCRYPT_ROUNDS) : undefined;

  // 4. Create PatientAccount
  const account = await prisma.patientAccount.create({
    data: {
      patientId: patient.id,
      email: data.email ?? null,
      phone: data.phone ?? null,
      passwordHash,
      pinHash,
    },
  });

  return toAccountData(account);
}

/**
 * Standard login with email/phone + password.
 */
export async function loginPatient(req: PatientLoginRequest): Promise<PatientLoginResponse> {
  const prisma = getPrisma();

  // Try to find by email first, then phone
  const account = await prisma.patientAccount.findFirst({
    where: {
      OR: [
        { email: req.identifier },
        { phone: req.identifier },
      ],
      isActive: true,
    },
  });

  if (!account) {
    throw new Error('Ungültige Anmeldedaten.');
  }

  const valid = await bcrypt.compare(req.password, account.passwordHash);
  if (!valid) {
    throw new Error('Ungültige Anmeldedaten.');
  }

  // Update login metadata
  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  const { token, expiresAt } = signToken(account.id, account.patientId);

  return {
    token,
    expiresAt,
    account: toAccountData(account),
  };
}

/**
 * Quick-login with PIN (for returning users on trusted devices).
 */
export async function loginWithPin(patientId: string, pin: string): Promise<PatientLoginResponse> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { patientId },
  });

  if (!account || !account.pinHash || !account.isActive) {
    throw new Error('PIN-Login nicht verfügbar.');
  }

  const valid = await bcrypt.compare(pin, account.pinHash);
  if (!valid) {
    throw new Error('Ungültige PIN.');
  }

  // Update login metadata
  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  const { token, expiresAt } = signToken(account.id, account.patientId);

  return {
    token,
    expiresAt,
    account: toAccountData(account),
  };
}

/**
 * Verify and decode a PWA JWT token.
 */
export function verifyToken(token: string): PwaJwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as PwaJwtPayload;
  } catch {
    throw new Error('Token ungültig oder abgelaufen.');
  }
}

/**
 * Issue a fresh token for an existing account (token refresh).
 */
export async function refreshToken(accountId: string): Promise<PatientLoginResponse> {
  const prisma = getPrisma();

  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
  });

  if (!account || !account.isActive) {
    throw new Error('Konto nicht gefunden oder deaktiviert.');
  }

  const { token, expiresAt } = signToken(account.id, account.patientId);

  return {
    token,
    expiresAt,
    account: toAccountData(account),
  };
}
