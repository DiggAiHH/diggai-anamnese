/**
 * AgentAuditLog Service
 *
 * DSGVO Art. 5 Abs. 2 (Rechenschaftspflicht) + Art. 22 (Automatisierte Entscheidungen):
 * Jede KI-Agenten-Aktion wird unveränderlich geloggt.
 *
 * WICHTIG: Kein PHI (Personal Health Information) in den Logs!
 * Nur anonymisierte/pseudonymisierte Referenzen und Aktions-Metadaten.
 */

import { prisma } from '../db';
import * as crypto from 'crypto';

export type AuditAction =
    | 'task_created'
    | 'task_queued'
    | 'task_started'
    | 'llm_called'
    | 'decision_made'
    | 'task_completed'
    | 'task_failed'
    | 'task_cancelled'
    | 'agent_registered'
    | 'agent_disabled'
    | 'human_review_requested'
    | 'human_review_completed';

export interface AuditLogParams {
    agentId: string;
    taskId?: string;
    action: AuditAction;
    details?: string;
    modelUsed?: string;
    /** Der vollständige Prompt wird NICHT gespeichert — nur sein SHA-256-Hash */
    promptText?: string;
    tokensUsed?: number;
    latencyMs?: number;
    decisionType?: string;
    confidence?: number;
    humanReview?: boolean;
    humanReviewBy?: string;
    /** Rohe IP-Adresse — wird intern gehasht, niemals im Klartext gespeichert */
    ipAddress?: string;
}

class AuditService {
    /**
     * Schreibt einen Audit-Log-Eintrag für eine Agenten-Aktion.
     * Alle PHI-freien Metadaten werden persistiert.
     */
    async log(params: AuditLogParams): Promise<void> {
        try {
            await prisma.agentAuditLog.create({
                data: {
                    agentId:      params.agentId,
                    taskId:       params.taskId,
                    action:       params.action,
                    details:      params.details,
                    modelUsed:    params.modelUsed,
                    // Prompt-Hash: Nachvollziehbarkeit ohne Datenschutzproblem
                    promptHash:   params.promptText
                        ? crypto.createHash('sha256').update(params.promptText).digest('hex')
                        : undefined,
                    tokensUsed:   params.tokensUsed,
                    latencyMs:    params.latencyMs,
                    decisionType: params.decisionType,
                    confidence:   params.confidence,
                    humanReview:  params.humanReview ?? false,
                    humanReviewBy: params.humanReviewBy,
                    // IP-Adresse wird gehasht (DSGVO: keine Klartext-IPs in Logs)
                    ipHash:       params.ipAddress
                        ? crypto.createHash('sha256').update(params.ipAddress).digest('hex')
                        : undefined,
                },
            });
        } catch (err) {
            // Audit-Fehler dürfen den normalen Betrieb nicht unterbrechen
            // aber müssen geloggt werden (Konsole als Fallback)
            console.error('[AuditService] Fehler beim Schreiben des Audit-Logs:', err);
        }
    }

    /**
     * Gibt Audit-Logs für einen Agenten zurück (für Admin-Dashboard).
     * Paginiert, max. 200 Einträge pro Anfrage.
     */
    async getLogsForAgent(agentId: string, limit = 100, offset = 0) {
        return prisma.agentAuditLog.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 200),
            skip: offset,
            select: {
                id: true,
                agentId: true,
                taskId: true,
                action: true,
                details: true,
                modelUsed: true,
                tokensUsed: true,
                latencyMs: true,
                decisionType: true,
                confidence: true,
                humanReview: true,
                humanReviewBy: true,
                createdAt: true,
                // promptHash und ipHash absichtlich nicht exponiert
            },
        });
    }

    /**
     * Gibt Audit-Logs für einen Task zurück.
     */
    async getLogsForTask(taskId: string) {
        return prisma.agentAuditLog.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                agentId: true,
                action: true,
                details: true,
                modelUsed: true,
                tokensUsed: true,
                latencyMs: true,
                decisionType: true,
                confidence: true,
                humanReview: true,
                createdAt: true,
            },
        });
    }

    /**
     * DSGVO-Auskunft: Alle Agenten-Aktionen die eine bestimmte
     * anonymisierte Patienten-Referenz betreffen.
     * (Für Betroffenenrechte nach Art. 15 DSGVO)
     */
    async getLogsForPatientRef(patientRef: string, limit = 50) {
        // Suche über die zugehörigen Tasks
        return prisma.agentAuditLog.findMany({
            where: {
                task: {
                    patientRef,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 200),
            select: {
                id: true,
                agentId: true,
                action: true,
                decisionType: true,
                humanReview: true,
                createdAt: true,
                agent: { select: { name: true, type: true } },
            },
        });
    }

    /**
     * Statistiken für das Admin-Dashboard.
     */
    async getStats(since?: Date) {
        const where = since ? { createdAt: { gte: since } } : {};
        const [total, decisions, humanReviews] = await Promise.all([
            prisma.agentAuditLog.count({ where }),
            prisma.agentAuditLog.count({ where: { ...where, action: 'decision_made' } }),
            prisma.agentAuditLog.count({ where: { ...where, humanReview: true } }),
        ]);
        return { total, decisions, humanReviews };
    }
}

export const auditService = new AuditService();
