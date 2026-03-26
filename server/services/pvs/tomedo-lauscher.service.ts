import { prisma } from '../../db';

/**
 * Tomedo Lauscher Service
 * 
 * Lauscht auf Änderungen in Tomedo (via Polling oder FHIR Subscriptions/Webhooks)
 * und aktualisiert automatisch den Status von Anliegen (Termine, Rezepte etc.) in
 * der Anamnese-App.
 */
export class TomedoLauscherService {
    private isPolling = false;
    private pollInterval: NodeJS.Timeout | null = null;

    /**
     * Startet den Background-Lauscher für eine Praxis
     */
    startLauscher(tenantId: string, intervalMs = 60000) {
        if (this.isPolling) return;
        this.isPolling = true;

        this.pollInterval = setInterval(async () => {
            await this.checkForUpdates(tenantId);
        }, intervalMs);

        console.log(`[Tomedo Lauscher] Aktiviert für Tenant ${tenantId} mit Intervall ${intervalMs}ms`);
    }

    stopLauscher() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isPolling = false;
        console.log(`[Tomedo Lauscher] Deaktiviert`);
    }

    /**
     * Prüft aktiv in Tomedo nach Status-Updates zu exportierten PatientSessions.
     */
    private async checkForUpdates(tenantId: string) {
        try {
            // Finde alle Sessions die zu Tomedo exportiert wurden, aber noch nicht abgeschlossen sind
            const activeSessions = await prisma.patientSession.findMany({
                where: { 
                    tenantId,
                    pvsExported: true,
                    status: { notIn: ['COMPLETED', 'ARCHIVED'] },
                    pvsExportRef: { not: null }
                }
            });

            if (activeSessions.length === 0) return;

            // Hier würde der tatsächliche Tomedo FHIR Call pro Session/Patient passieren.
            // Z.B. PVS Service holt den aktuellen Terminstatus aus Tomedo (Task/Appointment Resource)
            // Falls das Anliegen in Tomedo auf "Erledigt" gesetzt wurde, benachrichtigen wir den Patienten:
            
            for (const session of activeSessions) {
                // Mock-Logik für "Lauscher" Benachrichtigung
                // getStatusFromTomedo(session.pvsExportRef)
                
                // Falls Status == DONE in Tomedo:
                // await prisma.patientSession.update({ ...status: 'COMPLETED' })
                // await emitPatientMessage(session.id, "Ihr Anliegen wurde in der Praxis fertiggestellt.")
            }

        } catch (err) {
            console.error('[Tomedo Lauscher] Polling Error:', err);
        }
    }

    /**
     * Webhook Endpoint Handler: Wird von Tomedo direkt aufgerufen, wenn sich was ändert.
     * Alternative zum Polling.
     */
    async handleWebhookNotification(payload: any) {
        console.log('[Tomedo Lauscher] Webhook Notification empfangen', payload);
        // Verarbeitet die eingehende FHIR Subscription / Notification
    }
}

export const tomedoLauscher = new TomedoLauscherService();
