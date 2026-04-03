/**
 * Tomedo Bridge Batch Service
 * 
 * Batch-Verarbeitung mehrerer Patienten-Sessions parallel.
 * 
 * @phase PHASE_6_BATCH_PROCESSING
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../logger.js';
import { tomedoBridgeOrchestrator } from '../../agents/tomedo-bridge/orchestrator.js';
import { tomedoDLQ } from './tomedo-dlq.service.js';
import type { BridgeInput, BridgeExecutionResult } from '../../agents/tomedo-bridge/types.js';
import type { AgentTask } from '../../services/agent/task.queue.js';

const logger = createLogger('TomedoBatchService');

export interface BatchSession {
  patientSessionId: string;
  patientData: BridgeInput['patientData'];
  anamneseData: BridgeInput['anamneseData'];
}

export interface BatchJob {
  id: string;
  tenantId: string;
  connectionId: string;
  sessions: BatchSession[];
  options?: {
    maxConcurrent?: number;
    continueOnError?: boolean;
    skipExisting?: boolean;
  };
}

export interface BatchJobResult {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  startedAt: string;
  completedAt?: string;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  results: Array<{
    patientSessionId: string;
    success: boolean;
    error?: string;
    tomedoPatientId?: string;
    tomedoFallakteId?: string;
    durationMs: number;
  }>;
  errors: string[];
}

export interface BatchJobStatus {
  jobId: string;
  status: BatchJobResult['status'];
  progress: number; // 0-100
  current: number;
  total: number;
  etaMs?: number;
}

// In-memory store for batch jobs (in production, use Redis)
const jobStore = new Map<string, BatchJobResult>();
const activeJobs = new Map<string, AbortController>();

export class TomedoBatchService extends EventEmitter {
  private defaultOptions = {
    maxConcurrent: 5,
    continueOnError: true,
    skipExisting: false,
  };

  /**
   * Start a new batch job
   */
  async startBatch(job: Omit<BatchJob, 'id'>): Promise<string> {
    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullJob: BatchJob = {
      ...job,
      id: jobId,
    };

    const result: BatchJobResult = {
      jobId,
      status: 'pending',
      startedAt: new Date().toISOString(),
      total: job.sessions.length,
      completed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      errors: [],
    };

    jobStore.set(jobId, result);

    logger.info('[TomedoBatch] Starting batch job', {
      jobId,
      total: job.sessions.length,
      tenantId: job.tenantId,
    });

    // Start processing asynchronously
    this.processBatch(fullJob, result);

    return jobId;
  }

  /**
   * Process batch job
   */
  private async processBatch(job: BatchJob, result: BatchJobResult): Promise<void> {
    const options = { ...this.defaultOptions, ...job.options };
    const abortController = new AbortController();
    activeJobs.set(job.id, abortController);

    result.status = 'running';
    this.emit('job:started', { jobId: job.id, total: job.sessions.length });

    const startTime = Date.now();
    const queue = [...job.sessions];
    const running = new Set<string>();
    const signal = abortController.signal;

    try {
      while (queue.length > 0 || running.size > 0) {
        // Check for abort
        if (signal.aborted) {
          throw new Error('Batch job aborted');
        }

        // Start new sessions up to maxConcurrent
        while (running.size < options.maxConcurrent && queue.length > 0) {
          const session = queue.shift()!;
          running.add(session.patientSessionId);
          
          this.processSession(job, session, result, signal).finally(() => {
            running.delete(session.patientSessionId);
          });
        }

        // Emit progress update
        const progress = Math.round(
          ((result.completed + result.failed + result.skipped) / result.total) * 100
        );
        
        const elapsedMs = Date.now() - startTime;
        const processed = result.completed + result.failed + result.skipped;
        const avgMsPerSession = processed > 0 ? elapsedMs / processed : 0;
        const remaining = result.total - processed;
        const etaMs = Math.round(avgMsPerSession * remaining / (options.maxConcurrent || 1));

        this.emit('job:progress', {
          jobId: job.id,
          status: result.status,
          progress,
          current: processed,
          total: result.total,
          etaMs,
        } as BatchJobStatus);

        await this.delay(100);
      }

      // All done
      result.status = result.failed === 0 ? 'completed' : 
                      result.completed === 0 ? 'failed' : 'partial';
      result.completedAt = new Date().toISOString();

      logger.info('[TomedoBatch] Batch job completed', {
        jobId: job.id,
        status: result.status,
        completed: result.completed,
        failed: result.failed,
        durationMs: Date.now() - startTime,
      });

      this.emit('job:completed', { jobId: job.id, result });

    } catch (error) {
      result.status = 'failed';
      result.completedAt = new Date().toISOString();
      result.errors.push((error as Error).message);

      logger.error('[TomedoBatch] Batch job failed', {
        jobId: job.id,
        error: (error as Error).message,
      });

      this.emit('job:failed', { jobId: job.id, error: (error as Error).message });
    } finally {
      activeJobs.delete(job.id);
    }
  }

  /**
   * Process single session
   */
  private async processSession(
    job: BatchJob,
    session: BatchSession,
    result: BatchJobResult,
    signal: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Check abort
      if (signal.aborted) {
        throw new Error('Aborted');
      }

      logger.info('[TomedoBatch] Processing session', {
        jobId: job.id,
        patientSessionId: session.patientSessionId,
      });

      // Build bridge input
      const input: BridgeInput = {
        patientSessionId: session.patientSessionId,
        tenantId: job.tenantId,
        connectionId: job.connectionId,
        patientData: session.patientData,
        anamneseData: session.anamneseData,
        options: {
          requireHumanApproval: false,
          outputFormat: 'json',
          syncMode: 'auto',
          detailLevel: 'standard',
        },
      };

      // Create agent task
      const task: AgentTask = {
        id: `batch-task-${session.patientSessionId}`,
        type: 'tomedo-bridge',
        status: 'queued',
        agentName: 'tomedo-bridge',
        description: `Batch: ${session.patientSessionId}`,
        payload: {},
        createdAt: new Date(),
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
      };

      // Execute bridge
      const bridgeResult = await tomedoBridgeOrchestrator.execute(input, task);

      const durationMs = Date.now() - startTime;

      // Extract Tomedo IDs from result
      const tomedoPatientId = bridgeResult.teams.bravo.epaMapper.tomedoSync?.patientId;
      const tomedoFallakteId = bridgeResult.teams.bravo.epaMapper.tomedoSync?.fallakteId;

      // Add to results
      result.results.push({
        patientSessionId: session.patientSessionId,
        success: bridgeResult.success,
        tomedoPatientId,
        tomedoFallakteId,
        durationMs,
      });

      if (bridgeResult.success) {
        result.completed++;
      } else {
        result.failed++;
        
        // Add errors
        for (const error of bridgeResult.errors) {
          result.errors.push(`${session.patientSessionId}: ${error.error}`);
        }

        // If critical failure, add to DLQ
        if (bridgeResult.errors.some(e => !e.recoverable)) {
          await this.addToDLQ(job, session, bridgeResult);
        }
      }

      this.emit('session:completed', {
        jobId: job.id,
        patientSessionId: session.patientSessionId,
        success: bridgeResult.success,
        durationMs,
      });

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = (error as Error).message;

      result.results.push({
        patientSessionId: session.patientSessionId,
        success: false,
        error: errorMsg,
        durationMs,
      });

      result.failed++;
      result.errors.push(`${session.patientSessionId}: ${errorMsg}`);

      logger.error('[TomedoBatch] Session processing failed', {
        jobId: job.id,
        patientSessionId: session.patientSessionId,
        error: errorMsg,
      });

      this.emit('session:failed', {
        jobId: job.id,
        patientSessionId: session.patientSessionId,
        error: errorMsg,
      });
    }
  }

  /**
   * Add failed session to DLQ
   */
  private async addToDLQ(
    job: BatchJob,
    session: BatchSession,
    result: BridgeExecutionResult
  ): Promise<void> {
    try {
      await tomedoDLQ.add({
        type: 'documentation',
        patientSessionId: session.patientSessionId,
        tenantId: job.tenantId,
        connectionId: job.connectionId,
        payload: {
          documentation: {
            content: result.protocol || 'Batch processing failed',
            karteityp: 'Anamnese',
            icd10Codes: session.anamneseData?.icd10Codes,
          },
        },
        error: result.errors.map(e => e.error).join(', '),
        traceId: `batch-${job.id}`,
      });

      logger.info('[TomedoBatch] Added to DLQ', {
        jobId: job.id,
        patientSessionId: session.patientSessionId,
      });
    } catch (dlqError) {
      logger.error('[TomedoBatch] Failed to add to DLQ', {
        jobId: job.id,
        patientSessionId: session.patientSessionId,
        error: (dlqError as Error).message,
      });
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BatchJobResult | undefined {
    return jobStore.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): BatchJobResult[] {
    return Array.from(jobStore.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const controller = activeJobs.get(jobId);
    if (controller) {
      controller.abort();
      activeJobs.delete(jobId);
      
      const result = jobStore.get(jobId);
      if (result) {
        result.status = 'failed';
        result.completedAt = new Date().toISOString();
        result.errors.push('Job cancelled by user');
      }

      logger.info('[TomedoBatch] Job cancelled', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Delete job from store
   */
  deleteJob(jobId: string): boolean {
    // Cancel if active
    this.cancelJob(jobId);
    
    // Delete from store
    return jobStore.delete(jobId);
  }

  /**
   * Get stats
   */
  getStats() {
    const jobs = this.getAllJobs();
    const active = activeJobs.size;
    
    return {
      total: jobs.length,
      active,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      partial: jobs.filter(j => j.status === 'partial').length,
      totalSessions: jobs.reduce((sum, j) => sum + j.total, 0),
      totalProcessed: jobs.reduce((sum, j) => sum + j.completed + j.failed + j.skipped, 0),
    };
  }

  /**
   * Cleanup old jobs (keep last 100)
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [jobId, result] of jobStore) {
      const completedAt = result.completedAt 
        ? new Date(result.completedAt).getTime() 
        : new Date(result.startedAt).getTime();
      
      if (now - completedAt > maxAgeMs) {
        toDelete.push(jobId);
      }
    }

    for (const jobId of toDelete) {
      jobStore.delete(jobId);
    }

    logger.info('[TomedoBatch] Cleanup completed', {
      deleted: toDelete.length,
      remaining: jobStore.size,
    });
  }

  /**
   * Helper: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const tomedoBatchService = new TomedoBatchService();
