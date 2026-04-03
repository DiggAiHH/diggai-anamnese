/**
 * @module twofa.routes
 * @description 2FA/TOTP API Routes
 *
 * Endpunkte für TOTP-Setup, Verifizierung und Verwaltung
 * Geschützt durch requireAuth Middleware
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import {
  setupTOTP,
  verifyTOTPSetup,
  verifyTOTP,
  regenerateBackupCodes,
  disableTOTP,
  has2FAEnabled,
  getRemainingBackupCodesCount,
} from '../../services/auth/totp.service';
import { generateFingerprint } from '../../services/auth/device-fingerprint.service';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/auth/2fa/status
 * Check if 2FA is enabled for current user
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const enabled = await has2FAEnabled(userId, userType);
    const remainingBackupCodes = enabled 
      ? await getRemainingBackupCodesCount(userId, userType)
      : 0;
    
    res.json({ 
      enabled,
      remainingBackupCodes,
    });
  } catch (error) {
    console.error('[2FA] Status error:', error);
    res.status(500).json({ error: 'Status konnte nicht abgerufen werden' });
  }
});

/**
 * POST /api/auth/2fa/setup
 * Start 2FA setup (generates secret and QR code)
 */
router.post('/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const result = await setupTOTP(userId, userType);
    
    res.json({
      qrCodeUrl: result.qrCodeUrl,
      qrCodeDataUrl: result.qrCodeDataUrl,
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    console.error('[2FA] Setup error:', error);
    res.status(500).json({ error: 'Setup konnte nicht gestartet werden' });
  }
});

/**
 * POST /api/auth/2fa/verify-setup
 * Verify token and enable 2FA
 */
const verifySetupSchema = z.object({
  token: z.string().length(6).regex(/^\d+$/),
});

router.post('/verify-setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const { token } = verifySetupSchema.parse(req.body);
    
    const fingerprint = generateFingerprint(req);
    
    const result = await verifyTOTPSetup(userId, userType, token, {
      fingerprint: fingerprint.hash,
      userAgent: req.headers['user-agent'] || undefined,
      ip: req.ip || undefined,
    });
    
    if (!result.valid) {
      return res.status(400).json({ 
        error: 'Ungültiger Code',
        code: result.error,
      });
    }
    
    res.json({ success: true, message: '2FA erfolgreich aktiviert' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültiges Format', details: error.issues });
    }
    console.error('[2FA] Verify setup error:', error);
    res.status(500).json({ error: 'Verifizierung fehlgeschlagen' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP token (for login flow)
 */
const verifySchema = z.object({
  token: z.string(),
});

router.post('/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const { token } = verifySchema.parse(req.body);
    
    const fingerprint = generateFingerprint(req);
    
    const result = await verifyTOTP(userId, userType, token, {
      fingerprint: fingerprint.hash,
      userAgent: req.headers['user-agent'] || undefined,
      ip: req.ip || undefined,
    });
    
    if (!result.valid) {
      return res.status(400).json({ 
        error: 'Ungültiger Code',
        code: result.error,
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungültiges Format', details: error.issues });
    }
    console.error('[2FA] Verify error:', error);
    res.status(500).json({ error: 'Verifizierung fehlgeschlagen' });
  }
});

/**
 * POST /api/auth/2fa/backup-codes
 * Generate new backup codes
 */
router.post('/backup-codes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const codes = await regenerateBackupCodes(userId, userType);
    
    if (!codes) {
      return res.status(400).json({ error: '2FA ist nicht aktiviert' });
    }
    
    res.json({ backupCodes: codes });
  } catch (error) {
    console.error('[2FA] Backup codes error:', error);
    res.status(500).json({ error: 'Backup-Codes konnten nicht generiert werden' });
  }
});

/**
 * DELETE /api/auth/2fa
 * Disable 2FA
 */
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const fingerprint = generateFingerprint(req);
    
    const success = await disableTOTP(userId, userType, {
      fingerprint: fingerprint.hash,
      userAgent: req.headers['user-agent'] || undefined,
      ip: req.ip || undefined,
    });
    
    if (!success) {
      return res.status(400).json({ error: '2FA ist nicht aktiviert' });
    }
    
    res.json({ success: true, message: '2FA deaktiviert' });
  } catch (error) {
    console.error('[2FA] Disable error:', error);
    res.status(500).json({ error: 'Deaktivierung fehlgeschlagen' });
  }
});

export default router;
