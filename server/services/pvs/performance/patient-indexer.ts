/**
 * Patient Indexer
 *
 * Hintergrund-Indexierung aller GDT-Dateien für O(1) Patientensuche.
 * - Initial-Indexierung beim Start
 * - Inkrementelle Updates bei Dateiänderungen
 * - Parallel-Verarbeitung mit Worker-Pool
 * - Memory-efficient Streaming
 */

import { promises as fs, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join, basename, extname } from 'path';
import { EventEmitter } from 'events';
import { pvsCacheService, type PatientIndexEntry } from '../cache/pvs-cache.service.js';
import { GDT_FIELDS } from '../gdt/gdt-constants.js';
import { createHash } from 'crypto';

// ============================================================
// Types & Configuration
// ============================================================

interface IndexerConfig {
  importDir: string;
  workerCount: number;
  batchSize: number;
  maxConcurrentReads: number;
  indexHiddenFiles: boolean;
  supportedExtensions: string[];
  retryAttempts: number;
  retryDelay: number;
}

interface IndexerStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  indexedPatients: number;
  startTime: number;
  endTime?: number;
  errors: Array<{ file: string; error: string }>;
}

interface FileTask {
  filePath: string;
  priority: number;
  attempts: number;
}

interface FileProcessingResult {
  filePath: string;
  success: boolean;
  patientData?: PatientIndexEntry;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// ============================================================
// Worker Pool
// ============================================================

class WorkerPool extends EventEmitter {
  private workers: Array<{
    id: number;
    busy: boolean;
    currentTask?: FileTask;
  }> = [];
  
  private queue: FileTask[] = [];
  private processing = false;

  constructor(
    private size: number,
    private processor: (task: FileTask) => Promise<FileProcessingResult>
  ) {
    super();
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.size; i++) {
      this.workers.push({ id: i, busy: false });
    }
  }

  /**
   * Task zur Queue hinzufügen
   */
  enqueue(task: FileTask): void {
    // Prioritäts-Queue (höhere Priority = wichtiger)
    const insertIndex = this.queue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }
    this.emit('enqueued', task);
  }

  /**
   * Mehrere Tasks hinzufügen
   */
  enqueueMany(tasks: FileTask[]): void {
    for (const task of tasks) {
      this.enqueue(task);
    }
  }

  /**
   * Verarbeitung starten
   */
  async start(): Promise<FileProcessingResult[]> {
    if (this.processing) {
      throw new Error('Worker pool already running');
    }

    this.processing = true;
    this.emit('started');

    const results: FileProcessingResult[] = [];

    while (this.queue.length > 0 || this.workers.some(w => w.busy)) {
      // Freie Worker zuweisen
      while (this.queue.length > 0) {
        const availableWorker = this.workers.find(w => !w.busy);
        if (!availableWorker) break;

        const task = this.queue.shift()!;
        availableWorker.busy = true;
        availableWorker.currentTask = task;

        this.processTask(availableWorker, task)
          .then(result => {
            results.push(result);
            this.emit('completed', result);
          })
          .catch(error => {
            const errorResult: FileProcessingResult = {
              filePath: task.filePath,
              success: false,
              error: error.message,
            };
            results.push(errorResult);
            this.emit('error', errorResult);
          });
      }

      // Kurze Pause um Event Loop freizugeben
      if (this.queue.length > 0 || this.workers.some(w => w.busy)) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    this.processing = false;
    this.emit('completed:all', results);
    return results;
  }

  /**
   * Queue leeren
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Aktuelle Queue-Größe
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Aktive Worker
   */
  getActiveWorkers(): number {
    return this.workers.filter(w => w.busy).length;
  }

  // ─── Private Methods ─────────────────────────────────────

  private async processTask(
    worker: typeof this.workers[0],
    task: FileTask
  ): Promise<FileProcessingResult> {
    try {
      const result = await this.processor(task);
      worker.busy = false;
      worker.currentTask = undefined;
      return result;
    } catch (error) {
      worker.busy = false;
      worker.currentTask = undefined;
      throw error;
    }
  }
}

// ============================================================
// Patient Indexer
// ============================================================

export class PatientIndexer extends EventEmitter {
  private config: IndexerConfig;
  private stats: IndexerStats = {
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    indexedPatients: 0,
    startTime: 0,
    errors: [],
  };
  private workerPool: WorkerPool;
  private isRunning = false;
  private watcherInitialized = false;
  private indexedFileKeys = new Map<string, string[]>();

  constructor(config: Partial<IndexerConfig> = {}) {
    super();
    
    this.config = {
      importDir: config.importDir ?? './gdt-import',
      workerCount: config.workerCount ?? 4,
      batchSize: config.batchSize ?? 100,
      maxConcurrentReads: config.maxConcurrentReads ?? 10,
      indexHiddenFiles: config.indexHiddenFiles ?? false,
      supportedExtensions: config.supportedExtensions ?? ['.gdt', '.GDT', '.txt', '.TXT'],
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    this.workerPool = new WorkerPool(this.config.workerCount, (task) =>
      this.processFile(task)
    );

    this.setupWorkerListeners();
  }

  // ─── Public API ────────────────────────────────────────────

  /**
   * Vollständige Indexierung starten
   */
  async fullIndex(): Promise<IndexerStats> {
    if (this.isRunning) {
      throw new Error('Indexer already running');
    }

    this.isRunning = true;
    this.resetStats();
    this.stats.startTime = Date.now();

    this.emit('indexing:started', { type: 'full', directory: this.config.importDir });

    try {
      // 1. Alle Dateien sammeln
      const files = await this.collectFiles(this.config.importDir);
      this.stats.totalFiles = files.length;

      this.emit('files:discovered', { count: files.length });

      // 2. Tasks erstellen
      const tasks: FileTask[] = files.map((filePath, index) => ({
        filePath,
        priority: files.length - index, // Ältere zuerst
        attempts: 0,
      }));

      // 3. Verarbeitung starten
      this.workerPool.enqueueMany(tasks);
      const results = await this.workerPool.start();

      // 4. Ergebnisse verarbeiten
      this.processResults(results);

      this.stats.endTime = Date.now();
      
      this.emit('indexing:completed', { stats: this.getStats() });
      
      return this.getStats();
    } catch (error) {
      this.emit('indexing:error', { error });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inkrementelle Indexierung für neue/geänderte Dateien
   */
  async incrementalIndex(changedFiles: string[]): Promise<IndexerStats> {
    if (this.isRunning) {
      throw new Error('Indexer already running');
    }

    this.isRunning = true;
    this.resetStats();
    this.stats.startTime = Date.now();

    this.emit('indexing:started', { type: 'incremental', fileCount: changedFiles.length });

    try {
      const tasks: FileTask[] = changedFiles.map(filePath => ({
        filePath,
        priority: 100, // Hohe Priorität für inkrementelle Updates
        attempts: 0,
      }));

      this.stats.totalFiles = tasks.length;
      this.workerPool.enqueueMany(tasks);
      
      const results = await this.workerPool.start();
      this.processResults(results);

      this.stats.endTime = Date.now();
      
      this.emit('indexing:completed', { stats: this.getStats() });
      
      return this.getStats();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Einzelne Datei indexieren
   */
  async indexFile(filePath: string): Promise<FileProcessingResult> {
    const task: FileTask = {
      filePath,
      priority: 1000, // Höchste Priorität
      attempts: 0,
    };

    return this.processFile(task);
  }

  /**
   * Datei aus Index entfernen
   */
  removeFile(filePath: string): boolean {
    const removed = this.removeIndexedFile(filePath);
    
    if (removed) {
      this.emit('file:removed', { filePath });
    }
    
    return removed;
  }

  /**
   * Datei-Watcher initialisieren
   */
  async initWatcher(): Promise<void> {
    if (this.watcherInitialized) return;

    try {
      const { watch } = await import('fs');
      
      watch(this.config.importDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const filePath = join(this.config.importDir, filename);
        
        // Nur unterstützte Extensions
        const ext = extname(filename);
        if (!this.config.supportedExtensions.includes(ext)) return;

        // Versteckte Dateien ignorieren
        if (!this.config.indexHiddenFiles && basename(filename).startsWith('.')) return;

        if (eventType === 'rename') {
          // Datei gelöscht oder erstellt
          this.handleFileChange(filePath).catch(console.error);
        } else if (eventType === 'change') {
          // Datei geändert
          this.handleFileChange(filePath).catch(console.error);
        }
      });

      this.watcherInitialized = true;
      this.emit('watcher:initialized', { directory: this.config.importDir });
    } catch (error) {
      this.emit('watcher:error', { error });
      throw error;
    }
  }

  /**
   * Aktuelle Statistiken
   */
  getStats(): IndexerStats {
    return { ...this.stats };
  }

  /**
   * Läuft der Indexer?
   */
  isIndexerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Indexer stoppen
   */
  stop(): void {
    this.workerPool.clear();
    this.isRunning = false;
    this.emit('indexing:stopped');
  }

  // ─── Private Methods ─────────────────────────────────────

  private async collectFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const traverse = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile()) {
          // Extension prüfen
          const ext = extname(entry.name);
          if (!this.config.supportedExtensions.includes(ext)) continue;

          // Versteckte Dateien ignorieren
          if (!this.config.indexHiddenFiles && entry.name.startsWith('.')) continue;

          files.push(fullPath);
        }
      }
    };

    await traverse(dir);
    
    // Nach Änderungsdatum sortieren (neueste zuerst)
    const filesWithStats = await Promise.all(
      files.map(async (f) => {
        const stat = await fs.stat(f);
        return { path: f, mtime: stat.mtime.getTime() };
      })
    );
    
    filesWithStats.sort((a, b) => b.mtime - a.mtime);
    return filesWithStats.map(f => f.path);
  }

  private async processFile(task: FileTask): Promise<FileProcessingResult> {
    try {
      // Prüfe ob Datei existiert
      const stat = await fs.stat(task.filePath);
      
      if (!stat.isFile()) {
        return {
          filePath: task.filePath,
          success: false,
          skipped: true,
          skipReason: 'Not a file',
        };
      }

      // Datei parsen
      const patientData = await this.parseGdtFileStreaming(task.filePath);
      
      if (!patientData.patNr) {
        return {
          filePath: task.filePath,
          success: false,
          skipped: true,
          skipReason: 'No patient number found',
        };
      }

      // Index-Eintrag erstellen
      const indexEntry = this.patientDataToIndexEntry(patientData, task.filePath, stat);

      // In Index einfügen
      this.storeIndexEntry(indexEntry);

      return {
        filePath: task.filePath,
        success: true,
        patientData: indexEntry,
      };
    } catch (error) {
      // Retry falls noch Versuche übrig
      if (task.attempts < this.config.retryAttempts) {
        task.attempts++;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * task.attempts));
        return this.processFile(task);
      }

      return {
        filePath: task.filePath,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async parseGdtFileStreaming(filePath: string): Promise<{
    patNr: string;
    lastName: string;
    firstName: string;
    birthDate: string | null;
    kvnr: string;
  }> {
    const result = {
      patNr: '',
      lastName: '',
      firstName: '',
      birthDate: null as string | null,
      kvnr: '',
    };

    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.length < 7) continue;

      const fieldId = line.substring(3, 7);
      const data = line.substring(7).trim();

      switch (fieldId) {
        case GDT_FIELDS.PAT_NR:
          result.patNr = data;
          break;
        case GDT_FIELDS.PAT_NAME:
          result.lastName = data;
          break;
        case GDT_FIELDS.PAT_VORNAME:
          result.firstName = data;
          break;
        case GDT_FIELDS.PAT_GEBDAT:
          if (data.length === 8) {
            // TTMMJJJJ → YYYY-MM-DD
            const day = data.substring(0, 2);
            const month = data.substring(2, 4);
            const year = data.substring(4, 8);
            result.birthDate = `${year}-${month}-${day}`;
          }
          break;
        case GDT_FIELDS.PAT_VERSNR:
          result.kvnr = data;
          break;
      }

      // Frühzeitiger Abbruch wenn alle wichtigen Felder gefunden
      if (result.patNr && result.lastName && result.firstName && result.kvnr) {
        rl.close();
        fileStream.destroy();
        break;
      }
    }

    return result;
  }

  private patientDataToIndexEntry(
    data: {
      patNr: string;
      lastName: string;
      firstName: string;
      birthDate: string | null;
      kvnr: string;
    },
    filePath: string,
    stat: { mtime: Date; size: number }
  ): PatientIndexEntry {
    return {
      patNr: data.patNr,
      filePath,
      lastName: data.lastName,
      firstName: data.firstName,
      birthDate: data.birthDate ?? undefined,
      insuranceNr: data.kvnr || data.patNr,
      fileHash: `${stat.mtime.getTime()}:${stat.size}`,
      indexedAt: new Date(stat.mtime),
    };
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash('md5');
    const stream = createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const stat = await fs.stat(filePath).catch(() => null);
      
      if (!stat) {
        // Datei wurde gelöscht
        this.removeFile(filePath);
      } else {
        // Datei neu oder geändert
        await this.indexFile(filePath);
      }
    } catch (error) {
      console.error(`[PatientIndexer] Error handling file change: ${filePath}`, error);
    }
  }

  private processResults(results: FileProcessingResult[]): void {
    for (const result of results) {
      if (result.success) {
        this.stats.processedFiles++;
        if (result.patientData) {
          this.stats.indexedPatients++;
        }
      } else if (result.skipped) {
        this.stats.processedFiles++;
      } else {
        this.stats.failedFiles++;
        this.stats.errors.push({
          file: result.filePath,
          error: result.error || 'Unknown error',
        });
      }
    }
  }

  private resetStats(): void {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      indexedPatients: 0,
      startTime: 0,
      errors: [],
    };
  }

  private setupWorkerListeners(): void {
    this.workerPool.on('completed', (result: FileProcessingResult) => {
      this.emit('file:processed', result);
    });

    this.workerPool.on('error', (result: FileProcessingResult) => {
      this.emit('file:error', result);
    });
  }

  private storeIndexEntry(entry: PatientIndexEntry): void {
    this.removeIndexedFile(entry.filePath);

    const keys: string[] = [];

    if (entry.insuranceNr) {
      pvsCacheService.patientIndex.indexByKvnr(entry.insuranceNr, entry.filePath);
      keys.push(`kvnr:${entry.insuranceNr}`);
    }

    const fullName = `${entry.firstName} ${entry.lastName}`.trim();
    if (fullName) {
      pvsCacheService.patientIndex.indexByName(fullName, entry.filePath);
      keys.push(`name:${fullName.toLowerCase().replace(/\s+/g, '')}`);
    }

    this.indexedFileKeys.set(entry.filePath, keys);
  }

  private removeIndexedFile(filePath: string): boolean {
    const keys = this.indexedFileKeys.get(filePath);
    if (!keys || keys.length === 0) {
      return false;
    }

    for (const key of keys) {
      pvsCacheService.patientIndex.delete(key);
    }

    this.indexedFileKeys.delete(filePath);
    return true;
  }
}

// ============================================================
// Factory & Export
// ============================================================

export function createPatientIndexer(config?: Partial<IndexerConfig>): PatientIndexer {
  return new PatientIndexer(config);
}

// Singleton-Instanz für globale Nutzung
let defaultIndexer: PatientIndexer | null = null;

export function getDefaultIndexer(): PatientIndexer {
  if (!defaultIndexer) {
    defaultIndexer = new PatientIndexer();
  }
  return defaultIndexer;
}

export { WorkerPool };
export type { 
  IndexerConfig, 
  IndexerStats, 
  FileTask, 
  FileProcessingResult 
};
