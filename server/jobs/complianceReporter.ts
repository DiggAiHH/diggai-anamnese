// ─── Woechentlicher DSGVO/Compliance-Report ──────────────────
// Laeuft jeden Montag um 06:00 Uhr.
// Prueft: Consent-Abdeckung, Audit-Log-Vollstaendigkeit,
// Triage-Bestaetigungen, Backup-Status, Datenhygiene.

import * as cron from 'node-cron';
import { prisma } from '../db';
import * as fs from 'fs';
import * as path from 'path';

let complianceCron: ReturnType<typeof cron.schedule> | null = null;

const REPORTS_DIR = path.join(process.cwd(), 'compliance-reports');

interface ComplianceMetrics {
    reportDate: string;
    period: { from: string; to: string };
    consent: {
        totalAccounts: number;
        withAllConsents: number;
        coveragePercent: number;
        recentRevocations: number;
    };
    auditLogs: {
        totalEntries: number;
        uniqueAgents: number;
        humanReviewRequired: number;
        humanReviewCompleted: number;
    };
    triage: {
        totalCritical: number;
        acknowledged: number;
        unacknowledged: number;
        avgAckMinutes: number;
    };
    dataHygiene: {
        deletionsPending: number;
        deletionsCompleted: number;
        orphanedRecords: number;
    };
    backup: {
        lastBackupDate: string | null;
        lastBackupStatus: string | null;
        totalBackups: number;
        backupSizeBytes: number;
    };
    overallScore: number; // 0-100
    status: 'COMPLIANT' | 'ATTENTION' | 'NON_COMPLIANT';
}

async function generateComplianceReport(): Promise<ComplianceMetrics> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Consent-Abdeckung
    const [totalAccounts, accountsWithConsent] = await Promise.all([
        prisma.patientAccount.count(),
        prisma.patientConsent.groupBy({
            by: ['accountId'],
            where: { granted: true },
            _count: true,
        }),
    ]);

    const recentRevocations = await prisma.consentLog.count({
        where: { action: 'REVOKED', createdAt: { gte: weekAgo } },
    });

    const consentCoverage = totalAccounts > 0
        ? Math.round((accountsWithConsent.length / totalAccounts) * 100)
        : 100;

    // 2. Audit-Log Vollstaendigkeit
    const [auditTotal, auditAgents, auditReviewRequired, auditReviewDone] = await Promise.all([
        prisma.agentAuditLog.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.agentAuditLog.groupBy({
            by: ['agentId'],
            where: { createdAt: { gte: weekAgo } },
        }),
        prisma.agentAuditLog.count({
            where: { createdAt: { gte: weekAgo }, humanReview: true },
        }),
        prisma.agentAuditLog.count({
            where: { createdAt: { gte: weekAgo }, humanReview: true, humanReviewBy: { not: null } },
        }),
    ]);

    // 3. Triage-Bestaetigungen
    const [totalCritical, acknowledgedCritical] = await Promise.all([
        prisma.triageEvent.count({
            where: { level: 'CRITICAL', createdAt: { gte: weekAgo } },
        }),
        prisma.triageEvent.count({
            where: { level: 'CRITICAL', createdAt: { gte: weekAgo }, acknowledgedBy: { not: null } },
        }),
    ]);

    // Durchschnittliche Bestaetigungszeit
    const ackedEvents = await prisma.triageEvent.findMany({
        where: {
            level: 'CRITICAL',
            createdAt: { gte: weekAgo },
            acknowledgedAt: { not: null },
        },
        select: { createdAt: true, acknowledgedAt: true },
    });
    const avgAckMinutes = ackedEvents.length > 0
        ? ackedEvents.reduce((sum, e) => sum + (e.acknowledgedAt!.getTime() - e.createdAt.getTime()) / 60000, 0) / ackedEvents.length
        : 0;

    // 4. Datenhygiene
    const [deletionsPending, deletionsCompleted] = await Promise.all([
        prisma.patientAccount.count({
            where: { deletionScheduledAt: { not: null }, deletedAt: null },
        }),
        prisma.patientAccount.count({
            where: { deletedAt: { not: null }, deletionScheduledAt: { lte: now } },
        }),
    ]);

    // 5. Backup-Status
    let lastBackup = null;
    let totalBackups = 0;
    let totalSize = 0;
    try {
        const backups = await prisma.backupRecord.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        lastBackup = backups[0] || null;
        totalBackups = backups.length;
        totalSize = backups.reduce((s: number, b) => s + (b.fileSize || 0), 0);
    } catch { /* backupRecord table may not exist yet */ }

    // Score berechnen (0-100)
    let score = 100;
    if (consentCoverage < 90) score -= 20;
    else if (consentCoverage < 95) score -= 10;
    if (totalCritical > 0 && acknowledgedCritical < totalCritical) score -= 15;
    if (avgAckMinutes > 15) score -= 10;
    if (auditReviewRequired > 0 && auditReviewDone < auditReviewRequired) score -= 10;
    if (!lastBackup || (now.getTime() - new Date(lastBackup.createdAt).getTime()) > 48 * 60 * 60 * 1000) score -= 15;
    if (deletionsPending > 10) score -= 5;
    if (recentRevocations > 5) score -= 5;

    const status = score >= 85 ? 'COMPLIANT' : score >= 60 ? 'ATTENTION' : 'NON_COMPLIANT';

    return {
        reportDate: now.toISOString(),
        period: { from: weekAgo.toISOString(), to: now.toISOString() },
        consent: {
            totalAccounts,
            withAllConsents: accountsWithConsent.length,
            coveragePercent: consentCoverage,
            recentRevocations,
        },
        auditLogs: {
            totalEntries: auditTotal,
            uniqueAgents: auditAgents.length,
            humanReviewRequired: auditReviewRequired,
            humanReviewCompleted: auditReviewDone,
        },
        triage: {
            totalCritical,
            acknowledged: acknowledgedCritical,
            unacknowledged: totalCritical - acknowledgedCritical,
            avgAckMinutes: Math.round(avgAckMinutes * 10) / 10,
        },
        dataHygiene: {
            deletionsPending,
            deletionsCompleted,
            orphanedRecords: 0,
        },
        backup: {
            lastBackupDate: lastBackup?.createdAt?.toISOString() || null,
            lastBackupStatus: lastBackup?.status || null,
            totalBackups,
            backupSizeBytes: totalSize,
        },
        overallScore: Math.max(0, score),
        status,
    };
}

async function runComplianceReport(): Promise<void> {
    console.log('[Compliance] Generiere woechentlichen Compliance-Report...');
    try {
        const report = await generateComplianceReport();

        // Als JSON speichern
        if (!fs.existsSync(REPORTS_DIR)) {
            fs.mkdirSync(REPORTS_DIR, { recursive: true });
        }
        const filename = `compliance-${report.reportDate.split('T')[0]}.json`;
        const filepath = path.join(REPORTS_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');

        console.log(`[Compliance] Report erstellt: ${filename} — Score: ${report.overallScore}/100 (${report.status})`);

        if (report.status === 'NON_COMPLIANT') {
            console.error(`[Compliance] ⚠ ACHTUNG: Compliance-Score ist NON_COMPLIANT (${report.overallScore}/100)!`);
        }
    } catch (err) {
        console.error('[Compliance] Report-Generierung fehlgeschlagen:', err);
    }
}

export { generateComplianceReport };

export function startComplianceReporter(): void {
    console.log('[Compliance] Woechentlicher Compliance-Reporter gestartet (Mo 06:00)');

    // Montag 06:00 Uhr
    complianceCron = cron.schedule('0 6 * * 1', async () => {
        await runComplianceReport();
    });
}

export function stopComplianceReporter(): void {
    if (complianceCron) {
        complianceCron.stop();
        complianceCron = null;
        console.log('[Compliance] Reporter gestoppt');
    }
}
