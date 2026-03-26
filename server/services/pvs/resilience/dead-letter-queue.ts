// ============================================
// Dead Letter Queue für fehlgeschlagene Operationen
// ============================================

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export interface DeadLetterItem<T> {
  id: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  data: T;
  error: string;
  errorCode?: string;
  lastError?: string;
  nextRetryAt?: Date;
}

export interface DLQStats {
  total: number;
  pending: number;
  failed: number;
  retried: number;
}

/**
 * Dead Letter Queue für fehlgeschlagene PVS-Operationen
 */
export class DeadLetterQueue<T> extends EventEmitter {
  private queue: DeadLetterItem<T>[] = [];
  private processing = false;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(
    private name: string,
    private options: {
      maxRetries: number;
      retryDelayMs: number;
      maxQueueSize: number;
    } = {
      maxRetries: 5,
      retryDelayMs: 60000,
      maxQueueSize: 1000,
    }
  ) {
    super();
  }

  /**
   * Add item to DLQ
   */
  enqueue(data: T, error: Error, errorCode?: string): DeadLetterItem<T> {
    // Check queue size
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest item
      this.queue.shift();
      this.emit('dropped', { reason: 'queue-full' });
    }

    const item: DeadLetterItem<T> = {
      id: randomUUID(),
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.options.maxRetries,
      data,
      error: error.message,
      errorCode,
      nextRetryAt: new Date(Date.now() + this.options.retryDelayMs),
    };

    this.queue.push(item);
    this.emit('enqueued', { itemId: item.id, error: error.message });

    // Start retry processor if not running
    if (!this.processing) {
      this.startRetryProcessor();
    }

    return item;
  }

  /**
   * Start retry processor
   */
  private startRetryProcessor(): void {
    if (this.processing) return;
    this.processing = true;

    this.retryTimer = setInterval(() => {
      this.processRetries();
    }, this.options.retryDelayMs);
  }

  /**
   * Stop retry processor
   */
  stopRetryProcessor(): void {
    this.processing = false;
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Process retries
   */
  private async processRetries(): Promise<void> {
    const now = new Date();
    const toRetry = this.queue.filter(
      item => item.nextRetryAt && item.nextRetryAt <= now && item.retryCount < item.maxRetries
    );

    for (const item of toRetry) {
      this.emit('retry', item);
    }
  }

  /**
   * Mark item as successfully retried
   */
  markSuccess(itemId: string): void {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      this.emit('success', item);
    }
  }

  /**
   * Mark item as permanently failed
   */
  markFailed(itemId: string, error: Error): void {
    const item = this.queue.find(i => i.id === itemId);
    if (item) {
      item.retryCount++;
      item.lastError = error.message;
      
      if (item.retryCount >= item.maxRetries) {
        // Move to permanent failure
        this.emit('permanentFailure', item);
      } else {
        // Schedule next retry
        item.nextRetryAt = new Date(Date.now() + this.options.retryDelayMs * item.retryCount);
      }
    }
  }

  /**
   * Get all pending items
   */
  getPending(): DeadLetterItem<T>[] {
    return this.queue.filter(item => item.retryCount < item.maxRetries);
  }

  /**
   * Get permanently failed items
   */
  getFailed(): DeadLetterItem<T>[] {
    return this.queue.filter(item => item.retryCount >= item.maxRetries);
  }

  /**
   * Get stats
   */
  getStats(): DLQStats {
    return {
      total: this.queue.length,
      pending: this.getPending().length,
      failed: this.getFailed().length,
      retried: this.queue.reduce((sum, item) => sum + item.retryCount, 0),
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.emit('cleared');
  }

  /**
   * Get item by ID
   */
  getItem(id: string): DeadLetterItem<T> | undefined {
    return this.queue.find(item => item.id === id);
  }

  /**
   * Manual retry of specific item
   */
  async manualRetry(itemId: string, retryFn: (data: T) => Promise<void>): Promise<boolean> {
    const item = this.getItem(itemId);
    if (!item) return false;

    try {
      await retryFn(item.data);
      this.markSuccess(itemId);
      return true;
    } catch (error) {
      this.markFailed(itemId, error as Error);
      return false;
    }
  }
}

// Export type-specific DLQs
export const gdtExportDLQ = new DeadLetterQueue<{ filePath: string; content: string }>('gdt-export');
export const fhirExportDLQ = new DeadLetterQueue<{ sessionId: string; bundle: unknown }>('fhir-export');
