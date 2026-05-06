/**
 * server/routes/voice.ts
 *
 * API-Routes für Voice-Anamnese-Sessions (Capture-Side, Class-I-konform).
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3 (ElevenLabs)
 * Adressiert F5 (BITV 2.0 Barrierefreiheit)
 *
 * REGULATORY GUARD (Klasse-I-Schutz):
 *   - Diese Route arrangiert Voice-Sessions, gibt aber NIEMALS klinische Empfehlungen
 *   - Der Voice-Agent-Service (elevenlabsAgent.ts) hat einen Output-Filter (filterAgentOutput)
 *   - Audio wird NICHT serverseitig persistiert (DSGVO + Class-I)
 *   - Feature-Flag VOICE_AGENT_ENABLED muss true sein, sonst 503 Service-Unavailable
 *
 * Endpoints:
 *   POST /api/voice/sessions/:sessionId/start   — Voice-Session starten
 *   POST /api/voice/sessions/:sessionId/stop    — Voice-Session beenden
 *   GET  /api/voice/sessions/health             — Health/Config-Check
 *
 * Status: Skeleton mit 503-Default. Production-Aktivierung erfordert:
 *   1) ELEVENLABS_API_KEY als Fly-Secret
 *   2) AVV mit ElevenLabs (DSGVO Art. 28)
 *   3) Audio-no-store-Konfiguration im ElevenLabs-Dashboard
 *   4) VOICE_AGENT_ENABLED=true setzen
 */

import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db';

function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

const truthy = (v: string | undefined): boolean =>
    v === '1' || v === 'true' || v === 'TRUE' || v === 'yes';

const VOICE_AGENT_ENABLED = truthy(process.env.VOICE_AGENT_ENABLED);
const ELEVENLABS_AVAILABLE = !!process.env.ELEVENLABS_API_KEY;

const router = Router();

const startSchema = z.object({
    language: z.enum(['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl']).default('de'),
});

// ─── POST /api/voice/sessions/:sessionId/start ────────────────

router.post('/sessions/:sessionId/start', async (req, res) => {
    if (!VOICE_AGENT_ENABLED) {
        return res.status(503).json({
            error: 'Voice-Anamnese ist derzeit nicht verfügbar.',
            hint: 'Bitte verwenden Sie die Texteingabe.',
            featureFlag: 'VOICE_AGENT_ENABLED',
            apiKeyAvailable: ELEVENLABS_AVAILABLE,
        });
    }

    const sessionId = param(req, 'sessionId');
    if (!sessionId || sessionId.length < 5 || sessionId.length > 100) {
        return res.status(400).json({ error: 'Ungültige Session-ID' });
    }

    const session = await prisma.patientSession.findUnique({
        where: { id: sessionId },
        select: { id: true, createdAt: true },
    });
    if (!session) {
        return res.status(404).json({ error: 'Session nicht gefunden' });
    }

    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.issues });
    }

    // Skeleton: hier würde der ElevenLabs-Agent erstellt + WebRTC-URL generiert.
    // Für jetzt: 501 Not-Implemented mit klarer Hinweis-Message.
    return res.status(501).json({
        error: 'Voice-Agent-Production noch nicht aktiv',
        sessionId: session.id,
        nextStep: 'ELEVENLABS_API_KEY in Fly-Secrets + AVV abschließen',
        documentation: 'docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3',
    });
});

// ─── POST /api/voice/sessions/:sessionId/stop ─────────────────

router.post('/sessions/:sessionId/stop', async (req, res) => {
    const sessionId = param(req, 'sessionId');
    if (!sessionId) return res.status(400).json({ error: 'Ungültige Session-ID' });

    // Auch wenn Voice nicht aktiv ist, /stop muss tolerant antworten,
    // damit Frontend-Cleanup funktioniert.
    return res.json({ ok: true, sessionId });
});

// ─── GET /api/voice/sessions/health ──────────────────────────

router.get('/sessions/health', (_req, res) => {
    return res.json({
        status: VOICE_AGENT_ENABLED && ELEVENLABS_AVAILABLE ? 'ready' : 'not-configured',
        flags: {
            VOICE_AGENT_ENABLED,
            ELEVENLABS_API_KEY_PRESENT: ELEVENLABS_AVAILABLE,
        },
        languages: ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'],
        regulatoryClassification: 'class-I-administrative',
        documentation: 'docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3',
    });
});

export default router;
