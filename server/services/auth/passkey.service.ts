/**
 * Passkey / WebAuthn Service - Production Implementation
 * 
 * Verwendet @simplewebauthn/server v13.x fuer FIDO2 konforme Implementation.
 * Unterstuetzt: Registration, Authentication, Credential Management
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  Base64URLString,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';
import { prisma } from '../../db';
import { logSecurityEvent, SecurityEvent } from '../security-audit.service';
import * as crypto from 'crypto';

// Configuration
const RP_NAME = 'DiggAI Anamnese';
const RP_ID = process.env.RP_ID || 'diggai-drklaproth.netlify.app';
const ORIGIN = process.env.ORIGIN || 'https://diggai-drklaproth.netlify.app';

interface DeviceInfo {
  fingerprint?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Store challenge temporarily (use Redis in production)
 */
const challengeStore = new Map<string, { challenge: string; expires: Date }>();

function storeChallenge(userId: string, challenge: string): void {
  challengeStore.set(userId, {
    challenge,
    expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
}

function getChallenge(userId: string): string | null {
  const stored = challengeStore.get(userId);
  if (!stored) return null;
  if (stored.expires < new Date()) {
    challengeStore.delete(userId);
    return null;
  }
  return stored.challenge;
}

function clearChallenge(userId: string): void {
  challengeStore.delete(userId);
}

/**
 * Convert Buffer to Base64URL string
 */
function bufferToBase64URL(buffer: Buffer): Base64URLString {
  return buffer.toString('base64url');
}

/**
 * Convert Base64URL string to Uint8Array
 */
function base64URLToUint8Array(base64url: Base64URLString): Uint8Array {
  const buffer = Buffer.from(base64url, 'base64url');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Convert Uint8Array to Buffer
 */
function uint8ArrayToBuffer(arr: Uint8Array): Buffer {
  return Buffer.from(arr);
}

/**
 * Get user credentials for excludeCredentials
 */
async function getUserCredentialsForRegistration(userId: string): Promise<Array<{
  id: Base64URLString;
  transports?: AuthenticatorTransportFuture[];
}>> {
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId },
  });

  return credentials.map(cred => ({
    id: bufferToBase64URL(Buffer.from(cred.credentialID)),
    transports: cred.transports as AuthenticatorTransportFuture[],
  }));
}

/**
 * Generate registration options for passkey creation
 */
export async function generatePasskeyRegistrationOptions(
  userId: string,
  username: string,
  deviceName: string
): Promise<Awaited<ReturnType<typeof generateRegistrationOptions>>> {
  // Check existing credentials count
  const existingCredentials = await prisma.passkeyCredential.count({
    where: { userId },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
    excludeCredentials: existingCredentials > 0 ? await getUserCredentialsForRegistration(userId) : [],
  });

  // Store challenge
  storeChallenge(userId, options.challenge);

  return options;
}

/**
 * Verify registration and store credential
 */
export async function verifyAndStorePasskey(
  userId: string,
  userType: 'ARZT' | 'PATIENT',
  response: RegistrationResponseJSON,
  deviceName: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; error?: string; credentialId?: string }> {
  const expectedChallenge = getChallenge(userId);
  
  if (!expectedChallenge) {
    return { success: false, error: 'CHALLENGE_EXPIRED' };
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'VERIFICATION_FAILED' };
    }

    // In v13.x, credential data is in registrationInfo.credential
    const { credential } = verification.registrationInfo;

    // Store credential in database
    const stored = await prisma.passkeyCredential.create({
      data: {
        userId,
        userType,
        credentialID: Buffer.from(base64URLToUint8Array(credential.id)),
        credentialPublicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        deviceName,
        transports: credential.transports as string[] || [],
        lastUsedAt: new Date(),
      },
    });

    clearChallenge(userId);

    await logSecurityEvent({
      event: SecurityEvent.MFA_ENABLED,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      metadata: { method: 'PASSKEY', credentialId: stored.id },
    });

    return { success: true, credentialId: stored.id };
  } catch (error) {
    console.error('[Passkey] Verification error:', error);
    return { success: false, error: 'VERIFICATION_ERROR' };
  }
}

/**
 * Generate authentication options
 */
export async function generatePasskeyAuthenticationOptions(
  userId?: string
): Promise<Awaited<ReturnType<typeof generateAuthenticationOptions>>> {
  let allowCredentials: Awaited<ReturnType<typeof getUserCredentialsForAuthentication>> | undefined;

  if (userId) {
    allowCredentials = await getUserCredentialsForAuthentication(userId);
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: allowCredentials?.length ? allowCredentials : undefined,
    userVerification: 'required',
  });

  if (userId) {
    storeChallenge(userId, options.challenge);
  } else {
    // For usernameless login, we need a different challenge storage strategy
    // Store with a temporary ID
    const tempId = crypto.randomUUID();
    storeChallenge(tempId, options.challenge);
    (options as any).tempId = tempId;
  }

  return options;
}

/**
 * Get user credentials for authentication options
 */
async function getUserCredentialsForAuthentication(userId: string): Promise<Array<{
  id: Base64URLString;
  type: 'public-key';
  transports?: AuthenticatorTransportFuture[];
}>> {
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId },
  });

  return credentials.map(cred => ({
    id: bufferToBase64URL(Buffer.from(cred.credentialID)),
    type: 'public-key' as const,
    transports: cred.transports as AuthenticatorTransportFuture[],
  }));
}

/**
 * Verify authentication with passkey
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  deviceInfo?: DeviceInfo
): Promise<{ 
  success: boolean; 
  error?: string; 
  userId?: string; 
  userType?: 'ARZT' | 'PATIENT';
}> {
  // Find credential by ID (response.id is base64url)
  const credentialIdBuffer = Buffer.from(response.id, 'base64url');
  
  const credential = await prisma.passkeyCredential.findFirst({
    where: {
      credentialID: credentialIdBuffer,
    },
  });

  if (!credential) {
    return { success: false, error: 'CREDENTIAL_NOT_FOUND' };
  }

  const expectedChallenge = getChallenge(credential.userId);
  
  if (!expectedChallenge) {
    return { success: false, error: 'CHALLENGE_EXPIRED' };
  }

  try {
    // Build credential object for verification
    // Use the stored credential data directly
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: bufferToBase64URL(Buffer.from(credential.credentialID)),
        publicKey: new Uint8Array(credential.credentialPublicKey),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { success: false, error: 'VERIFICATION_FAILED' };
    }

    // Update counter and last used
    await prisma.passkeyCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    clearChallenge(credential.userId);

    await logSecurityEvent({
      event: SecurityEvent.MFA_CHALLENGE_SUCCESS,
      tenantId: credential.userType === 'ARZT' ? 'system' : 'pwa',
      actorId: credential.userId,
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      metadata: { method: 'PASSKEY', credentialId: credential.id },
    });

    return {
      success: true,
      userId: credential.userId,
      userType: credential.userType as 'ARZT' | 'PATIENT',
    };
  } catch (error) {
    console.error('[Passkey] Authentication error:', error);
    return { success: false, error: 'AUTHENTICATION_ERROR' };
  }
}

/**
 * List user's passkeys
 */
export async function listUserPasskeys(userId: string): Promise<Array<{
  id: string;
  deviceName: string;
  createdAt: Date;
  lastUsedAt?: Date;
}>> {
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId },
    select: {
      id: true,
      deviceName: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  });

  return credentials;
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  credentialId: string,
  userId: string,
  userType: 'ARZT' | 'PATIENT'
): Promise<boolean> {
  try {
    await prisma.passkeyCredential.deleteMany({
      where: {
        id: credentialId,
        userId, // Ensure user can only delete their own credentials
      },
    });

    await logSecurityEvent({
      event: SecurityEvent.MFA_DISABLED,
      tenantId: userType === 'ARZT' ? 'system' : 'pwa',
      actorId: userId,
      metadata: { method: 'PASSKEY', credentialId },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has passkeys
 */
export async function hasPasskeys(userId: string): Promise<boolean> {
  const count = await prisma.passkeyCredential.count({
    where: { userId },
  });
  return count > 0;
}
