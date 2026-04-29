/**
 * Tomedo Dead Letter Queue (DLQ) Service
 * 
 * Verwaltet fehlgeschlagene Sync-Operationen für spätere Wiederholung.
 * 
 * @phase PHASE_3_REAL_SYNC - Dead Letter Queue
 */

import { getRedisClient } from '../../redis.js';
import { createLogger } from '../../logger.js';
import { createTomedoApiClient, type Karteieintrag } from './tomedo-api.client.js';
import type { PvsConnectionData } from './types.js';

const logger = createLogger('TomedoDLQ');

const DLQ_KEY = 'tomedo-bridge:dlq';
const DLQ_PROCESSING_KEY = 'tomedo-bridge:dlq:processing';
const DLQ_TTL = 7 * 24 * 60 * 60; // 7 days
const MAX_RETRIES = 3;

export interface DLQItem {
    id: string;
    patientSessionId: string;
    tenantId: string;
    connectionId: string;
    type: 'documentation' | 'patient' | 'fallakte' | 'composition';
    payload: {
        documentation?: {
            content: string;
            karteityp: string;
            icd10Codes?: string[];
        };
        patientData?: {
            firstName: string;
            lastName: string;
            birthDate?: string;
            gender?: 'male' | 'female' | 'other' | 'unknown';
        };
        fallakteId?: string;
        patientId?: string;
    };
    error: string;
    traceId: string;
    failedAt: string;
    retryCount: number;
    lastRetryAt?: string;
}

export interface DLQStats {
    total: number;
    pending: number;
    processing: number;
    failed: number;
    byType: Record<string, number>;
}

export class TomedoDLQService {
    /**
     * Add an item to the dead letter queue
     */
    async add(item: Omit<DLQItem, 'id' | 'failedAt' | 'retryCount'>): Promise<string> {
        const redis = getRedisClient();
        
        const dlqItem: DLQItem = {
            ...item,
            id: `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            failedAt: new Date().toISOString(),
            retryCount: 0,
        };

        try {
            if (redis) {
                await redis.lpush(DLQ_KEY, JSON.stringify(dlqItem));
                await redis.expire(DLQ_KEY, DLQ_TTL);
            } else {
                // Fallback to database
                await this.addToDatabase(dlqItem);
            }

            logger.info('[TomedoDLQ] Item added', {
                itemId: dlqItem.id,
                type: dlqItem.type,
                patientSessionId: dlqItem.patientSessionId,
            });

            return dlqItem.id;
        } catch (error) {
            logger.error('[TomedoDLQ] Failed to add item', {
                error: error instanceof Error ? error.message : String(error),
                item,
            });
            throw error;
        }
    }

    /**
     * Get all items from DLQ
     */
    async getAll(): Promise<DLQItem[]> {
        const redis = getRedisClient();
        
        try {
            if (redis) {
                const items = await redis.lrange(DLQ_KEY, 0, -1);
                return items
                    .map(item => {
                        try {
                            return JSON.parse(item) as DLQItem;
                        } catch {
                            return null;
                        }
                    })
                    .filter((item): item is DLQItem => item !== null);
            } else {
                return this.getFromDatabase();
            }
        } catch (error) {
            logger.error('[TomedoDLQ] Failed to get items', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }

    /**
     * Get items pending retry
     */
    async getPending(): Promise<DLQItem[]> {
        const all = await this.getAll();
        return all.filter(item => item.retryCount < MAX_RETRIES);
    }

    /**
     * Process a single DLQ item
     */
    async processItem(item: DLQItem): Promise<{ success: boolean; error?: string }> {
        logger.info('[TomedoDLQ] Processing item', {
            itemId: item.id,
            type: item.type,
            retryCount: item.retryCount,
        });

        try {
            const { prisma } = await import('../../db.js');
            const connection = await prisma.pvsConnection.findFirst({
                where: {
                    id: item.connectionId,
                    pvsType: 'TOMEDO',
                    isActive: true,
                },
            });

            if (!connection) {
                return { success: false, error: 'Connection not found or inactive' };
            }

            const connectionData = this.toConnectionData(connection);
            const client = createTomedoApiClient(connectionData);

            // Test connection
            const test = await client.testConnection();
            if (!test.ok) {
                return { success: false, error: `Tomedo API unavailable: ${test.message}` };
            }

            // Process based on type
            switch (item.type) {
                case 'documentation': {
                    if (!item.payload.fallakteId || !item.payload.documentation) {
                        return { success: false, error: 'Missing fallakteId or documentation' };
                    }

                    const karteieintrag: Karteieintrag = {
                        type: item.payload.documentation.karteityp as 'Befund' | 'Therapieplan' | 'Anamnese' | 'Sonstiges',
                        content: item.payload.documentation.content,
                        icd10Codes: item.payload.documentation.icd10Codes,
                        metadata: {
                            dlqRetry: true,
                            originalTraceId: item.traceId,
                        },
                    };

                    await client.addKarteieintrag(item.payload.fallakteId, karteieintrag);
                    break;
                }

                case 'patient': {
                    if (!item.payload.patientData) {
                        return { success: false, error: 'Missing patientData' };
                    }

                    await client.createPatient(item.payload.patientData);
                    break;
                }

                default:
                    return { success: false, error: `Unsupported type: ${item.type}` };
            }

            // Success - remove from DLQ
            await this.remove(item.id);

            logger.info('[TomedoDLQ] Item processed successfully', {
                itemId: item.id,
                type: item.type,
            });

            return { success: true };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            // Update retry count
            await this.updateRetryCount(item.id);

            logger.warn('[TomedoDLQ] Item processing failed', {
                itemId: item.id,
                error: errorMsg,
                retryCount: item.retryCount + 1,
            });

            return { success: false, error: errorMsg };
        }
    }

    /**
     * Process all pending items
     */
    async processAll(): Promise<{
        processed: number;
        failed: number;
        skipped: number;
    }> {
        const pending = await this.getPending();
        
        let processed = 0;
        let failed = 0;
        let skipped = 0;

        for (const item of pending) {
            // Check if item is being processed by another instance
            if (await this.isProcessing(item.id)) {
                skipped++;
                continue;
            }

            // Mark as processing
            await this.markProcessing(item.id);

            try {
                const result = await this.processItem(item);
                if (result.success) {
                    processed++;
                } else {
                    failed++;
                }
            } catch (error) {
                failed++;
            } finally {
                await this.unmarkProcessing(item.id);
            }

            // Small delay between items to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        logger.info('[TomedoDLQ] Batch processing completed', {
            processed,
            failed,
            skipped,
            total: pending.length,
        });

        return { processed, failed, skipped };
    }

    /**
     * Remove an item from DLQ
     */
    async remove(itemId: string): Promise<void> {
        const redis = getRedisClient();
        
        try {
            if (redis) {
                // Get all items
                const items = await redis.lrange(DLQ_KEY, 0, -1);
                // Find and remove the specific item
                const item = items.find(i => {
                    try {
                        return (JSON.parse(i) as DLQItem).id === itemId;
                    } catch {
                        return false;
                    }
                });
                if (item) {
                    await redis.lrem(DLQ_KEY, 0, item);
                }
            } else {
                // Remove from database
                await this.removeFromDatabase(itemId);
            }
        } catch (error) {
            logger.error('[TomedoDLQ] Failed to remove item', {
                itemId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Get DLQ statistics
     */
    async getStats(): Promise<DLQStats> {
        const all = await this.getAll();
        
        const byType: Record<string, number> = {};
        for (const item of all) {
            byType[item.type] = (byType[item.type] || 0) + 1;
        }

        return {
            total: all.length,
            pending: all.filter(i => i.retryCount < MAX_RETRIES).length,
            processing: all.filter(i => i.lastRetryAt && !i.failedAt).length,
            failed: all.filter(i => i.retryCount >= MAX_RETRIES).length,
            byType,
        };
    }

    /**
     * Clear all items from DLQ
     */
    async clear(): Promise<void> {
        const redis = getRedisClient();
        
        try {
            if (redis) {
                await redis.del(DLQ_KEY);
                await redis.del(DLQ_PROCESSING_KEY);
            } else {
                await this.clearDatabase();
            }

            logger.info('[TomedoDLQ] Queue cleared');
        } catch (error) {
            logger.error('[TomedoDLQ] Failed to clear queue', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private async addToDatabase(item: DLQItem): Promise<void> {
        const { prisma } = await import('../../db.js');
        await prisma.pvsTransferLog.create({
            data: {
                connectionId: item.connectionId,
                direction: 'EXPORT',
                protocol: 'FHIR',
                entityType: 'DLQ',
                entityId: item.patientSessionId,
                status: 'FAILED',
                errorMessage: `DLQ: ${item.error}`,
                rawPayload: JSON.stringify(item),
                pvsReferenceId: item.id,
            },
        });
    }

    private async getFromDatabase(): Promise<DLQItem[]> {
        const { prisma } = await import('../../db.js');
        const logs = await prisma.pvsTransferLog.findMany({
            where: {
                entityType: 'DLQ',
                status: 'FAILED',
            },
            orderBy: { startedAt: 'desc' },
            take: 100,
        });

        return logs
            .filter(log => log.rawPayload)
            .map(log => {
                try {
                    return JSON.parse(log.rawPayload as string) as DLQItem;
                } catch {
                    return null;
                }
            })
            .filter((item): item is DLQItem => item !== null);
    }

    private async removeFromDatabase(itemId: string): Promise<void> {
        const { prisma } = await import('../../db.js');
        await prisma.pvsTransferLog.deleteMany({
            where: {
                pvsReferenceId: itemId,
                entityType: 'DLQ',
            },
        });
    }

    private async clearDatabase(): Promise<void> {
        const { prisma } = await import('../../db.js');
        await prisma.pvsTransferLog.deleteMany({
            where: {
                entityType: 'DLQ',
            },
        });
    }

    private async isProcessing(itemId: string): Promise<boolean> {
        const redis = getRedisClient();
        if (!redis) return false;

        const processing = await redis.sismember(DLQ_PROCESSING_KEY, itemId);
        return processing === 1;
    }

    private async markProcessing(itemId: string): Promise<void> {
        const redis = getRedisClient();
        if (redis) {
            await redis.sadd(DLQ_PROCESSING_KEY, itemId);
            await redis.expire(DLQ_PROCESSING_KEY, 3600); // 1 hour
        }
    }

    private async unmarkProcessing(itemId: string): Promise<void> {
        const redis = getRedisClient();
        if (redis) {
            await redis.srem(DLQ_PROCESSING_KEY, itemId);
        }
    }

    private async updateRetryCount(itemId: string): Promise<void> {
        const redis = getRedisClient();
        
        try {
            if (redis) {
                const items = await redis.lrange(DLQ_KEY, 0, -1);
                for (let i = 0; i < items.length; i++) {
                    const item = JSON.parse(items[i]) as DLQItem;
                    if (item.id === itemId) {
                        item.retryCount++;
                        item.lastRetryAt = new Date().toISOString();
                        await redis.lset(DLQ_KEY, i, JSON.stringify(item));
                        break;
                    }
                }
            }
        } catch (error) {
            logger.error('[TomedoDLQ] Failed to update retry count', {
                itemId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private toConnectionData(connection: Record<string, unknown>): PvsConnectionData {
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
}

// Singleton export
export const tomedoDLQ = new TomedoDLQService();
