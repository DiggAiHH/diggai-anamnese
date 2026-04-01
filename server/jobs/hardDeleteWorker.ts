// ─── DSGVO Art. 17 Hard-Delete Worker ──────────────────────
// Löscht PatientAccounts die nach der 30-Tage-Karenzzeit
// (deletionScheduledAt) unwiderruflich entfernt werden müssen.
// Läuft täglich um 02:00 Uhr.

import * as cron from 'node-cron';
import { prisma } from '../db';

async function runHardDelete(): Promise<void> {
    const now = new Date();

    // Alle Accounts finden, deren geplante Löschung überfällig ist
    const due = await prisma.patientAccount.findMany({
        where: {
            deletionScheduledAt: { lte: now },
            deletedAt: { not: null },
        },
        select: { id: true },
    });

    if (due.length === 0) return;

    console.log(`[HardDelete] ${due.length} Konto/Konten zur endgültigen Löschung gefunden.`);

    for (const account of due) {
        try {
            // Explizit verknüpfte Daten löschen (DSGVO Art. 17 — vollständige Vernichtung)
            await prisma.diaryEntry.deleteMany({ where: { accountId: account.id } });
            await prisma.measureTracking.deleteMany({ where: { accountId: account.id } });
            await prisma.providerMessage.deleteMany({ where: { accountId: account.id } });
            await prisma.patientConsent.deleteMany({ where: { accountId: account.id } });
            await (prisma as any).consentLog?.deleteMany?.({ where: { accountId: account.id } });

            // SECURITY FIX M5: MedicationReminder explizit löschen
            await (prisma as any).medicationReminder?.deleteMany?.({ where: { accountId: account.id } });

            // WebAuthnCredential + PatientDevice: CASCADE via onDelete auf PatientAccount,
            // aber explizit löschen für Klarheit und Sicherheit
            await prisma.webAuthnCredential.deleteMany({ where: { accountId: account.id } });
            await prisma.patientDevice.deleteMany({ where: { accountId: account.id } });

            // Account selbst löschen
            await prisma.patientAccount.delete({ where: { id: account.id } });

            console.log(`[HardDelete] Konto ${account.id} erfolgreich gelöscht (DSGVO Art. 17).`);
        } catch (err) {
            console.error(`[HardDelete] Fehler beim Löschen von Konto ${account.id}:`, err);
        }
    }
}

export function startHardDeleteWorker(): void {
    console.log('[HardDelete] DSGVO Hard-Delete Worker gestartet (täglich 02:00 Uhr).');

    // Täglich um 02:00 Uhr ausführen
    cron.schedule('0 2 * * *', async () => {
        console.log('[HardDelete] Starte geplante DSGVO-Löschung...');
        await runHardDelete();
    });
}
