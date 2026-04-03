/**
 * DiggAi-Tomedo-Bridge: Core Types
 * 
 * Maximale Subagenten • Maximale Parallelität • Null-Interferenz
 */

import type { AgentTask } from '../../services/agent/task.queue';

// ============================================================================
// AGENT OUTPUT TYPES (Stateless, Immutable)
// ============================================================================

/** Team Alpha: Trust & Transparency */
export interface ExplainabilityOutput {
    explanation: string;
    confidenceScore: number;
    basis: string;
    timestamp: string;
}

export interface EthicsComplianceOutput {
    complianceStatus: 'PASS' | 'WARNING' | 'FAIL';
    gdprCheck: boolean;
    biasFlags: string[];
    recommendations: string[];
    timestamp: string;
}

export interface HumanLoopOutput {
    requiresApproval: boolean;
    reason?: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    approverRole?: string;
    timestamp: string;
}

/** Team Bravo: Tomedo Integration */
export interface ApiConnectorOutput {
    connectionStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    syncQueue: Array<{
        id: string;
        type: string;
        priority: number;
        retryCount: number;
    }>;
    timestamp: string;
    latencyMs?: number;
}

export interface EpaMapperOutput {
    epaEntry: {
        patientId: string;
        fallakte: string;
        customEintrag: string;
        metadata: Record<string, unknown>;
    };
    goaeZiffern: string[];
    mappingValidation: {
        valid: boolean;
        errors: string[];
    };
    timestamp: string;
    /** @phase PHASE_3_REAL_SYNC - Tomedo Sync Results */
    tomedoSync?: {
        patientId?: string;
        patientRef?: string;
        fallakteId?: string;
        fallakteRef?: string;
        created: boolean;
        status: 'synced' | 'pending' | 'failed';
        error?: string;
    };
}

export interface DocumentationOutput {
    documentation: string;
    karteityp: 'Befund' | 'Therapieplan' | 'Anamnese' | 'Sonstiges';
    zeitstempel: string;
    sections: string[];
    wordCount: number;
    /** @phase PHASE_3_REAL_SYNC - Tomedo Composition ID */
    tomedoCompositionId?: string;
    tomedoCompositionRef?: string;
    tomedoSyncStatus?: 'synced' | 'pending' | 'failed' | 'skipped';
    tomedoSyncError?: string;
}

/** Team Charlie: Simplicity Optimization */
export interface LoadReducerOutput {
    simplicityScore: number; // 1-10
    simplifiedSummary: string;
    detailLevel: 'MINIMAL' | 'APPROPRIATE' | 'DETAILED';
    originalComplexity: number;
    reductionPercentage: number;
    timestamp: string;
}

export interface FeedbackOutput {
    validationStatus: 'PASS' | 'FAIL' | 'WARNING';
    errors: Array<{
        code: string;
        message: string;
        severity: 'ERROR' | 'WARNING';
        location?: string;
    }>;
    suggestions: string[];
    timestamp: string;
}

export interface ErrorCorrectionOutput {
    corrections: Array<{
        original: string;
        corrected: string;
        reason: string;
        confidence: number;
    }>;
    confidenceAfterFix: number;
    autoCorrected: boolean;
    requiresReview: boolean;
    timestamp: string;
}

/** Team Delta: Output Orchestration */
export interface MarkdownProtocolOutput {
    protocol: string;
    metadata: {
        version: string;
        sessionId: string;
        generatedAt: string;
        checksum: string;
    };
    sections: string[];
}

export interface CrossValidationOutput {
    validationPassed: boolean;
    divergences: Array<{
        field: string;
        diggaiValue: string;
        tomedoValue: string;
        severity: 'CRITICAL' | 'WARNING' | 'INFO';
    }>;
    syncStatus: 'SYNCED' | 'DIVERGENT' | 'PENDING';
    timestamp: string;
}

export interface AuditTrailOutput {
    auditLog: Array<{
        timestamp: string;
        agent: string;
        action: string;
        inputRef: string;
        outputRef: string;
        durationMs: number;
        status: 'SUCCESS' | 'FAILURE' | 'RETRY';
    }>;
    complianceHash: string;
    totalActions: number;
    failedActions: number;
}

// ============================================================================
// AGGREGATED OUTPUT (Final Result)
// ============================================================================

export interface BridgeExecutionResult {
    success: boolean;
    protocol: string;
    teams: {
        alpha: {
            explainability: ExplainabilityOutput;
            ethics: EthicsComplianceOutput;
            humanLoop: HumanLoopOutput;
        };
        bravo: {
            apiConnector: ApiConnectorOutput;
            epaMapper: EpaMapperOutput;
            documentation: DocumentationOutput;
        };
        charlie: {
            loadReducer: LoadReducerOutput;
            feedback: FeedbackOutput;
            errorCorrection: ErrorCorrectionOutput;
        };
        delta: {
            markdown: MarkdownProtocolOutput;
            crossValidation: CrossValidationOutput;
            auditTrail: AuditTrailOutput;
        };
    };
    timing: {
        startedAt: string;
        completedAt: string;
        totalDurationMs: number;
        teamDurations: Record<string, number>;
    };
    errors: Array<{
        team: string;
        agent: string;
        error: string;
        recoverable: boolean;
    }>;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface BridgeInput {
    patientSessionId: string;
    tenantId: string;
    connectionId: string;
    anamneseData: {
        answers: Record<string, unknown>;
        triageResult?: {
            level: 'CRITICAL' | 'WARNING' | 'NORMAL';
            reasons: string[];
        };
        icd10Codes?: string[];
        soapSummary?: string;
    };
    patientData: {
        patientId?: string;
        externalPatientId?: string;
        name?: string;
        dob?: string;
    };
    options?: {
        requireHumanApproval?: boolean;
        outputFormat?: 'markdown' | 'json' | 'both';
        syncMode?: 'auto' | 'queue' | 'offline';
        detailLevel?: 'minimal' | 'standard' | 'detailed';
    };
}

// ============================================================================
// AGENT INTERFACE
// ============================================================================

export interface IBridgeAgent<TInput, TOutput> {
    name: string;
    team: 'alpha' | 'bravo' | 'charlie' | 'delta';
    displayName: string;
    description: string;
    timeoutMs: number;
    execute(input: TInput, context: BridgeAgentContext): Promise<TOutput>;
}

export interface BridgeAgentContext {
    task: AgentTask;
    traceId: string;
    tenantId: string;
    patientSessionId: string;
    startTime: number;
    abortSignal?: AbortSignal;
}

// ============================================================================
// PROTOCOL TEMPLATE
// ============================================================================

export interface ProtocolTemplate {
    header: string;
    patientContext: string;
    clinicalDecisions: string;
    tomedoSyncStatus: string;
    auditTrail: string;
    footer: string;
}

export const DEFAULT_PROTOCOL_TEMPLATE = {
    header: `## DIGGAI-TOMEDO ÜBERGABEPROTOKOLL
**Datum**: {timestamp}  
**Agenten-Version**: v1.0  
**Session-ID**: {sessionId}  
**Trace-ID**: {traceId}
`,
    patientContext: `### PATIENTENKONTEXT
{epa_stammdaten}
`,
    clinicalDecisions: `### KLINISCHE ENTSCHEIDUNGEN
| Aktion | Erklärung | Compliance | GOÄ |
|--------|-----------|------------|-----|
{tabellen_zeilen}
`,
    tomedoSyncStatus: `### TOMEDO-SYNC-STATUS
- Verbindung: {online/offline}
- Eingereihte Updates: {anzahl}
- Letzter Sync: {timestamp}
- Latenz: {latency}ms
`,
    auditTrail: `### AUDIT-TRAIL
{alle_agenten_aktionen}
`,
    footer: `---
*Protokoll generiert von DiggAi-Tomedo-Bridge v1.0*  
*DSGVO-konform • FHIR-kompatibel • Tomedo-zertifiziert*
`,
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BridgeAgentError extends Error {
    constructor(
        message: string,
        public readonly team: string,
        public readonly agent: string,
        public readonly recoverable: boolean,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'BridgeAgentError';
    }
}

export class BridgeTimeoutError extends BridgeAgentError {
    constructor(team: string, agent: string, timeoutMs: number) {
        super(
            `Agent ${agent} in Team ${team} timed out after ${timeoutMs}ms`,
            team,
            agent,
            true // Timeouts are recoverable with retry
        );
        this.name = 'BridgeTimeoutError';
    }
}

export class BridgeValidationError extends BridgeAgentError {
    constructor(
        team: string,
        agent: string,
        public readonly validationErrors: string[]
    ) {
        super(
            `Validation failed in ${agent}: ${validationErrors.join(', ')}`,
            team,
            agent,
            false // Validation errors are not recoverable
        );
        this.name = 'BridgeValidationError';
    }
}
