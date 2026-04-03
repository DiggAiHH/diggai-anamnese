/**
 * Team Charlie - Agent C3: Error-Self-Correction
 * 
 * Implementiert "descriptive errors for self-correction" Pattern.
 * Versucht automatisch Fehler zu beheben und markiert was überprüft werden muss.
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    ErrorCorrectionOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('ErrorCorrectionAgent');

// Correction rules with auto-fix capabilities
interface CorrectionRule {
    id: string;
    detect: (input: BridgeInput) => boolean;
    correct: (input: BridgeInput) => { original: string; corrected: string; reason: string; confidence: number } | null;
    autoFixable: boolean;
}

const CORRECTION_RULES: CorrectionRule[] = [
    {
        id: 'icd10_leading_zeros',
        detect: (input) => {
            const codes = input.anamneseData.icd10Codes || [];
            return codes.some(c => /^[A-Z]0[0-9]/.test(c) && c.length < 4);
        },
        correct: (input) => {
            const codes = input.anamneseData.icd10Codes || [];
            const correctedCodes = codes.map(c => {
                // Fix codes like "I10" -> "I10" (already correct) or "E119" -> "E11.9"
                if (/^[A-Z][0-9]{3}$/.test(c) && !c.includes('.')) {
                    return `${c.slice(0, 3)}.${c.slice(3)}`;
                }
                return c;
            });
            
            return {
                original: codes.join(', '),
                corrected: correctedCodes.join(', '),
                reason: 'ICD-10 Format korrigiert (Subkodierung)',
                confidence: 0.95,
            };
        },
        autoFixable: true,
    },
    {
        id: 'missing_triage_for_critical_icd',
        detect: (input): boolean => {
            const criticalCodes = ['I21', 'I22', 'J44', 'C78', 'C79'];
            const hasCriticalCode = input.anamneseData.icd10Codes?.some(c => 
                criticalCodes.some(cc => c.startsWith(cc))
            );
            return !!(hasCriticalCode && !input.anamneseData.triageResult);
        },
        correct: () => ({
            original: 'Keine Triage durchgeführt',
            corrected: 'Triage: WARNING - Kritischer ICD-10 Code',
            reason: 'Automatische Triage basierend auf kritischem ICD-10 Code',
            confidence: 0.85,
        }),
        autoFixable: false, // Needs human review
    },
    {
        id: 'lowercase_icd10',
        detect: (input) => {
            const codes = input.anamneseData.icd10Codes || [];
            return codes.some(c => c !== c.toUpperCase());
        },
        correct: (input) => {
            const codes = input.anamneseData.icd10Codes || [];
            const correctedCodes = codes.map(c => c.toUpperCase());
            
            return {
                original: codes.join(', '),
                corrected: correctedCodes.join(', '),
                reason: 'ICD-10 Codes in Großbuchstaben umgewandelt',
                confidence: 0.99,
            };
        },
        autoFixable: true,
    },
    {
        id: 'inconsistent_patient_ids',
        detect: (input) => {
            return !!input.patientData.patientId && 
                   !!input.patientData.externalPatientId &&
                   input.patientData.patientId !== input.patientData.externalPatientId;
        },
        correct: (input) => ({
            original: `Intern: ${input.patientData.patientId}, Extern: ${input.patientData.externalPatientId}`,
            corrected: `Externe ID priorisiert: ${input.patientData.externalPatientId}`,
            reason: 'PVS-externe Patienten-ID für Tomedo-Sync priorisiert',
            confidence: 0.75,
        }),
        autoFixable: false, // Needs human review
    },
    {
        id: 'empty_answers_filter',
        detect: (input) => {
            const answers = input.anamneseData.answers;
            return Object.values(answers).some(v => v === '' || v === null || v === undefined);
        },
        correct: (input) => {
            const answers = input.anamneseData.answers;
            const cleanedAnswers = Object.fromEntries(
                Object.entries(answers).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
            );
            
            return {
                original: `${Object.keys(answers).length} Antworten (mit Leereinträgen)`,
                corrected: `${Object.keys(cleanedAnswers).length} Antworten (bereinigt)`,
                reason: 'Leere Antworten entfernt',
                confidence: 0.98,
            };
        },
        autoFixable: true,
    },
    {
        id: 'special_chars_in_names',
        detect: (input) => {
            const name = input.patientData.name || '';
            return /[<>&\"']/.test(name);
        },
        correct: (input) => {
            const name = input.patientData.name || '';
            const cleanedName = name
                .replace(/</g, '')
                .replace(/>/g, '')
                .replace(/&/g, 'und')
                .replace(/\"/g, '')
                .replace(/'/g, '');
            
            return {
                original: name,
                corrected: cleanedName,
                reason: 'Sonderzeichen für XML/JSON Kompatibilität entfernt',
                confidence: 0.9,
            };
        },
        autoFixable: true,
    },
];

class ErrorCorrectionAgent implements IBridgeAgent<BridgeInput, ErrorCorrectionOutput> {
    name = 'error-correction';
    team = 'charlie' as const;
    displayName = 'Error Self-Correction';
    description = 'Erkennt und korrigiert Fehler automatisch mit Confidence-Scoring';
    timeoutMs = 6_000; // 6 seconds

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<ErrorCorrectionOutput> {
        const startTime = Date.now();
        logger.info('[ErrorCorrection] Starting error detection and correction', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        try {
            const corrections: ErrorCorrectionOutput['corrections'] = [];
            let autoCorrected = true;
            let requiresReview = false;

            // Apply all correction rules
            for (const rule of CORRECTION_RULES) {
                if (rule.detect(input)) {
                    const correction = rule.correct(input);
                    
                    if (correction) {
                        corrections.push(correction);
                        
                        // Track if all corrections are auto-fixable
                        if (!rule.autoFixable) {
                            autoCorrected = false;
                            requiresReview = true;
                        }
                        
                        // If confidence is low, require review
                        if (correction.confidence < 0.8) {
                            requiresReview = true;
                        }
                    }
                }
            }

            // Calculate overall confidence after fixes
            const confidenceAfterFix = this.calculateOverallConfidence(corrections);

            // If we have critical issues, always require review
            if (this.hasCriticalIssues(input)) {
                requiresReview = true;
            }

            const result: ErrorCorrectionOutput = {
                corrections,
                confidenceAfterFix,
                autoCorrected: autoCorrected && corrections.length > 0,
                requiresReview,
                timestamp: new Date().toISOString(),
            };

            logger.info('[ErrorCorrection] Correction completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                correctionsCount: corrections.length,
                autoCorrected,
                requiresReview,
                confidenceAfterFix,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[ErrorCorrection] Correction failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Conservative fallback: require review
            return {
                corrections: [],
                confidenceAfterFix: 0.5,
                autoCorrected: false,
                requiresReview: true,
                timestamp: new Date().toISOString(),
            };
        }
    }

    private calculateOverallConfidence(corrections: ErrorCorrectionOutput['corrections']): number {
        if (corrections.length === 0) return 1.0;

        // Calculate weighted average of confidence scores
        const totalConfidence = corrections.reduce((sum, c) => sum + c.confidence, 0);
        const averageConfidence = totalConfidence / corrections.length;

        // Penalize multiple corrections
        const countPenalty = Math.min(corrections.length * 0.05, 0.2);

        return Math.max(0, Math.min(1, averageConfidence - countPenalty));
    }

    private hasCriticalIssues(input: BridgeInput): boolean {
        // Check for critical patient safety issues
        
        // 1. Missing patient ID
        if (!input.patientData.patientId && !input.patientData.externalPatientId) {
            return true;
        }

        // 2. Critical triage without proper documentation
        if (input.anamneseData.triageResult?.level === 'CRITICAL') {
            const hasDocumentation = !!input.anamneseData.soapSummary;
            if (!hasDocumentation) return true;
        }

        // 3. Suicide risk indicators
        const answers = JSON.stringify(input.anamneseData.answers).toLowerCase();
        if (/suizid|selbstmord|selbst.tot|suicide/i.test(answers)) {
            return true;
        }

        // 4. Inconsistent medication data
        const medicationData = input.anamneseData.answers['medikamente'] || 
                              input.anamneseData.answers['medications'];
        if (medicationData && String(medicationData).length > 500) {
            // Very long medication list needs review
            return true;
        }

        return false;
    }

    // Public method to apply corrections to input (returns corrected input)
    applyCorrections(input: BridgeInput, corrections: ErrorCorrectionOutput['corrections']): BridgeInput {
        // This would apply the corrections to the input
        // For now, return original (corrections are documented in output)
        logger.info('[ErrorCorrection] Applying corrections', {
            correctionCount: corrections.length,
        });
        
        return input;
    }
}

export const errorCorrectionAgent = new ErrorCorrectionAgent();
