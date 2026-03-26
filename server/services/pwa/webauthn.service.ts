// ─── WebAuthn / FIDO2 Passkey Service ─────────────────────────
// Enables passwordless biometric authentication for the patient PWA.
// Uses @simplewebauthn/server for FIDO2 ceremony handling.

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { config } from '../../config';

// ─── Configuration ───────────────────────────────────────────

// RP (Relying Party) config — must match the frontend origin
const rpName = 'DiggAI Anamnese';
const rpID = process.env.WEBAUTHN_RP_ID || new URL(config.frontendUrl).hostname;
const origin = config.frontendUrl;

// In-memory challenge store (per-account, short-lived)
// In production, use Redis for multi-instance deployments
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();

function setChallenge(accountId: string, challenge: string): void {
  challengeStore.set(accountId, {
    challenge,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
}

function getChallenge(accountId: string): string | null {
  const entry = challengeStore.get(accountId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    challengeStore.delete(accountId);
    return null;
  }
  challengeStore.delete(accountId); // One-time use
  return entry.challenge;
}

// ─── Registration ────────────────────────────────────────────

/**
 * Generate registration options for a new passkey.
 * The client calls navigator.credentials.create() with these options.
 */
export async function generateRegistration(
  prisma: any,
  accountId: string,
  patientId: string
): Promise<any> {
  // Get existing credentials to exclude (prevent duplicate registration)
  const existingCredentials = await prisma.webAuthnCredential.findMany({
    where: { accountId },
    select: { credentialId: true, transports: true },
  });

  const excludeCredentials = existingCredentials.map((cred: any) => ({
    id: cred.credentialId,
    transports: cred.transports,
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: patientId,
    userDisplayName: `Patient ${patientId.slice(0, 8)}`,
    attestationType: 'none', // No attestation needed for medical app
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Prefer built-in (fingerprint, face)
    },
  });

  // Store challenge for verification
  setChallenge(accountId, options.challenge);

  return options;
}

/**
 * Verify the registration response from the client and store the credential.
 */
export async function verifyRegistration(
  prisma: any,
  accountId: string,
  response: RegistrationResponseJSON,
  deviceName?: string
): Promise<{ credentialId: string }> {
  const expectedChallenge = getChallenge(accountId);
  if (!expectedChallenge) {
    throw new Error('Registration challenge expired or not found');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed');
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  // Store credential in database
  const saved = await prisma.webAuthnCredential.create({
    data: {
      accountId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports ?? [],
      deviceName: deviceName ?? null,
      lastUsedAt: new Date(),
    },
  });

  return { credentialId: saved.id };
}

// ─── Authentication ──────────────────────────────────────────

/**
 * Generate authentication options for passkey login.
 * The client calls navigator.credentials.get() with these options.
 */
export async function generateAuthentication(
  prisma: any,
  accountId?: string
): Promise<any> {
  let allowCredentials: any[] | undefined;

  if (accountId) {
    // Known user — restrict to their credentials
    const credentials = await prisma.webAuthnCredential.findMany({
      where: { accountId },
      select: { credentialId: true, transports: true },
    });

    allowCredentials = credentials.map((cred: any) => ({
      id: cred.credentialId,
      transports: cred.transports,
    }));

    if (allowCredentials!.length === 0) {
      throw new Error('No passkeys registered for this account');
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  // Store challenge keyed by accountId or a placeholder for discoverable credentials
  const challengeKey = accountId ?? `_discovery_${options.challenge.slice(0, 16)}`;
  setChallenge(challengeKey, options.challenge);

  return { options, challengeKey };
}

/**
 * Verify the authentication response and return the account info.
 */
export async function verifyAuthentication(
  prisma: any,
  challengeKey: string,
  response: AuthenticationResponseJSON
): Promise<{ accountId: string; patientId: string }> {
  const expectedChallenge = getChallenge(challengeKey);
  if (!expectedChallenge) {
    throw new Error('Authentication challenge expired or not found');
  }

  // Find the credential
  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
    include: { account: { select: { id: true, patientId: true, isActive: true, deletedAt: true } } },
  });

  if (!credential) {
    throw new Error('Passkey not recognized');
  }

  if (!credential.account.isActive || credential.account.deletedAt) {
    throw new Error('Account is deactivated');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: Number(credential.counter),
      transports: credential.transports as any,
    },
  });

  if (!verification.verified) {
    throw new Error('Authentication verification failed');
  }

  // Update counter and last-used timestamp
  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  // Update account login stats
  await prisma.patientAccount.update({
    where: { id: credential.accountId },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  return {
    accountId: credential.account.id,
    patientId: credential.account.patientId,
  };
}

// ─── Credential Management ───────────────────────────────────

/**
 * List all passkeys for an account.
 */
export async function listCredentials(
  prisma: any,
  accountId: string
): Promise<any[]> {
  const credentials = await prisma.webAuthnCredential.findMany({
    where: { accountId },
    select: {
      id: true,
      deviceType: true,
      deviceName: true,
      backedUp: true,
      transports: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return credentials;
}

/**
 * Remove a passkey by ID (scoped to account).
 */
export async function removeCredential(
  prisma: any,
  credentialId: string,
  accountId: string
): Promise<boolean> {
  const existing = await prisma.webAuthnCredential.findFirst({
    where: { id: credentialId, accountId },
  });
  if (!existing) return false;

  await prisma.webAuthnCredential.delete({ where: { id: credentialId } });
  return true;
}
