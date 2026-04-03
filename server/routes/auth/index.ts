/**
 * @module auth
 * @description Authentication API Routes Hub
 *
 * Zentrale Router-Datei für alle Auth-bezogenen Endpunkte:
 * - /api/auth/refresh - Token Refresh
 * - /api/auth/logout - Logout
 * - /api/auth/logout-all - Alle Sessions beenden
 * - /api/auth/sessions - Session Management
 * - /api/auth/device - Device Fingerprint
 * - /api/auth/2fa - Two-Factor Authentication
 * - /api/auth/passkeys - WebAuthn/Passkey Authentication
 */

import { Router } from 'express';
import sessionsRouter from './sessions';
import refreshRouter from './refresh';
import deviceRouter from './device';
import twofaRouter from './twofa';
import passkeysRouter from './passkeys';

const router = Router();

// Session Management Routes (/api/auth/sessions/*)
router.use('/sessions', sessionsRouter);

// Auth Routes (/api/auth/*)
router.use('/', refreshRouter);

// Device Fingerprint Routes (/api/auth/device/*)
router.use('/device', deviceRouter);

// 2FA/TOTP Routes (/api/auth/2fa/*)
router.use('/2fa', twofaRouter);

// Passkey/WebAuthn Routes (/api/auth/passkeys/*)
router.use('/passkeys', passkeysRouter);

export default router;
