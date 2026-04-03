// ─── Billing Monitor Service ───────────────────────────────
// Überwacht Payment-Failures und sendet Alerts
// Tracks Success Rates, Failed Payments, Webhook Health

import { getPrismaClientForDomain } from '../db.js';

const prisma = getPrismaClientForDomain('company');

interface PaymentMetrics {
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  averageAmount: number;
  refunds: number;
  webhookFailures: number;
  totalRevenue?: number;
  byType?: Record<string, number>;
}

interface AlertConfig {
  minSuccessRate: number;      // z.B. 0.95 für 95%
  maxFailedPayments: number;   // z.B. 10 pro Stunde
  webhookTimeoutThreshold: number; // z.B. 5 Sekunden
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  minSuccessRate: 0.95,
  maxFailedPayments: 10,
  webhookTimeoutThreshold: 5000,
};

export class BillingMonitor {
  private alertConfig: AlertConfig;

  constructor(config: Partial<AlertConfig> = {}) {
    this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...config };
  }

  /**
   * Sammelt Payment-Metriken für einen Zeitraum
   */
  async getPaymentMetrics(hours: number = 24): Promise<PaymentMetrics> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const transactions = await (prisma as any).paymentTransaction.findMany({
      where: {
        createdAt: { gte: since },
      },
    });

    const successful = transactions.filter((t: any) => t.status === 'COMPLETED');
    const failed = transactions.filter((t: any) => t.status === 'FAILED');
    const refunded = transactions.filter((t: any) => t.status === 'REFUNDED');

    const totalAmount = successful.reduce((sum: number, t: any) => sum + t.amount, 0);

    return {
      totalTransactions: transactions.length,
      successfulPayments: successful.length,
      failedPayments: failed.length,
      successRate: transactions.length > 0 ? successful.length / transactions.length : 1,
      averageAmount: successful.length > 0 ? totalAmount / successful.length : 0,
      refunds: refunded.length,
      webhookFailures: 0, // Würde aus Logs/Monitoring kommen
    };
  }

  /**
   * Prüft auf Anomalien und sendet Alerts
   */
  async checkAndAlert(): Promise<void> {
    const metrics = await this.getPaymentMetrics(1); // Letzte Stunde

    // Alert: Success Rate zu niedrig
    if (metrics.successRate < this.alertConfig.minSuccessRate && metrics.totalTransactions > 5) {
      await this.sendAlert({
        type: 'LOW_SUCCESS_RATE',
        severity: 'WARNING',
        message: `Payment success rate dropped to ${(metrics.successRate * 100).toFixed(1)}%`,
        metrics,
      });
    }

    // Alert: Zu viele Failed Payments
    if (metrics.failedPayments > this.alertConfig.maxFailedPayments) {
      await this.sendAlert({
        type: 'HIGH_FAILURE_RATE',
        severity: 'CRITICAL',
        message: `${metrics.failedPayments} failed payments in the last hour`,
        metrics,
      });
    }

    // Alert: Anzahl Transaktionen plötzlich sehr niedrig (Stripe API Problem?)
    if (metrics.totalTransactions === 0) {
      const previousHour = await this.getPaymentMetrics(2);
      if (previousHour.totalTransactions > 10) {
        await this.sendAlert({
          type: 'NO_TRANSACTIONS',
          severity: 'WARNING',
          message: 'No transactions in the last hour after high activity',
          metrics,
        });
      }
    }
  }

  /**
   * Sendet Alert (Slack, Email, etc.)
   */
  private async sendAlert(alert: {
    type: string;
    severity: 'WARNING' | 'CRITICAL' | 'INFO';
    message: string;
    metrics: PaymentMetrics;
  }): Promise<void> {
    const timestamp = new Date().toISOString();

    // Loggen
    console.error(`[BillingMonitor] ${alert.severity}: ${alert.message}`, {
      type: alert.type,
      timestamp,
      metrics: alert.metrics,
    });

    // Slack Webhook (falls konfiguriert)
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 *Billing Alert: ${alert.type}*\n${alert.message}\n\nSuccess Rate: ${(alert.metrics.successRate * 100).toFixed(1)}%\nFailed: ${alert.metrics.failedPayments}\nTotal: ${alert.metrics.totalTransactions}`,
          }),
        });
      } catch (error) {
        console.error('[BillingMonitor] Failed to send Slack alert:', error);
      }
    }

    // In Datenbank loggen für Audit
    try {
      await (prisma as any).systemLog.create({
        data: {
          level: alert.severity,
          category: 'BILLING_MONITOR',
          message: alert.message,
          metadata: {
            alertType: alert.type,
            metrics: alert.metrics,
          },
        },
      });
    } catch (error) {
      console.error('[BillingMonitor] Failed to log to database:', error);
    }
  }

  /**
   * Health Check für Billing System
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
  }> {
    const checks: Record<string, boolean> = {
      database: false,
      stripeApi: false,
      webhooks: false,
    };

    try {
      // DB Check
      await (prisma as any).subscription.count();
      checks.database = true;
    } catch (error) {
      console.error('[BillingMonitor] Database health check failed:', error);
    }

    try {
      // Stripe API Check (nur ein einfacher Call)
      const { stripe } = await import('../config/stripe.js');
      await stripe.customers.list({ limit: 1 });
      checks.stripeApi = true;
    } catch (error) {
      console.error('[BillingMonitor] Stripe API health check failed:', error);
    }

    // Webhook Health würde aus Monitoring-Logs kommen
    checks.webhooks = true; // Simplifiziert

    return {
      healthy: Object.values(checks).every(c => c),
      checks,
    };
  }
}

export const billingMonitor = new BillingMonitor();
