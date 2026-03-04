// ─── Avatar Routes ─────────────────────────────────────────
// Modul 8: Staff Avatar + TTS + Voice Clone endpoints

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getAvatar,
  upsertAvatar,
  signConsent,
  revokeConsent,
  speak,
  startVoiceClone,
  getCloneStatus,
  listAvatars,
  deleteAvatar,
  getSupportedLanguages,
} from '../services/avatar';

const router = Router();

// GET /api/avatar/languages — Supported TTS languages
router.get('/languages', async (_req: Request, res: Response) => {
  try {
    const languages = getSupportedLanguages();
    res.json(languages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/avatar/list — List all avatars (admin)
router.get('/list', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const avatars = await listAvatars(activeOnly);
    res.json(avatars);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/avatar/:staffId — Get avatar for a staff member
router.get('/:staffId', async (req: Request, res: Response) => {
  try {
    const avatar = await getAvatar(req.params.staffId);
    if (!avatar) {
      res.status(404).json({ error: 'Avatar nicht gefunden' });
      return;
    }
    res.json(avatar);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/avatar/:staffId — Create or update avatar
router.put('/:staffId', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      avatarUrl: z.string().url().optional(),
      avatarType: z.enum(['2D', '3D', 'REAL_PHOTO']).optional(),
      voiceSettings: z.object({
        pitch: z.number().min(-1).max(1),
        speed: z.number().min(0.5).max(2),
        volume: z.number().min(0).max(1),
        style: z.string().optional(),
        provider: z.string().optional(),
      }).optional(),
      supportedLanguages: z.array(z.string()).optional(),
      accentSettings: z.object({
        primaryLanguage: z.string(),
        accentStrength: z.number().min(0).max(1),
        dialectRegion: z.string().optional(),
      }).optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    const avatar = await upsertAvatar(req.params.staffId, data);
    res.json(avatar);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/avatar/:staffId/consent — Sign consent for voice features
router.post('/:staffId/consent', async (req: Request, res: Response) => {
  try {
    const result = await signConsent(req.params.staffId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/avatar/:staffId/consent — Revoke consent (DSGVO Widerruf)
router.delete('/:staffId/consent', async (req: Request, res: Response) => {
  try {
    const result = await revokeConsent(req.params.staffId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/avatar/speak — Text-to-Speech
router.post('/speak', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      staffId: z.string().min(1),
      text: z.string().min(1).max(5000),
      language: z.string().optional(),
      ssml: z.boolean().optional(),
      format: z.enum(['mp3', 'wav', 'ogg']).optional(),
    });

    const data = schema.parse(req.body);
    const result = await speak(data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/avatar/clone/start — Start voice cloning (feature-flagged)
router.post('/clone/start', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      staffId: z.string().min(1),
      audioSamples: z.array(z.string().url()).min(1).max(10),
      consentToken: z.string().min(10),
      language: z.string().default('de-DE'),
    });

    const data = schema.parse(req.body);
    const result = await startVoiceClone(data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/avatar/clone/:staffId — Get clone status
router.get('/clone/:staffId', async (req: Request, res: Response) => {
  try {
    const result = await getCloneStatus(req.params.staffId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/avatar/:staffId — Delete avatar entirely
router.delete('/:staffId', async (req: Request, res: Response) => {
  try {
    const result = await deleteAvatar(req.params.staffId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
