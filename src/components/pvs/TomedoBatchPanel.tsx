// @ts-nocheck
/**
 * Tomedo Bridge Batch Panel
 * 
 * UI für Batch-Verarbeitung mehrerer Sessions
 * 
 * @phase PHASE_6_BATCH_PROCESSING
 * @todo Requires useApi and Skeleton components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Play,
  Pause,
  X,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

// Types
interface BatchJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  startedAt: string;
  completedAt?: string;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
}

interface BatchJobDetail extends BatchJob {
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

interface BatchStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  partial: number;
  totalSessions: number;
  totalProcessed: number;
  successRate: number;
}

interface TomedoBatchPanelProps {
  tenantId: string;
  connectionId: string;
  onBatchComplete?: (jobId: string) => void;
}

export const TomedoBatchPanel: React.FC<TomedoBatchPanelProps> = ({
  tenantId,
  connectionId,
  onBatchComplete,
}) => {
  const { t } = useTranslation();
  const { get, post, del } = useApi();

  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [selectedJob, setSelectedJob] = useState<BatchJobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const response = await get('/api/tomedo-bridge/batch');
      if (response.success) {
        setJobs(response.jobs);
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to fetch batch jobs:', error);
    }
  }, [get]);

  // Initial load
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Start new batch
  const startBatch = async (sessions: Array<{ patientSessionId: string }>) => {
    setIsLoading(true);
    try {
      const response = await post('/api/tomedo-bridge/batch', {
        tenantId,
        connectionId,
        sessions: sessions.map(s => ({
          patientSessionId: s.patientSessionId,
          patientData: {},
          anamneseData: {},
        })),
        options: {
          maxConcurrent: 5,
          continueOnError: true,
        },
      });

      if (response.success) {
        await fetchJobs();
      }
    } catch (error) {
      console.error('Failed to start batch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel job
  const cancelJob = async (jobId: string) => {
    try {
      await del(`/api/tomedo-bridge/batch/${jobId}`);
      await fetchJobs();
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  // View job details
  const viewDetails = async (jobId: string) => {
    try {
      const response = await get(`/api/tomedo-bridge/batch/${jobId}/results`);
      if (response.success) {
        setSelectedJob(response);
      }
    } catch (error) {
      console.error('Failed to get job details:', error);
    }
  };

  // Download CSV
  const downloadCSV = (job: BatchJobDetail) => {
    const headers = ['Patient Session ID', 'Status', 'Tomedo Patient ID', 'Tomedo Fallakte ID', 'Duration (ms)', 'Error'];
    const rows = job.results.map(r => [
      r.patientSessionId,
      r.success ? 'SUCCESS' : 'FAILED',
      r.tomedoPatientId || '',
      r.tomedoFallakteId || '',
      r.durationMs,
      r.error || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${job.jobId}.csv`;
    a.click();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Layers className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('pvs.tomedoBatch.title', 'Tomedo Batch-Verarbeitung')}
              </h2>
              <p className="text-sm text-purple-100">
                {t('pvs.tomedoBatch.subtitle', 'Mehrere Sessions parallel verarbeiten')}
              </p>
            </div>
          </div>
          {stats && (
            <div className="flex items-center space-x-4 text-white text-sm">
              <span>
                {t('pvs.tomedoBatch.active', 'Aktiv')}: {stats.active}
              </span>
              <span>
                {t('pvs.tomedoBatch.completed', 'Abgeschlossen')}: {stats.completed}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">{t('pvs.tomedoBatch.totalJobs', 'Gesamt Jobs')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
              <div className="text-xs text-gray-500">{t('pvs.tomedoBatch.totalSessions', 'Sessions')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
              <div className="text-xs text-gray-500">{t('pvs.tomedoBatch.successRate', 'Erfolgsrate')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.active}</div>
              <div className="text-xs text-gray-500">{t('pvs.tomedoBatch.running', 'Laufend')}</div>
            </div>
          </div>
        )}

        {/* Jobs List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t('pvs.tomedoBatch.recentJobs', 'Aktuelle Jobs')}
          </h3>

          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.jobId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <span className="font-medium text-gray-900">{job.jobId}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {new Date(job.startedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                    {job.status === 'running' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelJob(job.jobId)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDetails(job.jobId)}
                    >
                      {selectedJob?.jobId === job.jobId ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {job.status === 'running' && (
                  <div className="px-4 py-2 bg-white">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {job.completed + job.failed + job.skipped} / {job.total}
                      </span>
                      <span className="text-gray-900">
                        {Math.round(((job.completed + job.failed + job.skipped) / job.total) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={((job.completed + job.failed + job.skipped) / job.total) * 100}
                      className="h-2"
                    />
                  </div>
                )}

                {selectedJob?.jobId === job.jobId && (
                  <div className="px-4 py-3 bg-white border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        {t('pvs.tomedoBatch.results', 'Ergebnisse')}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadCSV(selectedJob)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-auto">
                      {selectedJob.results.map((result) => (
                        <div
                          key={result.patientSessionId}
                          className={cn(
                            "flex items-center justify-between p-2 rounded",
                            result.success ? "bg-green-50" : "bg-red-50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              {result.success ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-sm font-medium truncate">
                                {result.patientSessionId}
                              </span>
                            </div>
                            {result.tomedoPatientId && (
                              <div className="text-xs text-gray-500 ml-6">
                                Tomedo: {result.tomedoPatientId}
                              </div>
                            )}
                            {result.error && (
                              <div className="text-xs text-red-600 ml-6">
                                {result.error}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {result.durationMs}ms
                          </span>
                        </div>
                      ))}
                    </div>

                    {selectedJob.errors.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded">
                        <h5 className="text-sm font-medium text-red-800 mb-2">
                          {t('pvs.tomedoBatch.errors', 'Fehler')}
                        </h5>
                        <ul className="text-xs text-red-600 space-y-1">
                          {selectedJob.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {selectedJob.errors.length > 5 && (
                            <li>... {selectedJob.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('pvs.tomedoBatch.noJobs', 'Keine Batch-Jobs')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('pvs.tomedoBatch.noJobsDesc', 'Starten Sie einen neuen Batch, um mehrere Sessions zu verarbeiten')}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TomedoBatchPanel;
