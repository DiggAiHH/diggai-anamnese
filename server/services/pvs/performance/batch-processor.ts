// ============================================
// PVS Batch Processor
// ============================================
// Parallele Verarbeitung mit Worker-Queue

import { EventEmitter } from 'events';

export interface BatchTask<T, R> {
  id: string;
  data: T;
  execute: (data: T) => Promise<R>;
  retryCount: number;
  maxRetries: number;
}

export interface BatchResult<R> {
  taskId: string;
  success: boolean;
  result?: R;
  error?: string;
  attempts: number;
  durationMs: number;
}

export interface BatchProcessorOptions {
  maxConcurrent: number;
  retryDelayMs: number;
  maxRetries: number;
  taskTimeoutMs: number;
}

/**
 * Batch processor with concurrency control and retry logic
 */
export class BatchProcessor<T, R> extends EventEmitter {
  private queue: BatchTask<T, R>[] = [];
  private running = new Set<string>();
  private results = new Map<string, BatchResult<R>>();
  private isProcessing = false;
  private stats = {
    total: 0,
    completed: 0,
    failed: 0,
    retried: 0,
  };

  constructor(private options: BatchProcessorOptions) {
    super();
  }

  /**
   * Add task to queue
   */
  addTask(task: Omit<BatchTask<T, R>, 'retryCount'>): void {
    const fullTask: BatchTask<T, R> = {
      ...task,
      retryCount: 0,
    };
    
    this.queue.push(fullTask);
    this.stats.total++;
    this.emit('task:added', { taskId: task.id });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks: Omit<BatchTask<T, R>, 'retryCount'>[]): void {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 || this.running.size > 0) {
      // Start new tasks up to maxConcurrent
      while (this.running.size < this.options.maxConcurrent && this.queue.length > 0) {
        const task = this.queue.shift()!;
        this.running.add(task.id);
        this.processTask(task);
      }

      // Wait a bit before checking again
      await this.delay(10);
    }

    this.isProcessing = false;
    this.emit('completed', this.getStats());
  }

  /**
   * Process single task
   */
  private async processTask(task: BatchTask<T, R>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.emit('task:started', { taskId: task.id });
      
      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => task.execute(task.data),
        this.options.taskTimeoutMs
      );

      const durationMs = Date.now() - startTime;
      
      this.results.set(task.id, {
        taskId: task.id,
        success: true,
        result,
        attempts: task.retryCount + 1,
        durationMs,
      });

      this.stats.completed++;
      this.emit('task:completed', { taskId: task.id, durationMs });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      
      // Retry if possible
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        this.stats.retried++;
        this.emit('task:retry', { taskId: task.id, attempt: task.retryCount });
        
        await this.delay(this.options.retryDelayMs * task.retryCount);
        this.queue.push(task);
      } else {
        this.results.set(task.id, {
          taskId: task.id,
          success: false,
          error: (error as Error).message,
          attempts: task.retryCount + 1,
          durationMs,
        });

        this.stats.failed++;
        this.emit('task:failed', { taskId: task.id, error: (error as Error).message });
      }
    } finally {
      this.running.delete(task.id);
    }
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<U>(
    fn: () => Promise<U>,
    timeoutMs: number
  ): Promise<U> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion(): Promise<BatchResult<R>[]> {
    if (!this.isProcessing && this.queue.length === 0) {
      return Array.from(this.results.values());
    }

    return new Promise((resolve) => {
      this.once('completed', () => {
        resolve(Array.from(this.results.values()));
      });
    });
  }

  /**
   * Get results
   */
  getResults(): BatchResult<R>[] {
    return Array.from(this.results.values());
  }

  /**
   * Get result for specific task
   */
  getResult(taskId: string): BatchResult<R> | undefined {
    return this.results.get(taskId);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      pending: this.queue.length,
      running: this.running.size,
      successRate: this.stats.total > 0
        ? Math.round((this.stats.completed / this.stats.total) * 100)
        : 100,
    };
  }

  /**
   * Clear all
   */
  clear(): void {
    this.queue = [];
    this.running.clear();
    this.results.clear();
    this.stats = { total: 0, completed: 0, failed: 0, retried: 0 };
  }

  /**
   * Helper: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Export sessions batch processor
 */
export class SessionBatchProcessor extends BatchProcessor<
  { sessionId: string; connectionId: string },
  { transferId: string; pvsReferenceId?: string }
> {
  constructor() {
    super({
      maxConcurrent: 3,
      retryDelayMs: 2000,
      maxRetries: 3,
      taskTimeoutMs: 30000,
    });
  }
}

// Export singleton
export const sessionBatchProcessor = new SessionBatchProcessor();
