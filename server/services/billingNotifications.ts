// ─── Billing Notifications Service ────────────────────────
// E-Mail Benachrichtigungen für Subscription Events
// Trial Ending, Payment Failed, Subscription Cancelled

import nodemailer from 'nodemailer';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
}

interface Customer {
  email: string;
  name?: string;
  praxisName?: string;
}

interface SubscriptionData {
  tier: string;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
  amount?: number;
}

export class BillingNotifications {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // SMTP Transporter erstellen wenn konfiguriert
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Trial endet bald
   */
  async sendTrialEndingSoon(customer: Customer, subscription: SubscriptionData): Promise<void> {
    if (!this.transporter) return;

    const trialEnd = subscription.trialEndsAt
      ? new Date(subscription.trialEndsAt).toLocaleDateString('de-DE')
      : 'bald';

    await this.sendEmail({
      to: customer.email,
      subject: 'Ihre Testphase endet bald - DiggAI',
      html: `
        <h2>Hallo ${customer.name || 'Kunde'},</h2>
        <p>Ihre 14-tägige Testphase bei DiggAI endet am <strong>${trialEnd}</strong>.</p>
        <p>Um Ihre Abonnement fortzusetzen, ist keine weitere Aktion erforderlich. Ihr Tarif <strong>${subscription.tier}</strong> wird automatisch fortgesetzt.</p>
        <p>Falls Sie kündigen möchten, können Sie dies in Ihrem <a href="${process.env.FRONTEND_URL}/verwaltung/billing">Billing Dashboard</a> tun.</p>
        <br>
        <p>Bei Fragen antworten Sie einfach auf diese E-Mail oder kontaktieren Sie uns unter support@diggai.de.</p>
        <br>
        <p>Beste Grüße,<br>Ihr DiggAI Team</p>
      `,
    });
  }

  /**
   * Zahlung fehlgeschlagen
   */
  async sendPaymentFailed(customer: Customer, subscription: SubscriptionData, retryCount: number): Promise<void> {
    if (!this.transporter) return;

    const isFinal = retryCount >= 3;

    await this.sendEmail({
      to: customer.email,
      subject: isFinal
        ? 'Wichtig: Ihre Zahlung konnte nicht verarbeitet werden'
        : 'Problem mit Ihrer Zahlung - DiggAI',
      html: `
        <h2>Hallo ${customer.name || 'Kunde'},</h2>
        <p>Leider konnten wir Ihre Zahlung für den DiggAI ${subscription.tier} Tarif nicht verarbeiten.</p>
        <p><strong>Betrag:</strong> ${subscription.amount ? `€${subscription.amount.toFixed(2)}` : 'monatliche Gebühr'}</p>
        ${!isFinal ? `
          <p>Wir werden es in den nächsten Tagen erneut versuchen. Bitte stellen Sie sicher, dass Ihre Zahlungsmethode auf dem neuesten Stand ist:</p>
          <p><a href="${process.env.FRONTEND_URL}/verwaltung/billing" style="background: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">Zahlungsmethode aktualisieren</a></p>
        ` : `
          <p style="color: #dc2626;"><strong>Wichtig:</strong> Nach mehreren erfolglosen Versuchen wird Ihr Abonnement leider gekündigt.</p>
          <p>Um einen Service-Unterbrechung zu vermeiden, aktualisieren Sie bitte Ihre Zahlungsmethode:</p>
          <p><a href="${process.env.FRONTEND_URL}/verwaltung/billing" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">Jetzt aktualisieren</a></p>
        `}
        <br>
        <p>Bei Fragen erreichen Sie uns unter support@diggai.de.</p>
        <br>
        <p>Beste Grüße,<br>Ihr DiggAI Team</p>
      `,
    });
  }

  /**
   * Subscription gekündigt
   */
  async sendSubscriptionCancelled(customer: Customer, subscription: SubscriptionData): Promise<void> {
    if (!this.transporter) return;

    await this.sendEmail({
      to: customer.email,
      subject: 'Ihre DiggAI-Abonnement wurde gekündigt',
      html: `
        <h2>Hallo ${customer.name || 'Kunde'},</h2>
        <p>Ihr DiggAI ${subscription.tier} Abonnement wurde gekündigt.</p>
        <p>Sie haben noch Zugriff bis zum <strong>${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE') : 'unbekannt'}</strong>.</p>
        <p>Es tut uns leid, Sie gehen zu sehen. Falls Sie Feedback haben oder uns bei der Verbesserung helfen möchten, antworten Sie einfach auf diese E-Mail.</p>
        <p>Möchten Sie Ihr Abonnement reaktivieren? Besuchen Sie Ihr <a href="${process.env.FRONTEND_URL}/pricing">Dashboard</a>.</p>
        <br>
        <p>Beste Grüße,<br>Ihr DiggAI Team</p>
      `,
    });
  }

  /**
   * Willkommens-E-Mail nach erfolgreichem Checkout
   */
  async sendWelcomeEmail(customer: Customer, subscription: SubscriptionData): Promise<void> {
    if (!this.transporter) return;

    await this.sendEmail({
      to: customer.email,
      subject: 'Willkommen bei DiggAI! Ihre Testphase beginnt',
      html: `
        <h2>Willkommen bei DiggAI, ${customer.name || 'Kunde'}!</h2>
        <p>Vielen Dank für Ihre Anmeldung. Ihre 14-tägige Testphase hat begonnen.</p>
        <p><strong>Ihr Tarif:</strong> ${subscription.tier}</p>
        <p><strong>Testphase endet:</strong> ${subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString('de-DE') : 'in 14 Tagen'}</p>
        <h3>Nächste Schritte:</h3>
        <ol>
          <li>Loggen Sie sich in Ihr <a href="${process.env.FRONTEND_URL}/verwaltung">Dashboard</a> ein</li>
          <li>Schließen Sie das Onboarding ab</li>
          <li>Integrieren Sie DiggAI in Ihre Praxis</li>
        </ol>
        <p>Bei Fragen stehen wir Ihnen jederzeit unter support@diggai.de zur Verfügung.</p>
        <br>
        <p>Wir freuen uns auf eine erfolgreiche Zusammenarbeit!</p>
        <br>
        <p>Beste Grüße,<br>Ihr DiggAI Team</p>
      `,
    });
  }

  /**
   * Rechnung verfügbar
   */
  async sendInvoiceAvailable(customer: Customer, invoice: { amount: number; pdfUrl: string; period: string }): Promise<void> {
    if (!this.transporter) return;

    await this.sendEmail({
      to: customer.email,
      subject: 'Ihre DiggAI-Rechnung ist verfügbar',
      html: `
        <h2>Hallo ${customer.name || 'Kunde'},</h2>
        <p>Ihre Rechnung für den Zeitraum ${invoice.period} ist jetzt verfügbar.</p>
        <p><strong>Betrag:</strong> €${invoice.amount.toFixed(2)}</p>
        <p><a href="${invoice.pdfUrl}" style="background: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">Rechnung herunterladen (PDF)</a></p>
        <p>Sie können alle Rechnungen auch in Ihrem <a href="${process.env.FRONTEND_URL}/verwaltung/billing">Billing Dashboard</a> einsehen.</p>
        <br>
        <p>Beste Grüße,<br>Ihr DiggAI Team</p>
      `,
    });
  }

  private async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      console.log('[BillingNotifications] SMTP not configured, skipping email:', subject);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"DiggAI" <${process.env.SMTP_FROM || 'noreply@diggai.de'}>`,
        to,
        subject,
        html,
      });
      console.log(`[BillingNotifications] Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('[BillingNotifications] Failed to send email:', error);
    }
  }
}

export const billingNotifications = new BillingNotifications();
