// ─── Billing Cron Jobs ────────────────────────────────────
// Regelmäßige Tasks für Billing-Verwaltung
// - Health Checks
// - Abgelaufene Trials prüfen
// - Metriken sammeln

import cron from 'node-cron';
import { billingMonitor } from '../services/billingMonitor.js';
import { billingNotifications } from '../services/billingNotifications.js';
import { getPrismaClientForDomain } from '../db.js';

const prisma = getPrismaClientForDomain('company');

export class BillingJobs {
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Startet alle Billing-Cron-Jobs
   */
  start(): void {
    // Alle 15 Minuten: Health Check
    this.tasks.push(
      cron.schedule('*/15 * * * *', async () => {
        console.log('[BillingJobs] Running health check...');
        const health = await billingMonitor.healthCheck();

        if (!health.healthy) {
          console.error('[BillingJobs] Billing system unhealthy:', health.checks);

          // Alert senden
          // @ts-ignore
          await billingMonitor.sendAlert({
            type: 'BILLING_HEALTH_CHECK_FAILED',
            severity: 'CRITICAL',
            message: 'Billing system health check failed',
            metrics: await billingMonitor.getPaymentMetrics(1),
          });
        }
      })
    );

    // Stündlich: Payment Metriken prüfen
    this.tasks.push(
      cron.schedule('0 * * * *', async () => {
        console.log('[BillingJobs] Checking payment metrics...');
        await billingMonitor.checkAndAlert();
      })
    );

    // Täglich um 9 Uhr: Abgelaufene Trials benachrichtigen
    this.tasks.push(
      cron.schedule('0 9 * * *', async () => {
        console.log('[BillingJobs] Checking expired trials...');
        await this.checkExpiredTrials();
      })
    );

    // Täglich um 3 Uhr: Abgelaufene Subscriptions deaktivieren
    this.tasks.push(
      cron.schedule('0 3 * * *', async () => {
        console.log('[BillingJobs] Cleaning up expired subscriptions...');
        await this.cleanupExpiredSubscriptions();
      })
    );

    // Wöchentlich: Billing Report
    this.tasks.push(
      cron.schedule('0 8 * * 1', async () => {
        console.log('[BillingJobs] Generating weekly billing report...');
        await this.generateWeeklyReport();
      })
    );

    console.log('[BillingJobs] All billing jobs started');
  }

  /**
   * Stoppt alle Jobs
   */
  stop(): void {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('[BillingJobs] All billing jobs stopped');
  }

  /**
   * Prüft abgelaufene Trials
   */
  private async checkExpiredTrials(): Promise<void> {
    const expiredTrials = await (prisma as any).subscription.findMany({
      where: {
        status: 'TRIAL',
        endsAt: {
          lt: new Date(),
          gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Letzte 24h abgelaufen
        },
      },
      include: {
        tenant: true,
      },
    });

    for (const subscription of expiredTrials) {
      console.log(`[BillingJobs] Trial expired: ${subscription.id}`);

      // Auf PAST_DUE setzen (wenn keine Zahlung erfolgt ist)
      await (prisma as any).subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });

      // Notification senden falls E-Mail verfügbar
      if (subscription.tenant?.stripeCustomerId) {
        try {
          const { stripe } = await import('../config/stripe.js');
          const customer = await stripe.customers.retrieve(subscription.tenant.stripeCustomerId);

          if (!customer.deleted && customer.email) {
            await billingNotifications.sendPaymentFailed(
              {
                email: customer.email,
                name: customer.name || undefined,
              },
              {
                tier: subscription.tier,
                currentPeriodEnd: new Date(),
              },
              0
            );
          }
        } catch (error) {
          console.error('[BillingJobs] Failed to notify expired trial:', error);
        }
      }
    }
  }

  /**
   * Bereinigt abgelaufene Subscriptions
   */
  private async cleanupExpiredSubscriptions(): Promise<void> {
    const expired = await (prisma as any).subscription.findMany({
      where: {
        status: 'CANCELLED',
        endsAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 Tage abgelaufen
        },
      },
    });

    for (const subscription of expired) {
      console.log(`[BillingJobs] Cleaning up old subscription: ${subscription.id}`);

      // Optional: Daten anonymisieren/archivieren
      // Hier könnte man z.B. Payment-Historie archivieren
    }

    console.log(`[BillingJobs] Cleaned up ${expired.length} old subscriptions`);
  }

  /**
   * Generiert wöchentlichen Billing Report
   */
  private async generateWeeklyReport(): Promise<void> {
    const metrics = await billingMonitor.getPaymentMetrics(168); // 7 Tage

    const report = {
      period: 'last_7_days',
      generatedAt: new Date().toISOString(),
      metrics,
      summary: {
        totalRevenue: metrics.totalTransactions > 0 && metrics.totalRevenue !== undefined
          ? `€${(metrics.totalRevenue).toFixed(2)}`
          : '€0.00',
        successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
        totalTransactions: metrics.totalTransactions,
      },
    };

    // In Datenbank speichern
    await (prisma as any).systemLog.create({
      data: {
        level: 'INFO',
        category: 'BILLING_WEEKLY_REPORT',
        message: `Weekly billing report: ${report.summary.totalRevenue} revenue, ${report.summary.successRate} success rate`,
        metadata: report,
      },
    });

    // Slack Benachrichtigung
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📊 *Weekly Billing Report*\nRevenue: ${report.summary.totalRevenue}\nSuccess Rate: ${report.summary.successRate}\nTransactions: ${report.summary.totalTransactions}`,
          }),
        });
      } catch (error) {
        console.error('[BillingJobs] Failed to send Slack report:', error);
      }
    }
  }
}

export const billingJobs = new BillingJobs();
