import * as cron from 'node-cron';
import { cleanupReceptionInboxData } from '../services/mfa/receptionInbox.service';

export async function runReceptionInboxCleanup(): Promise<void> {
  const result = await cleanupReceptionInboxData();

  if (result.deletedTrackings > 0 || result.deletedAuditLogs > 0) {
    console.log(
      `[ReceptionInboxCleanup] gelöscht: ${result.deletedTrackings} Tracking-Einträge, ${result.deletedAuditLogs} Audit-Einträge.`,
    );
  }
}

export function startReceptionInboxCleanupJob(): void {
  console.log('[ReceptionInboxCleanup] Cleanup-Job gestartet (täglich 02:15 Uhr).');

  cron.schedule('15 2 * * *', async () => {
    try {
      await runReceptionInboxCleanup();
    } catch (error) {
      console.error('[ReceptionInboxCleanup] Fehler beim Cleanup:', error);
    }
  });
}