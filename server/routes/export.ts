import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { config } from '../config';
import { requireAuth, requireRole } from '../middleware/auth';
import { buildCcdXml } from '../services/export/ccd.service';
import { sendPackageLinkEmail } from '../services/export/package-mail.service';
import { PackageError, consumeSecureExportLink, createEncryptedPackage, createSecureExportLink } from '../services/export/package.service';
import { renderSessionPdf } from '../services/export/pdf.service';
import {
  ExportAccessError,
  buildExportFilename,
  escapeCsvValue,
  getNormalizedSessionExport,
  renderTxtExport,
} from '../services/export/session-export.service';

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

function buildStaffScope(req: Request, res: Response) {
  const tenantId = getEffectiveTenantId(req, res);
  if (!tenantId) return null;

  return {
    role: req.auth?.role,
    userId: req.auth?.userId,
    tenantId,
  };
}

function buildFlexibleScope(req: Request, res: Response) {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentifizierung erforderlich' });
    return null;
  }

  if (req.auth.role === 'patient') {
    return {
      role: req.auth.role,
      sessionId: req.auth.sessionId,
    };
  }

  const tenantId = getEffectiveTenantId(req, res);
  if (!tenantId) return null;

  return {
    role: req.auth.role,
    userId: req.auth.userId,
    tenantId,
    sessionId: req.auth.sessionId,
  };
}

async function writeAuditLog(params: {
  tenantId: string;
  userId?: string | null;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId || null,
      action: params.action,
      resource: params.resource,
      metadata: JSON.stringify(params.metadata),
    },
  });
}

function handleExportError(res: Response, err: unknown, label: string) {
  if (err instanceof ExportAccessError || err instanceof PackageError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Ungültige Anfragedaten', code: 'EXPORT_VALIDATION_ERROR' });
    return;
  }

  console.error(label, err);
  res.status(500).json({ error: 'Export fehlgeschlagen' });
}

function buildApiBaseUrl(req: Request): string {
  const configured = config.apiPublicUrl.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  return `${req.protocol}://${req.get('host')}/api`;
}

function getRequestIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return req.ip || null;
}

async function getTenantName(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  return tenant?.name || 'Ihre Praxis';
}

router.get('/sessions/:id/export/csv', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
  try {
    const scope = buildStaffScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    const separator = ';';
    const lines: string[] = [];

    lines.push(`Anamnese-Bericht${separator}${separator}${separator}`);
    lines.push(`Patient${separator}${escapeCsvValue(data.patient.name)}${separator}${separator}`);
    lines.push(`Geschlecht${separator}${escapeCsvValue(data.patient.gender || '-')}${separator}${separator}`);
    lines.push(`Geburtsdatum${separator}${escapeCsvValue(data.patient.birthDate ? new Date(data.patient.birthDate).toLocaleDateString('de-DE') : '-')}${separator}${separator}`);
    lines.push(`Versicherung${separator}${escapeCsvValue(data.patient.insuranceType || '-')}${separator}${separator}`);
    lines.push(`Anliegen${separator}${escapeCsvValue(data.service)}${separator}${separator}`);
    lines.push(`Status${separator}${escapeCsvValue(data.status)}${separator}${separator}`);
    lines.push(`Erstellt am${separator}${escapeCsvValue(new Date(data.createdAt).toLocaleString('de-DE'))}${separator}${separator}`);
    lines.push(`Exportiert am${separator}${new Date().toLocaleString('de-DE')}${separator}${separator}`);
    lines.push('');
    lines.push(`Sektion${separator}Frage${separator}Antwort${separator}Beantwortet am`);
    lines.push('');

    for (const answer of data.answers) {
      lines.push([
        escapeCsvValue(answer.section),
        escapeCsvValue(answer.questionText),
        escapeCsvValue(answer.displayValue),
        escapeCsvValue(new Date(answer.answeredAt).toLocaleString('de-DE')),
      ].join(separator));
    }

    if (data.triageEvents.length > 0) {
      lines.push('');
      lines.push(`Triage-Alarme${separator}${separator}${separator}`);
      for (const event of data.triageEvents) {
        lines.push([
          escapeCsvValue(event.level),
          escapeCsvValue(event.message),
          escapeCsvValue(`Frage ${event.atomId}`),
          escapeCsvValue(new Date(event.createdAt).toLocaleString('de-DE')),
        ].join(separator));
      }
    }

    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_CSV',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'csv', sessionId: data.sessionId },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(data.patient.name, 'csv')}"`);
    res.send(`\uFEFF${lines.join('\r\n')}`);
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] CSV-Fehler:');
  }
});

router.get('/sessions/:id/export/txt', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
  try {
    const scope = buildStaffScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_TXT',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'txt', sessionId: data.sessionId },
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(data.patient.name, 'txt')}"`);
    res.send(renderTxtExport(data));
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] TXT-Fehler:');
  }
});

router.get('/sessions/:id/export/pdf', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
  try {
    const scope = buildStaffScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    const pdfBuffer = await renderSessionPdf(data);

    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_PDF',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'pdf', sessionId: data.sessionId },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(data.patient.name, 'pdf')}"`);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] PDF-Fehler:');
  }
});

router.get('/sessions/:id/export/json', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin'), async (req: Request, res: Response) => {
  try {
    const scope = buildStaffScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_JSON',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'json', sessionId: data.sessionId },
    });

    res.json({
      patient: data.patient,
      patientEmail: data.patientEmail,
      service: data.service,
      status: data.status,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      answers: data.answers.map((answer) => ({
        atomId: answer.atomId,
        questionText: answer.questionText,
        section: answer.section,
        value: answer.rawValue,
        displayValue: answer.displayValue,
        answeredAt: answer.answeredAt,
      })),
      triageEvents: data.triageEvents,
      exportedAt: new Date(),
    });
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] JSON-Fehler:');
  }
});

router.get('/sessions/:id/package', rejectTokenQueryParameter, requireAuth, async (req: Request, res: Response) => {
  try {
    const scope = buildFlexibleScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    const result = await createEncryptedPackage(data);

    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_PACKAGE',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'secure-package', sessionId: data.sessionId, packageId: result.package.packageId },
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(data.patient.name, 'secure.json')}"`);
    res.send(JSON.stringify(result.package, null, 2));
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] Package-Fehler:');
  }
});

router.post('/sessions/:id/package-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const scope = buildFlexibleScope(req, res);
    if (!scope) return;

    const body = z.object({
      email: z.string().email().optional().nullable(),
    }).parse(req.body || {});
    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    const recipientEmail = body.email?.trim() || data.patientEmail;

    if (!recipientEmail) {
      res.status(400).json({ error: 'Für diese Sitzung ist keine Patienten-E-Mail verfügbar', code: 'PACKAGE_EMAIL_REQUIRED' });
      return;
    }

    const secureLink = await createSecureExportLink({
      tenantId: data.tenantId,
      sessionId: data.sessionId,
      recipientEmail,
    });
    const downloadUrl = `${buildApiBaseUrl(req)}/export/download/${secureLink.token}`;
    const practiceName = await getTenantName(data.tenantId);
    const mailResult = await sendPackageLinkEmail({
      recipientEmail,
      practiceName,
      downloadUrl,
      expiresAt: secureLink.expiresAt,
    });

    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_PACKAGE_LINK',
      resource: `sessions/${data.sessionId}`,
      metadata: {
        packageId: secureLink.packageId,
        sessionId: data.sessionId,
        sent: mailResult.sent,
      },
    });

    res.json({
      success: true,
      sent: mailResult.sent,
      expiresAt: secureLink.expiresAt.toISOString(),
      packageId: secureLink.packageId,
      mailtoUrl: mailResult.mailtoUrl,
    });
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] Package-Link-Fehler:');
  }
});

router.get('/download/:token', async (req: Request, res: Response) => {
  try {
    const secureLink = await consumeSecureExportLink(req.params.token as string, getRequestIp(req));
    const data = await getNormalizedSessionExport(secureLink.sessionId, { tenantId: secureLink.tenantId });
    const result = await createEncryptedPackage(data, { packageId: secureLink.packageId });

    await writeAuditLog({
      tenantId: secureLink.tenantId,
      action: 'EXPORT_PACKAGE_DOWNLOAD',
      resource: `sessions/${secureLink.sessionId}`,
      metadata: {
        packageId: secureLink.packageId,
        sessionId: secureLink.sessionId,
      },
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(data.patient.name, 'secure.json')}"`);
    res.send(JSON.stringify(result.package, null, 2));
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] Download-Link-Fehler:');
  }
});

router.get('/sessions/:id/export/ccd', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
  try {
    const scope = buildStaffScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    const ccdXml = buildCcdXml({
      sessionId: data.sessionId,
      patientName: data.patient.name,
      gender: data.patient.gender,
      birthDate: data.patient.birthDate,
      insuranceType: data.patient.insuranceType,
      selectedService: data.service,
      status: data.status,
      createdAt: data.createdAt,
      exportedAt: new Date(),
      answers: data.answers.map((answer) => ({
        atomId: answer.atomId,
        questionText: answer.questionText,
        section: answer.section,
        value: answer.displayValue,
        answeredAt: answer.answeredAt,
      })),
      triageEvents: data.triageEvents,
    });

    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_CCD',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'ccd-cda', sessionId: data.sessionId },
    });

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildExportFilename(data.patient.name, 'xml')}"`);
    res.send(ccdXml);
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] CCD-Fehler:');
  }
});

router.get('/sessions/:id/export/fhir', rejectTokenQueryParameter, requireAuth, requireRole('arzt', 'admin', 'mfa'), async (req: Request, res: Response) => {
  try {
    const scope = buildStaffScope(req, res);
    if (!scope) return;

    const data = await getNormalizedSessionExport(req.params.id as string, scope);
    const rawSession = await prisma.patientSession.findUnique({
      where: { id: req.params.id as string },
      include: { answers: true, patient: true },
    });

    const patient = rawSession?.patient ?? null;
    const sessionTimestamp = new Date(data.createdAt).toISOString();
    const patientRef = patient ? `Patient/${patient.id}` : `Patient/anonymous-${data.sessionId.slice(0, 8)}`;
    const requestedProfile = typeof req.query.profile === 'string' ? req.query.profile : 'standard';

    const bundleEntries: Array<{ resource: Record<string, unknown> }> = [];

    bundleEntries.push({
      resource: {
        resourceType: 'Patient',
        id: patient?.id ?? `anon-${data.sessionId.slice(0, 8)}`,
        identifier: [
          { system: 'https://diggai.de/sid/patient-id', value: patient?.id ?? data.sessionId },
          patient?.patientNumber
            ? { system: 'https://diggai.de/sid/patient-number', value: patient.patientNumber }
            : null,
        ].filter(Boolean),
        birthDate: data.patient.birthDate ? new Date(data.patient.birthDate).toISOString().split('T')[0] : undefined,
        gender: data.patient.gender === 'M' ? 'male' : data.patient.gender === 'W' ? 'female' : 'unknown',
      },
    });

    bundleEntries.push({
      resource: {
        resourceType: 'Encounter',
        id: data.sessionId,
        status: data.status === 'COMPLETED' ? 'finished' : 'in-progress',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        subject: { reference: patientRef },
        reasonCode: [{ text: data.service }],
        period: {
          start: sessionTimestamp,
          end: data.completedAt ? new Date(data.completedAt).toISOString() : undefined,
        },
      },
    });

    bundleEntries.push({
      resource: {
        resourceType: 'QuestionnaireResponse',
        id: `qr-${data.sessionId}`,
        status: 'completed',
        subject: { reference: patientRef },
        encounter: { reference: `Encounter/${data.sessionId}` },
        authored: sessionTimestamp,
        item: data.answers.map((answer) => ({
          linkId: answer.atomId,
          text: answer.questionText,
          answer: [{ valueString: answer.displayValue }],
        })),
      },
    });

    for (let index = 0; index < data.triageEvents.length; index += 1) {
      const event = data.triageEvents[index];
      bundleEntries.push({
        resource: {
          resourceType: 'Flag',
          id: `flag-${index}-${data.sessionId}`,
          status: 'active',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/flag-category', code: 'clinical' }] }],
          code: { text: `[${event.level}] ${event.message}` },
          subject: { reference: patientRef },
          period: { start: new Date(event.createdAt).toISOString() },
        },
      });
    }

    if (requestedProfile === 'nephrology') {
      const { buildNephrologyResources, extractNephrologyData } = await import('../services/fhir/NephrologyProfile');
      const rawAnswers = rawSession?.answers?.map((answer) => ({ atomId: answer.atomId, value: answer.value })) ?? [];
      const nephrologyData = extractNephrologyData(patientRef, rawAnswers);
      for (const resource of buildNephrologyResources(nephrologyData)) {
        bundleEntries.push({ resource: resource as unknown as Record<string, unknown> });
      }
    }

    await writeAuditLog({
      tenantId: data.tenantId,
      userId: req.auth?.userId,
      action: 'EXPORT_FHIR',
      resource: `sessions/${data.sessionId}`,
      metadata: { format: 'fhir-r4', sessionId: data.sessionId, profile: requestedProfile },
    });

    res.setHeader('Content-Type', 'application/fhir+json');
    res.json({
      resourceType: 'Bundle',
      id: `export-${data.sessionId}`,
      type: 'document',
      timestamp: new Date().toISOString(),
      meta: {
        source: 'https://diggai.de/anamnese',
        tag: [{ system: 'https://diggai.de/tag', code: 'anamnese-export' }],
      },
      entry: bundleEntries,
    });
  } catch (err: unknown) {
    handleExportError(res, err, '[Export] FHIR-Fehler:');
  }
});

export default router;
