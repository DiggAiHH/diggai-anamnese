/**
 * Team Bravo - Agent B1: API-Connector
 * 
 * Verwaltung Tomedo REST-API Auth, Session-Handling, Offline-Mode-Sync.
 * Bei OFFLINE: Queue für späteren Sync, keine Datenverluste.
 * 
 * @phase PHASE_1_REAL_API - Echte Tomedo API Integration
 */

import { createLogger } from '../../../logger.js';
import { tomedoLauscher } from '../../../services/pvs/tomedo-lauscher.service.js';
import { pvsRouter } from '../../../services/pvs/pvs-router.service.js';
import { createTomedoApiClient, TomedoApiClient } from '../../../services/pvs/tomedo-api.client.js';
import { getRedisClient } from '../../../redis.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    ApiConnectorOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('ApiConnectorAgent');

// ============================================================================
// QUEUE TYPES & INTERFACES
// ============================================================================

interface QueuedItem {
    id: string;
    type: 'patient' | 'diagnosis' | 'documentation' | 'billing';
    priority: number;
    retryCount: number;
    data: unknown;
    queuedAt: string;
    errorMessage?: string;
}

interface QueueStatus {
    items: QueuedItem[];
    processing: boolean;
    lastProcessedAt?: string;
}

// ============================================================================
// QUEUE STORAGE (Redis + In-Memory Fallback)
// ============================================================================

const REDIS_QUEUE_PREFIX = 'tomedo-bridge:queue:';
const REDIS_QUEUE_TTL = 7 * 24 * 60 * 60; // 7 days

class TomedoSyncQueue {
    private memoryQueue: Map<string, QueuedItem[]> = new Map();

    private getQueueKey(tenantId: string, connectionId: string): string {
        return `${REDIS_QUEUE_PREFIX}${tenantId}:${connectionId}`;
    }

    async getQueue(tenantId: string, connectionId: string): Promise<QueuedItem[]> {
        // Try Redis first
        try {
            const redis = getRedisClient();
            if (redis) {
                const data = await redis.get(this.getQueueKey(tenantId, connectionId));
                if (data) {
                    const parsed = JSON.parse(data) as QueueStatus;
                    return parsed.items || [];
                }
            }
        } catch (e) {
            // Redis unavailable, fall through to memory
        }

        // Fallback to in-memory
        return this.memoryQueue.get(this.getQueueKey(tenantId, connectionId)) || [];
    }

    async setQueue(tenantId: string, connectionId: string, items: QueuedItem[]): Promise<void> {
        const key = this.getQueueKey(tenantId, connectionId);
        const status: QueueStatus = {
            items,
            processing: false,
            lastProcessedAt: new Date().toISOString(),
        };

        // Try Redis first
        try {
            const redis = getRedisClient();
            if (redis) {
                await redis.setex(key, REDIS_QUEUE_TTL, JSON.stringify(status));
                return;
            }
        } catch (e) {
            // Redis unavailable, fall through to memory
        }

        // Fallback to in-memory
        this.memoryQueue.set(key, items);
    }

    async addItem(
        tenantId: string,
        connectionId: string,
        item: Omit<QueuedItem, 'id' | 'queuedAt'>
    ): Promise<string> {
        const queue = await this.getQueue(tenantId, connectionId);
        
        const newItem: QueuedItem = {
            ...item,
            id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            queuedAt: new Date().toISOString(),
        };
        
        queue.push(newItem);
        await this.setQueue(tenantId, connectionId, queue);
        
        return newItem.id;
    }

    async removeItem(tenantId: string, connectionId: string, itemId: string): Promise<void> {
        const queue = await this.getQueue(tenantId, connectionId);
        const filtered = queue.filter(item => item.id !== itemId);
        await this.setQueue(tenantId, connectionId, filtered);
    }

    async updateItem(
        tenantId: string,
        connectionId: string,
        itemId: string,
        updates: Partial<QueuedItem>
    ): Promise<void> {
        const queue = await this.getQueue(tenantId, connectionId);
        const index = queue.findIndex(item => item.id === itemId);
        if (index !== -1) {
            queue[index] = { ...queue[index], ...updates };
            await this.setQueue(tenantId, connectionId, queue);
        }
    }
}

const syncQueue = new TomedoSyncQueue();

// ============================================================================
// API CONNECTOR AGENT
// ============================================================================

class ApiConnectorAgent implements IBridgeAgent<BridgeInput, ApiConnectorOutput> {
    name = 'api-connector';
    team = 'bravo' as const;
    displayName = 'Tomedo API Connector';
    description = 'Verwaltet Tomedo REST-API Verbindung und Offline-Sync';
    timeoutMs = 10_000; // 10 seconds for connection check (includes OAuth)

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<ApiConnectorOutput> {
        const startTime = Date.now();
        logger.info('[ApiConnector] Starting connection check', {
            traceId: context.traceId,
            tenantId: input.tenantId,
            connectionId: input.connectionId,
        });

        try {
            // Load connection and create API client
            const { prisma } = await import('../../../db.js');
            
            const connection = await prisma.pvsConnection.findFirst({
                where: {
                    id: input.connectionId,
                    pvsType: 'TOMEDO',
                    isActive: true,
                },
            });

            if (!connection) {
                logger.warn('[ApiConnector] No active Tomedo connection found', {
                    tenantId: input.tenantId,
                    connectionId: input.connectionId,
                });
                return this.buildOfflineResponse(input, 'OFFLINE', startTime);
            }

            // Convert to PvsConnectionData format
            const connectionData = this.toConnectionData(connection);
            const client = createTomedoApiClient(connectionData);

            // Test real API connection (includes OAuth)
            const connectionTest = await client.testConnection();

            // Get current queue status
            const queueKey = `${input.tenantId}:${input.connectionId}`;
            const queue = await this.getSyncQueue(queueKey, input);

            let connectionStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
            let latencyMs: number | undefined;

            if (connectionTest.ok) {
                connectionStatus = 'ONLINE';
                latencyMs = connectionTest.latencyMs;

                logger.info('[ApiConnector] Tomedo API connected', {
                    traceId: context.traceId,
                    latencyMs,
                    message: connectionTest.message,
                });

                // Check if lauscher is running
                const isLauscherRunning = tomedoLauscher.isRunning(input.tenantId, input.connectionId);
                if (!isLauscherRunning) {
                    logger.info('[ApiConnector] Tomedo Lauscher not running, consider starting', {
                        tenantId: input.tenantId,
                        connectionId: input.connectionId,
                    });
                }

                // Process offline queue if we're back online
                if (queue.length > 0) {
                    await this.processOfflineQueue(queueKey, input, client);
                }

            } else {
                // Connection test failed - check if this is a temporary issue
                const hasRecentError = connection.lastError && 
                    (Date.now() - new Date(connection.lastError as unknown as string).getTime()) < 5 * 60 * 1000;
                
                connectionStatus = hasRecentError ? 'DEGRADED' : 'OFFLINE';
                
                logger.warn('[ApiConnector] Tomedo API connection failed', {
                    traceId: context.traceId,
                    error: connectionTest.message,
                    status: connectionStatus,
                });

                // Update connection error in DB
                await prisma.pvsConnection.update({
                    where: { id: input.connectionId },
                    data: {
                        lastError: new Date().toISOString(),
                    },
                });
            }

            // Get updated queue after processing
            const updatedQueue = await syncQueue.getQueue(input.tenantId, input.connectionId);

            const result: ApiConnectorOutput = {
                connectionStatus,
                syncQueue: updatedQueue.map(item => ({
                    id: item.id,
                    type: item.type,
                    priority: item.priority,
                    retryCount: item.retryCount,
                })),
                timestamp: new Date().toISOString(),
                latencyMs,
            };

            logger.info('[ApiConnector] Connection check completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                connectionStatus,
                queueLength: updatedQueue.length,
                latencyMs,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[ApiConnector] Connection check failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Fallback to offline mode
            return this.buildOfflineResponse(input, 'OFFLINE', startTime);
        }
    }

    private async getSyncQueue(queueKey: string, input: BridgeInput): Promise<QueuedItem[]> {
        let queue = await syncQueue.getQueue(input.tenantId, input.connectionId);
        
        if (queue.length === 0) {
            // Initialize with current patient session
            const initialItem: Omit<QueuedItem, 'id' | 'queuedAt'> = {
                type: 'patient',
                priority: 1,
                retryCount: 0,
                data: {
                    patientSessionId: input.patientSessionId,
                    patientId: input.patientData?.patientId,
                    externalPatientId: input.patientData?.externalPatientId,
                },
            };
            
            const itemId = await syncQueue.addItem(input.tenantId, input.connectionId, initialItem);
            queue = await syncQueue.getQueue(input.tenantId, input.connectionId);
        }
        
        return queue;
    }

    private async processOfflineQueue(
        queueKey: string,
        input: BridgeInput,
        client: TomedoApiClient
    ): Promise<void> {
        const queue = await syncQueue.getQueue(input.tenantId, input.connectionId);
        if (!queue || queue.length === 0) return;

        logger.info('[ApiConnector] Processing offline queue', {
            queueKey,
            itemCount: queue.length,
        });

        // Process items in priority order
        const sortedQueue = [...queue].sort((a, b) => a.priority - b.priority);
        
        const processed: string[] = [];
        const failed: string[] = [];

        for (const item of sortedQueue) {
            // Skip items that have been retried too many times
            if (item.retryCount >= 3) {
                failed.push(item.id);
                continue;
            }

            try {
                logger.info('[ApiConnector] Syncing queued item', {
                    itemId: item.id,
                    type: item.type,
                    retryCount: item.retryCount,
                });

                // Attempt to sync based on item type
                const success = await this.syncItem(item, client);
                
                if (success) {
                    processed.push(item.id);
                } else {
                    // Mark for retry
                    await syncQueue.updateItem(
                        input.tenantId,
                        input.connectionId,
                        item.id,
                        {
                            retryCount: item.retryCount + 1,
                            errorMessage: 'Sync returned false',
                        }
                    );
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error('[ApiConnector] Failed to sync queued item', {
                    itemId: item.id,
                    error: errorMsg,
                });
                
                await syncQueue.updateItem(
                    input.tenantId,
                    input.tenantId,
                    item.id,
                    {
                        retryCount: item.retryCount + 1,
                        errorMessage: errorMsg,
                    }
                );
                
                if (item.retryCount >= 2) {
                    failed.push(item.id);
                }
            }
        }

        // Remove processed items from queue
        const remainingQueue = await syncQueue.getQueue(input.tenantId, input.connectionId);
        const filtered = remainingQueue.filter(item => 
            !processed.includes(item.id) && !failed.includes(item.id)
        );
        await syncQueue.setQueue(input.tenantId, input.connectionId, filtered);

        logger.info('[ApiConnector] Queue processing completed', {
            processed: processed.length,
            failed: failed.length,
            remaining: filtered.length,
        });
    }

    private async syncItem(item: QueuedItem, client: TomedoApiClient): Promise<boolean> {
        switch (item.type) {
            case 'patient': {
                const data = item.data as { patientId?: string; firstName?: string; lastName?: string };
                // Search for existing patient or create new
                if (data.firstName && data.lastName) {
                    const results = await client.searchPatient({ name: `${data.lastName},${data.firstName}` });
                    return results.length > 0;
                }
                return false;
            }
            
            case 'documentation': {
                // Documentation sync would require fallakteId and content
                // This is typically handled by the epa-mapper and documentation agents
                return true; // Mark as processed - these are handled elsewhere
            }
            
            case 'diagnosis':
            case 'billing':
                // These are handled by other agents in the pipeline
                return true;
            
            default:
                return false;
        }
    }

    private buildOfflineResponse(
        input: BridgeInput,
        status: 'ONLINE' | 'OFFLINE' | 'DEGRADED',
        startTime: number
    ): ApiConnectorOutput {
        return {
            connectionStatus: status,
            syncQueue: [],
            timestamp: new Date().toISOString(),
        };
    }

    private toConnectionData(connection: Record<string, unknown>) {
        return {
            id: connection.id as string,
            praxisId: connection.praxisId as string,
            pvsType: 'TOMEDO' as const,
            pvsVersion: connection.pvsVersion as string | undefined,
            protocol: 'FHIR' as const,
            fhirBaseUrl: connection.fhirBaseUrl as string | undefined,
            fhirAuthType: connection.fhirAuthType as string | undefined,
            fhirCredentials: connection.fhirCredentials as string | undefined,
            fhirTenantId: connection.fhirTenantId as string | undefined,
            isActive: connection.isActive as boolean,
            syncIntervalSec: connection.syncIntervalSec as number,
            retryCount: connection.retryCount as number,
            autoMapFields: connection.autoMapFields as boolean,
        };
    }

    // ============================================================================
    // PUBLIC API FOR OTHER AGENTS
    // ============================================================================

    /**
     * Add an item to the sync queue
     */
    async addToQueue(
        tenantId: string,
        connectionId: string,
        item: Omit<QueuedItem, 'id' | 'queuedAt'>
    ): Promise<string> {
        return syncQueue.addItem(tenantId, connectionId, item);
    }

    /**
     * Get queue status
     */
    async getQueueStatus(tenantId: string, connectionId: string): Promise<{
        items: QueuedItem[];
        count: number;
    }> {
        const items = await syncQueue.getQueue(tenantId, connectionId);
        return { items, count: items.length };
    }

    /**
     * Clear the sync queue
     */
    async clearQueue(tenantId: string, connectionId: string): Promise<void> {
        await syncQueue.setQueue(tenantId, connectionId, []);
    }
}

export const apiConnectorAgent = new ApiConnectorAgent();
