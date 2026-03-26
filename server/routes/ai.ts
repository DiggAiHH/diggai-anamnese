import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { optimizeBilling } from '../services/ai/billing-optimization.service';
import { processAmbientVoice } from '../services/ai/ambient-scribe.service';

const router = Router();

// Only medical staff and admins can access AI helper endpoints
router.use(requireAuth, requireRole('admin', 'arzt', 'mfa'));

// ─── POST /api/ai/billing-optimization ────────────
router.post('/billing-optimization', async (req: Request, res: Response) => {
    try {
        const { clinicalNotes } = req.body;
        if (!clinicalNotes) {
            res.status(400).json({ error: 'clinicalNotes parameter is required' });
            return;
        }
        
        const suggestions = await optimizeBilling(clinicalNotes);
        res.json({ suggestions });
    } catch (err: any) {
        console.error('[AI] Billing optimization error:', err);
        res.status(500).json({ error: 'Abrechnungsanalyse fehlgeschlagen' });
    }
});

// ─── POST /api/ai/ambient-scribe ────────────
router.post('/ambient-scribe', async (req: Request, res: Response) => {
    try {
        const { transcript, sessionId } = req.body;
        if (!transcript) {
            res.status(400).json({ error: 'transcript parameter is required' });
            return;
        }
        
        const soapNote = await processAmbientVoice(transcript, sessionId || 'default');
        res.json({ soapNote });
    } catch (err: any) {
        console.error('[AI] Ambient scribe error:', err);
        res.status(500).json({ error: 'SOAP-Notiz Generierung fehlgeschlagen' });
    }
});

export default router;
