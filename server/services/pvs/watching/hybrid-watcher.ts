// ============================================
// Hybrid Watcher — File-Watching + Polling Fallback
// ============================================
// Primary: Native File-System Events (Chokidar)
// Fallback: Polling für Netzwerk-Laufwerke und Fehlerfälle

import { watch, type FSWatcher } from 'chokidar';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../../../logger.js';

export type WatcherMode = 'native' | 'polling' | 'hybrid';

export interface HybridWatcherOptions {
  /** Verzeichnis zum Überwachen */
  watchDir: string;
  /** Archiv-Verzeichnis */
  archiveDir?: string;
  /** Datei-Pattern */
  filePattern?: string;
  /** Callback bei neuer Datei */
  onFileAdd?: (filePath: string, stats?: { size: number; mtime: Date }) => void | Promise<void>;
  /** Callback bei Datei-Änderung */
  onFileChange?: (filePath: string, stats?: { size: number; mtime: Date }) => void | Promise<void>;
  /** Callback bei Datei-Löschung */
  onFileUnlink?: (filePath: string) => void | Promise<void>;
  /** Callback bei Fehler */
  onError?: (error: Error, filePath?: string) => void;
  /** Callback bei Mode-Wechsel */
  onModeChange?: (newMode: WatcherMode, reason: string) => void;
  /** Callback bei Ready */
  onReady?: (mode: WatcherMode) => void;
  
  // Native Watcher Optionen
  stabilityThreshold?: number;
  pollInterval?: number;
  ignoreInitial?: boolean;
  
  // Polling Fallback Optionen
  pollIntervalMs?: number;
  enablePollingFallback?: boolean;
  
  // Fehler-Recovery
  maxNativeErrors?: number;
  nativeErrorResetTimeMs?: number;
  switchBackToNativeMs?: number;
  
  // Datei-Filter
  filter?: (filePath: string) => boolean;
}

export interface HybridWatcherStats {
  mode: WatcherMode;
  isRunning: boolean;
  watchedPath: string;
  filesProcessed: number;
  nativeEvents: number;
  pollingScans: number;
  errors: number;
  modeSwitches: number;
  lastModeSwitchAt?: Date;
  startTime?: Date;
  lastPollAt?: Date;
  nativeErrorCount: number;
  isNetworkDrive: boolean;
}

/**
 * Hybrid File Watcher - Kombiniert Native Events mit Polling-Fallback
 * 
 * Strategie:
 * 1. Primary: Native File-System Events (schnell, ressourcenschonend)
 * 2. Fallback: Polling bei Fehlern oder Netzwerk-Laufwerken
 * 3. Auto-Recovery: Zurück zu Native nach Stabilität
 * 
 * Vorteile:
 * - Höchste Performance bei lokaler Verarbeitung
 * - Zuverlässigkeit bei Netzwerk-Laufwerken
 * - Automatische Fehler-Recovery
 * - Kein Datei-Verlust bei Mode-Wechsel
 */
export class HybridWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private options: Required<HybridWatcherOptions>;
  private stats: HybridWatcherStats;
  private processingFiles = new Set<string>();
  private pendingFiles = new Set<string>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private knownFiles = new Map<string, { size: number; mtime: number }>();
  private modeSwitchTimer: NodeJS.Timeout | null = null;
  private nativeErrors: number[] = []; // Zeitstempel der letzten Fehler

  // Defaults
  private static readonly DEFAULTS: Partial<HybridWatcherOptions> = {
    filePattern: '*.gdt',
    stabilityThreshold: 2000,
    pollInterval: 100,
    ignoreInitial: true,
    pollIntervalMs: 30000,
    enablePollingFallback: true,
    maxNativeErrors: 5,
    nativeErrorResetTimeMs: 60000,
    switchBackToNativeMs: 300000, // 5 Minuten
  };

  constructor(options: HybridWatcherOptions) {
    super();
    this.options = { ...HybridWatcher.DEFAULTS, ...options } as Required<HybridWatcherOptions>;
    this.stats = {
      mode: 'native',
      isRunning: false,
      watchedPath: '',
      filesProcessed: 0,
      nativeEvents: 0,
      pollingScans: 0,
      errors: 0,
      modeSwitches: 0,
      nativeErrorCount: 0,
      isNetworkDrive: false,
    };
  }

  /**
   * Watcher starten
   */
  async start(): Promise<void> {
    if (this.stats.isRunning || this.isShuttingDown) {
      throw new Error('Watcher already running or shutting down');
    }

    // Prüfe ob Netzwerk-Laufwerk
    this.stats.isNetworkDrive = await this.detectNetworkDrive();
    
    if (this.stats.isNetworkDrive && this.options.enablePollingFallback) {
      logger.info('[HybridWatcher] Network drive detected, using polling mode');
      await this.startPolling();
    } else {
      await this.startNative();
    }

    this.stats.startTime = new Date();
    this.stats.isRunning = true;
  }

  /**
   * Native File-Watching starten
   */
  private async startNative(): Promise<void> {
    await fs.mkdir(this.options.watchDir, { recursive: true });

    const watchPattern = path.join(this.options.watchDir, this.options.filePattern);
    this.stats.watchedPath = watchPattern;

    logger.info(`[HybridWatcher] Starting native watcher: ${watchPattern}`);

    this.watcher = watch(watchPattern, {
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: this.options.stabilityThreshold,
        pollInterval: this.options.pollInterval,
      },
      ignoreInitial: this.options.ignoreInitial,
      ignorePermissionErrors: true,
      persistent: true,
      depth: 0,
    });

    this.setupNativeHandlers();

    return new Promise((resolve, reject) => {
      if (!this.watcher) {
        reject(new Error('Watcher initialization failed'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Watcher start timeout'));
      }, 10000);

      this.watcher!.once('ready', () => {
        clearTimeout(timeout);
        this.setMode('native', 'Initial start');
        this.options.onReady?.('native');
        resolve();
      });

      this.watcher!.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Polling-Modus starten
   */
  private async startPolling(): Promise<void> {
    await fs.mkdir(this.options.watchDir, { recursive: true });
    this.stats.watchedPath = this.options.watchDir;

    logger.info(`[HybridWatcher] Starting polling watcher: ${this.options.watchDir}`);

    // Initiales Scan
    await this.pollDirectory();

    // Polling-Interval
    this.pollInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.pollDirectory().catch(err => {
          logger.error('[HybridWatcher] Polling error:', err);
        });
      }
    }, this.options.pollIntervalMs);

    this.setMode('polling', this.stats.isNetworkDrive ? 'Network drive detected' : 'Native fallback');
    this.options.onReady?.('polling');
  }

  /**
   * Native Event Handler einrichten
   */
  private setupNativeHandlers(): void {
    if (!this.watcher) return;

    this.watcher.on('add', (filePath: string, stats?: { size: number; mtime: Date }) => {
      if (this.isShuttingDown) return;
      if (this.options.filter && !this.options.filter(filePath)) return;

      this.stats.nativeEvents++;
      this.debounceFileEvent('add', filePath, stats);
    });

    this.watcher.on('change', (filePath: string, stats?: { size: number; mtime: Date }) => {
      if (this.isShuttingDown) return;
      if (this.options.filter && !this.options.filter(filePath)) return;

      this.stats.nativeEvents++;
      this.debounceFileEvent('change', filePath, stats);
    });

    this.watcher.on('unlink', (filePath: string) => {
      if (this.isShuttingDown) return;
      this.handleUnlink(filePath);
    });

    this.watcher.on('error', (error: unknown) => {
      this.handleNativeError(error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * Native Fehler behandeln - ggf. auf Polling wechseln
   */
  private handleNativeError(error: Error): void {
    this.stats.errors++;
    this.nativeErrors.push(Date.now());

    // Alte Fehler entfernen
    const cutoff = Date.now() - this.options.nativeErrorResetTimeMs;
    this.nativeErrors = this.nativeErrors.filter(t => t > cutoff);

    logger.warn(`[HybridWatcher] Native error (${this.nativeErrors.length}/${this.options.maxNativeErrors}):`, error.message);

    if (this.nativeErrors.length >= this.options.maxNativeErrors && this.options.enablePollingFallback) {
      logger.error('[HybridWatcher] Too many native errors, switching to polling');
      this.switchToPolling();
    }

    this.options.onError?.(error);
  }

  /**
   * Zu Polling wechseln
   */
  private async switchToPolling(): Promise<void> {
    if (this.stats.mode === 'polling') return;

    this.setMode('polling', 'Native errors exceeded threshold');

    // Native Watcher stoppen
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Polling starten
    await this.startPolling();

    // Timer für Rückkehr zu Native
    this.scheduleNativeRetry();
  }

  /**
   * Timer für Rückkehr zu Native setzen
   */
  private scheduleNativeRetry(): void {
    if (this.modeSwitchTimer) {
      clearTimeout(this.modeSwitchTimer);
    }

    this.modeSwitchTimer = setTimeout(() => {
      logger.info('[HybridWatcher] Attempting to switch back to native mode...');
      this.trySwitchToNative();
    }, this.options.switchBackToNativeMs);
  }

  /**
   * Versuche zurück zu Native zu wechseln
   */
  private async trySwitchToNative(): Promise<void> {
    if (this.stats.mode !== 'polling') return;

    try {
      // Teste native Watcher
      const testWatcher = watch(this.stats.watchedPath, {
        usePolling: false,
        persistent: false,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Test timeout')), 5000);
        
        testWatcher.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        testWatcher.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      await testWatcher.close();

      // Erfolg! Wechsle zu Native
      await this.stopPolling();
      await this.startNative();
      this.nativeErrors = []; // Fehler zurücksetzen
      
      logger.info('[HybridWatcher] Successfully switched back to native mode');

    } catch (error) {
      logger.warn('[HybridWatcher] Cannot switch to native, staying on polling:', error);
      this.scheduleNativeRetry(); // Nochmal versuchen später
    }
  }

  /**
   * Polling-Scan durchführen
   */
  private async pollDirectory(): Promise<void> {
    this.stats.lastPollAt = new Date();

    try {
      const files = await fs.readdir(this.options.watchDir);
      const gdtFiles = files.filter(f => f.toLowerCase().endsWith('.gdt'));
      const currentFiles = new Map<string, { size: number; mtime: number }>();

      for (const file of gdtFiles) {
        const filePath = path.join(this.options.watchDir, file);
        
        if (this.options.filter && !this.options.filter(filePath)) continue;

        try {
          const stats = await fs.stat(filePath);
          currentFiles.set(filePath, { size: stats.size, mtime: stats.mtime.getTime() });

          const known = this.knownFiles.get(filePath);
          
          if (!known) {
            // Neue Datei
            this.debounceFileEvent('add', filePath, { size: stats.size, mtime: stats.mtime });
          } else if (known.size !== stats.size || known.mtime !== stats.mtime.getTime()) {
            // Geänderte Datei
            this.debounceFileEvent('change', filePath, { size: stats.size, mtime: stats.mtime });
          }
        } catch {
          // Datei wurde zwischen readdir und stat gelöscht
        }
      }

      // Gelöschte Dateien erkennen
      for (const [filePath] of this.knownFiles) {
        if (!currentFiles.has(filePath)) {
          this.handleUnlink(filePath);
        }
      }

      this.knownFiles = currentFiles;
      this.stats.pollingScans++;

    } catch (error) {
      this.stats.errors++;
      logger.error('[HybridWatcher] Poll directory error:', error);
    }
  }

  /**
   * Debouncing für Batch-Verarbeitung
   */
  private debounceFileEvent(
    eventType: 'add' | 'change',
    filePath: string,
    stats?: { size: number; mtime: Date }
  ): void {
    if (this.processingFiles.has(filePath)) {
      this.pendingFiles.add(filePath);
      return;
    }

    if (!this.debounceTimer) {
      this.processFileEvent(eventType, filePath, stats);
      
      this.debounceTimer = setTimeout(() => {
        this.processPendingFiles();
        this.debounceTimer = null;
      }, 50);
    } else {
      this.pendingFiles.add(filePath);
    }
  }

  /**
   * Datei-Event verarbeiten
   */
  private async processFileEvent(
    eventType: 'add' | 'change',
    filePath: string,
    stats?: { size: number; mtime: Date }
  ): Promise<void> {
    if (this.processingFiles.has(filePath)) return;

    this.processingFiles.add(filePath);

    try {
      if (eventType === 'add') {
        await this.options.onFileAdd?.(filePath, stats);
      } else {
        await this.options.onFileChange?.(filePath, stats);
      }
      this.stats.filesProcessed++;
      this.emit('processed', { filePath, eventType });
    } catch (error) {
      this.stats.errors++;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`[HybridWatcher] Error processing ${filePath}:`, err);
      this.options.onError?.(err, filePath);
    } finally {
      this.processingFiles.delete(filePath);
    }
  }

  /**
   * Ausstehende Dateien verarbeiten
   */
  private async processPendingFiles(): Promise<void> {
    const files = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    for (const filePath of files) {
      if (!this.processingFiles.has(filePath)) {
        await this.processFileEvent('change', filePath);
      }
    }
  }

  /**
   * Datei-Löschung behandeln
   */
  private async handleUnlink(filePath: string): Promise<void> {
    this.knownFiles.delete(filePath);
    try {
      await this.options.onFileUnlink?.(filePath);
      this.emit('unlink', filePath);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.onError?.(err, filePath);
    }
  }

  /**
   * Mode setzen
   */
  private setMode(newMode: WatcherMode, reason: string): void {
    if (this.stats.mode === newMode) return;

    const oldMode = this.stats.mode;
    this.stats.mode = newMode;
    this.stats.modeSwitches++;
    this.stats.lastModeSwitchAt = new Date();

    logger.info(`[HybridWatcher] Mode changed: ${oldMode} -> ${newMode} (${reason})`);
    this.emit('modeChange', newMode, reason);
    this.options.onModeChange?.(newMode, reason);
  }

  /**
   * Prüfe ob Netzwerk-Laufwerk
   */
  private async detectNetworkDrive(): Promise<boolean> {
    try {
      // Windows UNC-Pfad
      if (this.options.watchDir.startsWith('\\\\')) {
        return true;
      }

      // Gemountetes Netzwerk-Laufwerk (Windows)
      if (process.platform === 'win32') {
        // Prüfe auf Netzwerk-Laufwerk über fs.stat
        const stats = await fs.stat(this.options.watchDir);
        // Wenn kein lokaler Pfad, vermutlich Netzwerk
        const resolved = await fs.realpath(this.options.watchDir);
        if (!resolved.startsWith('C:') && !resolved.startsWith('D:') && 
            !resolved.startsWith('E:') && !resolved.startsWith('/')) {
          return true;
        }
      }

      // Unix: Prüfe auf NFS/CIFS mount
      if (process.platform !== 'win32') {
        // Vereinfachte Prüfung - in Produktion könnte man /proc/mounts parsen
        const resolved = await fs.realpath(this.options.watchDir);
        // Typische Mount-Punkte
        if (resolved.includes('/mnt/') || resolved.includes('/media/') || 
            resolved.includes('/net/') || resolved.includes('/nfs/')) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Polling stoppen
   */
  private async stopPolling(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Watcher stoppen (Graceful Shutdown)
   */
  async stop(): Promise<void> {
    if (!this.stats.isRunning || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('[HybridWatcher] Stopping watcher...');

    // Timer cleanup
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.modeSwitchTimer) {
      clearTimeout(this.modeSwitchTimer);
      this.modeSwitchTimer = null;
    }

    // Auf Verarbeitungen warten
    const maxWait = 10000;
    const start = Date.now();
    while (this.processingFiles.size > 0 && Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 100));
    }

    await this.processPendingFiles();

    // Cleanup
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    await this.stopPolling();

    this.stats.isRunning = false;
    this.isShuttingDown = false;

    logger.info('[HybridWatcher] Watcher stopped');
    this.emit('stopped');
  }

  /**
   * Aktuelle Statistiken
   */
  getStats(): HybridWatcherStats {
    return { ...this.stats };
  }

  /**
   * Aktueller Mode
   */
  getMode(): WatcherMode {
    return this.stats.mode;
  }
}
