// @ts-nocheck
/**
 * Tomedo Bridge Panel
 * 
 * UI für die DiggAi-Tomedo Multi-Agent Bridge:
 * - Bridge-Ausführung für Patienten-Session
 * - Status-Anzeige der 9 Subagenten
 * - DLQ Management
 * - Echtzeit-Updates via WebSocket
 * 
 * @phase PHASE_4_FRONTEND
 * @todo Requires useApi and Skeleton components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Database,
  Server,
  FileText,
  Users,
  Zap,
  Shield,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Trash2,
  Play,
  RotateCcw
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

// Types
interface BridgeStatus {
  success: boolean;
  taskId?: string;
  protocol?: string;
  timing?: {
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
  };
  errors: Array<{
    team: string;
    agent: string;
    error: string;
    recoverable: boolean;
  }>;
  teams: {
    alpha: {
      explainability: {
        explanation: string;
        confidenceScore: number;
      };
      ethics: {
        complianceStatus: 'PASS' | 'WARNING' | 'FAIL';
        biasFlags: string[];
      };
      humanLoop: {
        requiresApproval: boolean;
        urgency: 'HIGH' | 'MEDIUM' | 'LOW';
      };
    };
    bravo: {
      apiConnector: {
        connectionStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
        syncQueueLength: number;
        latencyMs?: number;
      };
      epaMapper: {
        patientId: string;
        goaeZiffern: string[];
        mappingValid: boolean;
        tomedoSync?: {
          patientId?: string;
          fallakteId?: string;
          status: 'synced' | 'pending' | 'failed';
        };
      };
      documentation: {
        karteityp: string;
        wordCount: number;
        tomedoCompositionId?: string;
        tomedoSyncStatus?: 'synced' | 'pending' | 'failed' | 'skipped';
      };
    };
    charlie: {
      loadReducer: {
        simplicityScore: number;
        detailLevel: string;
      };
      feedback: {
        validationStatus: 'PASS' | 'FAIL' | 'WARNING';
        errorCount: number;
      };
      errorCorrection: {
        autoCorrected: boolean;
        requiresReview: boolean;
      };
    };
    delta: {
      markdown: {
        checksum: string;
        sections: string[];
      };
      crossValidation: {
        validationPassed: boolean;
        syncStatus: string;
        divergenceCount: number;
      };
    };
  };
}

interface DLQItem {
  id: string;
  type: string;
  patientSessionId: string;
  tenantId: string;
  error: string;
  failedAt: string;
  retryCount: number;
}

interface DLQStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  byType: Record<string, number>;
}

interface BridgeStats {
  dlq: DLQStats;
  activeTasks: number;
  tasks: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
}

interface TomedoBridgePanelProps {
  patientSessionId: string;
  tenantId: string;
  connectionId: string;
  patientData?: {
    patientId?: string;
    externalPatientId?: string;
    name?: string;
    dob?: string;
  };
  anamneseData?: {
    answers?: Record<string, unknown>;
    triageResult?: {
      level: 'CRITICAL' | 'WARNING' | 'NORMAL';
      reasons: string[];
    };
    icd10Codes?: string[];
    soapSummary?: string;
  };
  onSuccess?: (result: BridgeStatus) => void;
  onError?: (error: string) => void;
}

export const TomedoBridgePanel: React.FC<TomedoBridgePanelProps> = ({
  patientSessionId,
  tenantId,
  connectionId,
  patientData = {},
  anamneseData = {},
  onSuccess,
  onError,
}) => {
  const { t } = useTranslation();
  const { get, post, del } = useApi();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [bridgeStats, setBridgeStats] = useState<BridgeStats | null>(null);
  const [dlqItems, setDlqItems] = useState<DLQItem[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({
    alpha: false,
    bravo: true,
    charlie: false,
    delta: false,
  });
  const [activeTab, setActiveTab] = useState<'status' | 'dlq' | 'protocol'>('status');
  const [isRetryingDLQ, setIsRetryingDLQ] = useState(false);

  // Fetch bridge stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await get('/api/tomedo-bridge/stats');
      if (response.success) {
        setBridgeStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to fetch bridge stats:', error);
    }
  }, [get]);

  // Fetch DLQ
  const fetchDLQ = useCallback(async () => {
    try {
      const response = await get('/api/tomedo-bridge/dlq');
      if (response.success) {
        setDlqItems(response.items);
      }
    } catch (error) {
      console.error('Failed to fetch DLQ:', error);
    }
  }, [get]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchDLQ();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      if (activeTab === 'dlq') {
        fetchDLQ();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchDLQ, activeTab]);

  // Execute bridge
  const executeBridge = async () => {
    setIsExecuting(true);
    try {
      const response = await post('/api/tomedo-bridge/execute', {
        patientSessionId,
        tenantId,
        connectionId,
        patientData,
        anamneseData,
        options: {
          waitForCompletion: true,
        },
      });

      if (response.success) {
        setBridgeStatus(response);
        onSuccess?.(response);
        // Refresh stats and DLQ
        fetchStats();
        fetchDLQ();
      } else {
        onError?.(response.error || 'Bridge execution failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  // Retry DLQ
  const retryDLQ = async () => {
    setIsRetryingDLQ(true);
    try {
      await post('/api/tomedo-bridge/dlq/retry');
      await fetchDLQ();
      await fetchStats();
    } catch (error) {
      console.error('Failed to retry DLQ:', error);
    } finally {
      setIsRetryingDLQ(false);
    }
  };

  // Retry single DLQ item
  const retryDLQItem = async (id: string) => {
    try {
      await post(`/api/tomedo-bridge/dlq/${id}/retry`);
      await fetchDLQ();
      await fetchStats();
    } catch (error) {
      console.error('Failed to retry DLQ item:', error);
    }
  };

  // Delete DLQ item
  const deleteDLQItem = async (id: string) => {
    try {
      await del(`/api/tomedo-bridge/dlq/${id}`);
      await fetchDLQ();
      await fetchStats();
    } catch (error) {
      console.error('Failed to delete DLQ item:', error);
    }
  };

  // Toggle team expansion
  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [team]: !prev[team],
    }));
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'synced':
      case 'PASS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OFFLINE':
      case 'failed':
      case 'FAIL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'DEGRADED':
      case 'WARNING':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'synced':
      case 'PASS':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'OFFLINE':
      case 'failed':
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'DEGRADED':
      case 'WARNING':
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isExecuting) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {t('pvs.tomedoBridge.executing', 'Tomedo Bridge wird ausgeführt...')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('pvs.tomedoBridge.executingDesc', 'Die 9 Subagenten verarbeiten die Daten')}
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {['Team Alpha (Trust & Transparency)', 'Team Bravo (Tomedo Integration)', 'Team Charlie (Simplicity)', 'Team Delta (Output)'].map((team, _i) => (
            <div key={team} className="flex items-center space-x-3">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('pvs.tomedoBridge.title', 'DiggAi ↔ Tomedo Bridge')}
              </h2>
              <p className="text-sm text-blue-100">
                {t('pvs.tomedoBridge.subtitle', 'Multi-Agent PVS Integration')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {bridgeStats && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  bridgeStats.dlq.pending > 0 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                )}
              >
                DLQ: {bridgeStats.dlq.pending}
              </Badge>
            )}
            <Button
              size="sm"
              onClick={executeBridge}
              disabled={isExecuting}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              {t('pvs.tomedoBridge.execute', 'Bridge ausführen')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'status', label: t('pvs.tomedoBridge.status', 'Status'), icon: Activity },
            { id: 'dlq', label: t('pvs.tomedoBridge.dlq', 'DLQ'), icon: AlertOctagon },
            { id: 'protocol', label: t('pvs.tomedoBridge.protocol', 'Protokoll'), icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={cn(
                "flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'status' && (
          <div className="space-y-4">
            {bridgeStatus ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {bridgeStatus.timing?.totalDurationMs}ms
                    </div>
                    <div className="text-xs text-gray-500">{t('pvs.tomedoBridge.duration', 'Dauer')}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className={cn(
                      "text-2xl font-bold",
                      bridgeStatus.success ? "text-green-600" : "text-red-600"
                    )}>
                      {bridgeStatus.success ? 'OK' : 'FEHLER'}
                    </div>
                    <div className="text-xs text-gray-500">{t('pvs.tomedoBridge.result', 'Ergebnis')}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {bridgeStatus.teams.bravo.epaMapper.tomedoSync?.status === 'synced' ? '✓' : '✗'}
                    </div>
                    <div className="text-xs text-gray-500">{t('pvs.tomedoBridge.tomedoSync', 'Tomedo Sync')}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {bridgeStatus.teams.bravo.epaMapper.goaeZiffern.length}
                    </div>
                    <div className="text-xs text-gray-500">{t('pvs.tomedoBridge.goae', 'GOÄ Ziffern')}</div>
                  </div>
                </div>

                {/* Teams */}
                {[
                  { 
                    id: 'alpha', 
                    name: 'Team Alpha', 
                    desc: 'Trust & Transparency',
                    icon: Shield,
                    color: 'blue',
                  },
                  { 
                    id: 'bravo', 
                    name: 'Team Bravo', 
                    desc: 'Tomedo Integration',
                    icon: Server,
                    color: 'green',
                  },
                  { 
                    id: 'charlie', 
                    name: 'Team Charlie', 
                    desc: 'Simplicity Optimization',
                    icon: Zap,
                    color: 'yellow',
                  },
                  { 
                    id: 'delta', 
                    name: 'Team Delta', 
                    desc: 'Output Orchestration',
                    icon: FileText,
                    color: 'purple',
                  },
                ].map((team) => (
                  <div 
                    key={team.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleTeam(team.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <team.icon className={cn("w-5 h-5", `text-${team.color}-600`)} />
                        <div className="text-left">
                          <span className="font-medium text-gray-900">{team.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({team.desc})</span>
                        </div>
                      </div>
                      {expandedTeams[team.id] ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedTeams[team.id] && (
                      <div className="px-4 py-3 space-y-3 bg-white">
                        {team.id === 'alpha' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Ethics Compliance</span>
                              <Badge className={getStatusColor(bridgeStatus.teams.alpha.ethics.complianceStatus)}>
                                {getStatusIcon(bridgeStatus.teams.alpha.ethics.complianceStatus)}
                                <span className="ml-1">{bridgeStatus.teams.alpha.ethics.complianceStatus}</span>
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Human Approval</span>
                              <Badge className={bridgeStatus.teams.alpha.humanLoop.requiresApproval ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                {bridgeStatus.teams.alpha.humanLoop.requiresApproval ? 'Required' : 'Not Required'}
                              </Badge>
                            </div>
                          </>
                        )}

                        {team.id === 'bravo' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Connection Status</span>
                              <Badge className={getStatusColor(bridgeStatus.teams.bravo.apiConnector.connectionStatus)}>
                                {getStatusIcon(bridgeStatus.teams.bravo.apiConnector.connectionStatus)}
                                <span className="ml-1">{bridgeStatus.teams.bravo.apiConnector.connectionStatus}</span>
                              </Badge>
                            </div>
                            {bridgeStatus.teams.bravo.apiConnector.latencyMs && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Latency</span>
                                <span className="text-sm font-medium">{bridgeStatus.teams.bravo.apiConnector.latencyMs}ms</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Tomedo Patient</span>
                              <Badge className={getStatusColor(bridgeStatus.teams.bravo.epaMapper.tomedoSync?.status || 'pending')}>
                                {bridgeStatus.teams.bravo.epaMapper.tomedoSync?.patientId || 'N/A'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Documentation</span>
                              <Badge className={getStatusColor(bridgeStatus.teams.bravo.documentation.tomedoSyncStatus || 'pending')}>
                                {bridgeStatus.teams.bravo.documentation.tomedoCompositionId || 'N/A'}
                              </Badge>
                            </div>
                          </>
                        )}

                        {team.id === 'charlie' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Validation</span>
                              <Badge className={getStatusColor(bridgeStatus.teams.charlie.feedback.validationStatus)}>
                                {bridgeStatus.teams.charlie.feedback.validationStatus}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Auto-Corrected</span>
                              <Badge className={bridgeStatus.teams.charlie.errorCorrection.autoCorrected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {bridgeStatus.teams.charlie.errorCorrection.autoCorrected ? 'Yes' : 'No'}
                              </Badge>
                            </div>
                          </>
                        )}

                        {team.id === 'delta' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Cross-Validation</span>
                              <Badge className={bridgeStatus.teams.delta.crossValidation.validationPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {bridgeStatus.teams.delta.crossValidation.validationPassed ? 'Passed' : 'Failed'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Divergences</span>
                              <span className="text-sm font-medium">{bridgeStatus.teams.delta.crossValidation.divergenceCount}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('pvs.tomedoBridge.noExecution', 'Noch keine Ausführung')}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {t('pvs.tomedoBridge.noExecutionDesc', 'Führen Sie die Bridge aus, um Daten an Tomedo zu übertragen')}
                </p>
                <Button onClick={executeBridge}>
                  <Zap className="w-4 h-4 mr-2" />
                  {t('pvs.tomedoBridge.executeNow', 'Jetzt ausführen')}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dlq' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {t('pvs.tomedoBridge.dlqTitle', 'Dead Letter Queue')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('pvs.tomedoBridge.dlqDesc', 'Fehlgeschlagene Sync-Operationen')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={retryDLQ}
                disabled={isRetryingDLQ || dlqItems.length === 0}
              >
                <RotateCcw className={cn("w-4 h-4 mr-2", isRetryingDLQ && "animate-spin")} />
                {t('pvs.tomedoBridge.retryAll', 'Alle wiederholen')}
              </Button>
            </div>

            {dlqItems.length > 0 ? (
              <div className="space-y-2">
                {dlqItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Badge variant="neutral" className="text-xs">
                          {item.type}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {item.patientSessionId}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.failedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 mt-1 truncate">
                        {item.error}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-xs text-gray-500">
                        {item.retryCount}x
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryDLQItem(item.id)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDLQItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  {t('pvs.tomedoBridge.dlqEmpty', 'DLQ ist leer')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('pvs.tomedoBridge.dlqEmptyDesc', 'Alle Sync-Operationen waren erfolgreich')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'protocol' && (
          <div className="space-y-4">
            {bridgeStatus?.protocol ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {t('pvs.tomedoBridge.protocolTitle', 'Übergabeprotokoll')}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([bridgeStatus.protocol || ''], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `tomedo-bridge-${patientSessionId}.md`;
                      a.click();
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t('pvs.tomedoBridge.download', 'Herunterladen')}
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {bridgeStatus.protocol}
                  </pre>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  {t('pvs.tomedoBridge.noProtocol', 'Kein Protokoll verfügbar')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('pvs.tomedoBridge.noProtocolDesc', 'Führen Sie die Bridge aus, um ein Protokoll zu generieren')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TomedoBridgePanel;
