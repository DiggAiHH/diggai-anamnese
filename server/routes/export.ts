import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { decrypt, isPIIAtom } from '../services/encryption';

const router = Router();

function getEffectiveTenantId(req: Request, res: Response): string | null {
    const requestTenantId = req.tenantId;
    const authTenantId = req.auth?.tenantId;

    if (requestTenantId && authTenantId && requestTenantId !== authTenantId) {
        res.status(403).json({ error: 'Tenant scope violation', code: 'EXPORT_SCOPE_VIOLATION' });
        return null;
    }

    const tenantId = requestTenantId || authTenantId;
    if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required', code: 'TENANT_CONTEXT_REQUIRED' });
        return null;
    }

    return tenantId;
}

function rejectTokenQueryParameter(req: Request, res: Response, next: () => void) {
    if (typeof req.query.token !== 'undefined') {
        return res.status(400).json({ error: 'Token query parameter is not allowed' });
    }

    next();
}

// ─── H-05 FIX: HTML Escaping gegen XSS in PDF-Export ────────
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── H-06 FIX: CSV Injection Prevention ─────────────────────
function escapeCsvValue(str: string): string {
    // Remove formula chars that could be interpreted by Excel
    let safe = str.replace(/;/g, ',').replace(/\n/g, ' ').replace(/\r/g, '');
    // Prefix formula-start characters with a single quote
    if (/^\s*[=+\-@\t\r]/.test(safe)) {
        safe = `'${safe}`;
    }
    return safe;
}

function sanitizeFilenamePart(str: string): string {
    const cleaned = str
        .replace(/[\r\n\t]/g, ' ')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    return cleaned.slice(0, 64) || 'Patient';
}

function buildExportFilename(patientName: string, extension: 'csv' | 'html'): string {
    const date = new Date().toISOString().slice(0, 10);
    const safeName = sanitizeFilenamePart(patientName);
    return `Anamnese_${safeName}_${date}.${extension}`;
}

// ─── Helper: Entschlüsselte Antworten aufbereiten ────────────

interface DecryptedAnswer {
    atomId: string;
    questionText: string;
    section: string;
    value: string;
    answeredAt: Date;
}

interface ExportScopeContext {
    role?: string;
    userId?: string;
    tenantId?: string;
}

class ExportRouteError extends Error {
    public readonly status: number;
    public readonly code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

async function getDecryptedSessionData(sessionId: string, scope?: ExportScopeContext) {
    const session = await prisma.patientSession.findUnique({
        where: { id: sessionId },
        include: {
            answers: { orderBy: { answeredAt: 'asc' } },
            triageEvents: true,
        },
    });

    if (!session) {
        throw new ExportRouteError(404, 'EXPORT_SESSION_NOT_FOUND', 'Session nicht gefunden');
    }

    const effectiveTenantId = scope?.tenantId;
    if (effectiveTenantId && session.tenantId !== effectiveTenantId) {
        throw new ExportRouteError(403, 'EXPORT_SCOPE_VIOLATION', 'Kein Zugriff auf diese Sitzung');
    }

    if (scope?.role === 'arzt' && scope.userId && session.assignedArztId && session.assignedArztId !== scope.userId) {
        throw new ExportRouteError(403, 'EXPORT_SCOPE_VIOLATION', 'Kein Zugriff auf diese Sitzung');
    }

    // Alle Fragen laden für die Texte
    const atoms = await prisma.medicalAtom.findMany();
    const atomMap = new Map(atoms.map(a => [a.id, a]));

    const decryptedAnswers: DecryptedAnswer[] = session.answers.map(a => {
        const atom = atomMap.get(a.atomId);
        let displayValue = a.value;

        // PII-Felder entschlüsseln
        if (isPIIAtom(a.atomId) && a.encryptedValue) {
            try {
                displayValue = decrypt(a.encryptedValue);
            } catch {
                displayValue = '[Entschlüsselung fehlgeschlagen]';
            }
        } else {
            // JSON-Werte auspacken
            try {
                const parsed = JSON.parse(a.value);
                if (typeof parsed === 'object' && parsed.data !== undefined) {
                    displayValue = Array.isArray(parsed.data)
                        ? parsed.data.join(', ')
                        : String(parsed.data);
                } else if (typeof parsed === 'string') {
                    displayValue = parsed;
                } else {
                    displayValue = JSON.stringify(parsed);
                }
            } catch {
                // Kein JSON => Rohwert verwenden
            }
        }

        return {
            atomId: a.atomId,
            questionText: atom?.questionText || `Frage ${a.atomId}`,
            section: atom?.section || 'sonstige',
            value: displayValue,
            answeredAt: a.answeredAt,
        };
    });

    // Entschlüsselten Namen zusammenbauen
    let patientName = 'Unbekannt';
    if (session.encryptedName) {
        try {
            patientName = decrypt(session.encryptedName);
        } catch {
            patientName = '[Name verschlüsselt]';
        }
    }

    return {
        session,
        patientName,
        decryptedAnswers,
        triageEvents: session.triageEvents,
    };
}

// ─── Sektions-Überschriften auf Deutsch ─────────────────────

const SECTION_LABELS: Record<string, string> = {
    'basis': 'Personalien',
    'versicherung': 'Versicherung',
    'adresse': 'Adresse',
    'kontakt': 'Kontaktdaten',
    'beschwerden': 'Aktuelle Beschwerden',
    'koerpermasse': 'Körpermaße',
    'rauchen': 'Raucherstatus',
    'impfungen': 'Impfstatus',
    'familie': 'Familienanamnese',
    'beruf': 'Beruf & Lebensstil',
    'diabetes': 'Diabetes',
    'beeintraechtigung': 'Beeinträchtigungen',
    'implantate': 'Implantate',
    'blutverduenner': 'Blutverdünner',
    'allergien': 'Allergien',
    'gesundheitsstoerungen': 'Gesundheitsstörungen',
    'vorerkrankungen': 'Vorerkrankungen',
    'medikamente-freitext': 'Medikamente',
    'schwangerschaft': 'Schwangerschaft',
    'rezepte': 'Rezeptanfrage',
    'dateien': 'Dokumenten-Upload',
    'au-anfrage': 'AU-Anfrage',
    'ueberweisung': 'Überweisungsanfrage',
    'absage': 'Terminabsage',
    'telefon': 'Telefonanfrage',
    'befund-anforderung': 'Befundanforderung',
    'nachricht': 'Nachricht',
    'abschluss': 'Abschluss',
    'bg-unfall': 'BG-Unfall',
};

// ─── CSV Export ──────────────────────────────────────────────

router.get('/sessions/:id/export/csv', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
    try {
        const tenantId = getEffectiveTenantId(req, res);
        if (!tenantId) return;

        const role = req.auth?.role;
        const userId = req.auth?.userId;
        const { session, patientName, decryptedAnswers, triageEvents } = await getDecryptedSessionData(req.params.id as string, {
            role,
            userId,
            tenantId,
        });

        // BOM für Excel UTF-8 Erkennung
        const BOM = '\uFEFF';
        const SEP = ';';

        const lines: string[] = [];

        // Header
        lines.push(`Anamnese-Bericht${SEP}${SEP}${SEP}`);
        lines.push(`Patient${SEP}${escapeCsvValue(patientName)}${SEP}${SEP}`);
        lines.push(`Geschlecht${SEP}${escapeCsvValue(session.gender || '-')}${SEP}${SEP}`);
        lines.push(`Geburtsdatum${SEP}${escapeCsvValue(session.birthDate ? new Date(session.birthDate).toLocaleDateString('de-DE') : '-')}${SEP}${SEP}`);
        lines.push(`Versicherung${SEP}${escapeCsvValue(session.insuranceType || '-')}${SEP}${SEP}`);
        lines.push(`Anliegen${SEP}${escapeCsvValue(session.selectedService)}${SEP}${SEP}`);
        lines.push(`Status${SEP}${escapeCsvValue(session.status)}${SEP}${SEP}`);
        lines.push(`Erstellt am${SEP}${escapeCsvValue(new Date(session.createdAt).toLocaleString('de-DE'))}${SEP}${SEP}`);
        lines.push(`Exportiert am${SEP}${new Date().toLocaleString('de-DE')}${SEP}${SEP}`);
        lines.push('');
        lines.push(`Sektion${SEP}Frage${SEP}Antwort${SEP}Beantwortet am`);
        lines.push('');

        // Antworten — H-06 FIX: CSV injection prevention
        for (const a of decryptedAnswers) {
            const sectionLabel = SECTION_LABELS[a.section] || a.section;
            const safeQuestion = escapeCsvValue(a.questionText);
            const safeValue = escapeCsvValue(a.value);
            const time = new Date(a.answeredAt).toLocaleString('de-DE');
            lines.push(`${escapeCsvValue(sectionLabel)}${SEP}${safeQuestion}${SEP}${safeValue}${SEP}${time}`);
        }

        // Triage Events
        if (triageEvents.length > 0) {
            lines.push('');
            lines.push(`Triage-Alarme${SEP}${SEP}${SEP}`);
            for (const t of triageEvents) {
                lines.push(`${escapeCsvValue(t.level)}${SEP}${escapeCsvValue(t.message)}${SEP}${escapeCsvValue(`Frage ${t.atomId}`)}${SEP}${escapeCsvValue(new Date(t.createdAt).toLocaleString('de-DE'))}`);
            }
        }

        const csvContent = BOM + lines.join('\r\n');

        // Audit-Log
        await prisma.auditLog.create({
            data: {
                tenantId: req.tenantId || req.auth?.tenantId || 'system',
                userId: req.auth?.userId || null,
                action: 'EXPORT_CSV',
                resource: `sessions/${session.id}`,
                metadata: JSON.stringify({ format: 'csv', sessionId: session.id }),
            },
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(patientName, 'csv')}"`);
        res.send(csvContent);
    } catch (err: unknown) {
        if (err instanceof ExportRouteError) {
            res.status(err.status).json({ error: err.message, code: err.code });
            return;
        }
        console.error('[Export] CSV-Fehler:', err);
        res.status(500).json({ error: 'Export fehlgeschlagen' });
    }
});

// ─── HTML/PDF Export ─────────────────────────────────────────

router.get('/sessions/:id/export/pdf', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
    try {
        const tenantId = getEffectiveTenantId(req, res);
        if (!tenantId) return;

        const role = req.auth?.role;
        const userId = req.auth?.userId;
        const { session, patientName, decryptedAnswers, triageEvents } = await getDecryptedSessionData(req.params.id as string, {
            role,
            userId,
            tenantId,
        });

        // Antworten nach Sektion gruppieren
        const sections = new Map<string, DecryptedAnswer[]>();
        for (const a of decryptedAnswers) {
            const key = a.section;
            if (!sections.has(key)) sections.set(key, []);
            sections.get(key)!.push(a);
        }

        // Triage-HTML — H-05 FIX: escapeHtml for all dynamic values
        let triageHTML = '';
        if (triageEvents.length > 0) {
            triageHTML = `
                <div style="background:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <h3 style="color:#856404;margin:0 0 8px;">⚠ Triage-Alarme</h3>
                    ${triageEvents.map(t => `
                        <p style="margin:4px 0;color:#856404;">
                            <strong>[${escapeHtml(t.level)}]</strong> ${escapeHtml(t.message)} 
                            <small>(Frage ${escapeHtml(t.atomId)}, ${new Date(t.createdAt).toLocaleString('de-DE')})</small>
                        </p>
                    `).join('')}
                </div>`;
        }

        // Sektionen-HTML — H-05 FIX: escapeHtml for all dynamic values
        let sectionsHTML = '';
        Array.from(sections.entries()).forEach(([sectionKey, answers]) => {
            const label = escapeHtml(SECTION_LABELS[sectionKey] || sectionKey);
            sectionsHTML += `
                <div style="margin-bottom:20px;">
                    <h3 style="background:#f0f4f8;padding:8px 12px;border-radius:6px;font-size:14px;color:#1a365d;margin:0 0 8px;border-left:4px solid #3182ce;">
                        ${label}
                    </h3>
                    <table style="width:100%;border-collapse:collapse;font-size:12px;">
                        ${answers.map(a => `
                            <tr style="border-bottom:1px solid #e2e8f0;">
                                <td style="padding:6px 8px;color:#4a5568;width:50%;vertical-align:top;">${escapeHtml(a.questionText)}</td>
                                <td style="padding:6px 8px;color:#1a202c;font-weight:500;">${escapeHtml(a.value || '-')}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>`;
        });

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Anamnese-Bericht – ${escapeHtml(patientName)}</title>
    <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; line-height: 1.5; font-size: 12px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 20px; }
        .header-left h1 { font-size: 20px; color: #2b6cb0; margin: 0; }
        .header-left p { color: #718096; font-size: 11px; margin: 2px 0 0; }
        .header-right { text-align: right; font-size: 11px; color: #718096; }
        .patient-card { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #ebf8ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bee3f8; }
        .patient-card dt { color: #2c5282; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .patient-card dd { margin: 0 0 8px; color: #1a365d; font-weight: 500; }
        .footer { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 16px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
        .sig-line { width: 200px; border-top: 1px solid #1a202c; padding-top: 4px; font-size: 10px; color: #718096; text-align: center; }
        .dsgvo { font-size: 9px; color: #a0aec0; margin-top: 20px; line-height: 1.4; }
        @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>📋 Anamnese-Bericht</h1>
            <p>Medizinische Patientenaufnahme</p>
        </div>
        <div class="header-right">
            <p><strong>Referenz:</strong> ${session.id.slice(0, 12)}</p>
            <p><strong>Erstellt:</strong> ${new Date(session.createdAt).toLocaleString('de-DE')}</p>
            <p><strong>Exportiert:</strong> ${new Date().toLocaleString('de-DE')}</p>
        </div>
    </div>

    <div class="patient-card">
        <div><dt>Patient</dt><dd>${escapeHtml(patientName)}</dd></div>
        <div><dt>Geschlecht</dt><dd>${session.gender === 'M' ? 'Männlich' : session.gender === 'W' ? 'Weiblich' : escapeHtml(session.gender || '-')}</dd></div>
        <div><dt>Geburtsdatum</dt><dd>${session.birthDate ? new Date(session.birthDate).toLocaleDateString('de-DE') : '-'}</dd></div>
        <div><dt>Versicherung</dt><dd>${escapeHtml(session.insuranceType || '-')}</dd></div>
        <div><dt>Anliegen</dt><dd>${escapeHtml(session.selectedService)}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(session.status)}</dd></div>
    </div>

    ${triageHTML}

    ${sectionsHTML}

    <div class="footer">
        <div class="signatures">
            <div class="sig-line">Patient / Datum</div>
            <div class="sig-line">Arzt / Datum</div>
        </div>
        <p class="dsgvo">
            Dieses Dokument enthält vertrauliche medizinische Daten gemäß Art. 9 DSGVO. 
            Die Verarbeitung erfolgt auf Grundlage der Einwilligung des Patienten (Art. 6 Abs. 1 lit. a, Art. 9 Abs. 2 lit. a DSGVO) 
            sowie zur Erfüllung des Behandlungsvertrags. Aufbewahrungspflicht gemäß § 630f BGB: 10 Jahre.
            Unbefugte Weitergabe ist strafbar (§ 203 StGB).
        </p>
    </div>
</body>
</html>`;

        // Audit-Log
        await prisma.auditLog.create({
            data: {
                tenantId: req.tenantId || req.auth?.tenantId || 'system',
                userId: req.auth?.userId || null,
                action: 'EXPORT_PDF',
                resource: `sessions/${session.id}`,
                metadata: JSON.stringify({ format: 'pdf', sessionId: session.id }),
            },
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${buildExportFilename(patientName, 'html')}"`);
        res.send(html);
    } catch (err: unknown) {
        if (err instanceof ExportRouteError) {
            res.status(err.status).json({ error: err.message, code: err.code });
            return;
        }
        console.error('[Export] PDF-Fehler:', err);
        res.status(500).json({ error: 'Export fehlgeschlagen' });
    }
});

// ─── JSON Export (raw decrypted data) ─────────────────────────

router.get('/sessions/:id/export/json', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
    try {
        const tenantId = getEffectiveTenantId(req, res);
        if (!tenantId) return;

        const role = req.auth?.role;
        const userId = req.auth?.userId;
        const data = await getDecryptedSessionData(req.params.id as string, {
            role,
            userId,
            tenantId,
        });

        await prisma.auditLog.create({
            data: {
                tenantId: req.tenantId || req.auth?.tenantId || 'system',
                userId: req.auth?.userId || null,
                action: 'EXPORT_JSON',
                resource: `sessions/${data.session.id}`,
                metadata: JSON.stringify({ format: 'json' }),
            },
        });

        res.json({
            patient: {
                name: data.patientName,
                gender: data.session.gender,
                birthDate: data.session.birthDate,
                insuranceType: data.session.insuranceType,
            },
            service: data.session.selectedService,
            status: data.session.status,
            createdAt: data.session.createdAt,
            completedAt: data.session.completedAt,
            answers: data.decryptedAnswers,
            triageEvents: data.triageEvents,
            exportedAt: new Date(),
        });
    } catch (err: unknown) {
        if (err instanceof ExportRouteError) {
            res.status(err.status).json({ error: err.message, code: err.code });
            return;
        }
        console.error('[Export] JSON-Fehler:', err);
        res.status(500).json({ error: 'Export fehlgeschlagen' });
    }
});

export default router;
