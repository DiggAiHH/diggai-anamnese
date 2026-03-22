// ─── Abrechnungs-Reconciliation Worker ───────────────────────
// Taeglich um 22:00 Uhr: Prueft alle abgeschlossenen Sessions
// auf korrekte Abrechnungszuordnung (GKV/PKV/IGeL/Selbstzahler).
// Identifiziert fehlende Zahlungen und generiert Zusammenfassung.

import * as cron from 'node-cron';
import { prisma } from '../db';
import * as fs from 'fs';
import * as path from 'path';

let billingCron: ReturnType<typeof cron.schedule> | null = null;

const REPORTS_DIR = path.join(process.cwd(), 'billing-reports');

interface BillingDaySummary {
    date: string;
    totalSessions: number;
    completedSessions: number;
    byInsuranceType: Record<string, { count: number; withPayment: number; missingPayment: number }>;
    payments: {
        total: number;
        completed: number;
        pending: number;
        failed: number;
        totalAmount: number;
        completedAmount: number;
    };
    unbilledSessions: Array<{
        sessionId: string;
        service: string;
        insuranceType: string | null;
        completedAt: string | null;
    }>;
    status: 'OK' | 'ATTENTION' | 'ACTION_REQUIRED';
}

async function runBillingReconciliation(): Promise<void> {
    console.log('[Billing] Starte Abrechnungs-Reconciliation...');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    try {
        // Alle heutigen abgeschlossenen Sessions
        const completedSessions = await prisma.patientSession.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: { gte: todayStart, lt: todayEnd },
            },
            select: {
                id: true,
                selectedService: true,
                insuranceType: true,
                completedAt: true,
            },
        });

        const totalSessions = await prisma.patientSession.count({
            where: { createdAt: { gte: todayStart, lt: todayEnd } },
        });

        // Zahlungstransaktionen
        const payments = await prisma.paymentTransaction.findMany({
            where: { createdAt: { gte: todayStart, lt: todayEnd } },
        });

        // Sessions mit und ohne Zahlung abgleichen
        const sessionIdsWithPayment = new Set(payments.map((p) => p.sessionId));
        const byInsurance: Record<string, { count: number; withPayment: number; missingPayment: number }> = {};

        const unbilled: BillingDaySummary['unbilledSessions'] = [];

        for (const session of completedSessions) {
            const ins = session.insuranceType || 'UNBEKANNT';
            if (!byInsurance[ins]) {
                byInsurance[ins] = { count: 0, withPayment: 0, missingPayment: 0 };
            }
            byInsurance[ins].count++;

            if (sessionIdsWithPayment.has(session.id)) {
                byInsurance[ins].withPayment++;
            } else {
                // Nur Selbstzahler und IGeL brauchen zwingend eine Zahlung
                if (['Selbstzahler', 'SELBSTZAHLER', 'PKV'].includes(ins)) {
                    byInsurance[ins].missingPayment++;
                    unbilled.push({
                        sessionId: session.id,
                        service: session.selectedService,
                        insuranceType: session.insuranceType,
                        completedAt: session.completedAt?.toISOString() || null,
                    });
                }
            }
        }

        const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
        const pendingPayments = payments.filter((p) => p.status === 'PENDING');
        const failedPayments = payments.filter((p) => p.status === 'FAILED');

        const status = unbilled.length > 5 ? 'ACTION_REQUIRED'
            : unbilled.length > 0 || failedPayments.length > 0 ? 'ATTENTION'
            : 'OK';

        const summary: BillingDaySummary = {
            date: todayStart.toISOString().split('T')[0],
            totalSessions,
            completedSessions: completedSessions.length,
            byInsuranceType: byInsurance,
            payments: {
                total: payments.length,
                completed: completedPayments.length,
                pending: pendingPayments.length,
                failed: failedPayments.length,
                totalAmount: payments.reduce((s: number, p) => s + (p.amount || 0), 0),
                completedAmount: completedPayments.reduce((s: number, p) => s + (p.amount || 0), 0),
            },
            unbilledSessions: unbilled,
            status,
        };

        // Report speichern
        if (!fs.existsSync(REPORTS_DIR)) {
            fs.mkdirSync(REPORTS_DIR, { recursive: true });
        }
        const filename = `billing-${summary.date}.json`;
        const filepath = path.join(REPORTS_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2), 'utf8');

        console.log(`[Billing] Reconciliation: ${completedSessions.length} Sessions, ${payments.length} Zahlungen, ${unbilled.length} ohne Zahlung (${status})`);

        if (status === 'ACTION_REQUIRED') {
            console.warn(`[Billing] ⚠ ${unbilled.length} Sessions ohne Zahlungszuordnung — manuelle Pruefung erforderlich!`);
        }
    } catch (err) {
        console.error('[Billing] Reconciliation fehlgeschlagen:', err);
    }
}

export function startBillingReconciler(): void {
    const cronExpr = process.env.BILLING_CRON || '0 22 * * *'; // Default: 22:00 taeglich
    console.log(`[Billing] Abrechnungs-Reconciler gestartet (${cronExpr})`);

    billingCron = cron.schedule(cronExpr, async () => {
        await runBillingReconciliation();
    });
}

export function stopBillingReconciler(): void {
    if (billingCron) {
        billingCron.stop();
        billingCron = null;
        console.log('[Billing] Reconciler gestoppt');
    }
}
