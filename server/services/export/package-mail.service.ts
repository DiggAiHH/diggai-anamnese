import nodemailer from 'nodemailer';

export interface SendPackageLinkEmailParams {
  recipientEmail: string;
  practiceName: string;
  downloadUrl: string;
  expiresAt: Date;
}

export interface SendPackageLinkEmailResult {
  sent: boolean;
  mailtoUrl: string;
}

function buildSubject(): string {
  return 'Sicherer Download Ihrer Anamnese-Unterlagen';
}

function buildTextBody(params: SendPackageLinkEmailParams): string {
  return [
    `Guten Tag,`,
    '',
    `Ihre Praxis ${params.practiceName} hat einen sicheren Download für Ihre Anamnese-Unterlagen vorbereitet.`,
    '',
    `Download-Link: ${params.downloadUrl}`,
    `Gültig bis: ${params.expiresAt.toLocaleString('de-DE')}`,
    '',
    'Bitte leiten Sie diese E-Mail nicht weiter. Der Link ist nur einmal verwendbar.',
    '',
    `Viele Grüße`,
    params.practiceName,
  ].join('\n');
}

function buildHtmlBody(params: SendPackageLinkEmailParams): string {
  return `
    <p>Guten Tag,</p>
    <p>Ihre Praxis <strong>${params.practiceName}</strong> hat einen sicheren Download für Ihre Anamnese-Unterlagen vorbereitet.</p>
    <p><a href="${params.downloadUrl}">${params.downloadUrl}</a></p>
    <p>Gültig bis: ${params.expiresAt.toLocaleString('de-DE')}</p>
    <p>Bitte leiten Sie diese E-Mail nicht weiter. Der Link ist nur einmal verwendbar.</p>
    <p>Viele Grüße<br />${params.practiceName}</p>
  `;
}

function buildMailtoUrl(params: SendPackageLinkEmailParams): string {
  const subject = encodeURIComponent(buildSubject());
  const body = encodeURIComponent(buildTextBody(params));
  return `mailto:${encodeURIComponent(params.recipientEmail)}?subject=${subject}&body=${body}`;
}

export async function sendPackageLinkEmail(
  params: SendPackageLinkEmailParams,
): Promise<SendPackageLinkEmailResult> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const mailtoUrl = buildMailtoUrl(params);

  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      sent: false,
      mailtoUrl,
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: params.recipientEmail,
    subject: buildSubject(),
    text: buildTextBody(params),
    html: buildHtmlBody(params),
  });

  return {
    sent: true,
    mailtoUrl,
  };
}

