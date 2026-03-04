import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { hashEmail } from '../services/encryption';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const router = Router();

/** Extract user-agent as string (Express 5 may return string[]) */
function ua(req: Request): string | null {
  const h = req.headers['user-agent'];
  return typeof h === 'string' ? h : Array.isArray(h) ? h[0] : null;
}

/** Extract client IP as string (Express 5 may return string[]) */
function clientIp(req: Request): string | null {
  const ip = req.ip;
  return typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : null;
}

// Rate limiting map (in-memory, per IP)
const identifyAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = identifyAttempts.get(ip);
  
  if (!entry || now > entry.resetAt) {
    identifyAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 }); // 10 min window
    return true;
  }
  
  if (entry.count >= 5) {
    return false; // Too many attempts
  }
  
  entry.count++;
  return true;
}

// ─── Patient Identification ─────────────────────────────────

const identifySchema = z.object({
  birthDate: z.string().min(1, 'Geburtsdatum erforderlich'),
  insuranceNumber: z.string().min(5, 'Versicherungsnummer zu kurz'),
  patientNumber: z.string().optional(),
});

/**
 * POST /api/patients/identify
 * Look up a returning patient by birthDate + insuranceNumber hash.
 * Rate-limited: 5 attempts per IP per 10 minutes.
 */
router.post('/identify', async (req: Request, res: Response) => {
  try {
    const ip: string = clientIp(req) || req.socket.remoteAddress || 'unknown';
    
    if (!checkRateLimit(ip)) {
      res.status(429).json({
        error: 'Zu viele Versuche. Bitte warten Sie 10 Minuten.',
        found: false,
      });
      return;
    }
    
    const data = identifySchema.parse(req.body);
    const insuranceHash = hashEmail(data.insuranceNumber); // Same SHA-256 util
    const birthDateObj = new Date(data.birthDate);
    
    if (isNaN(birthDateObj.getTime())) {
      res.status(400).json({ error: 'Ungültiges Geburtsdatum', found: false });
      return;
    }
    
    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      insuranceNumHash: insuranceHash,
      birthDate: {
        gte: new Date(birthDateObj.setHours(0, 0, 0, 0)),
        lt: new Date(birthDateObj.setHours(23, 59, 59, 999)),
      },
    };
    
    // Optional: narrow by patient number
    if (data.patientNumber) {
      where.patientNumber = data.patientNumber;
    }
    
    const patient = await prisma.patient.findFirst({
      where,
      select: {
        id: true,
        patientNumber: true,
        encryptedName: true,
        gender: true,
        birthDate: true,
        securityPattern: true,
        verifiedAt: true,
      },
    });
    
    if (!patient) {
      // Don't reveal whether insurance number exists (prevent enumeration)
      res.json({ found: false });
      return;
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'PATIENT_IDENTIFY',
        resource: `patients/${patient.id}`,
        ipAddress: ip,
        userAgent: ua(req),
        metadata: JSON.stringify({ method: 'insuranceNumber+birthDate' }),
      },
    });
    
    res.json({
      found: true,
      patient: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        name: patient.encryptedName || '', // Client will display encrypted name
        gender: patient.gender || '',
        birthDate: patient.birthDate?.toISOString().split('T')[0] || '',
        requiresPattern: !!patient.securityPattern,
        isVerified: !!patient.verifiedAt,
      },
    });
  } catch (err) {
    console.error('[Patients] Identify error:', err);
    res.status(500).json({ error: 'Interner Serverfehler', found: false });
  }
});

// ─── Pattern Verification ───────────────────────────────────

const verifyPatternSchema = z.object({
  patientId: z.string().uuid(),
  patternHash: z.string().min(10), // SHA-256 hex from client
});

/**
 * POST /api/patients/verify-pattern
 * Verify a patient's security pattern.
 */
router.post('/verify-pattern', async (req: Request, res: Response) => {
  try {
    const ip: string = clientIp(req) || req.socket.remoteAddress || 'unknown';
    
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Zu viele Versuche', verified: false });
      return;
    }
    
    const data = verifyPatternSchema.parse(req.body);
    
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, securityPattern: true },
    });
    
    if (!patient || !patient.securityPattern) {
      res.json({ verified: false });
      return;
    }
    
    // Compare: client sends SHA-256 of pattern, server stores bcrypt of SHA-256
    const isValid = await bcrypt.compare(data.patternHash, patient.securityPattern);
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        action: isValid ? 'PATTERN_VERIFY_SUCCESS' : 'PATTERN_VERIFY_FAIL',
        resource: `patients/${patient.id}`,
        ipAddress: ip,
        userAgent: ua(req),
      },
    });
    
    res.json({ verified: isValid });
  } catch (err) {
    console.error('[Patients] Pattern verify error:', err);
    res.status(500).json({ error: 'Interner Serverfehler', verified: false });
  }
});

// ─── Pattern Setup (MFA-initiated) ─────────────────────────

const setPatternSchema = z.object({
  patternHash: z.string().min(10),
});

/**
 * POST /api/patients/:id/pattern
 * Set or update a patient's security pattern.
 * Requires MFA or ADMIN auth.
 */
router.post(
  '/:id/pattern',
  requireAuth,
  requireRole('mfa', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const patientId = String(req.params.id);
      const data = setPatternSchema.parse(req.body);
      
      // Hash the SHA-256 with bcrypt for storage
      const bcryptHash = await bcrypt.hash(data.patternHash, 12);
      
      await prisma.patient.update({
        where: { id: patientId },
        data: { securityPattern: bcryptHash },
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.auth?.sessionId || null,
          action: 'PATTERN_SET',
          resource: `patients/${patientId}`,
          ipAddress: clientIp(req),
          userAgent: ua(req),
          metadata: JSON.stringify({ setBy: req.auth?.role }),
        },
      });
      
      res.json({ success: true });
    } catch (err) {
      console.error('[Patients] Set pattern error:', err);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// ─── MFA Certification ─────────────────────────────────────

const certifySchema = z.object({
  insuranceNumber: z.string().min(5),
  birthDate: z.string().min(1),
  patientName: z.string().optional(),
  gender: z.string().optional(),
});

/**
 * POST /api/patients/:sessionId/certify
 * MFA certifies a patient's identity after in-person Ausweis check.
 * Links session to verified patient, generates Patientennummer.
 */
router.post(
  '/:sessionId/certify',
  requireAuth,
  requireRole('mfa', 'admin', 'arzt'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.params.sessionId);
      const data = certifySchema.parse(req.body);
      
      // Find session
      const session = await prisma.patientSession.findUnique({
        where: { id: sessionId },
        include: { patient: true },
      });
      
      if (!session) {
        res.status(404).json({ error: 'Session nicht gefunden' });
        return;
      }
      
      const insuranceHash = hashEmail(data.insuranceNumber);
      const birthDateObj = new Date(data.birthDate);
      
      // Generate next patient number
      const lastPatient = await prisma.patient.findFirst({
        where: { patientNumber: { not: null } },
        orderBy: { patientNumber: 'desc' },
        select: { patientNumber: true },
      });
      
      let nextNum = 10001;
      if (lastPatient?.patientNumber) {
        const match = lastPatient.patientNumber.match(/P-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const patientNumber = `P-${nextNum}`;
      
      // Update patient record
      const patientId = session.patientId;
      if (!patientId) {
        res.status(400).json({ error: 'Session hat keinen Patienten' });
        return;
      }
      
      const userId = req.auth?.sessionId || 'system';
      
      await prisma.patient.update({
        where: { id: patientId },
        data: {
          insuranceNumHash: insuranceHash,
          birthDate: birthDateObj,
          gender: data.gender || session.gender,
          patientNumber,
          verifiedAt: new Date(),
          verifiedBy: userId,
          encryptedName: data.patientName || session.encryptedName,
        },
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PATIENT_CERTIFY',
          resource: `patients/${patientId}`,
          ipAddress: clientIp(req),
          userAgent: ua(req),
          metadata: JSON.stringify({
            sessionId,
            patientNumber,
            certifiedBy: req.auth?.role,
          }),
        },
      });
      
      res.json({
        success: true,
        patientNumber,
        patientId,
      });
    } catch (err) {
      console.error('[Patients] Certify error:', err);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// ─── Get Patient Info (for MFA dashboard) ───────────────────

/**
 * GET /api/patients/:id
 * Get patient details (MFA/Arzt only).
 */
router.get(
  '/:id',
  requireAuth,
  requireRole('mfa', 'admin', 'arzt'),
  async (req: Request, res: Response) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: String(req.params.id) },
        select: {
          id: true,
          patientNumber: true,
          gender: true,
          birthDate: true,
          verifiedAt: true,
          verifiedBy: true,
          createdAt: true,
          _count: { select: { sessions: true } },
        },
      });
      
      if (!patient) {
        res.status(404).json({ error: 'Patient nicht gefunden' });
        return;
      }
      
      res.json(patient);
    } catch (err) {
      console.error('[Patients] Get error:', err);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;
