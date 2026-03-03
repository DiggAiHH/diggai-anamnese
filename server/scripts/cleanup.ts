/**
 * Datenbereinigung gemäß Art. 5 Abs. 1 lit. e DSGVO (Speicherbegrenzung)
 * 
 * Löscht abgeschlossene Sessions älter als die konfigurierte Aufbewahrungsfrist.
 * Standard: 90 Tage (anpassbar über RETENTION_DAYS Umgebungsvariable)
 * 
 * HINWEIS: § 630f BGB schreibt 10 Jahre Aufbewahrung für Behandlungsdokumentation vor.
 * Dieses Script löscht nur DIGITALE Sessions, nicht die in der PVS gespeicherten Daten.
 * 
 * Nutzung: npx tsx server/scripts/cleanup.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    const isDryRun = process.argv.includes('--dry-run');
    const retentionDays = parseInt(process.env.RETENTION_DAYS || '90', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`\n🧹 Datenbereinigung nach DSGVO Art. 5 Abs. 1 lit. e`);
    console.log(`   Aufbewahrungsfrist: ${retentionDays} Tage`);
    console.log(`   Stichtag: ${cutoffDate.toLocaleDateString('de-DE')}`);
    console.log(`   Modus: ${isDryRun ? '🔍 Trockenlauf (keine Löschung)' : '🗑️ Produktiv'}\n`);

    // Abgeschlossene Sessions älter als Stichtag
    const expiredSessions = await prisma.patientSession.findMany({
        where: {
            status: { in: ['COMPLETED', 'SUBMITTED', 'EXPIRED'] },
            createdAt: { lt: cutoffDate },
        },
        select: { id: true, createdAt: true, status: true, selectedService: true },
    });

    console.log(`   Gefunden: ${expiredSessions.length} abgelaufene Session(s)\n`);

    if (expiredSessions.length === 0) {
        console.log('   ✅ Keine Daten zu löschen.\n');
        return;
    }

    for (const s of expiredSessions) {
        console.log(`   • ${s.id.slice(0, 12)}... | ${s.selectedService} | ${s.status} | ${new Date(s.createdAt).toLocaleDateString('de-DE')}`);
    }

    if (isDryRun) {
        console.log('\n   ℹ️  Trockenlauf – keine Daten gelöscht.');
        console.log('   Führen Sie ohne --dry-run aus, um zu löschen.\n');
        return;
    }

    // Kaskadierendes Löschen: Answers, TriageEvents, ChatMessages werden via ON DELETE CASCADE mitgelöscht
    const deleted = await prisma.patientSession.deleteMany({
        where: {
            id: { in: expiredSessions.map(s => s.id) },
        },
    });

    // Audit-Log
    await prisma.auditLog.create({
        data: {
            action: 'DATA_CLEANUP',
            resource: 'sessions',
            metadata: JSON.stringify({
                deletedCount: deleted.count,
                retentionDays,
                cutoffDate: cutoffDate.toISOString(),
                sessionIds: expiredSessions.map(s => s.id),
            }),
        },
    });

    // Alte Audit-Logs bereinigen (1 Jahr Aufbewahrung)
    const auditCutoff = new Date();
    auditCutoff.setFullYear(auditCutoff.getFullYear() - 1);
    const deletedAudits = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: auditCutoff } },
    });

    console.log(`\n   ✅ ${deleted.count} Session(s) gelöscht (inkl. Antworten, Triage, Chat)`);
    console.log(`   ✅ ${deletedAudits.count} alte Audit-Log-Einträge bereinigt`);
    console.log(`   📝 Löschung im Audit-Log protokolliert\n`);
}

cleanup()
    .catch((e: Error) => {
        console.error('❌ Bereinigungsfehler:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
