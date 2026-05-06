/**
 * server/routes/registration-confirmation.ts
 *
 * API-Route für die Capture-Anmeldebestätigung als PDF.
 * Aufrufer ist der Patient nach Abschluss des Capture-Workflows.
 *
 * REGULATORY GUARD (Klasse-I-Schutz):
 *   - Diese Route bedient ausschließlich administrative Inhalte
 *   - Generiert das PDF aus reinen Stammdaten + Termin + DSGVO-Konsent
 *   - KEINE klinischen Empfehlungen, KEINE Diagnose-Aussagen
 *   - validateNoClinicalFields-Guard im Service-Layer
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.6 + §3.2
 *
 * Endpoints:
 *   POST /api/registration/confirmation/:sessionId/preview  — PDF-Stream zum Anzeigen
 *   POST /api/registration/confirmation/:sessionId/email    — PDF + Mail an Patient
 */

import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { generateAnmeldebestaetigung, type AnmeldebestaetigungInput } from '../services/pdf/anmeldebestaetigung';

function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

const router = Router();

/**
 * Request-Schema. Erlaubte Felder sind ALLE administrativ.
 * Klinische Felder werden vom Service-Layer (validateNoClinicalFields) abgewiesen.
 */
const previewSchema = z.object({
    praxisName: z.string().min(2).max(200),
    praxisAdresse: z.string().min(5).max(500),
    praxisTelefon: z.string().max(50).optional(),
    praxisEmail: z.string().email().max(200).optional(),
    patientFullName: z.string().min(2).max(200),
    terminDatum: z.string().datetime(),
    dsgvoZeitstempel: z.string().datetime(),
    language: z.enum(['de', 'en']).default('de'),
});

// ─── POST /api/registration/confirmation/:sessionId/preview ───
//
// Generiert das PDF und liefert es als Stream zum Anzeigen / Download.
// Patient-facing Endpoint — kein Auth (Session-ID validiert Zugriff).

router.post('/:sessionId/preview', async (req, res) => {
    const sessionId = param(req, 'sessionId');

    if (!sessionId || sessionId.length < 5 || sessionId.length > 100) {
        return res.status(400).json({ error: 'Ungültige Session-ID' });
    }

    // Verifikation dass Session existiert und nicht expired
    const session = await prisma.patientSession.findUnique({
        where: { id: sessionId },
        select: { id: true, createdAt: true },
    });

    if (!session) {
        return res.status(404).json({ error: 'Session nicht gefunden' });
    }

    // Session-Alter-Limit: max 7 Tage (Anmeldebestätigung darf nur kurz nach Anmeldung)
    const ageMs = Date.now() - session.createdAt.getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
        return res.status(410).json({ error: 'Session abgelaufen' });
    }

    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.issues });
    }

    const data = parsed.data;
    const input: AnmeldebestaetigungInput = {
        praxisName: data.praxisName,
        praxisAdresse: data.praxisAdresse,
        praxisTelefon: data.praxisTelefon,
        praxisEmail: data.praxisEmail,
        patientFullName: data.patientFullName,
        terminDatum: new Date(data.terminDatum),
        anmeldeId: `A-${session.id.slice(0, 8).toUpperCase()}`,
        dsgvoZeitstempel: new Date(data.dsgvoZeitstempel),
        language: data.language,
    };

    try {
        const pdfBuffer = await generateAnmeldebestaetigung(input);

        // Audit-Log: kein Patient-Klarname, nur Session-ID
        // eslint-disable-next-line no-console
        console.log(`[registration-confirmation] PDF generated session=${session.id} bytes=${pdfBuffer.length} lang=${data.language}`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="anmeldebestaetigung-${session.id.slice(0, 8)}.pdf"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
        // eslint-disable-next-line no-console
        console.error(`[registration-confirmation] generation failed session=${session.id} err=${msg}`);

        // Forbidden-Field-Errors aus dem Service: 422 Unprocessable Entity
        if (msg.includes('Forbidden clinical field')) {
            return res.status(422).json({
                error: 'Klinische Felder in administrativem Endpoint nicht erlaubt',
                detail: msg,
                hint: 'Klinische Daten gehören nach packages/suite/, nicht in Capture.',
            });
        }
        return res.status(500).json({ error: 'PDF-Erstellung fehlgeschlagen' });
    }
});

// ─── GET /api/registration/confirmation/health ────────────────
//
// Health-Endpoint für den Smoke-Test, prüft dass der PDF-Service ladbar ist.

router.get('/health', async (_req, res) => {
    try {
        const dummy: AnmeldebestaetigungInput = {
            praxisName: 'Test',
            praxisAdresse: 'Teststraße 1\n12345 Teststadt',
            patientFullName: 'Max Muster',
            terminDatum: new Date(Date.now() + 86_400_000),
            anmeldeId: 'HEALTHCHECK',
            dsgvoZeitstempel: new Date(),
            language: 'de',
        };
        const buf = await generateAnmeldebestaetigung(dummy);
        return res.json({
            status: 'ok',
            module: 'registration-confirmation',
            pdfBytes: buf.length,
            classification: 'class-I-administrative',
        });
    } catch (err) {
        return res.status(500).json({
            status: 'error',
            module: 'registration-confirmation',
            error: err instanceof Error ? err.message : String(err),
        });
    }
});

export default router;
