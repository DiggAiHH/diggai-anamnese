/**
 * Tomedo Bridge Batch API Routes
 * 
 * @phase PHASE_6_BATCH_PROCESSING
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { tomedoBatchService } from '../services/pvs/tomedo-batch.service.js';
import { createLogger } from '../logger.js';
import { emitBridgeBatchStarted, emitBridgeBatchProgress, emitBridgeBatchCompleted } from '../socket.js';

const logger = createLogger('TomedoBatchRoutes');
const router = Router();

/**
 * POST /api/tomedo-bridge/batch
 * Start a new batch job
 */
router.post(
  '/batch',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const {
        tenantId,
        connectionId,
        sessions,
        options,
      } = req.body;

      // Validate required fields
      if (!tenantId || !connectionId || !sessions || !Array.isArray(sessions)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, connectionId, sessions',
        });
      }

      if (sessions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Sessions array cannot be empty',
        });
      }

      if (sessions.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 sessions per batch',
        });
      }

      logger.info('[BatchAPI] Starting batch job', {
        tenantId,
        connectionId,
        sessionCount: sessions.length,
      });

      // Setup event listeners for WebSocket emissions
      const handleProgress = (data: { jobId: string; progress: number; current: number; total: number }) => {
        emitBridgeBatchProgress({
          jobId: data.jobId,
          tenantId,
          progress: data.progress,
          current: data.current,
          total: data.total,
        });
      };

      const handleCompleted = (data: { jobId: string }) => {
        emitBridgeBatchCompleted({
          jobId: data.jobId,
          tenantId,
        });
        
        // Cleanup listeners
        tomedoBatchService.off('job:progress', handleProgress);
        tomedoBatchService.off('job:completed', handleCompleted);
      };

      tomedoBatchService.on('job:progress', handleProgress);
      tomedoBatchService.on('job:completed', handleCompleted);

      // Start batch
      const jobId = await tomedoBatchService.startBatch({
        tenantId,
        connectionId,
        sessions,
        options,
      });

      // Emit started event
      emitBridgeBatchStarted({
        jobId,
        tenantId,
        total: sessions.length,
      });

      return res.status(202).json({
        success: true,
        jobId,
        message: 'Batch job started',
        statusUrl: `/api/tomedo-bridge/batch/${jobId}`,
        sessions: sessions.length,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchAPI] Failed to start batch', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * GET /api/tomedo-bridge/batch/:jobId
 * Get batch job status
 */
router.get(
  '/batch/:jobId',
  requireAuth,
  requireRole('arzt', 'admin', 'mfa'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const id = Array.isArray(jobId) ? jobId[0] : jobId;

      const result = tomedoBatchService.getJobStatus(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Batch job not found',
        });
      }

      return res.json({
        success: true,
        job: result,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchAPI] Failed to get job status', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * GET /api/tomedo-bridge/batch
 * List all batch jobs
 */
router.get(
  '/batch',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (_req: Request, res: Response) => {
    try {
      const jobs = tomedoBatchService.getAllJobs();
      const stats = tomedoBatchService.getStats();

      return res.json({
        success: true,
        jobs: jobs.slice(0, 50), // Limit to last 50
        stats,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchAPI] Failed to list jobs', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * DELETE /api/tomedo-bridge/batch/:jobId
 * Cancel or delete batch job
 */
router.delete(
  '/batch/:jobId',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const id = Array.isArray(jobId) ? jobId[0] : jobId;

      // Try to cancel if running
      const cancelled = tomedoBatchService.cancelJob(id);
      
      // Delete from store
      const deleted = tomedoBatchService.deleteJob(id);

      if (!deleted && !cancelled) {
        return res.status(404).json({
          success: false,
          error: 'Batch job not found',
        });
      }

      logger.info('[BatchAPI] Job cancelled/deleted', { jobId: id });

      return res.json({
        success: true,
        message: cancelled ? 'Job cancelled' : 'Job deleted',
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchAPI] Failed to cancel/delete job', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * GET /api/tomedo-bridge/batch/:jobId/results
 * Get detailed results for a batch job
 */
router.get(
  '/batch/:jobId/results',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const id = Array.isArray(jobId) ? jobId[0] : jobId;

      const result = tomedoBatchService.getJobStatus(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Batch job not found',
        });
      }

      // Return full results
      return res.json({
        success: true,
        jobId: id,
        status: result.status,
        summary: {
          total: result.total,
          completed: result.completed,
          failed: result.failed,
          skipped: result.skipped,
          successRate: Math.round((result.completed / result.total) * 100),
        },
        results: result.results,
        errors: result.errors,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchAPI] Failed to get results', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * GET /api/tomedo-bridge/batch/stats/overview
 * Get batch processing statistics
 */
router.get(
  '/batch/stats/overview',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (_req: Request, res: Response) => {
    try {
      const stats = tomedoBatchService.getStats();

      return res.json({
        success: true,
        stats: {
          ...stats,
          successRate: stats.totalSessions > 0
            ? Math.round((stats.totalProcessed / stats.totalSessions) * 100)
            : 100,
        },
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchAPI] Failed to get stats', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

export default router;
