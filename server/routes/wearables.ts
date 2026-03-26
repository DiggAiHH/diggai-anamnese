import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.post('/ingest', async (req: Request, res: Response) => {
  const { source, metricType, value, unit, recordedAt } = req.body;
  const patientId = (req as any).user?.patientId;

  if(!patientId) {
      res.status(403).json({ error: 'Not a patient' });
      return;
  }

  try {
    const prisma = (globalThis as any).__prisma;
    if (!prisma) {
        res.status(500).json({ error: 'DB not available' });
        return;
    }
    const data = await prisma.wearableData.create({
      data: {
        patientId,
        source,
        metricType,
        value,
        unit,
        recordedAt: new Date(recordedAt),
      }
    });
    
    // Check for alerts (e.g. chronic decompensation)
    if (metricType === 'HEART_RATE' && value > 120) {
      console.log('CRITICAL: High resting heart rate detected!');
      // Option: Trigger Triage Alert...
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
