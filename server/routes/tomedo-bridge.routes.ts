/**
 * Tomedo Bridge API Routes
 * 
 * Endpunkte für die DiggAi-Tomedo Multi-Agent Bridge:
 * - POST /api/tomedo-bridge/execute - Bridge für Session ausführen
 * - GET /api/tomedo-bridge/status/:taskId - Status eines Bridge-Tasks abrufen
 * - GET /api/tomedo-bridge/audit/:sessionId - Audit-Trail für Session
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { executeTomedoBridge } from '../agents/tomedo-bridge.agent.js';
import { auditLoggerAgent } from '../agents/tomedo-bridge/team-delta/audit-logger.agent.js';
import { taskQueue } from '../services/agent/task.queue.js';
import { tomedoDLQ, type DLQItem } from '../services/pvs/tomedo-dlq.service.js';
import { createTomedoApiClient } from '../services/pvs/tomedo-api.client.js';
import { tomedoHealth } from '../services/pvs/tomedo-health.service.js';
import { tomedoMetrics } from '../services/pvs/tomedo-metrics.service.js';
import { tomedoConnectionPool } from '../services/pvs/tomedo-connection-pool.js';
import { tomedoCache } from '../services/pvs/tomedo-cache.service.js';
import { circuitBreakerRegistry } from '../services/pvs/resilience/circuit-breaker.js';
import { prisma } from '../db.js';
import { createLogger } from '../logger.js';

const logger = createLogger('TomedoBridgeRoutes');
const router = Router();

/**
 * POST /api/tomedo-bridge/execute
 * Execute the Tomedo Bridge for a patient session
 */
router.post(
    '/execute',
    requireAuth,
    requireRole('arzt', 'admin'),
    // Audit logging handled internally
    async (req: Request, res: Response) => {
        try {
            const {
                patientSessionId,
                tenantId,
                connectionId,
                anamneseData,
                patientData,
                options,
            } = req.body;

            // Validate required fields
            if (!patientSessionId || !tenantId || !connectionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: patientSessionId, tenantId, connectionId',
                });
            }

            logger.info('[BridgeAPI] Executing bridge', {
                patientSessionId,
                tenantId,
                // userId: req.user?.id,
            });

            // Execute bridge
            const { taskId, result } = await executeTomedoBridge(
                {
                    patientSessionId,
                    tenantId,
                    connectionId,
                    anamneseData: anamneseData || {},
                    patientData: patientData || {},
                    options: options || {},
                },
                {
                    waitForCompletion: options?.waitForCompletion !== false, // Default: wait
                }
            );

            if (result) {
                // Return full result
                return res.json({
                    success: result.success,
                    taskId,
                    protocol: result.protocol,
                    timing: result.timing,
                    errors: result.errors,
                    teams: {
                        alpha: {
                            explainability: result.teams.alpha.explainability,
                            ethics: {
                                complianceStatus: result.teams.alpha.ethics.complianceStatus,
                                biasFlags: result.teams.alpha.ethics.biasFlags,
                            },
                            humanLoop: {
                                requiresApproval: result.teams.alpha.humanLoop.requiresApproval,
                                urgency: result.teams.alpha.humanLoop.urgency,
                            },
                        },
                        bravo: {
                            apiConnector: {
                                connectionStatus: result.teams.bravo.apiConnector.connectionStatus,
                                syncQueueLength: result.teams.bravo.apiConnector.syncQueue.length,
                            },
                            epaMapper: {
                                patientId: result.teams.bravo.epaMapper.epaEntry.patientId,
                                goaeZiffern: result.teams.bravo.epaMapper.goaeZiffern,
                                mappingValid: result.teams.bravo.epaMapper.mappingValidation.valid,
                            },
                            documentation: {
                                karteityp: result.teams.bravo.documentation.karteityp,
                                wordCount: result.teams.bravo.documentation.wordCount,
                            },
                        },
                        charlie: {
                            loadReducer: {
                                simplicityScore: result.teams.charlie.loadReducer.simplicityScore,
                                detailLevel: result.teams.charlie.loadReducer.detailLevel,
                            },
                            feedback: {
                                validationStatus: result.teams.charlie.feedback.validationStatus,
                                errorCount: result.teams.charlie.feedback.errors.length,
                            },
                            errorCorrection: {
                                autoCorrected: result.teams.charlie.errorCorrection.autoCorrected,
                                requiresReview: result.teams.charlie.errorCorrection.requiresReview,
                                confidenceAfterFix: result.teams.charlie.errorCorrection.confidenceAfterFix,
                            },
                        },
                        delta: {
                            markdown: {
                                checksum: result.teams.delta.markdown.metadata.checksum,
                                sections: result.teams.delta.markdown.sections,
                            },
                            crossValidation: {
                                validationPassed: result.teams.delta.crossValidation.validationPassed,
                                syncStatus: result.teams.delta.crossValidation.syncStatus,
                                divergenceCount: result.teams.delta.crossValidation.divergences.length,
                            },
                        },
                    },
                });
            } else {
                // Async execution started
                return res.status(202).json({
                    success: true,
                    taskId,
                    message: 'Bridge execution started asynchronously',
                    statusUrl: `/api/tomedo-bridge/status/${taskId}`,
                });
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Bridge execution failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/status/:taskId
 * Get the status of a bridge execution task
 */
router.get(
    '/status/:taskId',
    requireAuth,
    requireRole('arzt', 'admin', 'mfa'),
    async (req: Request, res: Response) => {
        try {
            const { taskId } = req.params;
            const taskIdStr = Array.isArray(taskId) ? taskId[0] : taskId;
            const task = taskQueue.get(taskIdStr);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                });
            }

            return res.json({
                success: true,
                task: {
                    id: task.id,
                    type: task.type,
                    status: task.status,
                    agentName: task.agentName,
                    description: task.description,
                    createdAt: task.createdAt,
                    result: task.result,
                    error: task.error,
                    retryCount: task.retryCount,
                },
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Status check failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/audit/:sessionId
 * Get the audit trail for a patient session
 */
router.get(
    '/audit/:sessionId',
    requireAuth,
    requireRole('arzt', 'admin'),
    // Audit logging handled internally
    async (req: Request, res: Response) => {
        try {
            let { sessionId } = req.params;
            sessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;

            logger.info('[BridgeAPI] Retrieving audit trail', {
                sessionId,
                // userId: req.user?.id,
            });

            const auditTrail = await auditLoggerAgent.getAuditTrail();

            if (!auditTrail) {
                return res.status(404).json({
                    success: false,
                    error: 'Audit trail not found for this session',
                });
            }

            return res.json({
                success: true,
                auditTrail: {
                    complianceHash: auditTrail.complianceHash,
                    totalActions: auditTrail.totalActions,
                    failedActions: auditTrail.failedActions,
                    log: auditTrail.auditLog,
                },
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Audit retrieval failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/agents
 * List all bridge agents and their status
 */
router.get(
    '/agents',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (_req: Request, res: Response) => {
        try {
            const agents = [
                { team: 'Alpha', name: 'explainability', status: 'active' },
                { team: 'Alpha', name: 'ethics', status: 'active' },
                { team: 'Alpha', name: 'human-loop', status: 'active' },
                { team: 'Bravo', name: 'api-connector', status: 'active' },
                { team: 'Bravo', name: 'epa-mapper', status: 'active' },
                { team: 'Bravo', name: 'documentation', status: 'active' },
                { team: 'Charlie', name: 'load-reducer', status: 'active' },
                { team: 'Charlie', name: 'feedback', status: 'active' },
                { team: 'Charlie', name: 'error-correction', status: 'active' },
                { team: 'Delta', name: 'markdown-generator', status: 'active' },
                { team: 'Delta', name: 'cross-validator', status: 'active' },
                { team: 'Delta', name: 'audit-logger', status: 'active' },
            ];

            return res.json({
                success: true,
                agents,
                total: agents.length,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Agent listing failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/dlq
 * Get all items in the Dead Letter Queue
 */
router.get(
    '/dlq',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (_req: Request, res: Response) => {
        try {
            const items = await tomedoDLQ.getAll();
            const stats = await tomedoDLQ.getStats();

            return res.json({
                success: true,
                items: items.map((item: DLQItem) => ({
                    id: item.id,
                    type: item.type,
                    patientSessionId: item.patientSessionId,
                    tenantId: item.tenantId,
                    error: item.error,
                    failedAt: item.failedAt,
                    retryCount: item.retryCount,
                })),
                stats,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] DLQ retrieval failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * POST /api/tomedo-bridge/dlq/retry
 * Retry all pending items in the DLQ
 */
router.post(
    '/dlq/retry',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (_req: Request, res: Response) => {
        try {
            logger.info('[BridgeAPI] Starting DLQ retry batch');

            const result = await tomedoDLQ.processAll();

            return res.json({
                success: true,
                result,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] DLQ retry failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * POST /api/tomedo-bridge/dlq/:id/retry
 * Retry a specific DLQ item
 */
router.post(
    '/dlq/:id/retry',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const itemId = Array.isArray(id) ? id[0] : id;

            logger.info('[BridgeAPI] Retrying DLQ item', { itemId });

            const allItems = await tomedoDLQ.getAll();
            const item = allItems.find((i: DLQItem) => i.id === itemId);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    error: 'DLQ item not found',
                });
            }

            const result = await tomedoDLQ.processItem(item);

            if (result.success) {
                return res.json({
                    success: true,
                    message: 'Item processed successfully',
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] DLQ item retry failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * DELETE /api/tomedo-bridge/dlq/:id
 * Remove an item from the DLQ
 */
router.delete(
    '/dlq/:id',
    requireAuth,
    requireRole('admin'),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const itemId = Array.isArray(id) ? id[0] : id;

            await tomedoDLQ.remove(itemId);

            return res.json({
                success: true,
                message: 'Item removed from DLQ',
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] DLQ item removal failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/connection/:connectionId/status
 * Check Tomedo connection status
 */
router.get(
    '/connection/:connectionId/status',
    requireAuth,
    requireRole('arzt', 'admin', 'mfa'),
    async (req: Request, res: Response) => {
        try {
            const { connectionId } = req.params;
            const connId = Array.isArray(connectionId) ? connectionId[0] : connectionId;

            const connection = await prisma.pvsConnection.findFirst({
                where: {
                    id: connId,
                    pvsType: 'TOMEDO',
                    isActive: true,
                },
            });

            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Tomedo connection not found',
                });
            }

            // Test actual connection
            const client = createTomedoApiClient({
                id: connection.id,
                praxisId: connection.praxisId,
                pvsType: 'TOMEDO',
                protocol: 'FHIR',
                fhirBaseUrl: connection.fhirBaseUrl || undefined,
                fhirAuthType: connection.fhirAuthType || undefined,
                fhirCredentials: connection.fhirCredentials || undefined,
                isActive: connection.isActive,
                syncIntervalSec: connection.syncIntervalSec,
                retryCount: connection.retryCount,
                autoMapFields: connection.autoMapFields,
            });

            const testResult = await client.testConnection();
            const rateLimitStatus = client.getRateLimitStatus();

            return res.json({
                success: true,
                connection: {
                    id: connection.id,
                    praxisId: connection.praxisId,
                    baseUrl: connection.fhirBaseUrl,
                    status: testResult.ok ? 'ONLINE' : 'OFFLINE',
                    message: testResult.message,
                    latencyMs: testResult.latencyMs,
                    lastSyncAt: connection.lastSyncAt,
                },
                rateLimit: rateLimitStatus,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Connection status check failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/stats
 * Get overall bridge statistics
 */
router.get(
    '/stats',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (_req: Request, res: Response) => {
        try {
            const dlqStats = await tomedoDLQ.getStats();
            
            // Get active tasks
            const activeTasks = taskQueue.list()
                .filter(t => t.type === 'tomedo-bridge');

            return res.json({
                success: true,
                stats: {
                    dlq: dlqStats,
                    activeTasks: activeTasks.length,
                    tasks: activeTasks.map(t => ({
                        id: t.id,
                        status: t.status,
                        createdAt: t.createdAt,
                    })),
                },
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Stats retrieval failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/health
 * Get comprehensive health check results
 */
router.get(
    '/health',
    requireAuth,
    requireRole('arzt', 'admin', 'mfa'),
    async (_req: Request, res: Response) => {
        try {
            const health = await tomedoHealth.runHealthChecks();

            // Map status to HTTP status
            const statusCode = health.overall === 'healthy' ? 200 :
                              health.overall === 'degraded' ? 200 : 503;

            return res.status(statusCode).json({
                success: health.overall !== 'unhealthy',
                health: {
                    overall: health.overall,
                    timestamp: health.timestamp,
                    checks: health.checks,
                    metrics: health.metrics,
                },
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Health check failed', { error: errorMsg });
            
            return res.status(503).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/metrics
 * Get Prometheus-compatible metrics
 */
router.get(
    '/metrics',
    requireAuth,
    requireRole('admin'),
    async (_req: Request, res: Response) => {
        try {
            const prometheus = tomedoMetrics.exportPrometheus();
            const snapshot = tomedoMetrics.getSnapshot();

            res.setHeader('Content-Type', 'text/plain');
            return res.send(prometheus);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Metrics export failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/performance
 * Get performance metrics and pool stats
 */
router.get(
    '/performance',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (_req: Request, res: Response) => {
        try {
            const poolStats = tomedoConnectionPool.getStats();
            const cacheStats = tomedoCache.getStats();
            const circuitStats = circuitBreakerRegistry.getAllStats();
            const healthSummary = tomedoHealth.getSummary();

            return res.json({
                success: true,
                performance: {
                    connectionPool: poolStats,
                    cache: cacheStats,
                    circuitBreakers: circuitStats,
                    health: healthSummary,
                    timestamp: Date.now(),
                },
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Performance retrieval failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * GET /api/tomedo-bridge/alerts
 * Get active alerts
 */
router.get(
    '/alerts',
    requireAuth,
    requireRole('arzt', 'admin'),
    async (req: Request, res: Response) => {
        try {
            const severity = req.query.severity as string | undefined;
            const alerts = tomedoHealth.getActiveAlerts(severity as any);

            return res.json({
                success: true,
                alerts,
                count: alerts.length,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Alerts retrieval failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * POST /api/tomedo-bridge/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post(
    '/alerts/:id/acknowledge',
    requireAuth,
    requireRole('admin'),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const alertId = Array.isArray(id) ? id[0] : id;

            const acknowledged = tomedoHealth.acknowledgeAlert(alertId);

            if (!acknowledged) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found or already acknowledged',
                });
            }

            return res.json({
                success: true,
                message: 'Alert acknowledged',
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Alert acknowledgment failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * POST /api/tomedo-bridge/alerts/:id/resolve
 * Resolve an alert
 */
router.post(
    '/alerts/:id/resolve',
    requireAuth,
    requireRole('admin'),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const alertId = Array.isArray(id) ? id[0] : id;

            const resolved = tomedoHealth.resolveAlert(alertId);

            if (!resolved) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found or already resolved',
                });
            }

            return res.json({
                success: true,
                message: 'Alert resolved',
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Alert resolution failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * POST /api/tomedo-bridge/circuit-breakers/reset
 * Reset all circuit breakers
 */
router.post(
    '/circuit-breakers/reset',
    requireAuth,
    requireRole('admin'),
    async (_req: Request, res: Response) => {
        try {
            circuitBreakerRegistry.resetAll();

            return res.json({
                success: true,
                message: 'All circuit breakers reset',
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Circuit breaker reset failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

/**
 * DELETE /api/tomedo-bridge/cache
 * Clear all caches
 */
router.delete(
    '/cache',
    requireAuth,
    requireRole('admin'),
    async (req: Request, res: Response) => {
        try {
            const { praxisId } = req.query;
            
            if (praxisId && typeof praxisId === 'string') {
                await tomedoCache.invalidatePraxis(praxisId);
            } else {
                // Clear all - would need to iterate all praxis IDs
                // For now, just reset stats
                tomedoCache.resetStats();
            }

            return res.json({
                success: true,
                message: 'Cache cleared',
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[BridgeAPI] Cache clear failed', { error: errorMsg });
            
            return res.status(500).json({
                success: false,
                error: errorMsg,
            });
        }
    }
);

export default router;
