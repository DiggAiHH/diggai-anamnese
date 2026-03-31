import { prisma } from '../../db';
import { createLogger } from '../../logger.js';
import { completeVersand, markVersandProcessed } from '../export/versand.service.js';
import { pvsRouter } from './pvs-router.service.js';
import {
    buildScopeKey,
    buildStatusEventKey,
    clampPollingIntervalMs,
    mapSyncStatusToVersand,
    pruneEventCache,
    shouldImportPatient,
    toSafeSyncError,
    type ScopeIdentity,
} from './tomedo-import-chain.helpers.js';
import {
    extractFhirReferences,
    normalizeTomedoStatus,
    type TomedoStatusSnapshot,
} from './tomedo-status.mapper.js';
import type { PvsAdapter, PvsConnectionData } from './types.js';

const logger = createLogger('TomedoLauscher');

const EVENT_TTL_MS = 60 * 60 * 1000;
const MAX_EVENT_CACHE_ENTRIES = 5000;

type LauscherState = 'started' | 'already_running' | 'stopped' | 'already_stopped' | 'skipped';

interface TomedoStatusCapableAdapter extends PvsAdapter {
    fetchStatusByReference(reference: string): Promise<TomedoStatusSnapshot | null>;
}

interface ActiveSession {
    id: string;
    patientId: string | null;
    pvsExportRef: string | null;
}

interface ActiveLauscher {
    tenantId: string;
    connection: PvsConnectionData;
    timer: NodeJS.Timeout;
    stats: TomedoLauscherStats;
    processedEventIds: Map<string, number>;
    pollInFlight: boolean;
}

interface LauscherBaseOptions {
    intervalMs?: number;
}

export interface TomedoLauscherStats {
    running: boolean;
    intervalMs: number;
    startedAt: Date;
    lastPollAt: Date | null;
    lastEventAt: Date | null;
    lastImportAt: Date | null;
    processedEvents: number;
    triggeredImports: number;
    skippedEvents: number;
    duplicateEvents: number;
    failedEvents: number;
    lastErrorCode: string | null;
}

export interface TomedoLauscherResult {
    state: LauscherState;
    stats: TomedoLauscherStats | null;
    reason?: string;
}

function supportsTomedoStatus(adapter: PvsAdapter): adapter is TomedoStatusCapableAdapter {
    return typeof (adapter as Partial<TomedoStatusCapableAdapter>).fetchStatusByReference === 'function';
}

function isTomedoConnection(connection: PvsConnectionData): boolean {
    return connection.pvsType === 'TOMEDO' && connection.protocol === 'FHIR';
}

/**
 * Tomedo Lauscher Service
 *
 * Polling-/Webhook-basierte Status-Synchronisation für Tomedo-Exports.
 * Aktualisiert Versandstatus (ohne PHI-Logging) und stößt bei finalen
 * Status-Events den patientenbezogenen Import-Chain-Schritt an.
 */
export class TomedoLauscherService {
    private watchers = new Map<string, ActiveLauscher>();

    startLauscher(
        tenantId: string,
        connection: PvsConnectionData,
        options: LauscherBaseOptions = {},
    ): TomedoLauscherResult {
        if (!isTomedoConnection(connection)) {
            return {
                state: 'skipped',
                stats: null,
                reason: 'unsupported_connection',
            };
        }

        const scope: ScopeIdentity = { tenantId, connectionId: connection.id };
        const scopeKey = buildScopeKey(scope);
        const existing = this.watchers.get(scopeKey);

        if (existing) {
            return {
                state: 'already_running',
                stats: this.cloneStats(existing.stats),
            };
        }

        const fallbackInterval = connection.syncIntervalSec > 0
            ? connection.syncIntervalSec * 1000
            : 60_000;
        const intervalMs = clampPollingIntervalMs(options.intervalMs, fallbackInterval);
        const stats = this.createInitialStats(intervalMs);

        const timer = setInterval(() => {
            void this.checkForUpdates(scope);
        }, intervalMs);

        const watcher: ActiveLauscher = {
            tenantId,
            connection,
            timer,
            stats,
            processedEventIds: new Map(),
            pollInFlight: false,
        };

        this.watchers.set(scopeKey, watcher);

        void this.checkForUpdates(scope);

        logger.info('Tomedo-Lauscher aktiviert', {
            tenantId,
            connectionId: connection.id,
            intervalMs,
        });

        return {
            state: 'started',
            stats: this.cloneStats(stats),
        };
    }

    stopLauscher(tenantId: string, connectionId: string): TomedoLauscherResult {
        const scopeKey = buildScopeKey({ tenantId, connectionId });
        const watcher = this.watchers.get(scopeKey);

        if (!watcher) {
            return {
                state: 'already_stopped',
                stats: null,
            };
        }

        clearInterval(watcher.timer);
        watcher.stats.running = false;
        this.watchers.delete(scopeKey);

        logger.info('Tomedo-Lauscher deaktiviert', {
            tenantId,
            connectionId,
        });

        return {
            state: 'stopped',
            stats: this.cloneStats(watcher.stats),
        };
    }

    getStats(tenantId: string, connectionId: string): TomedoLauscherStats | null {
        const watcher = this.watchers.get(buildScopeKey({ tenantId, connectionId }));
        if (!watcher) {
            return null;
        }

        return this.cloneStats(watcher.stats);
    }

    isRunning(tenantId: string, connectionId: string): boolean {
        return this.watchers.has(buildScopeKey({ tenantId, connectionId }));
    }

    registerEventId(
        tenantId: string,
        connectionId: string,
        eventId: string,
        force = false,
    ): 'accepted' | 'duplicate' | 'scope_missing' {
        const watcher = this.watchers.get(buildScopeKey({ tenantId, connectionId }));
        if (!watcher) {
            return 'scope_missing';
        }

        const normalizedEventId = eventId.trim();
        if (!normalizedEventId) {
            return 'accepted';
        }

        return this.upsertEventId(watcher, normalizedEventId, force);
    }

    /**
     * Webhook Endpoint Handler: Wird von Tomedo aufgerufen, wenn sich Status ändert.
     */
    async handleWebhookNotification(payload: unknown): Promise<{ processed: boolean; reason?: string }> {
        if (!payload || typeof payload !== 'object') {
            return { processed: false, reason: 'invalid_payload' };
        }

        const data = payload as Record<string, unknown>;
        const tenantId = typeof data.tenantId === 'string' ? data.tenantId : '';
        const connectionId = typeof data.connectionId === 'string' ? data.connectionId : '';
        const reference = typeof data.reference === 'string' ? data.reference : '';
        const sessionId = typeof data.sessionId === 'string' ? data.sessionId : 'webhook-session';
        const statusEventId = typeof data.statusEventId === 'string' ? data.statusEventId.trim() : '';

        if (!tenantId || !connectionId || !reference) {
            return { processed: false, reason: 'missing_scope_or_reference' };
        }

        const watcher = this.watchers.get(buildScopeKey({ tenantId, connectionId }));
        if (!watcher) {
            return { processed: false, reason: 'scope_not_running' };
        }

        const adapter = await this.getStatusAdapter(watcher.connection);
        if (!adapter) {
            return { processed: false, reason: 'adapter_not_supported' };
        }

        const rawStatus = typeof data.statusCode === 'string' ? data.statusCode : null;
        const snapshot: TomedoStatusSnapshot = {
            reference,
            resourceType: typeof data.resourceType === 'string' ? data.resourceType : 'Task',
            resourceId: typeof data.resourceId === 'string' ? data.resourceId : 'unknown',
            rawStatus,
            normalizedStatus: normalizeTomedoStatus(rawStatus),
            patientExternalId: typeof data.pvsPatientId === 'string' ? data.pvsPatientId : null,
            lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : new Date().toISOString(),
        };

        await this.handleStatusSnapshot(
            watcher,
            {
                id: sessionId,
                patientId: null,
                pvsExportRef: reference,
            },
            snapshot,
            adapter,
            statusEventId || undefined,
        );

        return { processed: true };
    }

    private createInitialStats(intervalMs: number): TomedoLauscherStats {
        return {
            running: true,
            intervalMs,
            startedAt: new Date(),
            lastPollAt: null,
            lastEventAt: null,
            lastImportAt: null,
            processedEvents: 0,
            triggeredImports: 0,
            skippedEvents: 0,
            duplicateEvents: 0,
            failedEvents: 0,
            lastErrorCode: null,
        };
    }

    private cloneStats(stats: TomedoLauscherStats): TomedoLauscherStats {
        return {
            ...stats,
            startedAt: new Date(stats.startedAt),
            lastPollAt: stats.lastPollAt ? new Date(stats.lastPollAt) : null,
            lastEventAt: stats.lastEventAt ? new Date(stats.lastEventAt) : null,
            lastImportAt: stats.lastImportAt ? new Date(stats.lastImportAt) : null,
        };
    }

    /**
     * Prüft aktiv in Tomedo nach Status-Updates zu exportierten PatientSessions.
     */
    private async checkForUpdates(scope: ScopeIdentity): Promise<void> {
        const scopeKey = buildScopeKey(scope);
        const watcher = this.watchers.get(scopeKey);

        if (!watcher || watcher.pollInFlight) {
            return;
        }

        watcher.pollInFlight = true;
        watcher.stats.lastPollAt = new Date();

        try {
            const activeSessions = await prisma.patientSession.findMany({
                where: {
                    tenantId: watcher.tenantId,
                    pvsExported: true,
                    pvsExportRef: { not: null },
                    status: { notIn: ['COMPLETED', 'ARCHIVED', 'EXPIRED'] },
                },
                select: {
                    id: true,
                    patientId: true,
                    pvsExportRef: true,
                },
            }) as ActiveSession[];

            if (activeSessions.length === 0) {
                return;
            }

            const adapter = await this.getStatusAdapter(watcher.connection);
            if (!adapter) {
                watcher.stats.skippedEvents += activeSessions.length;
                return;
            }

            for (const session of activeSessions) {
                const references = extractFhirReferences(session.pvsExportRef);
                if (references.length === 0) {
                    watcher.stats.skippedEvents++;
                    continue;
                }

                for (const reference of references) {
                    try {
                        const snapshot = await adapter.fetchStatusByReference(reference.normalized);
                        if (!snapshot) {
                            watcher.stats.skippedEvents++;
                            continue;
                        }

                        await this.handleStatusSnapshot(watcher, session, snapshot, adapter);
                    } catch (error) {
                        this.bumpFailure(watcher, error, {
                            tenantId: watcher.tenantId,
                            connectionId: watcher.connection.id,
                            sessionId: session.id,
                            reference: reference.normalized,
                        });
                    }
                }
            }
        } catch (error) {
            this.bumpFailure(watcher, error, {
                tenantId: watcher.tenantId,
                connectionId: watcher.connection.id,
                reason: 'polling_failed',
            });
        } finally {
            watcher.pollInFlight = false;
        }
    }

    private async getStatusAdapter(connection: PvsConnectionData): Promise<TomedoStatusCapableAdapter | null> {
        const adapter = await pvsRouter.getAdapter(connection);
        if (!supportsTomedoStatus(adapter)) {
            return null;
        }

        return adapter;
    }

    private async handleStatusSnapshot(
        watcher: ActiveLauscher,
        session: ActiveSession,
        snapshot: TomedoStatusSnapshot,
        adapter: TomedoStatusCapableAdapter,
        overrideEventId?: string,
    ): Promise<void> {
        const eventId = overrideEventId || buildStatusEventKey({
            tenantId: watcher.tenantId,
            connectionId: watcher.connection.id,
            sessionId: session.id,
            reference: snapshot.reference,
            normalizedStatus: snapshot.normalizedStatus,
            patientExternalId: snapshot.patientExternalId,
            lastUpdated: snapshot.lastUpdated,
        });

        const eventState = this.upsertEventId(watcher, eventId);
        if (eventState === 'duplicate') {
            watcher.stats.duplicateEvents++;
            return;
        }

        watcher.stats.processedEvents++;
        watcher.stats.lastEventAt = new Date();

        const transitioned = await this.maybeTransitionVersand(session.id, snapshot, watcher);
        const canImport = shouldImportPatient(snapshot.normalizedStatus) && Boolean(snapshot.patientExternalId);

        if (!canImport || !snapshot.patientExternalId) {
            if (!transitioned) {
                watcher.stats.skippedEvents++;
            }
            return;
        }

        await this.maybeImportPatient(watcher, session, snapshot, adapter);
    }

    private async maybeTransitionVersand(
        sessionId: string,
        snapshot: TomedoStatusSnapshot,
        watcher: ActiveLauscher,
    ): Promise<boolean> {
        const targetStatus = mapSyncStatusToVersand(snapshot.normalizedStatus);
        if (!targetStatus) {
            return false;
        }

        try {
            if (targetStatus === 'VERARBEITET') {
                await markVersandProcessed(sessionId);
            } else {
                await completeVersand(sessionId);
            }

            return true;
        } catch (error) {
            const safeError = toSafeSyncError(error);
            logger.warn('Versandstatus konnte nicht synchronisiert werden', {
                tenantId: watcher.tenantId,
                connectionId: watcher.connection.id,
                sessionId,
                errorCode: safeError.code,
            });

            return false;
        }
    }

    private async maybeImportPatient(
        watcher: ActiveLauscher,
        session: ActiveSession,
        snapshot: TomedoStatusSnapshot,
        adapter: TomedoStatusCapableAdapter,
    ): Promise<void> {
        const patientExternalId = snapshot.patientExternalId;
        if (!patientExternalId) {
            watcher.stats.skippedEvents++;
            return;
        }

        try {
            const importedPatient = await adapter.importPatient(patientExternalId);
            const importedResourceType = typeof importedPatient === 'object'
                && importedPatient
                && typeof (importedPatient as { resourceType?: unknown }).resourceType === 'string'
                ? (importedPatient as { resourceType: string }).resourceType
                : null;

            await prisma.pvsTransferLog.create({
                data: {
                    connectionId: watcher.connection.id,
                    direction: 'IMPORT',
                    protocol: 'FHIR',
                    status: 'COMPLETED',
                    entityType: 'Patient',
                    entityId: patientExternalId,
                    resourceType: snapshot.resourceType,
                    pvsReferenceId: snapshot.reference,
                    completedAt: new Date(),
                    initiatedBy: 'system:tomedo-lauscher',
                    transformedData: {
                        source: 'tomedo-status-sync',
                        sessionId: session.id,
                        normalizedStatus: snapshot.normalizedStatus,
                        importedResourceType,
                    },
                },
            });

            if (session.patientId) {
                await prisma.pvsPatientLink.upsert({
                    where: {
                        patientId_pvsType: {
                            patientId: session.patientId,
                            pvsType: 'TOMEDO',
                        },
                    },
                    update: {
                        pvsPatientId: patientExternalId,
                        lastSyncAt: new Date(),
                        syncStatus: 'linked',
                    },
                    create: {
                        patientId: session.patientId,
                        pvsType: 'TOMEDO',
                        pvsPatientId: patientExternalId,
                        lastSyncAt: new Date(),
                        syncStatus: 'linked',
                    },
                });
            }

            watcher.stats.triggeredImports++;
            watcher.stats.lastImportAt = new Date();
        } catch (error) {
            const safeError = toSafeSyncError(error);

            watcher.stats.failedEvents++;
            watcher.stats.lastErrorCode = safeError.code;

            await prisma.pvsTransferLog.create({
                data: {
                    connectionId: watcher.connection.id,
                    direction: 'IMPORT',
                    protocol: 'FHIR',
                    status: 'FAILED',
                    entityType: 'Patient',
                    entityId: patientExternalId,
                    resourceType: snapshot.resourceType,
                    pvsReferenceId: snapshot.reference,
                    errorCode: safeError.code,
                    errorMessage: safeError.message,
                    initiatedBy: 'system:tomedo-lauscher',
                    transformedData: {
                        source: 'tomedo-status-sync',
                        sessionId: session.id,
                        normalizedStatus: snapshot.normalizedStatus,
                    },
                },
            });

            logger.warn('Tomedo-Import fehlgeschlagen', {
                tenantId: watcher.tenantId,
                connectionId: watcher.connection.id,
                sessionId: session.id,
                errorCode: safeError.code,
            });
        }
    }

    private bumpFailure(
        watcher: ActiveLauscher,
        error: unknown,
        context: Record<string, unknown>,
    ): void {
        const safeError = toSafeSyncError(error);
        watcher.stats.failedEvents++;
        watcher.stats.lastErrorCode = safeError.code;

        logger.error('Tomedo-Lauscher Polling-Fehler', {
            ...context,
            errorCode: safeError.code,
        });
    }

    private upsertEventId(
        watcher: ActiveLauscher,
        eventId: string,
        force = false,
    ): 'accepted' | 'duplicate' {
        const nowMs = Date.now();
        const pruned = pruneEventCache(
            watcher.processedEventIds,
            nowMs,
            EVENT_TTL_MS,
            MAX_EVENT_CACHE_ENTRIES,
        );

        if (!force && pruned.has(eventId)) {
            watcher.processedEventIds = pruned;
            return 'duplicate';
        }

        const next = new Map(pruned);
        next.set(eventId, nowMs);
        watcher.processedEventIds = next;

        return 'accepted';
    }
}

export const tomedoLauscher = new TomedoLauscherService();
