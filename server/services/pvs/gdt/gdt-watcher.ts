// ============================================
// GDT 3.0 Watcher — File-based GDT Import
// ============================================

import { watch, type FSWatcher } from 'chokidar';
import { promises as fs } from 'fs';
import path from 'path';
import { parseGdtFile } from './gdt-parser.js';

export interface GdtWatcherOptions {
  importDir: string;
  archiveDir: string;
  onImport: (parsed: ReturnType<typeof parseGdtFile>, filePath: string) => void | Promise<void>;
  onError: (error: Error, filePath?: string) => void;
  filePattern?: string;
}

export class GdtWatcher {
  private watcher: FSWatcher | null = null;
  private options: GdtWatcherOptions;
  private processing = new Set<string>();

  constructor(options: GdtWatcherOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    await fs.mkdir(this.options.importDir, { recursive: true });
    await fs.mkdir(this.options.archiveDir, { recursive: true });

    const pattern = this.options.filePattern ?? '*.gdt';

    this.watcher = watch(path.join(this.options.importDir, pattern), {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath: string) => {
      this.handleFile(filePath).catch(err => {
        this.options.onError(err instanceof Error ? err : new Error(String(err)), filePath);
      });
    });

    this.watcher.on('error', (error: unknown) => {
      this.options.onError(error instanceof Error ? error : new Error(String(error)));
    });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  private async handleFile(filePath: string): Promise<void> {
    const basename = path.basename(filePath);

    if (this.processing.has(basename)) return;
    this.processing.add(basename);

    try {
      const content = await fs.readFile(filePath, 'latin1');
      const parsed = parseGdtFile(content);

      await this.options.onImport(parsed, filePath);

      const archiveName = `${Date.now()}_${basename}`;
      const archivePath = path.join(this.options.archiveDir, archiveName);
      await fs.rename(filePath, archivePath);
    } catch (err) {
      this.options.onError(
        err instanceof Error ? err : new Error(String(err)),
        filePath
      );
    } finally {
      this.processing.delete(basename);
    }
  }

  isRunning(): boolean {
    return this.watcher !== null;
  }
}
