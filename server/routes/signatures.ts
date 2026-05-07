import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    encryptSignature,
    decryptSignature,
    hashDocument,
    verifyDocumentHash,
    hashIp,
    isValidSignatureData,
} from '../services/signatureService';
import type { AuthPayload } from '../middleware/auth';

/** Extract a route param as a guaranteed string (Express 5 compat) */
function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

const router = Router();

// ─── POST /api/signatures — Neue Unterschrift speichern ─────

const createSignatureSchema = z.object({
    signatureData: z.string().min(100, 'Unterschrift zu kurz'),
    documentHash: z.string().length(64, 'Ungültiger Dokument-Hash'),
    formType: z.enum(['DSGVO', 'BEHANDLUNG', 'AVV', 'VIDEO_CONSENT', 'SONSTIG']),
    documentVersion: z.string().default('1.0'),
    patientId: z.string().optional(),
    sessionId: z.string().optional(),
});

router.post('/', requireAuth, async (req, res) => {
    const auth = (req as any).auth as AuthPayload;
    const parsed = createSignatureSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.issues });
    }

    const { signatureData, documentHash, formType, documentVersion, patientId, sessionId } = parsed.data;

    if (!isValidSignatureData(signatureData)) {
        return res.status(400).json({ error: 'Ungültige Unterschriftsdaten' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
    const signerRole = (['arzt', 'admin'].includes(auth.role) ? 'ARZT' :
        auth.role === 'mfa' ? 'MFA' : 'PATIENT') as any;

    const encryptedSignatureData = encryptSignature(signatureData);
    const ipHash = hashIp(ip);

    const signature = await prisma.signature.create({
        data: {
            patientId: patientId || null,
            sessionId: sessionId || null,
            signerRole,
            formType: formType as any,
            documentVersion,
            documentHash,
            encryptedSignatureData,
            ipHash,
            userAgent,
        },
        select: {
            id: true,
            formType: true,
            signerRole: true,
            documentVersion: true,
            documentHash: true,
            createdAt: true,
        },
    });

    // DSGVO Art. 30: Einwilligungs-Signatur protokollieren
    setImmediate(() => {
        prisma.auditLog.create({
            data: {
                tenantId: auth.tenantId || 'system',
                userId: auth.userId || null,
                action: 'SIGNATURE_CREATED',
                resource: '/api/signatures',
                ipAddress: ip,
                userAgent: userAgent.slice(0, 256),
                metadata: JSON.stringify({
                    signatureId: signature.id,
                    formType: signature.formType,
                    signerRole: signature.signerRole,
                    documentVersion: signature.documentVersion,
                    patientId: patientId || null,
                    sessionId: sessionId || null,
                }),
            },
        }).catch((e: unknown) => console.error('[AuditLog] SIGNATURE_CREATED write failed:', e));
    });

    return res.status(201).json({ success: true, signature });
});

// ─── GET /api/signatures/:id — Einzelne Unterschrift abrufen ─

router.get('/:id', requireAuth, requireRole('arzt', 'admin'), async (req, res) => {
    const signature = await prisma.signature.findUnique({
        where: { id: param(req, 'id') },
    });
    if (!signature) return res.status(404).json({ error: 'Unterschrift nicht gefunden' });

    const { encryptedSignatureData, ...rest } = signature;
    // Decrypt only if explicitly requested via ?decrypt=true
    const result: any = { ...rest };
    if (req.query.decrypt === 'true') {
        try {
            result.signatureData = decryptSignature(encryptedSignatureData);
            // DSGVO Art. 30: Entschlüsselungszugriff auf Einwilligung protokollieren
            setImmediate(() => {
                const auth2 = (req as any).auth as AuthPayload | undefined;
                prisma.auditLog.create({
                    data: {
                        tenantId: auth2?.tenantId || 'system',
                        userId: auth2?.userId || null,
                        action: 'SIGNATURE_DECRYPTED',
                        resource: `/api/signatures/${param(req, 'id')}`,
                        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
                        userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 256),
                        metadata: JSON.stringify({ signatureId: param(req, 'id') }),
                    },
                }).catch((e: unknown) => console.error('[AuditLog] SIGNATURE_DECRYPTED write failed:', e));
            });
        } catch {
            return res.status(500).json({ error: 'Entschlüsselung fehlgeschlagen' });
        }
    }
    return res.json(result);
});

// ─── GET /api/signatures/patient/:patientId ──────────────────

router.get('/patient/:patientId', requireAuth, requireRole('arzt', 'admin'), async (req, res) => {
    const signatures = await prisma.signature.findMany({
        where: { patientId: param(req, 'patientId') },
        select: {
            id: true, formType: true, signerRole: true,
            documentVersion: true, documentHash: true,
            createdAt: true, invalidatedAt: true, invalidationReason: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    return res.json(signatures);
});

// ─── POST /api/signatures/:id/verify — Hash-Verifikation ────

router.post('/:id/verify', requireAuth, async (req, res) => {
    const { documentText } = req.body;
    if (!documentText || typeof documentText !== 'string') {
        return res.status(400).json({ error: 'Dokumenttext erforderlich' });
    }

    const signature = await prisma.signature.findUnique({
        where: { id: param(req, 'id') },
        select: { documentHash: true },
    });
    if (!signature) return res.status(404).json({ error: 'Unterschrift nicht gefunden' });

    const isValid = verifyDocumentHash(documentText, signature.documentHash);
    return res.json({ valid: isValid, computedHash: hashDocument(documentText) });
});

// ─── POST /api/signatures/:id/invalidate — Widerruf ─────────

router.post('/:id/invalidate', requireAuth, requireRole('arzt', 'admin'), async (req, res) => {
    const { reason } = req.body;
    const signature = await prisma.signature.findUnique({ where: { id: param(req, 'id') } });
    if (!signature) return res.status(404).json({ error: 'Unterschrift nicht gefunden' });
    if (signature.invalidatedAt) {
        return res.status(409).json({ error: 'Unterschrift bereits widerrufen' });
    }

    const updated = await prisma.signature.update({
        where: { id: param(req, 'id') },
        data: { invalidatedAt: new Date(), invalidationReason: reason || 'Kein Grund angegeben' },
        select: { id: true, invalidatedAt: true, invalidationReason: true },
    });
    return res.json({ success: true, signature: updated });
});

export default router;
