// KIM (Kommunikation im Medizinwesen) Client
// Uses nodemailer for SMTP (KIM Clientmodul)
// POP3 inbox: returns mock/DB messages (real POP3 via net.Socket is stubbed)

import nodemailer from 'nodemailer';
import type { KIMDirectoryEntry } from './types';

const prisma = () => (globalThis as any).__prisma;

// ─── Exported Types ──────────────────────────────────────────

export interface SendKIMParams {
  to: string | string[];
  subject: string;
  body: string;
  attachmentPath?: string;
  attachmentName?: string;
}

export interface KIMSendResult {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface KIMInboxMessage {
  id: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  body: string;
  status: string;
  hasAttachment: boolean;
  attachmentName?: string | null;
  createdAt: string;
}

// Re-export for use in routes
export type { KIMDirectoryEntry };

// ─── Config Helper ───────────────────────────────────────────

function getKIMConfig() {
  return {
    smtp: {
      host: process.env.KIM_SMTP_HOST || '',
      port: parseInt(process.env.KIM_SMTP_PORT || '465'),
      user: process.env.KIM_SMTP_USER || '',
      pass: process.env.KIM_SMTP_PASS || '',
    },
    pop3: {
      host: process.env.KIM_POP3_HOST || '',
      port: parseInt(process.env.KIM_POP3_PORT || '995'),
      user: process.env.KIM_POP3_USER || '',
      pass: process.env.KIM_POP3_PASS || '',
    },
    fromAddress: process.env.KIM_FROM_ADDRESS || 'praxis@kim.telematik',
    vdzUrl: process.env.VZD_URL || '',
  };
}

export function isKIMConfigured(): boolean {
  const cfg = getKIMConfig();
  return !!(cfg.smtp.host && cfg.smtp.user && cfg.smtp.pass);
}

// ─── sendKIMMessage ──────────────────────────────────────────

export async function sendKIMMessage(params: SendKIMParams): Promise<KIMSendResult> {
  const cfg = getKIMConfig();
  const db = prisma();
  const toArray = Array.isArray(params.to) ? params.to : [params.to];
  const toAddress = toArray.join(', ');

  // Build DB record first (optimistic)
  let dbMessageId: string | undefined;
  if (db) {
    try {
      const record = await db.kIMMessage.create({
        data: {
          fromAddress: cfg.fromAddress,
          toAddress,
          subject: params.subject,
          body: params.body,
          status: 'SENDING',
          hasAttachment: !!params.attachmentPath,
          attachmentName: params.attachmentName || null,
        },
      });
      dbMessageId = record.id;
    } catch (dbErr: any) {
      console.warn('[KIM] DB record creation failed:', dbErr.message);
    }
  }

  // Attempt real SMTP send if configured
  if (cfg.smtp.host && cfg.smtp.user && cfg.smtp.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port,
        secure: cfg.smtp.port === 465,
        auth: {
          user: cfg.smtp.user,
          pass: cfg.smtp.pass,
        },
        tls: {
          rejectUnauthorized: false, // KIM Clientmodule often use self-signed certs
        },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: cfg.fromAddress,
        to: toArray,
        subject: params.subject,
        text: params.body,
      };

      if (params.attachmentPath && params.attachmentName) {
        mailOptions.attachments = [
          {
            filename: params.attachmentName,
            path: params.attachmentPath,
          },
        ];
      }

      const info = await transporter.sendMail(mailOptions);

      // Update DB record to SENT
      if (db && dbMessageId) {
        await db.kIMMessage.update({
          where: { id: dbMessageId },
          data: { status: 'SENT', externalId: info.messageId },
        }).catch(() => {});
      }

      return { messageId: dbMessageId || info.messageId, status: 'sent' };
    } catch (err: any) {
      // Update DB record to FAILED
      if (db && dbMessageId) {
        await db.kIMMessage.update({
          where: { id: dbMessageId },
          data: { status: 'FAILED', lastError: err.message },
        }).catch(() => {});
      }

      return {
        messageId: dbMessageId || 'unknown',
        status: 'failed',
        error: err.message,
      };
    }
  }

  // Stub mode: no SMTP configured — treat as "sent" for demo
  if (db && dbMessageId) {
    await db.kIMMessage.update({
      where: { id: dbMessageId },
      data: { status: 'SENT' },
    }).catch(() => {});
  }

  return {
    messageId: dbMessageId || `stub-${Date.now()}`,
    status: 'sent',
  };
}

// ─── getKIMInbox ─────────────────────────────────────────────

export async function getKIMInbox(): Promise<KIMInboxMessage[]> {
  const cfg = getKIMConfig();
  const db = prisma();

  // If a real POP3 host is configured (not 'mock'), attempt real fetch
  // Real POP3 via net.Socket is complex; here we log and fall back to DB
  if (cfg.pop3.host && cfg.pop3.host !== 'mock') {
    // Stub: In production, open TLS socket to KIM_POP3_HOST:KIM_POP3_PORT,
    // authenticate with USER/PASS, LIST messages, RETR each, DELE if needed.
    // For now, log the attempt and fall through to DB.
    console.info(`[KIM] POP3 configured at ${cfg.pop3.host}:${cfg.pop3.port} — real fetch not yet implemented, returning DB records`);
  }

  if (!db) return [];

  const messages = await db.kIMMessage.findMany({
    where: { status: 'RECEIVED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return messages.map((m: any) => ({
    id: m.id,
    fromAddress: m.fromAddress,
    toAddress: m.toAddress,
    subject: m.subject,
    body: m.body,
    status: m.status,
    hasAttachment: m.hasAttachment,
    attachmentName: m.attachmentName,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  }));
}

// ─── getKIMMessage ────────────────────────────────────────────

export async function getKIMMessage(id: string): Promise<KIMInboxMessage | null> {
  const db = prisma();
  if (!db) return null;

  const m = await db.kIMMessage.findUnique({ where: { id } });
  if (!m) return null;

  return {
    id: m.id,
    fromAddress: m.fromAddress,
    toAddress: m.toAddress,
    subject: m.subject,
    body: m.body,
    status: m.status,
    hasAttachment: m.hasAttachment,
    attachmentName: m.attachmentName,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  };
}

// ─── deleteKIMMessage ─────────────────────────────────────────

export async function deleteKIMMessage(id: string): Promise<void> {
  const db = prisma();
  if (!db) throw new Error('Datenbank nicht verfügbar');
  await db.kIMMessage.delete({ where: { id } });
}

// ─── searchKIMDirectory ───────────────────────────────────────

export async function searchKIMDirectory(params: {
  name?: string;
  city?: string;
  specialty?: string;
}): Promise<KIMDirectoryEntry[]> {
  const cfg = getKIMConfig();

  // If VZD_URL is configured, attempt real HTTP request to VZD LDAP gateway
  if (cfg.vdzUrl) {
    try {
      const url = new URL(`${cfg.vdzUrl}/directory/api/v1/DirectoryEntries`);
      if (params.name) url.searchParams.set('displayName', params.name);
      if (params.city) url.searchParams.set('locality', params.city);
      if (params.specialty) url.searchParams.set('specialization', params.specialty);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        // Map VZD API response to our KIMDirectoryEntry shape
        const entries: KIMDirectoryEntry[] = (data.DirectoryEntries || data || []).map((e: any) => ({
          kimAddress: e.userCertificates?.[0]?.kimAddress || e.mail || '',
          displayName: e.displayName || e.cn || '',
          organizationName: e.organization || e.o || '',
          telematikId: e.telematikID || e.uid || '',
          professionOid: e.professionOID || '',
          speciality: e.specialization || '',
        }));
        return entries.filter(e => e.kimAddress);
      }
    } catch (err: any) {
      console.warn('[KIM] VZD lookup failed:', err.message, '— returning mock data');
    }
  }

  // Fallback: mock directory entries for demo / development
  const mockEntries: KIMDirectoryEntry[] = [
    {
      kimAddress: 'dr.mueller@kim.telematik',
      displayName: 'Dr. med. Hans Müller',
      organizationName: 'Praxis Dr. Müller',
      telematikId: '1-2.58.00000001',
      professionOid: '1.2.276.0.76.4.30',
      speciality: 'Allgemeinmedizin',
    },
    {
      kimAddress: 'kardiologie@herzzentrum-berlin.kim.telematik',
      displayName: 'Herzzentrum Berlin — Kardiologie',
      organizationName: 'Herzzentrum Berlin GmbH',
      telematikId: '1-2.58.00000002',
      professionOid: '1.2.276.0.76.4.30',
      speciality: 'Kardiologie',
    },
    {
      kimAddress: 'radiologie@klinikum-nord.kim.telematik',
      displayName: 'Radiologie Klinikum Nord',
      organizationName: 'Klinikum Nord',
      telematikId: '1-2.58.00000003',
      professionOid: '1.2.276.0.76.4.31',
      speciality: 'Radiologie',
    },
    {
      kimAddress: 'neurologie@neurocentrum.kim.telematik',
      displayName: 'Dr. med. Sabine Fischer',
      organizationName: 'Neurocentrum Hamburg',
      telematikId: '1-2.58.00000004',
      professionOid: '1.2.276.0.76.4.30',
      speciality: 'Neurologie',
    },
    {
      kimAddress: 'labor@medlabor.kim.telematik',
      displayName: 'MedLabor Diagnostik GmbH',
      organizationName: 'MedLabor Diagnostik GmbH',
      telematikId: '1-2.58.00000005',
      professionOid: '1.2.276.0.76.4.32',
      speciality: 'Labormedizin',
    },
  ];

  // Filter mock entries by search params
  return mockEntries.filter(entry => {
    const nameLower = (params.name || '').toLowerCase();
    const cityLower = (params.city || '').toLowerCase();
    const specLower = (params.specialty || '').toLowerCase();

    const matchesName = !nameLower ||
      entry.displayName.toLowerCase().includes(nameLower) ||
      entry.organizationName?.toLowerCase().includes(nameLower) ||
      entry.kimAddress.toLowerCase().includes(nameLower);

    const matchesCity = !cityLower ||
      entry.organizationName?.toLowerCase().includes(cityLower) ||
      entry.displayName.toLowerCase().includes(cityLower);

    const matchesSpecialty = !specLower ||
      entry.speciality?.toLowerCase().includes(specLower);

    return matchesName && matchesCity && matchesSpecialty;
  });
}
