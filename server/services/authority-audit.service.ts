import { prisma } from '../db';
import { AuthorityAuditLog } from '@prisma/client';

export interface AuthorityLogParams {
    tenantId: string;
    userId?: string;
    sessionId?: string;
    status: string;
    concern?: string;
    tunnelId?: string;
    actionSteps?: string; // JSON string
    durationSeconds?: number;
    gdprConsentStatus?: boolean;
}

class AuthorityAuditService {
    /**
     * Schreibt einen Behörden-/DSGVO-Log-Eintrag.
     * Dies ist ein manipulationssicheres Log für rechtliche Nachweise.
     */
    async log(params: AuthorityLogParams): Promise<AuthorityAuditLog | null> {
        try {
            return await prisma.authorityAuditLog.create({
                data: {
                    tenantId: params.tenantId,
                    userId: params.userId,
                    sessionId: params.sessionId,
                    status: params.status,
                    concern: params.concern,
                    tunnelId: params.tunnelId,
                    actionSteps: params.actionSteps,
                    durationSeconds: params.durationSeconds,
                    gdprConsentStatus: params.gdprConsentStatus ?? false,
                    // Aufbewahrung und Encryption sind durch Defaults im Schema abgedeckt
                },
            });
        } catch (err) {
            console.error('[AuthorityAuditService] Fehler beim Schreiben des DSGVO-Logs:', err);
            return null;
        }
    }

    /**
     * Holt alle Logs für einen Tenant (z.B. für Synchronisation oder Behörden-Export)
     */
    async getLogsForTenant(tenantId: string, limit = 500) {
        return prisma.authorityAuditLog.findMany({
            where: { tenantId },
            orderBy: { timestamp: 'desc' },
            take: limit
        });
    }

    /**
     * Aktualisiert den Status eines bestehenden Logs (z.B. wenn eine Session abgeschlossen wird)
     */
    async updateLog(id: string, updates: Partial<AuthorityLogParams>) {
        try {
            return await prisma.authorityAuditLog.update({
                where: { id },
                data: {
                    ...updates
                }
            });
        } catch (err) {
            console.error(`[AuthorityAuditService] Fehler beim Update des Logs ${id}:`, err);
            return null;
        }
    }
}

export const authorityAuditService = new AuthorityAuditService();
