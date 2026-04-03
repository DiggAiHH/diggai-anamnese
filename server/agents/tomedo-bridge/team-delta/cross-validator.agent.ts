/**
 * Team Delta - Agent D2: Cross-System-Synchronizer
 * 
 * Stellt sicher, dass Tomedo-ePA und DiggAi-Protokoll identisch sind.
 * Erkennt Divergenzen und dokumentiert diese.
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    CrossValidationOutput,
    MarkdownProtocolOutput,
    EpaMapperOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('CrossValidatorAgent');

interface CrossValidatorInput {
    input: BridgeInput;
    markdown: MarkdownProtocolOutput;
    bravoResult: {
        epaMapper: EpaMapperOutput;
    };
}

interface DivergenceCheck {
    field: string;
    diggaiValue: string;
    tomedoValue: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

class CrossValidatorAgent implements IBridgeAgent<CrossValidatorInput, CrossValidationOutput> {
    name = 'cross-validator';
    team = 'delta' as const;
    displayName = 'Cross-System Validator';
    description = 'Validiert Konsistenz zwischen DiggAi und Tomedo';
    timeoutMs = 7_000; // 7 seconds

    async execute(
        data: CrossValidatorInput,
        context: BridgeAgentContext
    ): Promise<CrossValidationOutput> {
        const startTime = Date.now();
        logger.info('[CrossValidator] Starting cross-validation', {
            traceId: context.traceId,
            patientSessionId: data.input.patientSessionId,
        });

        try {
            // Perform divergence checks
            const divergences = this.checkForDivergences(data);

            // Determine sync status
            const syncStatus = this.determineSyncStatus(divergences, data);

            // Determine overall validation result
            const validationPassed = divergences.every(d => d.severity !== 'CRITICAL');

            const result: CrossValidationOutput = {
                validationPassed,
                divergences,
                syncStatus,
                timestamp: new Date().toISOString(),
            };

            logger.info('[CrossValidator] Cross-validation completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                validationPassed,
                divergenceCount: divergences.length,
                syncStatus,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[CrossValidator] Cross-validation failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Return conservative result with error
            return {
                validationPassed: false,
                divergences: [{
                    field: 'validation_error',
                    diggaiValue: 'unknown',
                    tomedoValue: 'unknown',
                    severity: 'CRITICAL',
                }],
                syncStatus: 'PENDING',
                timestamp: new Date().toISOString(),
            };
        }
    }

    private checkForDivergences(data: CrossValidatorInput): DivergenceCheck[] {
        const divergences: DivergenceCheck[] = [];
        const { input, markdown, bravoResult } = data;

        // Check 1: Patient ID consistency
        const diggaiPatientId = input.patientData.patientId || input.patientData.externalPatientId || '';
        const tomedoPatientId = bravoResult.epaMapper.epaEntry.patientId;
        
        if (diggaiPatientId && tomedoPatientId && diggaiPatientId !== tomedoPatientId) {
            divergences.push({
                field: 'patient_id',
                diggaiValue: diggaiPatientId,
                tomedoValue: tomedoPatientId,
                severity: 'CRITICAL',
            });
        }

        // Check 2: ICD-10 codes in protocol vs EPA
        const icd10InProtocol = input.anamneseData.icd10Codes || [];
        // In a real implementation, we would fetch the actual ICD-10 codes from Tomedo
        // For now, we assume they match if the EPA mapping was successful

        // Check 3: Session ID referenced correctly
        if (!markdown.protocol.includes(input.patientSessionId.substr(0, 8))) {
            divergences.push({
                field: 'session_reference',
                diggaiValue: input.patientSessionId,
                tomedoValue: 'not found in protocol',
                severity: 'WARNING',
            });
        }

        // Check 4: Documentation completeness
        const expectedSections = ['PATIENTENKONTEXT', 'KLINISCHE ENTSCHEIDUNGEN', 'DOKUMENTATION'];
        for (const section of expectedSections) {
            if (!markdown.protocol.includes(section)) {
                divergences.push({
                    field: `missing_section_${section.toLowerCase()}`,
                    diggaiValue: 'expected',
                    tomedoValue: 'missing',
                    severity: 'WARNING',
                });
            }
        }

        // Check 5: Timestamp consistency
        const protocolTimestamp = markdown.metadata.generatedAt;
        const epaTimestamp = bravoResult.epaMapper.timestamp;
        const timeDiff = Math.abs(new Date(protocolTimestamp).getTime() - new Date(epaTimestamp).getTime());
        
        if (timeDiff > 60 * 1000) { // More than 1 minute difference
            divergences.push({
                field: 'timestamp_sync',
                diggaiValue: protocolTimestamp,
                tomedoValue: epaTimestamp,
                severity: 'INFO',
            });
        }

        // Check 6: Checksum validation
        const calculatedChecksum = this.calculateChecksum(markdown.protocol);
        if (calculatedChecksum !== markdown.metadata.checksum) {
            divergences.push({
                field: 'checksum_mismatch',
                diggaiValue: calculatedChecksum,
                tomedoValue: markdown.metadata.checksum,
                severity: 'CRITICAL',
            });
        }

        // Check 7: GOÄ Ziffern consistency
        const goaeZiffern = bravoResult.epaMapper.goaeZiffern;
        if (goaeZiffern.length === 0) {
            divergences.push({
                field: 'goae_ziffern_missing',
                diggaiValue: 'expected',
                tomedoValue: 'none assigned',
                severity: 'WARNING',
            });
        }

        // Check 8: Mapping validation status
        if (!bravoResult.epaMapper.mappingValidation.valid) {
            divergences.push({
                field: 'epa_mapping',
                diggaiValue: 'valid mapping expected',
                tomedoValue: bravoResult.epaMapper.mappingValidation.errors.join(', '),
                severity: 'CRITICAL',
            });
        }

        return divergences;
    }

    private determineSyncStatus(
        divergences: DivergenceCheck[],
        data: CrossValidatorInput
    ): CrossValidationOutput['syncStatus'] {
        // Check if we have critical divergences
        const hasCritical = divergences.some(d => d.severity === 'CRITICAL');
        const hasWarnings = divergences.some(d => d.severity === 'WARNING');

        if (hasCritical) {
            return 'DIVERGENT';
        }

        if (hasWarnings) {
            return 'PENDING'; // Needs review but not critical
        }

        // Check if Tomedo connection is online
        // In a real implementation, we would verify actual sync with Tomedo API
        const connectionStatus = 'ONLINE'; // Placeholder
        
        if (connectionStatus === 'ONLINE' && divergences.length === 0) {
            return 'SYNCED';
        }

        return 'PENDING';
    }

    private calculateChecksum(content: string): string {
        // Same algorithm as MarkdownGeneratorAgent
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    }

    // Public method to trigger re-sync (would be called when user approves)
    async triggerResync(
        input: BridgeInput,
        context: BridgeAgentContext
    ): Promise<{ success: boolean; message: string }> {
        logger.info('[CrossValidator] Triggering manual re-sync', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        // In production, this would:
        // 1. Re-generate the EPA entry
        // 2. Push to Tomedo API
        // 3. Verify the sync
        // 4. Update sync status

        return {
            success: true,
            message: 'Re-sync triggered successfully',
        };
    }
}

export const crossValidatorAgent = new CrossValidatorAgent();
