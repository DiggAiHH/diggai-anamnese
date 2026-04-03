import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import {
  generatePasskeyRegistrationOptions,
  verifyAndStorePasskey,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  listUserPasskeys,
  deletePasskey,
  hasPasskeys,
} from '../../services/auth/passkey.service';
import { generateFingerprint } from '../../services/auth/device-fingerprint.service';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/auth/passkeys/status
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const hasKeys = await hasPasskeys(userId);
    res.json({ enabled: hasKeys });
  } catch (error) {
    console.error('[Passkey] Status error:', error);
    res.status(500).json({ error: 'Status konnte nicht abgerufen werden' });
  }
});

/**
 * GET /api/auth/passkeys
 * List all passkeys for user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const passkeys = await listUserPasskeys(userId);
    res.json({ passkeys });
  } catch (error) {
    console.error('[Passkey] List error:', error);
    res.status(500).json({ error: 'Passkeys konnten nicht geladen werden' });
  }
});

/**
 * POST /api/auth/passkeys/register-options
 */
router.post('/register-options', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const username = req.auth?.userId; // Or get from user record
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const options = await generatePasskeyRegistrationOptions(
      userId,
      username || userId,
      req.body.deviceName || 'Unknown Device'
    );
    
    res.json(options);
  } catch (error) {
    console.error('[Passkey] Register options error:', error);
    res.status(500).json({ error: 'Optionen konnten nicht generiert werden' });
  }
});

/**
 * POST /api/auth/passkeys/register
 */
const registerSchema = z.object({
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      transports: z.array(z.string()).optional(),
    }),
    type: z.literal('public-key'),
  }),
  deviceName: z.string().min(1),
});

router.post('/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType: 'ARZT' | 'PATIENT' = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const { response, deviceName } = registerSchema.parse(req.body);
    
    const fingerprint = generateFingerprint(req);
    
    const clientIp = req.ip ? (Array.isArray(req.ip) ? req.ip[0] : req.ip) : undefined;
    
    const result = await verifyAndStorePasskey(
      userId,
      userType,
      response as any,
      deviceName,
      {
        fingerprint: fingerprint.hash,
        userAgent: req.headers['user-agent'] || undefined,
        ip: clientIp,
      }
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true, credentialId: result.credentialId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungueltiges Format', details: error.issues });
    }
    console.error('[Passkey] Register error:', error);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

/**
 * POST /api/auth/passkeys/auth-options
 */
router.post('/auth-options', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    const options = await generatePasskeyAuthenticationOptions(userId);
    res.json(options);
  } catch (error) {
    console.error('[Passkey] Auth options error:', error);
    res.status(500).json({ error: 'Optionen konnten nicht generiert werden' });
  }
});

/**
 * POST /api/auth/passkeys/authenticate
 */
const authenticateSchema = z.object({
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.literal('public-key'),
  }),
});

router.post('/authenticate', async (req: Request, res: Response) => {
  try {
    const { response } = authenticateSchema.parse(req.body);
    
    const fingerprint = generateFingerprint(req);
    
    const clientIp = req.ip ? (Array.isArray(req.ip) ? req.ip[0] : req.ip) : undefined;
    
    const result = await verifyPasskeyAuthentication(
      response as any,
      {
        fingerprint: fingerprint.hash,
        userAgent: req.headers['user-agent'] || undefined,
        ip: clientIp,
      }
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Create session for authenticated user
    // TODO: Create JWT tokens for the user
    res.json({
      success: true,
      userId: result.userId,
      userType: result.userType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Ungueltiges Format', details: error.issues });
    }
    console.error('[Passkey] Authentication error:', error);
    res.status(500).json({ error: 'Authentifizierung fehlgeschlagen' });
  }
});

/**
 * DELETE /api/auth/passkeys/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const userType: 'ARZT' | 'PATIENT' = req.auth?.role === 'patient' ? 'PATIENT' : 'ARZT';
    const credentialId = req.params.id as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    const success = await deletePasskey(credentialId, userId, userType);
    
    if (!success) {
      return res.status(404).json({ error: 'Passkey nicht gefunden' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Passkey] Delete error:', error);
    res.status(500).json({ error: 'Loeschen fehlgeschlagen' });
  }
});

export default router;
