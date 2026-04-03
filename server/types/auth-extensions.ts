/**
 * Auth Extensions - Refresh Token Rotation Types
 * 
 * TypeScript Interfaces für das Refresh Token Rotation System
 * @module server/types/auth-extensions
 */

import { UserType } from '@prisma/client';

/**
 * Token Pair - Ergebnis einer erfolgreichen Authentifizierung
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Refresh Token Datenstruktur (aus der Datenbank)
 */
export interface RefreshTokenData {
  id: string;
  tokenFamily: string;
  userId: string;
  userType: UserType;
  deviceId?: string;
  issuedAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  rotatedAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  ipHash?: string;
  userAgent?: string;
  reuseDetected: boolean;
  reuseCount: number;
}

/**
 * Gerätedaten für Fingerprinting und Trust-Entscheidungen
 */
export interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  ip: string;
}

/**
 * Ergebnis einer Token Rotation
 */
export interface RotationResult {
  success: boolean;
  tokenPair?: TokenPair;
  error?: string;
  reuseDetected?: boolean;
  familyRevoked?: boolean;
}

/**
 * Payload des Refresh Tokens (JWT Payload)
 */
export interface RefreshTokenPayload {
  jti: string;          // Token ID
  family: string;       // Token Family
  sub: string;          // User ID
  type: UserType;       // ARZT | PATIENT
  deviceId?: string;    // Optional Device ID
  iat: number;          // Issued At
  exp: number;          // Expiration
}

/**
 * Payload des Access Tokens (JWT Payload)
 */
export interface AccessTokenPayload {
  sub: string;          // User ID
  type: UserType;       // ARZT | PATIENT
  tenantId?: string;    // Optional für Arzt
  role?: string;        // Optional für Arzt (ARZT | MFA | ADMIN)
  deviceId?: string;    // Optional Device ID
  iat: number;          // Issued At
  exp: number;          // Expiration
}

/**
 * Konfiguration für Token-Laufzeiten
 */
export interface TokenConfig {
  accessTokenExpiry: string;   // z.B. "15m"
  refreshTokenExpiry: string;  // z.B. "7d"
  rotationWindowMs: number;    // Zeitfenster für Rotation
  maxReuseCount: number;       // Maximale Wiederverwendungen bevor Sperre
}

/**
 * Trust-Level eines Geräts
 */
export type DeviceTrustLevel = 
  | 'untrusted'     // Neues/unbekanntes Gerät
  | 'basic'         // Bekannt, aber nicht verifiziert
  | 'verified'      // Durch 2FA/PIN verifiziert
  | 'trusted';      // Lange Nutzung + Verifizierung

/**
 * Trust-Level Konstanten für Verwendung im Code
 */
export const DeviceTrustLevels = {
  UNTRUSTED: 'untrusted' as const,
  BASIC: 'basic' as const,
  VERIFIED: 'verified' as const,
  FULLY_TRUSTED: 'trusted' as const,
};

/**
 * Erweiterte Gerätedaten mit Trust-Informationen
 */
export interface TrustedDeviceInfo extends DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  trustLevel: DeviceTrustLevel;
  isTrusted: boolean;
  trustedAt?: Date;
  trustExpiresAt?: Date;
  lastVerifiedAt?: Date;
  lastSeenAt: Date;
}

/**
 * Request Context mit Authentifizierungsdaten
 */
export interface AuthContext {
  userId: string;
  userType: UserType;
  tenantId?: string;
  role?: string;
  deviceId?: string;
  tokenId?: string;
  tokenFamily?: string;
}

/**
 * Ergebnis einer Verifikationsprüfung
 */
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  context?: AuthContext;
}

/**
 * Cookie-Konfiguration für Token-Speicherung
 */
export interface CookieConfig {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;  // in Sekunden
  path: string;
}
