// ============================================
// Smart Sync Service — Optimiert mit Chokidar
// ============================================
// Echtzeit-Dateiüberwachung mit Hybrid-Watching (Native + Polling)

import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { PvsConnectionData, PatientSessionFull } from '../types.js';
import { pvsRouter } from '../pvs-router.service.js';
import { HybridWatcher, type WatcherMode } from '../watching/hybrid-watcher.js';
import { logger } from '../../../logger.js';

export interface SyncEvent {
  type: 'IMPORT' | 'EXPORT' | 'ERROR';
  connectionId: string;
  pvsType: string;
  timestamp: Date;
  details: {
    fileName?: string;
    patientId?: string;
    success: boolean;
    error?: string;
    durationMs: number;
    watcherMode?: WatcherMode;
  };
}

export interface SyncStats {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  averageDuration: number;
  lastSyncAt: Date | null;
  pendingTransfers: number;
  watcherMode: WatcherMode;
  filesProcessed: number;
  watcherErrors: number;
}

export interface SmartSyncOptions {
  /** Stability threshold für awaitWriteFinish (ms) */
  stabilityThreshold?: number;
  /** Polling-Interval als Fallback (ms) */
  pollIntervalMs?: number;
  /** Automatischer Fallback zu Polling */
  enablePollingFallback?: boolean;
  /** Max Native-Fehler vor Fallback */
  maxNativeErrors?: number;
}

/**
 * Smart Sync Service - Real-time file system watching with Chokidar
 * 
 * Features:
 * - Hybrid Watching: Native Events + Polling Fallback
 * - Graceful Shutdown mit Pending-Transfer-Wartezeit
 * - Konfigurierbare Watch-Optionen
 * - Cross-Platform Support
 * - Race-Condition-Schutz
 */
export class SmartSyncService extends EventEmitter {
  private watchers = new Map<string, HybridWatcher>();
  private syncStats = new Map<string, SyncStats>();
  private pendingTransfers = new Map<string, Promise<void>>();
  private isShuttingDown = false;
  private defaultOptions: SmartSyncOptions;

  constructor(options: SmartSyncOptions = {}) {
    super();
    this.defaultOptions = {
      stabilityThreshold: 2000,
      pollIntervalMs: 30000,
      enablePollingFallback: true,
      maxNativeErrors: 5,
      ...options,
    };
  }

  /**
   * Clear all watchers (for testing)
   */
  clearAllWatchers(): void {
    for (const [connectionId, watcher] of this.watchers) {
      watcher.stop().catch(err => {
        logger.error(`[SmartSync] Error stopping watcher ${connectionId}:`, err);
      });
      this.emit('stopped', { connectionId });
    }
    this.watchers.clear();
    this.syncStats.clear();
  }

  /**
   * Start watching a PVS connection for file changes
   */
  async startWatching(
    connection: PvsConnectionData, 
    options?: Partial<SmartSyncOptions>
  ): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn(`[SmartSync] Cannot start watching ${connection.id}: shutting down`);
      return;
    }

    if (this.watchers.has(connection.id)) {
      logger.debug(`[SmartSync] Already watching ${connection.id}`);
      return;
    }

    if (connection.protocol !== 'GDT') {
      logger.debug(`[SmartSync] Skipping non-GDT connection ${connection.id}`);
      return;
    }

    if (!connection.gdtImportDir) {
      logger.warn(`[SmartSync] No import directory for ${connection.id}`);
      return;
    }

    const opts = { ...this.defaultOptions, ...options };

    // Stats initialisieren
    this.syncStats.set(connection.id, {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      averageDuration: 0,
      lastSyncAt: null,
      pendingTransfers: 0,
      watcherMode: 'native',
      filesProcessed: 0,
      watcherErrors: 0,
    });

    // Hybrid Watcher erstellen
    const watcher = new HybridWatcher({
      watchDir: connection.gdtImportDir,
      archiveDir: path.join(connection.gdtImportDir, 'archiv'),
      filePattern: connection.gdtFilePattern || '*.gdt',
      stabilityThreshold: opts.stabilityThreshold,
      pollIntervalMs: connection.syncIntervalSec * 1000 || opts.pollIntervalMs,
      enablePollingFallback: opts.enablePollingFallback,
      maxNativeErrors: opts.maxNativeErrors,
      ignoreInitial: false, // Initial-Scan für vorhandene Dateien
      
      onFileAdd: (filePath, stats) => this.handleFileEvent(connection, filePath, 'add', stats),
      onFileChange: (filePath, stats) => this.handleFileEvent(connection, filePath, 'change', stats),
      onFileUnlink: (filePath) => this.handleFileUnlink(connection, filePath),
      
      onError: (error, filePath) => {
        logger.error(`[SmartSync] Watcher error for ${connection.id}:`, error);
        const stats = this.syncStats.get(connection.id);
        if (stats) stats.watcherErrors++;
        this.emit('error', { connectionId: connection.id, error: error.message, filePath });
      },
      
      onModeChange: (newMode, reason) => {
        logger.info(`[SmartSync] Mode change for ${connection.id}: ${newMode} (${reason})`);
        const stats = this.syncStats.get(connection.id);
        if (stats) stats.watcherMode = newMode;
        this.emit('modeChange', { connectionId: connection.id, mode: newMode, reason });
      },
      
      onReady: (mode) => {
        logger.info(`[SmartSync] Watcher ready for ${connection.id} (mode: ${mode})`);
        const stats = this.syncStats.get(connection.id);
        if (stats) stats.watcherMode = mode;
      },
    });

    // Watcher starten
    await watcher.start();
    
    this.watchers.set(connection.id, watcher);
    this.emit('watching', { 
      connectionId: connection.id, 
      pvsType: connection.pvsType,
      mode: watcher.getMode(),
    });
  }

  /**
   * Datei-Event behandeln (add/change)
   */
  private async handleFileEvent(
    connection: PvsConnectionData,
    filePath: string,
    eventType: 'add' | 'change',
    stats?: { size: number; mtime: Date }
  ): Promise<void> {
    const fileName = path.basename(filePath);
    const transferKey = `${connection.id}:${fileName}`;

    // Race-Condition-Schutz
    if (this.pendingTransfers.has(transferKey)) {
      logger.debug(`[SmartSync] Transfer already pending: ${transferKey}`);
      return;
    }

    const processPromise = this.processIncomingFile(connection, filePath, fileName);
    this.pendingTransfers.set(transferKey, processPromise);

    try {
      await processPromise;
    } finally {
      this.pendingTransfers.delete(transferKey);
    }
  }

  /**
   * Datei-Löschung behandeln
   */
  private async handleFileUnlink(
    connection: PvsConnectionData,
    filePath: string
  ): Promise<void> {
    logger.debug(`[SmartSync] File unlinked: ${path.basename(filePath)}`);
    // Optional: Event emit für Tracking
    this.emit('fileUnlinked', {
      connectionId: connection.id,
      fileName: path.basename(filePath),
    });
  }

  /**
   * Process incoming GDT file
   */
  private async processIncomingFile(
    connection: PvsConnectionData, 
    filePath: string, 
    fileName: string
  ): Promise<void> {
    const startTime = Date.now();
    const stats = this.syncStats.get(connection.id);

    try {
      // Datei lesen
      const encoding = connection.gdtEncoding || 'latin1';
      const content = await fs.readFile(filePath, { encoding: encoding as BufferEncoding });
      
      // Satzart extrahieren
      const satzart = this.extractSatzart(content);
      
      if (satzart === '6311') {
        this.emit('patientDataReceived', { 
          connectionId: connection.id, 
          fileName, 
          pvsType: connection.pvsType,
        });
      }

      // Archivieren
      await this.archiveFile(connection, filePath, fileName);
      
      // Stats aktualisieren
      this.updateStats(connection.id, true, Date.now() - startTime);
      if (stats) stats.filesProcessed++;

      // Event emit
      this.emitSyncEvent({
        type: 'IMPORT',
        connectionId: connection.id,
        pvsType: connection.pvsType,
        timestamp: new Date(),
        details: { 
          fileName, 
          success: true, 
          durationMs: Date.now() - startTime,
          watcherMode: stats?.watcherMode,
        },
      });

      logger.info(`[SmartSync] Processed ${fileName} for ${connection.id}`);

    } catch (error) {
      this.updateStats(connection.id, false, Date.now() - startTime);
      
      this.emitSyncEvent({
        type: 'ERROR',
        connectionId: connection.id,
        pvsType: connection.pvsType,
        timestamp: new Date(),
        details: { 
          fileName, 
          success: false, 
          error: (error as Error).message, 
          durationMs: Date.now() - startTime,
          watcherMode: stats?.watcherMode,
        },
      });

      logger.error(`[SmartSync] Error processing ${fileName}:`, error);
    }
  }

  /**
   * Satzart aus GDT-Content extrahieren
   */
  private extractSatzart(content: string): string | null {
    const match = content.match(/8000(\d{4})/);
    return match ? match[1] : null;
  }

  /**
   * Datei archivieren
   */
  private async archiveFile(
    connection: PvsConnectionData, 
    filePath: string, 
    fileName: string
  ): Promise<void> {
    if (!connection.gdtImportDir) return;

    const archiveDir = path.join(connection.gdtImportDir, 'archiv');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${timestamp}_${fileName}`;
    const archivePath = path.join(archiveDir, archiveName);

    try {
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.rename(filePath, archivePath);
    } catch {
      // Fallback: Copy + Delete
      try {
        await fs.copyFile(filePath, archivePath);
        await fs.unlink(filePath);
      } catch (copyError) {
        logger.error(`[SmartSync] Failed to archive ${fileName}:`, copyError);
      }
    }
  }

  /**
   * Smart export with retry
   */
  async smartExport(
    connection: PvsConnectionData, 
    session: PatientSessionFull, 
    retryCount = 3
  ): Promise<{ success: boolean; error?: string; attempts: number }> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const result = await pvsRouter.exportAnamnese(connection, session);

        if (result.success) {
          this.updateStats(connection.id, true, Date.now() - startTime);
          this.emitSyncEvent({
            type: 'EXPORT',
            connectionId: connection.id,
            pvsType: connection.pvsType,
            timestamp: new Date(),
            details: { 
              patientId: session.patientId || undefined, 
              success: true, 
              durationMs: Date.now() - startTime,
            },
          });
          return { success: true, attempts: attempt };
        } else {
          lastError = result.error;
          if (attempt < retryCount) {
            await this.delay(Math.pow(2, attempt) * 1000);
          }
        }
      } catch (error) {
        lastError = (error as Error).message;
        if (attempt < retryCount) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    this.updateStats(connection.id, false, Date.now() - startTime);
    return { success: false, error: lastError, attempts: retryCount };
  }

  /**
   * Stats aktualisieren
   */
  private updateStats(connectionId: string, success: boolean, durationMs: number): void {
    const stats = this.syncStats.get(connectionId);
    if (!stats) return;

    stats.totalTransfers++;
    if (success) {
      stats.successfulTransfers++;
    } else {
      stats.failedTransfers++;
    }

    // Rolling average
    const prevAvg = stats.averageDuration;
    const count = stats.totalTransfers;
    stats.averageDuration = (prevAvg * (count - 1) + durationMs) / count;
    
    stats.lastSyncAt = new Date();
    stats.pendingTransfers = this.pendingTransfers.size;
  }

  /**
   * Sync Event emit
   */
  private emitSyncEvent(event: SyncEvent): void {
    this.emit('sync', event);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stats für Connection abrufen
   */
  getStats(connectionId: string): SyncStats | undefined {
    const stats = this.syncStats.get(connectionId);
    const watcher = this.watchers.get(connectionId);
    
    if (stats && watcher) {
      const watcherStats = watcher.getStats();
      return {
        ...stats,
        watcherMode: watcherStats.mode,
        filesProcessed: watcherStats.filesProcessed,
        watcherErrors: watcherStats.errors,
      };
    }
    
    return stats;
  }

  /**
   * Alle Stats abrufen
   */
  getAllStats(): Map<string, SyncStats> {
    return new Map(this.syncStats);
  }

  /**
   * Watching für Connection stoppen
   */
  async stopWatching(connectionId: string): Promise<void> {
    const watcher = this.watchers.get(connectionId);
    if (!watcher) return;

    logger.info(`[SmartSync] Stopping watcher for ${connectionId}`);
    
    await watcher.stop();
    this.watchers.delete(connectionId);
    this.emit('stopped', { connectionId });
  }

  /**
   * Graceful Shutdown - wartet auf alle Pending Transfers
   */
  async shutdown(timeoutMs = 30000): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info('[SmartSync] Starting graceful shutdown...');

    // Auf Pending Transfers warten (mit Timeout)
    if (this.pendingTransfers.size > 0) {
      logger.info(`[SmartSync] Waiting for ${this.pendingTransfers.size} pending transfers...`);
      
      const timeout = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs);
      });

      const waitForTransfers = Promise.all(
        Array.from(this.pendingTransfers.values())
      ).then(() => {});

      try {
        await Promise.race([waitForTransfers, timeout]);
      } catch (error) {
        logger.warn('[SmartSync] Shutdown timeout reached, forcing stop');
      }
    }

    // Alle Watcher stoppen
    const stopPromises = Array.from(this.watchers.entries()).map(
      async ([connectionId, watcher]) => {
        try {
          await watcher.stop();
          this.emit('stopped', { connectionId });
        } catch (error) {
          logger.error(`[SmartSync] Error stopping watcher ${connectionId}:`, error);
        }
      }
    );

    await Promise.all(stopPromises);

    // Cleanup
    this.watchers.clear();
    this.syncStats.clear();
    this.pendingTransfers.clear();
    this.isShuttingDown = false;

    logger.info('[SmartSync] Graceful shutdown complete');
    this.emit('shutdown');
  }

  /**
   * Watcher-Modus für Connection abrufen
   */
  getWatcherMode(connectionId: string): WatcherMode | undefined {
    return this.watchers.get(connectionId)?.getMode();
  }

  /**
   * Prüft ob Connection überwacht wird
   */
  isWatching(connectionId: string): boolean {
    return this.watchers.has(connectionId);
  }

  /**
   * Liste aller überwachten Connections
   */
  getWatchedConnections(): string[] {
    return Array.from(this.watchers.keys());
  }
}

// Singleton-Instanz mit Default-Optionen
export const smartSyncService = new SmartSyncService({
  stabilityThreshold: 2000,
  pollIntervalMs: 30000,
  enablePollingFallback: true,
  maxNativeErrors: 5,
});
