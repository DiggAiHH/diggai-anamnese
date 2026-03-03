import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { PaymentService, IGEL_SERVICES } from '../services/paymentService';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/payments/services
 */
router.get('/services', requireAuth, (_req: Request, res: Response) => {
    res.json({ services: IGEL_SERVICES });
});

/**
 * POST /api/payments/checkout
 */
const checkoutSchema = z.object({
    serviceId: z.string().min(1).max(100),
    email: z.string().email(),
});

router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
    try {
        const { serviceId, email } = checkoutSchema.parse(req.body);
        const checkout = await PaymentService.createCheckoutSession(serviceId, email);
        res.json(checkout);
    } catch (err: unknown) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: 'Ungültige Eingabe', details: err.issues });
            return;
        }
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        res.status(500).json({ error: message });
    }
});

export default router;
