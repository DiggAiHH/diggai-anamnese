import { afterEach, describe, expect, it, vi } from 'vitest';

const transporterMock = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => transporterMock),
  },
}));

import { sendPackageLinkEmail } from './package-mail.service';

describe('package mail service', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('falls back to mailto when smtp is not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const result = await sendPackageLinkEmail({
      recipientEmail: 'patient@example.com',
      practiceName: 'Praxis Nord',
      downloadUrl: 'https://api.example.de/api/export/download/token-1',
      expiresAt: new Date('2026-04-01T10:00:00.000Z'),
    });

    expect(result.sent).toBe(false);
    expect(result.mailtoUrl).toContain('mailto:patient%40example.com');
    expect(result.mailtoUrl).toContain('Sicherer%20Download');
  });

  it('sends a phi-lean email when smtp is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_PASS = 'secret';
    process.env.SMTP_FROM = 'praxis@example.com';

    await sendPackageLinkEmail({
      recipientEmail: 'patient@example.com',
      practiceName: 'Praxis Nord',
      downloadUrl: 'https://api.example.de/api/export/download/token-1',
      expiresAt: new Date('2026-04-01T10:00:00.000Z'),
    });

    expect(transporterMock.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Sicherer Download Ihrer Anamnese-Unterlagen',
      to: 'patient@example.com',
      html: expect.not.stringContaining('Diagnose'),
      text: expect.not.stringContaining('Kopfschmerzen'),
    }));
  });
});

