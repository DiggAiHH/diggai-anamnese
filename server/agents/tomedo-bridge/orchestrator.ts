/**
 * DiggAi-Tomedo-Bridge Orchestrator
 * 
 * Koordiniert 9 Subagenten in 3 parallelen Clustern:
 * - Team Alpha (Trust & Transparency): Parallel
 * - Team Bravo (Tomedo Integration): Parallel  
 * - Team Charlie (Simplicity Optimization): Parallel
 * - Team Delta (Output Orchestration): Sequentiell (abhängig von 1+2)
 * 
 * Grundprinzip: "MAXIMALE SUBAGENTEN • MAXIMALE PARALLELITÄT • NULL-INTERFERENZ"
 */

import { createLogger } from '../../logger.js';
import { taskQueue, type AgentTask } from '../../services/agent/task.queue';
import {
    emitBridgeStarted,
    emitBridgeCompleted,
    emitBridgeFailed,
    emitBridgeDLQUpdated,
    emitBridgeTeamProgress,
} from '../../socket.js';
import type {
    BridgeInput,
    BridgeExecutionResult,
    BridgeAgentContext,
    ExplainabilityOutput,
    EthicsComplianceOutput,
    HumanLoopOutput,
    ApiConnectorOutput,
    EpaMapperOutput,
    DocumentationOutput,
    LoadReducerOutput,
    FeedbackOutput,
    ErrorCorrectionOutput,
    MarkdownProtocolOutput,
    CrossValidationOutput,
    AuditTrailOutput,
    BridgeAgentError,
} from './types.js';
import { BridgeTimeoutError } from './types.js';

// Team Agents
import { explainabilityAgent } from './team-alpha/explainability.agent.js';
import { ethicsAgent } from './team-alpha/ethics.agent.js';
import { humanLoopAgent } from './team-alpha/human-loop.agent.js';
import { apiConnectorAgent } from './team-bravo/api-connector.agent.js';
import { epaMapperAgent } from './team-bravo/epa-mapper.agent.js';
import { documentationAgent } from './team-bravo/documentation.agent.js';
import { loadReducerAgent } from './team-charlie/load-reducer.agent.js';
import { feedbackAgent } from './team-charlie/feedback.agent.js';
import { errorCorrectionAgent } from './team-charlie/error-correction.agent.js';
import { markdownGeneratorAgent } from './team-delta/markdown-generator.agent.js';
import { crossValidatorAgent } from './team-delta/cross-validator.agent.js';
import { auditLoggerAgent } from './team-delta/audit-logger.agent.js';

const logger = createLogger('TomedoBridgeOrchestrator');

// Timeouts per team (30s default per agent)
const TEAM_TIMEOUTS = {
    alpha: 30_000,
    bravo: 30_000,
    charlie: 30_000,
    delta: 30_000,
};

interface TeamAlphaResult {
    explainability: ExplainabilityOutput;
    ethics: EthicsComplianceOutput;
    humanLoop: HumanLoopOutput;
}

interface TeamBravoResult {
    apiConnector: ApiConnectorOutput;
    epaMapper: EpaMapperOutput;
    documentation: DocumentationOutput;
}

interface TeamCharlieResult {
    loadReducer: LoadReducerOutput;
    feedback: FeedbackOutput;
    errorCorrection: ErrorCorrectionOutput;
}

interface TeamDeltaResult {
    markdown: MarkdownProtocolOutput;
    crossValidation: CrossValidationOutput;
    auditTrail: AuditTrailOutput;
}

export class TomedoBridgeOrchestrator {
    private readonly name = 'TomedoBridgeOrchestrator';

    /**
     * Main execution entry point
     * Phases:
     * 1. PARALLEL: Teams Alpha + Bravo + Charlie simultaneously
     * 2. SYNCHRONIZE: Aggregate and validate results
     * 3. SEQUENTIAL: Team Delta (depends on Alpha + Bravo)
     */
    async execute(input: BridgeInput, task: AgentTask): Promise<BridgeExecutionResult> {
        const startTime = Date.now();
        const traceId = this.generateTraceId();
        
        logger.info('[Bridge] Starting execution', {
            traceId,
            patientSessionId: input.patientSessionId,
            tenantId: input.tenantId,
        });

        const errors: Array<{
            team: string;
            agent: string;
            error: string;
            recoverable: boolean;
        }> = [];

        // Emit started event
        emitBridgeStarted({
            patientSessionId: input.patientSessionId,
            tenantId: input.tenantId,
            taskId: traceId,
        });

        try {
            // =====================================================================
            // PHASE 1: PARALLEL EXECUTION (Teams Alpha, Bravo, Charlie)
            // =====================================================================
            logger.info('[Bridge] Phase 1: Starting parallel team execution', { traceId });

            const parallelStart = Date.now();
            
            const [alphaResult, bravoResult, charlieResult] = await Promise.all([
                this.executeTeamAlpha(input, task, traceId, startTime).catch(err => {
                    errors.push({ team: 'alpha', agent: 'team', error: err.message, recoverable: err.recoverable ?? false });
                    return this.getAlphaFallback(input);
                }),
                this.executeTeamBravo(input, task, traceId, startTime).catch(err => {
                    errors.push({ team: 'bravo', agent: 'team', error: err.message, recoverable: err.recoverable ?? false });
                    return this.getBravoFallback(input);
                }),
                this.executeTeamCharlie(input, task, traceId, startTime).catch(err => {
                    errors.push({ team: 'charlie', agent: 'team', error: err.message, recoverable: err.recoverable ?? false });
                    return this.getCharlieFallback(input);
                }),
            ]);

            const parallelDuration = Date.now() - parallelStart;
            logger.info('[Bridge] Phase 1 completed', { traceId, durationMs: parallelDuration });

            // =====================================================================
            // PHASE 2: SYNCHRONIZATION & VALIDATION
            // =====================================================================
            logger.info('[Bridge] Phase 2: Synchronizing team outputs', { traceId });
            
            const validationErrors = this.validateTeamOutputs(alphaResult, bravoResult, charlieResult);
            if (validationErrors.length > 0) {
                logger.warn('[Bridge] Validation warnings', { traceId, errors: validationErrors });
            }

            // =====================================================================
            // PHASE 3: SEQUENTIAL OUTPUT (Team Delta)
            // =====================================================================
            logger.info('[Bridge] Phase 3: Starting Team Delta (output orchestration)', { traceId });

            const deltaStart = Date.now();
            const deltaResult = await this.executeTeamDelta(
                input,
                task,
                traceId,
                startTime,
                alphaResult,
                bravoResult,
                charlieResult
            ).catch(err => {
                errors.push({ team: 'delta', agent: 'team', error: err.message, recoverable: err.recoverable ?? false });
                return this.getDeltaFallback(input, alphaResult, bravoResult, charlieResult);
            });

            const deltaDuration = Date.now() - deltaStart;
            logger.info('[Bridge] Phase 3 completed', { traceId, durationMs: deltaDuration });

            // =====================================================================
            // BUILD FINAL RESULT
            // =====================================================================
            const totalDuration = Date.now() - startTime;
            
            const result: BridgeExecutionResult = {
                success: errors.length === 0 || errors.every(e => e.recoverable),
                protocol: deltaResult.markdown.protocol,
                teams: {
                    alpha: alphaResult,
                    bravo: bravoResult,
                    charlie: charlieResult,
                    delta: deltaResult,
                },
                timing: {
                    startedAt: new Date(startTime).toISOString(),
                    completedAt: new Date().toISOString(),
                    totalDurationMs: totalDuration,
                    teamDurations: {
                        parallel: parallelDuration,
                        delta: deltaDuration,
                    },
                },
                errors,
            };

            logger.info('[Bridge] Execution completed', {
                traceId,
                success: result.success,
                totalDurationMs: totalDuration,
                errorCount: errors.length,
            });

            // Emit completion event
            emitBridgeCompleted({
                patientSessionId: input.patientSessionId,
                tenantId: input.tenantId,
                taskId: traceId,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[Bridge] Fatal execution error', { traceId, error: errorMsg });

            // Emit failed event
            emitBridgeFailed({
                patientSessionId: input.patientSessionId,
                tenantId: input.tenantId,
                taskId: traceId,
                error: errorMsg,
            });

            return {
                success: false,
                protocol: this.generateErrorProtocol(input, errorMsg, traceId),
                teams: {} as BridgeExecutionResult['teams'],
                timing: {
                    startedAt: new Date(startTime).toISOString(),
                    completedAt: new Date().toISOString(),
                    totalDurationMs: Date.now() - startTime,
                    teamDurations: {},
                },
                errors: [...errors, { team: 'orchestrator', agent: 'main', error: errorMsg, recoverable: false }],
            };
        }
    }

    // =========================================================================
    // TEAM EXECUTORS
    // =========================================================================

    private async executeTeamAlpha(
        input: BridgeInput,
        task: AgentTask,
        traceId: string,
        startTime: number
    ): Promise<TeamAlphaResult> {
        const context = this.createContext(task, traceId, input, startTime);
        
        // All 3 agents in Team Alpha execute in parallel
        const [explainability, ethics, humanLoop] = await Promise.all([
            this.runWithTimeout(
                explainabilityAgent.execute(input, context),
                explainabilityAgent.timeoutMs,
                'alpha',
                explainabilityAgent.name
            ),
            this.runWithTimeout(
                ethicsAgent.execute(input, context),
                ethicsAgent.timeoutMs,
                'alpha',
                ethicsAgent.name
            ),
            this.runWithTimeout(
                humanLoopAgent.execute(input, context),
                humanLoopAgent.timeoutMs,
                'alpha',
                humanLoopAgent.name
            ),
        ]);

        return { explainability, ethics, humanLoop };
    }

    private async executeTeamBravo(
        input: BridgeInput,
        task: AgentTask,
        traceId: string,
        startTime: number
    ): Promise<TeamBravoResult> {
        const context = this.createContext(task, traceId, input, startTime);
        
        // PHASE 3: Sequential execution for dependency management
        // 1. API Connector runs first (connection check)
        // 2. EPA Mapper runs second (creates patient/fallakte in Tomedo)
        // 3. Documentation runs third (needs patient/fallakte IDs)
        
        const apiConnector = await this.runWithTimeout(
            apiConnectorAgent.execute(input, context),
            apiConnectorAgent.timeoutMs,
            'bravo',
            apiConnectorAgent.name
        );

        // EPA Mapper creates patient/fallakte in Tomedo
        const epaMapper = await this.runWithTimeout(
            epaMapperAgent.execute(input, context),
            epaMapperAgent.timeoutMs,
            'bravo',
            epaMapperAgent.name
        );

        // Documentation uses the Tomedo IDs from EPA Mapper
        // We pass them via input enrichment
        const enrichedInput: BridgeInput = {
            ...input,
            // Pass Tomedo IDs to documentation agent via patientData
            patientData: {
                ...input.patientData,
                externalPatientId: epaMapper.tomedoSync?.patientId || input.patientData.externalPatientId,
            },
        };

        const documentation = await this.runWithTimeout(
            documentationAgent.execute(enrichedInput, context),
            documentationAgent.timeoutMs,
            'bravo',
            documentationAgent.name
        );

        // Sync Documentation result to Tomedo if we have fallakte ID
        if (epaMapper.tomedoSync?.fallakteId && documentation.tomedoSyncStatus !== 'synced') {
            try {
                const { createTomedoApiClient } = await import('../../services/pvs/tomedo-api.client.js');
                const { prisma } = await import('../../db.js');
                
                const connection = await prisma.pvsConnection.findFirst({
                    where: { id: input.connectionId, pvsType: 'TOMEDO', isActive: true },
                });

                if (connection) {
                    const client = createTomedoApiClient(this.toConnectionData(connection));
                    const connectionTest = await client.testConnection();
                    
                    if (connectionTest.ok) {
                        const compositionId = await client.addKarteieintrag(
                            epaMapper.tomedoSync.fallakteId,
                            {
                                type: documentation.karteityp,
                                content: documentation.documentation,
                                icd10Codes: input.anamneseData.icd10Codes,
                                metadata: {
                                    sessionId: input.patientSessionId,
                                    tenantId: input.tenantId,
                                    source: 'DiggAI-Tomedo-Bridge',
                                },
                            }
                        );

                        // Update documentation output with Tomedo IDs
                        documentation.tomedoCompositionId = compositionId;
                        documentation.tomedoCompositionRef = `Composition/${compositionId}`;
                        documentation.tomedoSyncStatus = 'synced';

                        logger.info('[Bridge] Documentation synced to Tomedo', {
                            traceId,
                            compositionId,
                            fallakteId: epaMapper.tomedoSync.fallakteId,
                        });
                    }
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.warn('[Bridge] Failed to sync documentation to Tomedo', {
                    traceId,
                    error: errorMsg,
                });
                documentation.tomedoSyncStatus = 'failed';
                documentation.tomedoSyncError = errorMsg;
                
                // Add to dead letter queue
                await this.addToDeadLetterQueue(input, documentation, errorMsg, traceId);
            }
        }

        return { apiConnector, epaMapper, documentation };
    }

    private toConnectionData(connection: Record<string, unknown>) {
        return {
            id: connection.id as string,
            praxisId: connection.praxisId as string,
            pvsType: 'TOMEDO' as const,
            pvsVersion: connection.pvsVersion as string | undefined,
            protocol: 'FHIR' as const,
            fhirBaseUrl: connection.fhirBaseUrl as string | undefined,
            fhirAuthType: connection.fhirAuthType as string | undefined,
            fhirCredentials: connection.fhirCredentials as string | undefined,
            fhirTenantId: connection.fhirTenantId as string | undefined,
            isActive: connection.isActive as boolean,
            syncIntervalSec: connection.syncIntervalSec as number,
            retryCount: connection.retryCount as number,
            autoMapFields: connection.autoMapFields as boolean,
        };
    }

    private async addToDeadLetterQueue(
        input: BridgeInput,
        documentation: DocumentationOutput,
        error: string,
        traceId: string
    ): Promise<void> {
        try {
            const { getRedisClient } = await import('../../redis.js');
            const redis = getRedisClient();
            
            const dlqItem = {
                id: `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                patientSessionId: input.patientSessionId,
                tenantId: input.tenantId,
                connectionId: input.connectionId,
                documentation: {
                    content: documentation.documentation,
                    karteityp: documentation.karteityp,
                    icd10Codes: input.anamneseData.icd10Codes,
                },
                error,
                traceId,
                failedAt: new Date().toISOString(),
                retryCount: 0,
            };

            if (redis) {
                await redis.lpush('tomedo-bridge:dlq', JSON.stringify(dlqItem));
                await redis.expire('tomedo-bridge:dlq', 7 * 24 * 60 * 60); // 7 days
            } else {
                // Fallback: log to database
                const { prisma } = await import('../../db.js');
                await prisma.pvsTransferLog.create({
                    data: {
                        connectionId: input.connectionId,
                        direction: 'EXPORT',
                        protocol: 'FHIR',
                        entityType: 'Composition',
                        entityId: input.patientSessionId,
                        status: 'FAILED',
                        errorMessage: `DLQ: ${error}`,
                        rawPayload: JSON.stringify(dlqItem),
                    },
                });
            }

            logger.info('[Bridge] Added to dead letter queue', {
                traceId,
                dlqItemId: dlqItem.id,
            });

            // Emit DLQ updated event
            emitBridgeDLQUpdated({
                patientSessionId: input.patientSessionId,
                tenantId: input.tenantId,
                taskId: traceId,
                dlqCount: 1, // Approximate, actual count will be fetched by clients
            });
        } catch (dlqError) {
            logger.error('[Bridge] Failed to add to dead letter queue', {
                traceId,
                error: dlqError instanceof Error ? dlqError.message : String(dlqError),
            });
        }
    }

    private async executeTeamCharlie(
        input: BridgeInput,
        task: AgentTask,
        traceId: string,
        startTime: number
    ): Promise<TeamCharlieResult> {
        const context = this.createContext(task, traceId, input, startTime);
        
        // All 3 agents in Team Charlie execute in parallel
        const [loadReducer, feedback, errorCorrection] = await Promise.all([
            this.runWithTimeout(
                loadReducerAgent.execute(input, context),
                loadReducerAgent.timeoutMs,
                'charlie',
                loadReducerAgent.name
            ),
            this.runWithTimeout(
                feedbackAgent.execute(input, context),
                feedbackAgent.timeoutMs,
                'charlie',
                feedbackAgent.name
            ),
            this.runWithTimeout(
                errorCorrectionAgent.execute(input, context),
                errorCorrectionAgent.timeoutMs,
                'charlie',
                errorCorrectionAgent.name
            ),
        ]);

        return { loadReducer, feedback, errorCorrection };
    }

    private async executeTeamDelta(
        input: BridgeInput,
        task: AgentTask,
        traceId: string,
        startTime: number,
        alphaResult: TeamAlphaResult,
        bravoResult: TeamBravoResult,
        charlieResult: TeamCharlieResult
    ): Promise<TeamDeltaResult> {
        const context = this.createContext(task, traceId, input, startTime);
        
        // Team Delta is sequential - each agent depends on the previous
        // First: Generate Markdown
        const markdown = await this.runWithTimeout(
            markdownGeneratorAgent.execute({
                input,
                alphaResult,
                bravoResult,
                charlieResult,
            }, context),
            markdownGeneratorAgent.timeoutMs,
            'delta',
            markdownGeneratorAgent.name
        );

        // Second: Cross-validate
        const crossValidation = await this.runWithTimeout(
            crossValidatorAgent.execute({
                input,
                markdown,
                bravoResult,
            }, context),
            crossValidatorAgent.timeoutMs,
            'delta',
            crossValidatorAgent.name
        );

        // Third: Audit logging
        const auditTrail = await this.runWithTimeout(
            auditLoggerAgent.execute({
                input,
                alphaResult,
                bravoResult,
                charlieResult,
                deltaResult: { markdown, crossValidation },
                timing: {
                    startedAt: startTime,
                    completedAt: Date.now(),
                },
            }, context),
            auditLoggerAgent.timeoutMs,
            'delta',
            auditLoggerAgent.name
        );

        return { markdown, crossValidation, auditTrail };
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    private async runWithTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        team: string,
        agent: string
    ): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new BridgeTimeoutError(team, agent, timeoutMs)), timeoutMs)
            ),
        ]);
    }

    private createContext(
        task: AgentTask,
        traceId: string,
        input: BridgeInput,
        startTime: number
    ): BridgeAgentContext {
        return {
            task,
            traceId,
            tenantId: input.tenantId,
            patientSessionId: input.patientSessionId,
            startTime,
        };
    }

    private generateTraceId(): string {
        return `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private validateTeamOutputs(
        alpha: TeamAlphaResult,
        bravo: TeamBravoResult,
        charlie: TeamCharlieResult
    ): string[] {
        const errors: string[] = [];

        // Check if ethics compliance passed
        if (alpha.ethics.complianceStatus === 'FAIL') {
            errors.push('Ethics compliance check failed');
        }

        // Check if human approval is required but not obtained
        if (alpha.humanLoop.requiresApproval) {
            errors.push(`Human approval required: ${alpha.humanLoop.reason}`);
        }

        // Check Tomedo connection
        if (bravo.apiConnector.connectionStatus === 'OFFLINE') {
            errors.push('Tomedo API is offline - using offline queue mode');
        }

        // Check validation status
        if (charlie.feedback.validationStatus === 'FAIL') {
            errors.push(`Validation failed: ${charlie.feedback.errors.map(e => e.message).join(', ')}`);
        }

        return errors;
    }

    // =========================================================================
    // FALLBACK HANDLERS (Graceful Degradation)
    // =========================================================================

    private getAlphaFallback(input: BridgeInput): TeamAlphaResult {
        const timestamp = new Date().toISOString();
        return {
            explainability: {
                explanation: 'Fallback: Explainability service unavailable',
                confidenceScore: 0,
                basis: 'fallback',
                timestamp,
            },
            ethics: {
                complianceStatus: 'WARNING',
                gdprCheck: true,
                biasFlags: ['fallback_mode'],
                recommendations: ['Review manually'],
                timestamp,
            },
            humanLoop: {
                requiresApproval: true,
                reason: 'Fallback mode activated - manual review required',
                urgency: 'HIGH',
                approverRole: 'arzt',
                timestamp,
            },
        };
    }

    private getBravoFallback(input: BridgeInput): TeamBravoResult {
        const timestamp = new Date().toISOString();
        return {
            apiConnector: {
                connectionStatus: 'OFFLINE',
                syncQueue: [],
                timestamp,
            },
            epaMapper: {
                epaEntry: {
                    patientId: input.patientData.patientId || 'unknown',
                    fallakte: 'pending',
                    customEintrag: 'Fallback: EPA mapping unavailable',
                    metadata: {},
                },
                goaeZiffern: [],
                mappingValidation: { valid: false, errors: ['Fallback mode'] },
                timestamp,
            },
            documentation: {
                documentation: 'Fallback: Documentation generation failed',
                karteityp: 'Sonstiges',
                zeitstempel: timestamp,
                sections: [],
                wordCount: 0,
            },
        };
    }

    private getCharlieFallback(input: BridgeInput): TeamCharlieResult {
        const timestamp = new Date().toISOString();
        return {
            loadReducer: {
                simplicityScore: 5,
                simplifiedSummary: 'Fallback: Simplicity optimization unavailable',
                detailLevel: 'APPROPRIATE',
                originalComplexity: 0,
                reductionPercentage: 0,
                timestamp,
            },
            feedback: {
                validationStatus: 'WARNING',
                errors: [{ code: 'FALLBACK', message: 'Running in fallback mode', severity: 'WARNING' }],
                suggestions: ['Manual review recommended'],
                timestamp,
            },
            errorCorrection: {
                corrections: [],
                confidenceAfterFix: 0.5,
                autoCorrected: false,
                requiresReview: true,
                timestamp,
            },
        };
    }

    private getDeltaFallback(
        input: BridgeInput,
        alpha: TeamAlphaResult,
        bravo: TeamBravoResult,
        charlie: TeamCharlieResult
    ): TeamDeltaResult {
        const timestamp = new Date().toISOString();
        const protocol = this.generateErrorProtocol(input, 'Team Delta failed', `fallback-${Date.now()}`);
        
        return {
            markdown: {
                protocol,
                metadata: {
                    version: '1.0-fallback',
                    sessionId: input.patientSessionId,
                    generatedAt: timestamp,
                    checksum: 'fallback',
                },
                sections: ['ERROR'],
            },
            crossValidation: {
                validationPassed: false,
                divergences: [{
                    field: 'system',
                    diggaiValue: 'error',
                    tomedoValue: 'unknown',
                    severity: 'CRITICAL',
                }],
                syncStatus: 'PENDING',
                timestamp,
            },
            auditTrail: {
                auditLog: [],
                complianceHash: 'fallback',
                totalActions: 0,
                failedActions: 1,
            },
        };
    }

    private generateErrorProtocol(input: BridgeInput, error: string, traceId: string): string {
        return `## DIGGAI-TOMEDO ÜBERGABEPROTOKOLL - FEHLER
**Datum**: ${new Date().toISOString()}  
**Session-ID**: ${input.patientSessionId}  
**Trace-ID**: ${traceId}

### FEHLER
${error}

### PATIENTENKONTEXT
- Patienten-ID: ${input.patientData.patientId || 'unbekannt'}
- Tenant: ${input.tenantId}

### EMPFEHLUNG
Bitte manuelle Überprüfung durchführen.

---
*Fehlerprotokoll generiert von DiggAi-Tomedo-Bridge*
`;
    }
}

// Singleton export
export const tomedoBridgeOrchestrator = new TomedoBridgeOrchestrator();
