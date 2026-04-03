/**
 * Team Charlie - Agent C2: Feedback-Loop-Manager
 * 
 * Real-time Validation der generierten Daten.
 * Prüft auf Vollständigkeit, Konsistenz und medizinische Plausibilität.
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    FeedbackOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('FeedbackAgent');

// Validation rules
interface ValidationRule {
    id: string;
    check: (input: BridgeInput) => { passed: boolean; message?: string };
    severity: 'ERROR' | 'WARNING';
}

const VALIDATION_RULES: ValidationRule[] = [
    {
        id: 'patient_id_present',
        check: (input) => ({
            passed: !!input.patientData.patientId || !!input.patientData.externalPatientId,
            message: 'Patienten-ID fehlt',
        }),
        severity: 'ERROR',
    },
    {
        id: 'session_id_present',
        check: (input) => ({
            passed: !!input.patientSessionId && input.patientSessionId.length > 0,
            message: 'Session-ID fehlt',
        }),
        severity: 'ERROR',
    },
    {
        id: 'tenant_id_present',
        check: (input) => ({
            passed: !!input.tenantId && input.tenantId.length > 0,
            message: 'Tenant-ID fehlt',
        }),
        severity: 'ERROR',
    },
    {
        id: 'anamnese_data_present',
        check: (input) => ({
            passed: Object.keys(input.anamneseData.answers).length > 0,
            message: 'Anamnese-Daten sind leer',
        }),
        severity: 'WARNING',
    },
    {
        id: 'icd10_valid_format',
        check: (input) => {
            const codes = input.anamneseData.icd10Codes || [];
            const invalidCodes = codes.filter(c => !/^[A-Z][0-9]{2,3}(.[0-9]{1,2})?$/.test(c));
            return {
                passed: invalidCodes.length === 0,
                message: invalidCodes.length > 0 ? `Ungültige ICD-10 Codes: ${invalidCodes.join(', ')}` : undefined,
            };
        },
        severity: 'WARNING',
    },
    {
        id: 'triage_consistency',
        check: (input) => {
            const triage = input.anamneseData.triageResult;
            if (!triage) return { passed: true };
            
            // Check if triage level matches reasons
            const hasReasons = triage.reasons.length > 0;
            return {
                passed: hasReasons,
                message: hasReasons ? undefined : 'Triage-Level ohne Begründung',
            };
        },
        severity: 'WARNING',
    },
    {
        id: 'critical_triage_check',
        check: (input) => {
            const triage = input.anamneseData.triageResult;
            if (!triage || triage.level !== 'CRITICAL') return { passed: true };
            
            // Critical triage should have explicit critical reasons
            const criticalReasons = ['schmerz', 'pain', 'blut', 'blood', 'atemnot', 'notfall', 'emergency'];
            const hasCriticalReason = triage.reasons.some(r => 
                criticalReasons.some(cr => r.toLowerCase().includes(cr))
            );
            
            return {
                passed: hasCriticalReason,
                message: hasCriticalReason ? undefined : 'Kritischer Triage-Level ohne kritische Begründung',
            };
        },
        severity: 'ERROR',
    },
    {
        id: 'connection_id_present',
        check: (input) => ({
            passed: !!input.connectionId && input.connectionId.length > 0,
            message: 'PVS Connection-ID fehlt',
        }),
        severity: 'WARNING',
    },
];

class FeedbackAgent implements IBridgeAgent<BridgeInput, FeedbackOutput> {
    name = 'feedback';
    team = 'charlie' as const;
    displayName = 'Feedback Loop Manager';
    description = 'Validiert generierte Daten auf Vollständigkeit und Konsistenz';
    timeoutMs = 4_000; // 4 seconds

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<FeedbackOutput> {
        const startTime = Date.now();
        logger.info('[Feedback] Starting validation', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        try {
            // Run all validation rules
            const errors: FeedbackOutput['errors'] = [];
            const suggestions: string[] = [];

            for (const rule of VALIDATION_RULES) {
                const result = rule.check(input);
                
                if (!result.passed) {
                    errors.push({
                        code: rule.id,
                        message: result.message || `Validierungsregel ${rule.id} fehlgeschlagen`,
                        severity: rule.severity,
                        location: this.getErrorLocation(rule.id),
                    });
                }
            }

            // Generate suggestions based on input
            suggestions.push(...this.generateSuggestions(input, errors));

            // Determine overall validation status
            const validationStatus = this.determineValidationStatus(errors);

            const result: FeedbackOutput = {
                validationStatus,
                errors,
                suggestions,
                timestamp: new Date().toISOString(),
            };

            logger.info('[Feedback] Validation completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                validationStatus,
                errorCount: errors.length,
                suggestionCount: suggestions.length,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[Feedback] Validation failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Return warning on validation error (conservative)
            return {
                validationStatus: 'WARNING',
                errors: [{
                    code: 'VALIDATION_ERROR',
                    message: `Validierung konnte nicht durchgeführt werden: ${errorMsg}`,
                    severity: 'WARNING',
                }],
                suggestions: ['Manuelle Überprüfung empfohlen'],
                timestamp: new Date().toISOString(),
            };
        }
    }

    private getErrorLocation(ruleId: string): string | undefined {
        const locationMap: Record<string, string> = {
            patient_id_present: 'input.patientData',
            session_id_present: 'input.patientSessionId',
            tenant_id_present: 'input.tenantId',
            anamnese_data_present: 'input.anamneseData.answers',
            icd10_valid_format: 'input.anamneseData.icd10Codes',
            triage_consistency: 'input.anamneseData.triageResult',
            critical_triage_check: 'input.anamneseData.triageResult',
            connection_id_present: 'input.connectionId',
        };
        return locationMap[ruleId];
    }

    private generateSuggestions(
        input: BridgeInput,
        errors: FeedbackOutput['errors']
    ): string[] {
        const suggestions: string[] = [];

        // Suggest improvements based on errors
        for (const error of errors) {
            switch (error.code) {
                case 'patient_id_present':
                    suggestions.push('Patienten-ID aus dem PVS übernehmen oder manuell eingeben');
                    break;
                case 'anamnese_data_present':
                    suggestions.push('Anamnese erneut durchführen oder manuelle Eingabe');
                    break;
                case 'icd10_valid_format':
                    suggestions.push('ICD-10 Codes auf gültiges Format prüfen (z.B. I10, E11.9)');
                    break;
                case 'triage_consistency':
                    suggestions.push('Triage-Begründung ergänzen');
                    break;
            }
        }

        // Suggest additional improvements based on data completeness
        if (!input.anamneseData.soapSummary) {
            suggestions.push('SOAP-Zusammenfassung generieren für bessere Übersicht');
        }

        if (!input.anamneseData.icd10Codes || input.anamneseData.icd10Codes.length === 0) {
            suggestions.push('ICD-10 Codierung durchführen');
        }

        if (!input.patientData.dob) {
            suggestions.push('Geburtsdatum ergänzen für Altersberechnung');
        }

        // Add best practice suggestions
        if (input.anamneseData.triageResult?.level === 'CRITICAL') {
            suggestions.push('Dokumentation der Notfallmaßnahmen ergänzen');
        }

        return suggestions.slice(0, 5); // Max 5 suggestions
    }

    private determineValidationStatus(errors: FeedbackOutput['errors']): FeedbackOutput['validationStatus'] {
        const hasErrors = errors.some(e => e.severity === 'ERROR');
        const hasWarnings = errors.some(e => e.severity === 'WARNING');

        if (hasErrors) return 'FAIL';
        if (hasWarnings) return 'WARNING';
        return 'PASS';
    }
}

export const feedbackAgent = new FeedbackAgent();
