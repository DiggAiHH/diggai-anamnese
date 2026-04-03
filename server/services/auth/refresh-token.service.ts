/**
 * @module refresh-token.service
 * @description Refresh Token Rotation Service für sichere Session-Verwaltung
 *
 * Implementiert das Token Rotation Pattern nach OWASP Best Practices:
 * - Kurzlebige Access Tokens (15 Minuten)
 * - Langlebige Refresh Tokens (7 Tage) mit Rotation
 * - Token Family Detection bei Theft/Reuse
 * - Redis-Backup für Token-Blacklist
 *
 * @security
 * - Tokens werden niemals im Klartext gespeichert (nur SHA-256 Hash)
 * - Token Family ermöglicht Detection von gestohlenen Tokens
 * - Automatische Revocation bei verdächtiger Aktivität
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../../db';
import { config } from '../../config';
import { getRedisClient, isRedisReady } from '../../redis';
import { logSecurityEvent, SecurityEvent } from '../security-audit.service';
import type { UserType } from '@prisma/client';

// ─── Configuration ──────────────────────────────────────────

const REFRESH_TOKEN_LENGTH = 64; // Bytes
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Redis key prefixes
const REDIS_KEY_REFRESH_TOKEN = 'rt';
const REDIS_KEY_BLACKLIST = 'rt:bl';

// ─── Types ──────────────────────────────────────────────────

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

export interface RefreshTokenPayload {
    userId: string;
    userType: UserType;
    tokenFamily: string;
    jti: string;
}

export interface TokenRotationResult {
    success: boolean;
    tokenPair?: TokenPair;
    error?: string;
    securityEvent?: 'reuse_detected' | 'expired' | 'revoked' | 'invalid';
}

// ─── Helper Functions ───────────────────────────────────────

/**
 * Generiert einen kryptographisch sicheren Refresh Token
 */
function generateRefreshToken(): string {
    return crypto.randomBytes(REFRESH_TOKEN_LENGTH).toString('base64url');
}

/**
 * Erzeugt SHA-256 Hash eines Tokens für Datenbankspeicherung
 * Niemals den Klartext-Token speichern!
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generiert eine eindeutige Token-Familien-ID
 */
function generateTokenFamily(): string {
    return crypto.randomUUID();
}

/**
 * Hash der IP-Adresse für DSGVO-konformes Tracking
 */
function hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

/**
 * Sanitizes user agent string für Speicherung
 */
function sanitizeUserAgent(ua?: string): string | null {
    if (!ua) return null;
    return ua.replace(/[\r\n\t]/g, ' ').substring(0, 255);
}

// ─── Redis Operations ───────────────────────────────────────

/**
 * Speichert Refresh Token Metadaten in Redis (für schnelle Validierung)
 */
async function cacheRefreshToken(
    tokenHash: string,
    payload: RefreshTokenPayload,
    expiresAt: Date
): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisReady()) return;

    const ttl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
    if (ttl <= 0) return;

    try {
        await redis.setex(
            `${REDIS_KEY_REFRESH_TOKEN}:${tokenHash}`,
            ttl,
            JSON.stringify(payload)
        );
    } catch (err) {
        console.warn('[RefreshToken] Redis cache write failed:', err);
    }
}

/**
 * Löscht Refresh Token aus Redis Cache
 */
async function invalidateRefreshTokenCache(tokenHash: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisReady()) return;

    try {
        await redis.del(`${REDIS_KEY_REFRESH_TOKEN}:${tokenHash}`);
    } catch (err) {
        console.warn('[RefreshToken] Redis cache delete failed:', err);
    }
}

/**
 * Prüft ob ein Token-Hash auf der Blacklist steht
 */
async function isTokenBlacklisted(tokenHash: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis || !isRedisReady()) return false;

    try {
        const result = await redis.get(`${REDIS_KEY_BLACKLIST}:${tokenHash}`);
        return result !== null;
    } catch (err) {
        console.warn('[RefreshToken] Redis blacklist check failed:', err);
        return false;
    }
}

/**
 * Fügt einen Token-Hash zur Redis Blacklist hinzu
 */
async function blacklistRefreshToken(tokenHash: string, ttlSeconds: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis || !isRedisReady()) return;

    try {
        await redis.setex(`${REDIS_KEY_BLACKLIST}:${tokenHash}`, ttlSeconds, '1');
    } catch (err) {
        console.warn('[RefreshToken] Redis blacklist write failed:', err);
    }
}

// ─── Access Token Operations ────────────────────────────────

/**
 * Erstellt ein signiertes JWT Access Token
 */
function createAccessToken(
    userId: string,
    userType: UserType,
    tenantId?: string,
    role?: string
): string {
    const jti = crypto.randomUUID();
    const payload: Record<string, unknown> = {
        userId,
        userType,
        jti,
    };

    if (tenantId) payload.tenantId = tenantId;
    if (role) payload.role = role;

    return jwt.sign(payload, config.jwtSecret as Secret, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        algorithm: 'HS256',
    } as SignOptions);
}

// ─── Core Token Operations ──────────────────────────────────

/**
 * Erstellt ein neues Token-Paar (Access + Refresh Token)
 *
 * @param userId - Benutzer-ID (Arzt oder Patient)
 * @param userType - 'ARZT' oder 'PATIENT'
 * @param tenantId - Optional: Tenant ID für Arzt-User
 * @param role - Optional: Rolle für Arzt-User (arzt, mfa, admin)
 * @param deviceId - Optional: Geräte-ID für Device-Tracking
 * @param ip - Optional: IP-Adresse für Audit-Log
 * @param userAgent - Optional: User-Agent für Audit-Log
 */
export async function createTokenPair(
    userId: string,
    userType: UserType,
    tenantId?: string,
    role?: string,
    deviceId?: string,
    ip?: string,
    userAgent?: string
): Promise<TokenPair> {
    const tokenFamily = generateTokenFamily();
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    // Speichere Refresh Token in Datenbank
    await prisma.refreshToken.create({
        data: {
            tokenFamily,
            tokenHash,
            userId,
            userType,
            deviceId: deviceId || null,
            expiresAt,
            ipHash: ip ? hashIp(ip) : null,
            userAgent: sanitizeUserAgent(userAgent),
        },
    });

    // Cache in Redis für schnelle Validierung
    await cacheRefreshToken(tokenHash, {
        userId,
        userType,
        tokenFamily,
        jti: tokenFamily, // Verwende tokenFamily als JTI
    }, expiresAt);

    // Erstelle Access Token
    const accessToken = createAccessToken(userId, userType, tenantId, role);

    // Log security event
    await logSecurityEvent({
        event: SecurityEvent.TOKEN_REFRESHED,
        tenantId: tenantId || 'system',
        actorId: userId,
        ip,
        userAgent,
        metadata: {
            userType,
            tokenFamily,
            deviceId,
            isInitial: true,
        },
    });

    return {
        accessToken,
        refreshToken,
        expiresAt,
    };
}

/**
 * Rotiert einen Refresh Token (Token Rotation Pattern)
 *
 * Bei erfolgreicher Rotation:
 * 1. Alter Token wird revoked
 * 2. Neues Token-Paar wird erstellt (gleiche Token-Familie)
 * 3. Redis-Caches werden aktualisiert
 *
 * Bei Reuse-Detection (alter bereits verwendeter Token):
 * 1. Gesamte Token-Familie wird revoked
 * 2. Security Event wird geloggt
 * 3. Alle Sessions des Benutzers werden beendet
 */
export async function rotateRefreshToken(
    oldRefreshToken: string,
    deviceFingerprint?: string,
    ip?: string,
    userAgent?: string
): Promise<TokenRotationResult> {
    const oldTokenHash = hashToken(oldRefreshToken);

    try {
        // 1. Prüfe Redis Blacklist (schneller Check)
        const isBlacklisted = await isTokenBlacklisted(oldTokenHash);
        if (isBlacklisted) {
            return {
                success: false,
                error: 'Token wurde widerrufen',
                securityEvent: 'revoked',
            };
        }

        // 2. Lade Token aus Datenbank
        const storedToken = await prisma.refreshToken.findUnique({
            where: { tokenHash: oldTokenHash },
        });

        // 3. Token nicht gefunden
        if (!storedToken) {
            // Möglicherweise ein bereits rotierter Token (Theft-Versuch)
            // Versuche zu ermitteln, welche Token-Familie betroffen ist
            return await handlePotentialTokenReuse(oldRefreshToken, ip, userAgent);
        }

        // 4. Prüfe ob Token abgelaufen
        if (storedToken.expiresAt < new Date()) {
            return {
                success: false,
                error: 'Token ist abgelaufen',
                securityEvent: 'expired',
            };
        }

        // 5. Prüfe ob Token revoked
        if (storedToken.isRevoked) {
            return {
                success: false,
                error: 'Token wurde widerrufen',
                securityEvent: 'revoked',
            };
        }

        // 6. Prüfe auf Reuse (wurde bereits rotiert)
        if (storedToken.rotatedAt || storedToken.reuseDetected) {
            // TOKEN REUSE DETECTED - Sicherheitsvorfall!
            return await handleTokenReuseDetected(storedToken, ip, userAgent);
        }

        // 7. Validierung erfolgreich - Token rotieren
        const newRefreshToken = generateRefreshToken();
        const newTokenHash = hashToken(newRefreshToken);
        const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

        // Transaktion: Alten Token als rotiert markieren + neuen erstellen
        await prisma.$transaction([
            // Alten Token als rotiert markieren
            prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: {
                    rotatedAt: new Date(),
                },
            }),
            // Neuen Token erstellen (gleiche Familie)
            prisma.refreshToken.create({
                data: {
                    tokenFamily: storedToken.tokenFamily,
                    tokenHash: newTokenHash,
                    userId: storedToken.userId,
                    userType: storedToken.userType,
                    deviceId: storedToken.deviceId,
                    expiresAt: newExpiresAt,
                    ipHash: ip ? hashIp(ip) : storedToken.ipHash,
                    userAgent: sanitizeUserAgent(userAgent) || storedToken.userAgent,
                },
            }),
        ]);

        // Alten Token in Redis Blacklist
        const ttlSeconds = Math.ceil((storedToken.expiresAt.getTime() - Date.now()) / 1000);
        if (ttlSeconds > 0) {
            await blacklistRefreshToken(oldTokenHash, ttlSeconds);
            await invalidateRefreshTokenCache(oldTokenHash);
        }

        // Cache neuen Token
        await cacheRefreshToken(newTokenHash, {
            userId: storedToken.userId,
            userType: storedToken.userType,
            tokenFamily: storedToken.tokenFamily,
            jti: storedToken.tokenFamily,
        }, newExpiresAt);

        // Erstelle neuen Access Token
        const accessToken = createAccessToken(
            storedToken.userId,
            storedToken.userType
        );

        // Log rotation event
        await logSecurityEvent({
            event: SecurityEvent.TOKEN_REFRESHED,
            tenantId: 'system', // TODO: Lookup tenant for user
            actorId: storedToken.userId,
            ip,
            userAgent,
            metadata: {
                userType: storedToken.userType,
                tokenFamily: storedToken.tokenFamily,
                deviceFingerprint,
                isRotation: true,
            },
        });

        return {
            success: true,
            tokenPair: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresAt: newExpiresAt,
            },
        };

    } catch (err) {
        console.error('[RefreshToken] Rotation error:', err);
        return {
            success: false,
            error: 'Token-Rotation fehlgeschlagen',
        };
    }
}

/**
 * Behandelt Token Reuse Detection
 * Wird aufgerufen wenn ein bereits rotierter Token wiederverwendet wird
 */
async function handleTokenReuseDetected(
    storedToken: { id: string; userId: string; userType: UserType; tokenFamily: string },
    ip?: string,
    userAgent?: string
): Promise<TokenRotationResult> {
    // Markiere als Reuse erkannt
    await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
            reuseDetected: true,
            reuseCount: { increment: 1 },
        },
    });

    // REVOKE GESAMTE TOKEN FAMILIE
    await revokeTokenFamily(storedToken.tokenFamily, 'TOKEN_REUSE_DETECTED');

    // Log security incident
    await logSecurityEvent({
        event: SecurityEvent.TOKEN_FAMILY_BROKEN,
        tenantId: 'system',
        actorId: storedToken.userId,
        ip,
        userAgent,
        metadata: {
            userType: storedToken.userType,
            tokenFamily: storedToken.tokenFamily,
            severity: 'CRITICAL',
            description: 'Refresh Token wurde nach Rotation wiederverwendet - möglicher Token-Diebstahl',
        },
    });

    return {
        success: false,
        error: 'Sicherheitsverstoß erkannt. Alle Sessions wurden beendet.',
        securityEvent: 'reuse_detected',
    };
}

/**
 * Behandelt potentiellen Token Reuse wenn Token nicht in DB gefunden wurde
 * Könnte ein bereits gelöschter (rotierter) Token sein
 */
async function handlePotentialTokenReuse(
    refreshToken: string,
    ip?: string,
    userAgent?: string
): Promise<TokenRotationResult> {
    // Extrahiere Payload falls möglich (für Logging)
    // Da Refresh Tokens opaque sind, können wir nichts extrahieren
    // Aber wir loggen den Versuch

    console.warn('[RefreshToken] Unknown token presented - possible reuse attempt', {
        ip: ip ? hashIp(ip) : null,
        userAgent: sanitizeUserAgent(userAgent),
    });

    return {
        success: false,
        error: 'Ungültiger Token',
        securityEvent: 'invalid',
    };
}

// ─── Revocation Operations ──────────────────────────────────

/**
 * Widerruft alle Tokens einer Token-Familie
 */
export async function revokeTokenFamily(
    tokenFamily: string,
    reason: string
): Promise<void> {
    const tokens = await prisma.refreshToken.findMany({
        where: {
            tokenFamily,
            isRevoked: false,
        },
    });

    // Batch update
    await prisma.refreshToken.updateMany({
        where: {
            tokenFamily,
            isRevoked: false,
        },
        data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: reason,
        },
    });

    // Redis Blacklist für alle Tokens
    const now = Date.now();
    for (const token of tokens) {
        const ttlSeconds = Math.ceil((token.expiresAt.getTime() - now) / 1000);
        if (ttlSeconds > 0) {
            await blacklistRefreshToken(token.tokenHash, ttlSeconds);
            await invalidateRefreshTokenCache(token.tokenHash);
        }
    }
}

/**
 * Widerruft alle Refresh Tokens eines Benutzers
 */
export async function revokeAllUserTokens(
    userId: string,
    userType: UserType,
    exceptTokenId?: string
): Promise<number> {
    const whereClause: {
        userId: string;
        userType: UserType;
        isRevoked: boolean;
        id?: { not: string };
    } = {
        userId,
        userType,
        isRevoked: false,
    };

    if (exceptTokenId) {
        whereClause.id = { not: exceptTokenId };
    }

    const tokens = await prisma.refreshToken.findMany({ where: whereClause });

    const result = await prisma.refreshToken.updateMany({
        where: whereClause,
        data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'USER_LOGOUT_ALL',
        },
    });

    // Redis Blacklist
    const now = Date.now();
    for (const token of tokens) {
        const ttlSeconds = Math.ceil((token.expiresAt.getTime() - now) / 1000);
        if (ttlSeconds > 0) {
            await blacklistRefreshToken(token.tokenHash, ttlSeconds);
            await invalidateRefreshTokenCache(token.tokenHash);
        }
    }

    return result.count;
}

/**
 * Widerruft einen einzelnen Refresh Token
 */
export async function revokeRefreshToken(
    tokenHash: string,
    reason: string
): Promise<boolean> {
    const token = await prisma.refreshToken.findUnique({
        where: { tokenHash },
    });

    if (!token || token.isRevoked) {
        return false;
    }

    await prisma.refreshToken.update({
        where: { id: token.id },
        data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: reason,
        },
    });

    // Redis Blacklist
    const ttlSeconds = Math.ceil((token.expiresAt.getTime() - Date.now()) / 1000);
    if (ttlSeconds > 0) {
        await blacklistRefreshToken(tokenHash, ttlSeconds);
        await invalidateRefreshTokenCache(tokenHash);
    }

    return true;
}

// ─── Cleanup Operations ─────────────────────────────────────

/**
 * Löscht abgelaufene und revoked Tokens (für Cron Job)
 */
export async function cleanupExpiredTokens(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.refreshToken.deleteMany({
        where: {
            OR: [
                {
                    expiresAt: { lt: new Date() },
                    rotatedAt: { lt: cutoffDate },
                },
                {
                    isRevoked: true,
                    revokedAt: { lt: cutoffDate },
                },
            ],
        },
    });

    return result.count;
}

/**
 * Gibt Statistiken über aktive Tokens zurück
 */
export async function getTokenStats(): Promise<{
    totalActive: number;
    totalRevoked: number;
    expiredNotCleaned: number;
    reuseDetected: number;
}> {
    const [active, revoked, expired, reuse] = await Promise.all([
        prisma.refreshToken.count({ where: { isRevoked: false, expiresAt: { gt: new Date() } } }),
        prisma.refreshToken.count({ where: { isRevoked: true } }),
        prisma.refreshToken.count({ where: { expiresAt: { lt: new Date() } } }),
        prisma.refreshToken.count({ where: { reuseDetected: true } }),
    ]);

    return {
        totalActive: active,
        totalRevoked: revoked,
        expiredNotCleaned: expired,
        reuseDetected: reuse,
    };
}
