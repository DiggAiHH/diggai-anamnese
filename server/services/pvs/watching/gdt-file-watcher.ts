// ============================================
// GDT File Watcher
// ============================================
// Chokidar-basierte Dateiüberwachung mit awaitWriteFinish

import { EventEmitter } from 'events';
import type { FSWatcher } from 'chokidar';

export interface FileWatcherOptions {
  path: string;
  pattern?: string;
  usePolling?: boolean;
  awaitWriteFinish?: {
    stabilityThreshold: number;
    pollInterval: number;
  };
  ignoreInitial?: boolean;
  depth?: number;
}

export interface FileEvent {
  type: 'add' | 'change' | 'unlink' | 'error';
  path: string;
  stats?: {
    size: number;
    mtime: Date;
  };
  timestamp: Date;
}

/**
 * File watcher optimized for GDT files
 * Uses Chokidar with awaitWriteFinish for stability
 */
export class GdtFileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private isWatching = false;
  private processedFiles = new Set<string>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private options: FileWatcherOptions) {
    super();
  }

  /**
   * Start watching
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    try {
      // Dynamic import to avoid issues if chokidar is not installed
      const { watch } = await import('chokidar');

      const watchPath = this.options.pattern 
        ? `${this.options.path}/${this.options.pattern}`
        : this.options.path;

      this.watcher = watch(watchPath, {
        // Performance options
        usePolling: this.options.usePolling ?? false,
        interval: 100,
        binaryInterval: 300,
        
        // Stability options - IMPORTANT for GDT!
        awaitWriteFinish: this.options.awaitWriteFinish ?? {
          stabilityThreshold: 2000, // Wait 2s after last write
          pollInterval: 100,
        },
        
        // Filtering
        ignoreInitial: this.options.ignoreInitial ?? true,
        depth: this.options.depth ?? 1,
        
        // Reliability
        persistent: true,
        ignorePermissionErrors: true,
        
        // Only watch .gdt files
        ignored: /(^|[\/\\])\../, // Ignore hidden files
      });

      this.setupEventHandlers();
      this.isWatching = true;

      // Wait for ready
      await new Promise<void>((resolve, reject) => {
        this.watcher?.once('ready', resolve);
        this.watcher?.once('error', reject);
        setTimeout(resolve, 5000); // Timeout after 5s
      });

      this.emit('ready');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    this.watcher
      .on('add', (path, stats) => this.handleFileEvent('add', path, stats))
      .on('change', (path, stats) => this.handleFileEvent('change', path, stats))
      .on('unlink', (path) => this.handleFileEvent('unlink', path))
      .on('error', (error) => this.emit('error', error));
  }

  /**
   * Handle file event with debouncing
   */
  private handleFileEvent(
    type: 'add' | 'change' | 'unlink',
    filePath: string,
    stats?: { size: number; mtime: Date }
  ): void {
    // Only process .gdt files
    if (!filePath.toLowerCase().endsWith('.gdt')) {
      return;
    }

    const event: FileEvent = {
      type,
      path: filePath,
      stats: stats ? {
        size: stats.size,
        mtime: new Date(stats.mtime),
      } : undefined,
      timestamp: new Date(),
    };

    // Debounce rapid successive events
    const key = `${type}:${filePath}`;
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(key, setTimeout(() => {
      this.debounceTimers.delete(key);
      this.emit('file', event);
      
      if (type === 'add') {
        this.processedFiles.add(filePath);
      } else if (type === 'unlink') {
        this.processedFiles.delete(filePath);
      }
    }, 100));
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.isWatching = false;
    this.emit('stopped');
  }

  /**
   * Check if watching
   */
  getIsWatching(): boolean {
    return this.isWatching;
  }

  /**
   * Get processed files count
   */
  getProcessedCount(): number {
    return this.processedFiles.size;
  }

  /**
   * Clear processed files tracking
   */
  clearProcessed(): void {
    this.processedFiles.clear();
  }

  /**
   * Check if file was already processed
   */
  isProcessed(filePath: string): boolean {
    return this.processedFiles.has(filePath);
  }
}

/**
 * Hybrid Watcher - File watching with polling fallback
 */
export class HybridFileWatcher extends EventEmitter {
  private fileWatcher: GdtFileWatcher;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastPollTime = 0;

  constructor(
    options: FileWatcherOptions,
    private fallbackPollIntervalMs: number = 30000
  ) {
    super();
    this.fileWatcher = new GdtFileWatcher(options);
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    this.fileWatcher.on('file', (event) => this.emit('file', event));
    this.fileWatcher.on('error', (error) => this.emit('error', error));
    this.fileWatcher.on('ready', () => this.emit('ready'));
  }

  /**
   * Start hybrid watching
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      // Try file watching first
      await this.fileWatcher.start();
      
      // Setup polling as backup for network drives
      this.startPollingFallback();
      
      this.emit('started', { mode: 'hybrid' });
    } catch (error) {
      // If file watching fails, use polling only
      this.emit('warning', { message: 'File watching failed, using polling only', error });
      this.startPollingFallback();
      this.emit('started', { mode: 'polling' });
    }
  }

  /**
   * Start polling fallback
   */
  private startPollingFallback(): void {
    this.pollInterval = setInterval(() => {
      this.lastPollTime = Date.now();
      this.emit('poll');
    }, this.fallbackPollIntervalMs);
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    await this.fileWatcher.stop();
    this.emit('stopped');
  }

  /**
   * Get status
   */
  getStatus(): { isRunning: boolean; lastPollTime: number; mode: string } {
    return {
      isRunning: this.isRunning,
      lastPollTime: this.lastPollTime,
      mode: this.fileWatcher.getIsWatching() ? 'hybrid' : 'polling',
    };
  }
}

// Export factory function
export function createGdtWatcher(
  path: string,
  options?: Partial<FileWatcherOptions>
): GdtFileWatcher {
  return new GdtFileWatcher({
    path,
    pattern: '*.gdt',
    ...options,
  });
}

export function createHybridWatcher(
  path: string,
  options?: Partial<FileWatcherOptions>,
  pollIntervalMs?: number
): HybridFileWatcher {
  return new HybridFileWatcher(
    { path, pattern: '*.gdt', ...options },
    pollIntervalMs
  );
}
