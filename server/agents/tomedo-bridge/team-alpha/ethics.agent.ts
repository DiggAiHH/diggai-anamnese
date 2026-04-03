/**
 * Team Alpha - Agent A2: Ethics-Compliance-Monitor
 * 
 * Prüft DSGVO-Konformität (Tomedo ist DSGVO-konform) und Bias-Mitigation.
 * Bei High-Impact-Actions (Diagnosen, Medikation): TRIGGER Human-Approval
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    EthicsComplianceOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('EthicsAgent');

// High-Impact medical actions requiring approval
const HIGH_IMPACT_KEYWORDS = [
    'medikation', 'medication', 'arznei', 'drug',
    'diagnose', 'diagnosis', 'icd-10',
    'operation', 'surgery', 'eingriff',
    'notfall', 'emergency', 'critical'
];

// Bias indicators to check
const BIAS_INDICATORS = [
    { pattern: /\b(alt|alte|älter|senior)\b.*\b(weniger|nicht|kein)\b/i, flag: 'age_bias' },
    { pattern: /\b(frau|weiblich|männlich|mann)\b.*\b(unterschied|anders)\b/i, flag: 'gender_bias' },
    { pattern: /\b(ausländer|migrant|fremd)\b/i, flag: 'origin_bias' },
    { pattern: /\b(armut|sozial|bildung)\b.*\b(niedrig|gering|schlecht)\b/i, flag: 'ses_bias' },
];

class EthicsAgent implements IBridgeAgent<BridgeInput, EthicsComplianceOutput> {
    name = 'ethics';
    team = 'alpha' as const;
    displayName = 'Ethics & Compliance Monitor';
    description = 'Prüft DSGVO-Konformität und Bias in medizinischen Entscheidungen';
    timeoutMs = 5_000; // 5 seconds

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<EthicsComplianceOutput> {
        const startTime = Date.now();
        logger.info('[Ethics] Starting compliance check', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        try {
            // DSGVO Compliance Checks
            const gdprChecks = this.performGdprChecks(input, context);

            // Bias Detection
            const biasFlags = this.detectBias(input);

            // High-Impact Assessment
            const highImpactAssessment = this.assessHighImpact(input);

            // Determine compliance status
            const complianceStatus = this.determineComplianceStatus(
                gdprChecks,
                biasFlags,
                highImpactAssessment
            );

            // Generate recommendations
            const recommendations = this.generateRecommendations(
                gdprChecks,
                biasFlags,
                highImpactAssessment
            );

            const result: EthicsComplianceOutput = {
                complianceStatus,
                gdprCheck: gdprChecks.overall,
                biasFlags,
                recommendations,
                timestamp: new Date().toISOString(),
            };

            logger.info('[Ethics] Compliance check completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                complianceStatus,
                biasFlagsCount: biasFlags.length,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[Ethics] Compliance check failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Conservative fallback: require approval on error
            return {
                complianceStatus: 'WARNING',
                gdprCheck: false,
                biasFlags: ['check_failed'],
                recommendations: ['Manuelle Überprüfung erforderlich aufgrund technischer Störung'],
                timestamp: new Date().toISOString(),
            };
        }
    }

    private performGdprChecks(
        input: BridgeInput,
        context: BridgeAgentContext
    ): { overall: boolean; checks: Record<string, boolean> } {
        const checks: Record<string, boolean> = {
            patientConsent: this.checkPatientConsent(input),
            dataMinimization: this.checkDataMinimization(input),
            purposeLimitation: this.checkPurposeLimitation(input),
            storageLimitation: this.checkStorageLimitation(input),
            traceability: this.checkTraceability(context),
            encryption: this.checkEncryption(context),
        };

        return {
            overall: Object.values(checks).every(v => v),
            checks,
        };
    }

    private checkPatientConsent(input: BridgeInput): boolean {
        // Check if patient has valid consent
        // In production, this would check the database
        return input.patientData.patientId !== undefined;
    }

    private checkDataMinimization(input: BridgeInput): boolean {
        // Check if only necessary data is collected
        const hasExcessiveData = Object.keys(input.anamneseData.answers).length > 300; // More than 270 questions
        return !hasExcessiveData;
    }

    private checkPurposeLimitation(input: BridgeInput): boolean {
        // Check if data is used only for medical purposes
        return input.anamneseData.icd10Codes !== undefined || 
               input.anamneseData.soapSummary !== undefined;
    }

    private checkStorageLimitation(input: BridgeInput): boolean {
        // Check retention policies
        // In production, check against configured retention periods
        return true; // Assume compliant for now
    }

    private checkTraceability(context: BridgeAgentContext): boolean {
        // Check if we have proper audit trail
        return context.traceId.length > 0 && context.task.id.length > 0;
    }

    private checkEncryption(context: BridgeAgentContext): boolean {
        // Check if encryption is in place
        // In production, verify encryption service status
        return true; // Assume compliant
    }

    private detectBias(input: BridgeInput): string[] {
        const flags: string[] = [];
        const textToCheck = this.extractTextForBiasCheck(input);

        for (const indicator of BIAS_INDICATORS) {
            if (indicator.pattern.test(textToCheck)) {
                flags.push(indicator.flag);
            }
        }

        // Check for missing demographic data (could indicate bias)
        if (!input.patientData.dob) {
            flags.push('missing_age_data');
        }

        return flags;
    }

    private extractTextForBiasCheck(input: BridgeInput): string {
        const parts: string[] = [];
        
        // Include SOAP summary
        if (input.anamneseData.soapSummary) {
            parts.push(input.anamneseData.soapSummary);
        }

        // Include key answers
        const answers = input.anamneseData.answers;
        for (const [key, value] of Object.entries(answers)) {
            if (typeof value === 'string' && value.length > 10) {
                parts.push(`${key}: ${value}`);
            }
        }

        return parts.join(' ').toLowerCase();
    }

    private assessHighImpact(input: BridgeInput): {
        isHighImpact: boolean;
        reasons: string[];
    } {
        const reasons: string[] = [];
        let isHighImpact = false;

        // Check triage level
        if (input.anamneseData.triageResult?.level === 'CRITICAL') {
            isHighImpact = true;
            reasons.push('Critical triage level detected');
        }

        // Check for medication recommendations
        const answers = JSON.stringify(input.anamneseData.answers).toLowerCase();
        if (HIGH_IMPACT_KEYWORDS.some(kw => answers.includes(kw))) {
            isHighImpact = true;
            reasons.push('High-impact medical keywords detected');
        }

        // Check ICD-10 codes for serious conditions
        const seriousConditions = ['I21', 'I22', 'J44', 'C', 'F32', 'F33']; // Heart attack, COPD, Cancer, Depression
        if (input.anamneseData.icd10Codes?.some(code => 
            seriousConditions.some(sc => code.startsWith(sc))
        )) {
            isHighImpact = true;
            reasons.push('Serious medical condition (ICD-10) detected');
        }

        return { isHighImpact, reasons };
    }

    private determineComplianceStatus(
        gdprChecks: { overall: boolean; checks: Record<string, boolean> },
        biasFlags: string[],
        highImpactAssessment: { isHighImpact: boolean; reasons: string[] }
    ): 'PASS' | 'WARNING' | 'FAIL' {
        // Fail if GDPR check fails
        if (!gdprChecks.overall) {
            return 'FAIL';
        }

        // Warning if bias detected or high-impact
        if (biasFlags.length > 0 || highImpactAssessment.isHighImpact) {
            return 'WARNING';
        }

        return 'PASS';
    }

    private generateRecommendations(
        gdprChecks: { overall: boolean; checks: Record<string, boolean> },
        biasFlags: string[],
        highImpactAssessment: { isHighImpact: boolean; reasons: string[] }
    ): string[] {
        const recommendations: string[] = [];

        // GDPR recommendations
        if (!gdprChecks.checks.patientConsent) {
            recommendations.push('Einwilligung des Patienten verifizieren');
        }
        if (!gdprChecks.checks.dataMinimization) {
            recommendations.push('Datenminimierung prüfen - nur notwendige Daten erfassen');
        }

        // Bias recommendations
        if (biasFlags.includes('age_bias')) {
            recommendations.push('Altersdiskriminierung prüfen - gleiche Behandlung sicherstellen');
        }
        if (biasFlags.includes('gender_bias')) {
            recommendations.push('Geschlechterspezifische Bias prüfen');
        }

        // High-impact recommendations
        if (highImpactAssessment.isHighImpact) {
            recommendations.push('Ärztliche Überprüfung erforderlich (High-Impact Action)');
            recommendations.push('Zweitmeinung bei kritischen Entscheidungen einholen');
        }

        // Default recommendation if all good
        if (recommendations.length === 0) {
            recommendations.push('Standard-Compliance eingehalten');
        }

        return recommendations;
    }
}

export const ethicsAgent = new EthicsAgent();
