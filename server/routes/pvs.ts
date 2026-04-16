// ============================================
// PVS Routes â€” /api/pvs/*
// 20 Endpunkte: Connection, Transfer, Mapping, Patient-Link
// ============================================

import { Router } from 'express';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { extname, normalize, resolve, sep } from 'path';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getPrismaClientForDomain } from '../db.js';
import { pvsRouter } from '../services/pvs/pvs-router.service.js';
import { countExportFields } from '../services/pvs/mapping-engine.js';
import { pvsDetectionService } from '../services/pvs/auto-config/index.js';
import { smartSyncService } from '../services/pvs/sync/index.js';
import { tomedoLauscher } from '../services/pvs/tomedo-lauscher.service.js';
import { processVersand } from '../services/export/versand.service.js';
import { createTomedoApiClient } from '../services/pvs/tomedo-api.client.js';
import type { PvsConnectionData, PatientSessionFull } from '../services/pvs/types.js';

const router = Router();
const prisma: any = getPrismaClientForDomain('authority');
const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

function isUploadPathSecure(filepath: string): boolean {
  const normalized = normalize(filepath);
  return normalized.startsWith(UPLOAD_DIR + sep);
}

function detectMimeType(filename: string): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  const ext = extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return null;
}

function getEffectiveTenantId(req: any, res: any): string | null {
  const authTenantId = req.auth?.tenantId as string | undefined;
  const requestTenantId = req.tenantId as string | undefined;

  if (requestTenantId && authTenantId && requestTenantId !== authTenantId) {
    res.status(403).json({
      error: 'Tenant scope violation',
      code: 'PVS_SCOPE_VIOLATION',
    });
    return null;
  }

  const tenantId = requestTenantId || authTenantId;
  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant context required',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    return null;
  }

  return tenantId;
}

async function findActiveConnectionsForTenant(tenantId: string) {
  return prisma.pvsConnection.findMany({
    where: { isActive: true, praxisId: tenantId },
    include: { _count: { select: { transferLogs: true, fieldMappings: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function findActiveConnectionForTenant(tenantId: string) {
  return prisma.pvsConnection.findFirst({
    where: { isActive: true, praxisId: tenantId },
  });
}

async function findConnectionByIdForTenant(id: string, tenantId: string) {
  return prisma.pvsConnection.findFirst({
    where: {
      id,
      praxisId: tenantId,
    },
  });
}

type HybridExportProtocol = 'GDT' | 'FHIR';

type ExportTarget = {
  protocol: HybridExportProtocol;
  connection: PvsConnectionData;
  isShadow: boolean;
};

type ExportPlan = {
  targets: ExportTarget[];
  warnings: string[];
  hybridRequested: boolean;
};

function normalizeProtocol(protocol: unknown): HybridExportProtocol | null {
  if (protocol === 'GDT' || protocol === 'FHIR') {
    return protocol;
  }
  return null;
}

function parseHybridRequested(body: any): boolean {
  const mode = typeof body?.mode === 'string' ? body.mode.trim().toUpperCase() : '';
  if (mode === 'HYBRID') {
    return true;
  }

  if (typeof body?.hybrid === 'boolean') {
    return body.hybrid;
  }

  if (typeof body?.hybrid === 'string') {
    const value = body.hybrid.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  return false;
}

function parseRequestedProtocols(body: any): HybridExportProtocol[] {
  const protocols = new Set<HybridExportProtocol>();
  const channels = Array.isArray(body?.channels) ? body.channels : [];

  for (const channel of channels) {
    const normalized = normalizeProtocol(typeof channel === 'string' ? channel.trim().toUpperCase() : null);
    if (normalized) {
      protocols.add(normalized);
    }
  }

  if (Array.isArray(body?.protocols)) {
    for (const protocol of body.protocols) {
      const normalized = normalizeProtocol(typeof protocol === 'string' ? protocol.trim().toUpperCase() : null);
      if (normalized) {
        protocols.add(normalized);
      }
    }
  }

  return Array.from(protocols);
}

function buildShadowConnection(base: PvsConnectionData, protocol: HybridExportProtocol): PvsConnectionData | null {
  if (protocol === 'GDT') {
    if (!base.gdtExportDir) {
      return null;
    }

    return {
      ...base,
      id: `${base.id}-hybrid-gdt`,
      protocol: 'GDT',
      pvsType: base.pvsType === 'TOMEDO' || base.pvsType === 'FHIR_GENERIC' ? 'CGM_M1' : base.pvsType,
    };
  }

  if (!base.fhirBaseUrl) {
    return null;
  }

  return {
    ...base,
    id: `${base.id}-hybrid-fhir`,
    protocol: 'FHIR',
    pvsType: base.pvsType === 'TOMEDO' ? 'TOMEDO' : 'FHIR_GENERIC',
  };
}

function buildExportPlan(connection: PvsConnectionData, body: any): ExportPlan {
  const warnings: string[] = [];
  const baseProtocol = normalizeProtocol(connection.protocol);
  const requestedProtocols = parseRequestedProtocols(body);
  const hybridRequested = parseHybridRequested(body);

  if (hybridRequested) {
    requestedProtocols.push('FHIR', 'GDT');
  }

  const dedupedProtocols = Array.from(new Set(requestedProtocols));

  if (dedupedProtocols.length === 0 && baseProtocol) {
    dedupedProtocols.push(baseProtocol);
  }

  if (dedupedProtocols.length === 0) {
    warnings.push('Weder FHIR noch GDT angefordert; Standard-Export wird verwendet.');
    dedupedProtocols.push('GDT');
  }

  const orderedProtocols = [...dedupedProtocols].sort((left, right) => {
    if (left === baseProtocol) return -1;
    if (right === baseProtocol) return 1;
    return 0;
  });

  const targets: ExportTarget[] = [];

  for (const protocol of orderedProtocols) {
    if (protocol === baseProtocol) {
      targets.push({ protocol, connection, isShadow: false });
      continue;
    }

    const shadowConnection = buildShadowConnection(connection, protocol);
    if (!shadowConnection) {
      warnings.push(`Hybrid-Protokoll ${protocol} wurde angefordert, aber Konfiguration fehlt.`);
      continue;
    }

    targets.push({ protocol, connection: shadowConnection, isShadow: true });
  }

  if (targets.length === 0) {
    targets.push({
      protocol: baseProtocol || 'GDT',
      connection,
      isShadow: false,
    });
    warnings.push('Fallback auf primäre PVS-Konfiguration durchgeführt.');
  }

  return {
    targets,
    warnings,
    hybridRequested,
  };
}

function resolveVersandChannels(
  body: any,
  successfulProtocols: HybridExportProtocol[],
): {
  channels: Array<'EMAIL' | 'PRINT' | 'NFC' | 'PVS' | 'GDT' | 'FHIR'>;
  droppedProtocolChannels: HybridExportProtocol[];
} {
  const allowed = new Set(['EMAIL', 'PRINT', 'NFC', 'PVS', 'GDT', 'FHIR']);
  const requested = Array.isArray(body?.channels) ? body.channels : [];
  const successfulProtocolSet = new Set(successfulProtocols);
  const droppedProtocolChannels = new Set<HybridExportProtocol>();

  const channels = new Set<string>(['PVS']);
  for (const protocol of successfulProtocols) {
    channels.add(protocol);
  }

  for (const channel of requested) {
    if (typeof channel !== 'string') continue;
    const normalized = channel.trim().toUpperCase();
    if (normalized === 'FHIR' || normalized === 'GDT') {
      if (successfulProtocolSet.has(normalized)) {
        channels.add(normalized);
      } else {
        droppedProtocolChannels.add(normalized);
      }
      continue;
    }

    if (allowed.has(normalized)) {
      channels.add(normalized);
    }
  }

  return {
    channels: Array.from(channels) as Array<'EMAIL' | 'PRINT' | 'NFC' | 'PVS' | 'GDT' | 'FHIR'>,
    droppedProtocolChannels: Array.from(droppedProtocolChannels),
  };
}

const importPatientSchema = z.object({
  pvsPatientId: z.string().min(1),
  source: z.enum(['manual', 'tomedo-status']).default('manual'),
  statusEventId: z.string().optional(),
  connectionId: z.string().optional(),
  force: z.boolean().default(false),
}).superRefine((payload, ctx) => {
  if (payload.source === 'tomedo-status' && !payload.statusEventId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['statusEventId'],
      message: 'statusEventId ist für Tomedo-Statusimport erforderlich',
    });
  }
});

// â”€â”€â”€ 1-6: PVS Connection CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// 1. GET /connection â€” Aktive PVS-Verbindung abrufen
router.get('/connection', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const tenantId = getEffectiveTenantId(_req, res);
    if (!tenantId) return;

    const connections = await findActiveConnectionsForTenant(tenantId);
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: 'Verbindungen konnten nicht geladen werden' });
  }
});

// 2. POST /connection â€” PVS-Verbindung konfigurieren
const createConnectionSchema = z.object({
  pvsType: z.enum(['CGM_M1', 'MEDATIXX', 'MEDISTAR', 'T2MED', 'X_ISYNET', 'DOCTOLIB', 'TURBOMED', 'FHIR_GENERIC', 'ALBIS', 'TOMEDO', 'MEDISTAR', 'T2MED', 'X_ISYNET']),
  protocol: z.enum(['GDT', 'BDT', 'FHIR', 'REST', 'KIM']).default('GDT'),
  pvsVersion: z.string().optional(),
  gdtImportDir: z.string().optional(),
  gdtExportDir: z.string().optional(),
  gdtFilePattern: z.string().default('*.gdt'),
  gdtEncoding: z.string().default('ISO-8859-15'),
  gdtSenderId: z.string().optional(),
  gdtReceiverId: z.string().optional(),
  fhirBaseUrl: z.string().url().optional(),
  fhirAuthType: z.enum(['basic', 'oauth2', 'apikey']).optional(),
  fhirCredentials: z.string().optional(),
  fhirTenantId: z.string().optional(),
  kimAddress: z.string().optional(),
  kimSmtpHost: z.string().optional(),
  kimSmtpPort: z.number().optional(),
  syncIntervalSec: z.number().min(5).default(30),
  autoMapFields: z.boolean().default(true),
});

router.post('/connection', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const data = createConnectionSchema.parse(req.body);
    const praxisId = tenantId;

    const connection = await prisma.pvsConnection.upsert({
      where: { praxisId },
      update: { ...data, updatedAt: new Date() },
      create: { ...data, praxisId },
    });

    // Test connection
    const connData = connection as unknown as PvsConnectionData;
    const testResult = await pvsRouter.testConnection(connData).catch(err => ({
      ok: false,
      message: (err as Error).message,
    }));

    res.status(201).json({ ...connection, testResult });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }
    res.status(500).json({ error: 'Verbindung konnte nicht erstellt werden' });
  }
});

// 3. PUT /connection/:id â€” Verbindung aktualisieren
router.put('/connection/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const scopedConnection = await findConnectionByIdForTenant(id, tenantId);
    if (!scopedConnection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const data = createConnectionSchema.partial().parse(req.body);
    const connection = await prisma.pvsConnection.update({
      where: { id: scopedConnection.id },
      data: { ...data, updatedAt: new Date() },
    });

    // Remove cached adapter so it re-initializes
    await pvsRouter.removeAdapter(id);

    res.json(connection);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }
    res.status(500).json({ error: 'Verbindung konnte nicht aktualisiert werden' });
  }
});

// 4. POST /connection/:id/test â€” Verbindung testen
router.post('/connection/:id/test', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const connection = await findConnectionByIdForTenant(id, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const connData = connection as unknown as PvsConnectionData;
    const result = await pvsRouter.testConnection(connData);

    await prisma.pvsConnection.update({
      where: { id },
      data: {
        lastSyncAt: result.ok ? new Date() : undefined,
        lastError: result.ok ? null : result.message,
      },
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, message: (err as Error).message });
  }
});

// 5. DELETE /connection/:id â€” Verbindung deaktivieren
router.delete('/connection/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const scopedConnection = await findConnectionByIdForTenant(id, tenantId);
    if (!scopedConnection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    await prisma.pvsConnection.update({
      where: { id: scopedConnection.id },
      data: { isActive: false },
    });
    await pvsRouter.removeAdapter(scopedConnection.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Verbindung konnte nicht deaktiviert werden' });
  }
});

// 6. GET /connection/:id/capabilities â€” Adapter-FÃ¤higkeiten
router.get('/connection/:id/capabilities', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const connection = await findConnectionByIdForTenant(id, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const capabilities = pvsRouter.getCapabilities(connection.pvsType);
    res.json(capabilities);
  } catch (err) {
    res.status(500).json({ error: 'FÃ¤higkeiten konnten nicht abgerufen werden' });
  }
});

// â”€â”€â”€ 7-9: Transfer Operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// 7. POST /export/session/:sessionId â€” Anamnese an PVS exportieren
router.post('/export/session/:sessionId', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const sessionId = req.params.sessionId as string;

    // Load full session data
    const session = await prisma.patientSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        patient: true,
        answers: true,
        triageEvents: true,
      },
    });

    if (session.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Tenant scope violation',
        code: 'PVS_SCOPE_VIOLATION',
      });
    }

    // Get active connection
    const connection = await findActiveConnectionForTenant(tenantId);
    if (!connection) {
      return res.status(400).json({ error: 'Keine aktive PVS-Verbindung' });
    }

    const connData = connection as unknown as PvsConnectionData;
    const sessionFull: PatientSessionFull = {
      id: session.id,
      patientId: session.patientId,
      patient: session.patient ? {
        id: session.patient.id,
        encryptedName: session.patient.encryptedName,
        birthDate: session.patient.birthDate,
        gender: session.patient.gender,
        versichertenNr: session.patient.versichertenNr,
        versichertenArt: session.patient.versichertenArt,
        kassenname: session.patient.kassenname,
        kassennummer: session.patient.kassennummer,
        patientNumber: session.patient.patientNumber,
      } : null,
      status: session.status,
      selectedService: session.selectedService,
      insuranceType: session.insuranceType,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      answers: session.answers.map((a: any) => ({
        id: a.id,
        atomId: a.atomId,
        value: a.value,
        encryptedValue: a.encryptedValue,
      })),
      triageEvents: session.triageEvents.map((t: any) => ({
        id: t.id,
        level: t.level,
        atomId: t.atomId,
        triggerValues: t.triggerValues,
        message: t.message,
      })),
    };

    const exportPlan = buildExportPlan(connData, req.body);
    const protocolResults: Array<{
      protocol: HybridExportProtocol;
      success: boolean;
      transferLogId: string;
      pvsReferenceId?: string;
      warnings: string[];
      error?: string;
      shadow: boolean;
    }> = [];

    for (const target of exportPlan.targets) {
      let result;
      try {
        result = await pvsRouter.exportAnamnese(target.connection, sessionFull);
      } catch (error) {
        console.error('[PVS] Protokoll-Export fehlgeschlagen', {
          sessionId,
          protocol: target.protocol,
          shadowConnection: target.isShadow,
        });
        result = {
          success: false,
          transferLogId: `${sessionId}-${target.protocol.toLowerCase()}-${Date.now()}`,
          pvsReferenceId: undefined,
          warnings: [],
          error: 'Export fehlgeschlagen',
        };
      }

      await prisma.pvsTransferLog.create({
        data: {
          connectionId: connection.id,
          direction: 'EXPORT',
          protocol: target.protocol,
          status: result.success ? 'COMPLETED' : 'FAILED',
          entityType: 'PatientSession',
          entityId: sessionId,
          satzart: target.protocol === 'GDT' ? '6301' : undefined,
          resourceType: target.protocol === 'FHIR' ? 'Bundle' : undefined,
          pvsReferenceId: result.pvsReferenceId,
          errorMessage: result.error,
          completedAt: result.success ? new Date() : undefined,
          durationMs: 0,
          initiatedBy: req.auth?.userId || 'system',
          transformedData: {
            hybridRequested: exportPlan.hybridRequested,
            shadowConnection: target.isShadow,
            targetProtocol: target.protocol,
          },
        },
      });

      protocolResults.push({
        protocol: target.protocol,
        success: result.success,
        transferLogId: result.transferLogId,
        pvsReferenceId: result.pvsReferenceId,
        warnings: result.warnings || [],
        error: result.error,
        shadow: target.isShadow,
      });

      if (target.isShadow) {
        try {
          await pvsRouter.removeAdapter(target.connection.id);
        } catch {
          // shadow adapter cleanup is best-effort
        }
      }
    }

    const successfulResults = protocolResults.filter((entry) => entry.success);
    const status = successfulResults.length === protocolResults.length
      ? 'COMPLETED'
      : successfulResults.length > 0
        ? 'PARTIAL'
        : 'FAILED';

    const referenceParts = successfulResults
      .map((entry) => entry.pvsReferenceId ? `${entry.protocol}:${entry.pvsReferenceId}` : null)
      .filter((value): value is string => Boolean(value));

    const primaryResult = successfulResults.find((entry) => !entry.shadow)
      || successfulResults[0]
      || protocolResults[0];

    if (successfulResults.length > 0) {
      await prisma.patientSession.update({
        where: { id: sessionId },
        data: {
          pvsExported: true,
          pvsExportedAt: new Date(),
          pvsExportRef: referenceParts.length > 0 ? referenceParts.join(' | ') : primaryResult?.pvsReferenceId,
        },
      });
    }

    const successfulProtocols = successfulResults.map((entry) => entry.protocol);
    let versandSummary: {
      priority: string;
      status: string;
      channels: Array<{ channel: string; success: boolean; error?: string }>;
    } | null = null;

    if (successfulProtocols.length > 0) {
      const {
        channels: resolvedChannels,
        droppedProtocolChannels,
      } = resolveVersandChannels(req.body, successfulProtocols);

      for (const protocol of droppedProtocolChannels) {
        exportPlan.warnings.push(`Versandkanal ${protocol} übersprungen, da Export fehlgeschlagen.`);
      }

      try {
        const versandResult = await processVersand(sessionId, resolvedChannels);
        versandSummary = {
          priority: versandResult.priority,
          status: versandResult.status,
          channels: versandResult.channelResults.map((channel) => ({
            channel: channel.channel,
            success: channel.success,
            error: channel.error,
          })),
        };
      } catch (error) {
        console.error('[PVS] Versandprotokoll fehlgeschlagen', {
          sessionId,
          reason: 'internal_error',
        });
        exportPlan.warnings.push('Versandprotokoll fehlgeschlagen');
      }
    }

    const warnings = Array.from(new Set([
      ...exportPlan.warnings,
      ...protocolResults.flatMap((entry) => entry.warnings || []),
    ]));

    res.json({
      transferId: primaryResult?.transferLogId || null,
      status,
      pvsReferenceId: primaryResult?.pvsReferenceId || null,
      pvsReferenceIds: protocolResults
        .filter((entry) => entry.pvsReferenceId)
        .map((entry) => ({ protocol: entry.protocol, reference: entry.pvsReferenceId })),
      warnings,
      exportedFields: countExportFields(sessionFull),
      error: status === 'FAILED' ? 'PVS-Export fehlgeschlagen' : undefined,
      hybrid: exportPlan.hybridRequested || protocolResults.length > 1,
      protocolResults: protocolResults.map((entry) => ({
        protocol: entry.protocol,
        success: entry.success,
        transferLogId: entry.transferLogId,
        pvsReferenceId: entry.pvsReferenceId,
        error: entry.error,
        shadow: entry.shadow,
      })),
      versand: versandSummary,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 8. POST /export/batch â€” Mehrere Sessions exportieren
router.post('/export/batch', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const { sessionIds } = z.object({ sessionIds: z.array(z.string()) }).parse(req.body);
    const results: Array<{ sessionId: string; success: boolean; error?: string }> = [];

    for (const sessionId of sessionIds) {
      try {
        // Reuse single export logic
        const session = await prisma.patientSession.findUnique({
          where: { id: sessionId },
          include: { patient: true, answers: true, triageEvents: true },
        });
        if (!session) {
          results.push({ sessionId, success: false, error: 'Session nicht gefunden' });
          continue;
        }

        if (session.tenantId !== tenantId) {
          results.push({ sessionId, success: false, error: 'Tenant scope violation' });
          continue;
        }

        const connection = await findActiveConnectionForTenant(tenantId);
        if (!connection) {
          results.push({ sessionId, success: false, error: 'Keine aktive PVS-Verbindung' });
          continue;
        }

        const connData = connection as unknown as PvsConnectionData;
        const sessionFull: PatientSessionFull = {
          id: session.id,
          patientId: session.patientId,
          patient: session.patient ? {
            id: session.patient.id,
            encryptedName: session.patient.encryptedName,
            birthDate: session.patient.birthDate,
            gender: session.patient.gender,
            versichertenNr: session.patient.versichertenNr,
            versichertenArt: session.patient.versichertenArt,
            kassenname: session.patient.kassenname,
            kassennummer: session.patient.kassennummer,
            patientNumber: session.patient.patientNumber,
          } : null,
          status: session.status,
          selectedService: session.selectedService,
          insuranceType: session.insuranceType,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
          answers: session.answers.map((a: any) => ({ id: a.id, atomId: a.atomId, value: a.value, encryptedValue: a.encryptedValue })),
          triageEvents: session.triageEvents.map((t: any) => ({ id: t.id, level: t.level, atomId: t.atomId, triggerValues: t.triggerValues, message: t.message })),
        };

        const result = await pvsRouter.exportAnamnese(connData, sessionFull);
        results.push({ sessionId, success: result.success, error: result.error });

        if (result.success) {
          await prisma.patientSession.update({
            where: { id: sessionId },
            data: { pvsExported: true, pvsExportedAt: new Date(), pvsExportRef: result.pvsReferenceId },
          });
        }
      } catch (err) {
        results.push({ sessionId, success: false, error: (err as Error).message });
      }
    }

    res.json({ results, total: sessionIds.length, successful: results.filter(r => r.success).length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const attachDocumentSchema = z.object({
  filename: z.string().min(1),
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  sessionId: z.string().optional(),
  title: z.string().optional(),
});

// 9. POST /documents/attach - Upload-Dokument in Tomedo-Akte verknuepfen
router.post('/documents/attach', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const payload = attachDocumentSchema.parse(req.body);

    const connection = await findActiveConnectionForTenant(tenantId);
    if (!connection) {
      return res.status(400).json({ error: 'Keine aktive PVS-Verbindung' });
    }

    if (connection.pvsType !== 'TOMEDO' || connection.protocol !== 'FHIR') {
      return res.status(400).json({
        error: 'Dokument-Upload wird aktuell nur fuer TOMEDO/FHIR unterstuetzt',
        code: 'TOMEDO_FHIR_REQUIRED',
      });
    }

    if (payload.sessionId) {
      const session = await prisma.patientSession.findUnique({
        where: { id: payload.sessionId },
        select: { id: true, tenantId: true },
      });
      if (!session || session.tenantId !== tenantId) {
        return res.status(403).json({
          error: 'Session gehoert nicht zum aktuellen Tenant',
          code: 'PVS_SCOPE_VIOLATION',
        });
      }
    }

    const filepath = resolve(UPLOAD_DIR, payload.filename);
    if (!isUploadPathSecure(filepath)) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    const fileBuffer = await readFile(filepath);
    const contentType = detectMimeType(payload.filename);
    if (!contentType) {
      return res.status(400).json({
        error: 'Ungueltiger Dateityp. Nur PDF, JPG und PNG werden unterstuetzt.',
        code: 'INVALID_MIME_TYPE',
      });
    }

    const displayName = payload.title?.trim() || payload.filename;
    const connData = connection as unknown as PvsConnectionData;
    const client = createTomedoApiClient(connData);

    const result = await client.uploadDocument(
      payload.patientId,
      fileBuffer,
      displayName,
      contentType,
      payload.encounterId,
    );

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.auth?.userId || null,
        action: 'PVS_DOCUMENT_ATTACH',
        resource: `pvs/tomedo/${payload.patientId}`,
        metadata: JSON.stringify({
          connectionId: connection.id,
          patientId: payload.patientId,
          encounterId: payload.encounterId || null,
          sessionId: payload.sessionId || null,
          filename: payload.filename,
          displayName,
          contentType,
          size: result.size,
          binaryId: result.binaryId || null,
          documentReferenceId: result.documentReferenceId || null,
          reference: result.reference || null,
          warning: result.warning || null,
        }),
      },
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }
    return res.status(500).json({ error: (err as Error).message });
  }
});

// 10. POST /import/patient â€” Patient aus PVS importieren
router.post('/import/patient', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const payload = importPatientSchema.parse(req.body);

    const connection = payload.connectionId
      ? await findConnectionByIdForTenant(payload.connectionId, tenantId)
      : await findActiveConnectionForTenant(tenantId);

    if (!connection) {
      return res.status(400).json({ error: 'Keine aktive PVS-Verbindung' });
    }

    if (payload.source === 'tomedo-status') {
      if (connection.pvsType !== 'TOMEDO' || connection.protocol !== 'FHIR') {
        return res.status(400).json({ error: 'Status-Import nur für Tomedo/FHIR unterstützt' });
      }

      const registration = tomedoLauscher.registerEventId(
        tenantId,
        connection.id,
        payload.statusEventId as string,
        payload.force,
      );

      if (registration === 'duplicate') {
        return res.status(202).json({
          patient: null,
          source: connection.pvsType,
          duplicate: true,
          reason: 'duplicate_status_event',
        });
      }
    }

    const connData = connection as unknown as PvsConnectionData;
    const adapter = await pvsRouter.getAdapter(connData);
    const patData = await adapter.importPatient(payload.pvsPatientId);

    // Log transfer
    await prisma.pvsTransferLog.create({
      data: {
        connectionId: connection.id,
        direction: 'IMPORT',
        protocol: connection.protocol,
        status: 'COMPLETED',
        entityType: 'Patient',
        entityId: payload.pvsPatientId,
        pvsReferenceId: payload.pvsPatientId,
        completedAt: new Date(),
        initiatedBy: req.auth?.userId || 'system',
        transformedData: {
          source: payload.source,
          statusEventId: payload.statusEventId || null,
        },
      },
    });

    res.json({
      patient: patData,
      source: connection.pvsType,
      statusEventId: payload.statusEventId || null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }

    res.status(500).json({ error: (err as Error).message });
  }
});

// â”€â”€â”€ 10-12: Patient Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// 10. GET /patient-link/:patientId â€” PVS-VerknÃ¼pfung abrufen
router.get('/patient-link/:patientId', requireAuth, async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const links = await prisma.pvsPatientLink.findMany({
      where: {
        patientId: req.params.patientId as string,
        patient: { tenantId },
      },
    });
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: 'Links konnten nicht geladen werden' });
  }
});

// 11. POST /patient-link â€” Patient mit PVS verknÃ¼pfen
router.post('/patient-link', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const data = z.object({
      patientId: z.string(),
      pvsType: z.enum(['CGM_M1', 'MEDATIXX', 'MEDISTAR', 'T2MED', 'X_ISYNET', 'DOCTOLIB', 'TURBOMED', 'FHIR_GENERIC', 'ALBIS', 'TOMEDO', 'MEDISTAR', 'T2MED', 'X_ISYNET']),
      pvsPatientId: z.string(),
      pvsPatientNr: z.string().optional(),
    }).parse(req.body);

    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, tenantId },
      select: { id: true },
    });

    if (!patient) {
      return res.status(403).json({ error: 'Tenant scope violation', code: 'PVS_SCOPE_VIOLATION' });
    }

    const link = await prisma.pvsPatientLink.create({ data });
    res.status(201).json(link);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }
    res.status(500).json({ error: 'VerknÃ¼pfung konnte nicht erstellt werden' });
  }
});

// 12. DELETE /patient-link/:id â€” VerknÃ¼pfung lÃ¶sen
router.delete('/patient-link/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const removed = await prisma.pvsPatientLink.deleteMany({
      where: {
        id: req.params.id as string,
        patient: { tenantId },
      },
    });

    if (removed.count === 0) {
      return res.status(404).json({ error: 'Verknüpfung nicht gefunden' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'VerknÃ¼pfung konnte nicht gelÃ¶scht werden' });
  }
});

// â”€â”€â”€ 13-16: Transfer Log & Monitoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// 13. GET /transfers â€” Transfer-Historie
router.get('/transfers', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string | undefined;
    const direction = req.query.direction as string | undefined;

    const where: Record<string, unknown> = {};
    where.connection = { praxisId: tenantId };
    if (status) where.status = status;
    if (direction) where.direction = direction;

    const [transfers, total] = await Promise.all([
      prisma.pvsTransferLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { connection: { select: { pvsType: true, protocol: true } } },
      }),
      prisma.pvsTransferLog.count({ where }),
    ]);

    res.json({ transfers, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Transfer-Log konnte nicht geladen werden' });
  }
});

// 14. GET /transfers/stats — Transfer-Statistiken
router.get('/transfers/stats', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const tenantId = getEffectiveTenantId(_req, res);
    if (!tenantId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, failed, byStatus] = await Promise.all([
      prisma.pvsTransferLog.count({ where: { connection: { praxisId: tenantId } } }),
      prisma.pvsTransferLog.count({ where: { createdAt: { gte: today }, connection: { praxisId: tenantId } } }),
      prisma.pvsTransferLog.count({ where: { status: 'FAILED', connection: { praxisId: tenantId } } }),
      prisma.pvsTransferLog.groupBy({
        by: ['status'],
        where: { connection: { praxisId: tenantId } },
        _count: true,
      }),
    ]);

    const successRate = total > 0
      ? Math.round(((total - failed) / total) * 100)
      : 100;

    res.json({
      total,
      today: todayCount,
      failed,
      successRate,
      byStatus: byStatus.reduce((acc: any, s: any) => {
        acc[s.status] = s._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (err) {
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});

// 14. GET /transfers/:id â€” Transfer-Details
router.get('/transfers/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const transfer = await prisma.pvsTransferLog.findFirstOrThrow({
      where: {
        id: req.params.id as string,
        connection: { praxisId: tenantId },
      },
      include: { connection: true },
    });
    res.json(transfer);
  } catch (err) {
    res.status(404).json({ error: 'Transfer nicht gefunden' });
  }
});

// 15. POST /transfers/:id/retry â€” Fehlgeschlagenen Transfer wiederholen
router.post('/transfers/:id/retry', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const transfer = await prisma.pvsTransferLog.findFirstOrThrow({
      where: {
        id: req.params.id as string,
        connection: { praxisId: tenantId },
      },
      include: { connection: true },
    });

    if (transfer.status !== 'FAILED') {
      return res.status(400).json({ error: 'Nur fehlgeschlagene Transfers kÃ¶nnen wiederholt werden' });
    }
    if (transfer.retryAttempt >= transfer.maxRetries) {
      return res.status(400).json({ error: 'Maximale Wiederholungsversuche erreicht' });
    }

    // Update retry count
    await prisma.pvsTransferLog.update({
      where: { id: transfer.id },
      data: { status: 'RETRYING', retryAttempt: transfer.retryAttempt + 1 },
    });

    // Re-export based on entity type
    if (transfer.entityType === 'PatientSession') {
      const session = await prisma.patientSession.findUnique({
        where: { id: transfer.entityId },
        include: { patient: true, answers: true, triageEvents: true },
      });
      if (!session) return res.status(404).json({ error: 'Session nicht mehr vorhanden' });

      const connData = transfer.connection as unknown as PvsConnectionData;
      const sessionFull: PatientSessionFull = {
        id: session.id,
        patientId: session.patientId,
        patient: session.patient ? {
          id: session.patient.id,
          encryptedName: session.patient.encryptedName,
          birthDate: session.patient.birthDate,
          gender: session.patient.gender,
          versichertenNr: session.patient.versichertenNr,
          versichertenArt: session.patient.versichertenArt,
          kassenname: session.patient.kassenname,
          kassennummer: session.patient.kassennummer,
          patientNumber: session.patient.patientNumber,
        } : null,
        status: session.status,
        selectedService: session.selectedService,
        insuranceType: session.insuranceType,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        answers: session.answers.map((a: any) => ({ id: a.id, atomId: a.atomId, value: a.value, encryptedValue: a.encryptedValue })),
        triageEvents: session.triageEvents.map((t: any) => ({ id: t.id, level: t.level, atomId: t.atomId, triggerValues: t.triggerValues, message: t.message })),
      };

      const result = await pvsRouter.exportAnamnese(connData, sessionFull);

      await prisma.pvsTransferLog.update({
        where: { id: transfer.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          pvsReferenceId: result.pvsReferenceId,
          errorMessage: result.error,
          completedAt: result.success ? new Date() : undefined,
        },
      });

      res.json({ success: result.success, error: result.error });
    } else {
      res.status(400).json({ error: 'Retry fÃ¼r diesen Entity-Typ nicht unterstÃ¼tzt' });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 16. GET /transfers/stats â€” Transfer-Statistiken
router.get('/transfers/stats', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const tenantId = getEffectiveTenantId(_req, res);
    if (!tenantId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, failed, byStatus] = await Promise.all([
      prisma.pvsTransferLog.count({ where: { connection: { praxisId: tenantId } } }),
      prisma.pvsTransferLog.count({ where: { createdAt: { gte: today }, connection: { praxisId: tenantId } } }),
      prisma.pvsTransferLog.count({ where: { status: 'FAILED', connection: { praxisId: tenantId } } }),
      prisma.pvsTransferLog.groupBy({
        by: ['status'],
        where: { connection: { praxisId: tenantId } },
        _count: true,
      }),
    ]);

    const successRate = total > 0
      ? Math.round(((total - failed) / total) * 100)
      : 100;

    res.json({
      total,
      today: todayCount,
      failed,
      successRate,
      byStatus: byStatus.reduce((acc: any, s: any) => {
        acc[s.status] = s._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (err) {
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});

// â”€â”€â”€ 17-20: Field Mappings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// 17. GET /mappings/:connectionId â€” Feld-Mappings abrufen
router.get('/mappings/:connectionId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const connection = await findConnectionByIdForTenant(req.params.connectionId as string, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const mappings = await prisma.pvsFieldMapping.findMany({
      where: { connectionId: connection.id },
      orderBy: [{ diggaiModel: 'asc' }, { diggaiField: 'asc' }],
    });
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ error: 'Mappings konnten nicht geladen werden' });
  }
});

// 18. PUT /mappings/:connectionId â€” Custom-Mappings speichern
router.put('/mappings/:connectionId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const scopedConnection = await findConnectionByIdForTenant(req.params.connectionId as string, tenantId);
    if (!scopedConnection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const connectionId = scopedConnection.id;
    const { mappings } = z.object({
      mappings: z.array(z.object({
        diggaiModel: z.string(),
        diggaiField: z.string(),
        pvsFieldId: z.string(),
        pvsFieldName: z.string().optional(),
        direction: z.enum(['IMPORT', 'EXPORT', 'BIDIRECTIONAL']).default('BIDIRECTIONAL'),
        transformRule: z.string().optional(),
        defaultValue: z.string().optional(),
        isRequired: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })),
    }).parse(req.body);

    // Delete existing + create new (transaction)
    await prisma.$transaction([
      prisma.pvsFieldMapping.deleteMany({ where: { connectionId } }),
      ...mappings.map(m =>
        prisma.pvsFieldMapping.create({ data: { ...m, connectionId } }),
      ),
    ]);

    const result = await prisma.pvsFieldMapping.findMany({
      where: { connectionId },
      orderBy: [{ diggaiModel: 'asc' }, { diggaiField: 'asc' }],
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }
    res.status(500).json({ error: 'Mappings konnten nicht gespeichert werden' });
  }
});

// 19. POST /mappings/:connectionId/reset â€” Auf Defaults zurÃ¼cksetzen
router.post('/mappings/:connectionId/reset', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const scopedConnection = await findConnectionByIdForTenant(req.params.connectionId as string, tenantId);
    if (!scopedConnection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const connectionId = scopedConnection.id;
    const connection = scopedConnection;

    // Delete all custom mappings
    await prisma.pvsFieldMapping.deleteMany({ where: { connectionId } });

    // Import defaults based on protocol
    const { DEFAULT_GDT_MAPPINGS } = await import('../services/pvs/gdt/gdt-constants.js');

    if (connection.protocol === 'GDT' || connection.protocol === 'BDT') {
      for (const m of DEFAULT_GDT_MAPPINGS) {
        await prisma.pvsFieldMapping.create({
          data: {
            connectionId,
            diggaiModel: m.diggaiModel,
            diggaiField: m.diggaiField,
            pvsFieldId: m.gdtField,
            pvsFieldName: m.diggaiField,
            direction: 'BIDIRECTIONAL',
            transformRule: m.transform || 'direct',
            isRequired: false,
            isActive: true,
          },
        });
      }
    }

    const mappings = await prisma.pvsFieldMapping.findMany({
      where: { connectionId },
      orderBy: [{ diggaiModel: 'asc' }, { diggaiField: 'asc' }],
    });

    res.json({ reset: true, count: mappings.length, mappings });
  } catch (err) {
    res.status(500).json({ error: 'Mappings konnten nicht zurÃ¼ckgesetzt werden' });
  }
});

// 20. POST /mappings/preview â€” Mapping-Vorschau (Dry-Run)
router.post('/mappings/preview', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const { sessionId, connectionId } = z.object({
      sessionId: z.string(),
      connectionId: z.string(),
    }).parse(req.body);

    const session = await prisma.patientSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { patient: true, answers: true, triageEvents: true },
    });

    if (session.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Tenant scope violation', code: 'PVS_SCOPE_VIOLATION' });
    }

    const connection = await findConnectionByIdForTenant(connectionId, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const { buildBefundtext } = await import('../services/pvs/mapping-engine.js');

    const sessionFull: PatientSessionFull = {
      id: session.id,
      patientId: session.patientId,
      patient: session.patient ? {
        id: session.patient.id,
        encryptedName: session.patient.encryptedName,
        birthDate: session.patient.birthDate,
        gender: session.patient.gender,
        versichertenNr: session.patient.versichertenNr,
        versichertenArt: session.patient.versichertenArt,
        kassenname: session.patient.kassenname,
        kassennummer: session.patient.kassennummer,
        patientNumber: session.patient.patientNumber,
      } : null,
      status: session.status,
      selectedService: session.selectedService,
      insuranceType: session.insuranceType,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      answers: session.answers.map((a: any) => ({ id: a.id, atomId: a.atomId, value: a.value, encryptedValue: a.encryptedValue })),
      triageEvents: session.triageEvents.map((t: any) => ({ id: t.id, level: t.level, atomId: t.atomId, triggerValues: t.triggerValues, message: t.message })),
    };

    const befundtext = buildBefundtext(sessionFull, {
      format: 'structured',
      includeTriageDetails: true,
      includeMedications: true,
      includeSurgeries: true,
    });

    res.json({
      preview: befundtext.join('\n'),
      fieldCount: countExportFields(sessionFull),
      protocol: connection.protocol,
      pvsType: connection.pvsType,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    }
    res.status(500).json({ error: 'Vorschau konnte nicht erstellt werden' });
  }
});

// ─── 21-24: Auto-Config & Smart Sync ─────────────────────────────────────

// 21. POST /detect — Automatische PVS-Erkennung
router.post('/detect', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const tenantId = getEffectiveTenantId(_req, res);
    if (!tenantId) return;

    const detectedSystems = await pvsDetectionService.detectLocalPVS();

    // Map to simplified response format
    const results = detectedSystems.map(system => ({
      pvsType: system.type,
      protocol: system.protocol,
      confidence: system.confidence,
      detectedPaths: system.detectedPaths,
      detectedUrls: system.detectedUrls,
      version: system.version,
      suggestedConfig: system.suggestedConfig,
    }));

    res.json({
      detected: results.length,
      systems: results,
    });
  } catch (err) {
    res.status(500).json({ error: 'PVS-Erkennung fehlgeschlagen', message: (err as Error).message });
  }
});

// 22. POST /detect/test — Erkannte Konfiguration testen
router.post('/detect/test', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const { pvsType, detectedPaths, detectedUrls, suggestedConfig } = req.body;

    const mockDetected = {
      type: pvsType,
      protocol: detectedPaths ? 'GDT' : 'FHIR',
      confidence: 75,
      detectedPaths,
      detectedUrls,
      suggestedConfig,
    };

    const testResult = await pvsDetectionService.testDetectedSystem(mockDetected as any);

    res.json({
      works: testResult.works,
      message: testResult.message,
    });
  } catch (err) {
    res.status(500).json({ error: 'Test fehlgeschlagen', message: (err as Error).message });
  }
});

// 23. POST /connection/:id/sync/start — Smart Sync starten
router.post('/connection/:id/sync/start', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const connection = await findConnectionByIdForTenant(id, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    if (!connection.isActive) {
      return res.status(400).json({ error: 'Verbindung ist nicht aktiv' });
    }

    const connData = connection as unknown as PvsConnectionData;
    const wasSmartWatching = smartSyncService.isWatching(id);
    await smartSyncService.startWatching(connData);

    const smartSyncState = connData.protocol === 'GDT'
      ? (wasSmartWatching ? 'already_running' : smartSyncService.isWatching(id) ? 'started' : 'skipped')
      : 'skipped';

    const tomedoResult = tomedoLauscher.startLauscher(tenantId, connData);

    const warnings: string[] = [];
    if (tomedoResult.state === 'skipped' && tomedoResult.reason === 'unsupported_connection') {
      warnings.push('Tomedo-Statussync für diese Verbindung nicht aktiviert');
    }

    const status = smartSyncService.isWatching(id) || tomedoLauscher.isRunning(tenantId, id)
      ? 'watching'
      : 'not_watching';

    res.json({
      success: true,
      message: 'Synchronisation gestartet',
      connectionId: id,
      status,
      components: {
        smartSync: {
          state: smartSyncState,
        },
        tomedoLauscher: {
          state: tomedoResult.state,
          reason: tomedoResult.reason,
        },
      },
      warnings,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync konnte nicht gestartet werden', message: (err as Error).message });
  }
});

// 24. POST /connection/:id/sync/stop — Smart Sync stoppen
router.post('/connection/:id/sync/stop', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const connection = await findConnectionByIdForTenant(id, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const wasSmartWatching = smartSyncService.isWatching(id);
    await smartSyncService.stopWatching(id);
    const smartSyncState = wasSmartWatching ? 'stopped' : 'already_stopped';

    const tomedoResult = tomedoLauscher.stopLauscher(tenantId, id);

    res.json({
      success: true,
      message: 'Synchronisation gestoppt',
      connectionId: id,
      components: {
        smartSync: {
          state: smartSyncState,
        },
        tomedoLauscher: {
          state: tomedoResult.state,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync konnte nicht gestoppt werden', message: (err as Error).message });
  }
});

// 25. GET /connection/:id/sync/stats — Sync-Statistiken
router.get('/connection/:id/sync/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = getEffectiveTenantId(req, res);
    if (!tenantId) return;

    const id = req.params.id as string;
    const connection = await findConnectionByIdForTenant(id, tenantId);
    if (!connection) {
      return res.status(404).json({ error: 'Verbindung nicht gefunden' });
    }

    const stats = smartSyncService.getStats(id);
    const tomedoStats = tomedoLauscher.getStats(tenantId, id);

    if (!stats && !tomedoStats) {
      return res.json({
        connectionId: id,
        status: 'not_watching',
        message: 'Keine aktive Überwachung für diese Verbindung',
      });
    }

    const smartStats = stats || {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      averageDuration: 0,
      lastSyncAt: null,
      pendingTransfers: 0,
      watcherMode: 'native',
      filesProcessed: 0,
      watcherErrors: 0,
    };

    res.json({
      connectionId: id,
      status: 'watching',
      stats: {
        totalTransfers: smartStats.totalTransfers,
        successfulTransfers: smartStats.successfulTransfers,
        failedTransfers: smartStats.failedTransfers,
        successRate: smartStats.totalTransfers > 0
          ? Math.round((smartStats.successfulTransfers / smartStats.totalTransfers) * 100)
          : 100,
        averageDurationMs: Math.round(smartStats.averageDuration),
        lastSyncAt: smartStats.lastSyncAt,
        pendingTransfers: smartStats.pendingTransfers,
        componentStats: {
          smartSync: stats || null,
          tomedoLauscher: tomedoStats,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden', message: (err as Error).message });
  }
});

export default router;
