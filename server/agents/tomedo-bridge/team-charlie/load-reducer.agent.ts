/**
 * Team Charlie - Agent C1: Cognitive-Load-Reducer
 * 
 * Reduziert komplexe medizinische Daten auf "Appropriate Trust" Level.
 * Balance zwischen Transparenz und Übersichtlichkeit.
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    LoadReducerOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('LoadReducerAgent');

// Complexity scoring weights
const COMPLEXITY_WEIGHTS = {
    icd10Code: 2,
    triageLevel: 3,
    symptomCount: 1,
    medicationCount: 2,
    comorbidity: 2,
};

// Target complexity levels
const TARGET_LEVELS = {
    MINIMAL: { maxScore: 5, description: 'Nur kritische Informationen' },
    APPROPRIATE: { maxScore: 15, description: 'Ausgewogene Detailtiefe' },
    DETAILED: { maxScore: 30, description: 'Vollständige Dokumentation' },
};

class LoadReducerAgent implements IBridgeAgent<BridgeInput, LoadReducerOutput> {
    name = 'load-reducer';
    team = 'charlie' as const;
    displayName = 'Cognitive Load Reducer';
    description = 'Vereinfacht komplexe medizinische Daten für bessere Übersichtlichkeit';
    timeoutMs = 5_000; // 5 seconds

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<LoadReducerOutput> {
        const startTime = Date.now();
        logger.info('[LoadReducer] Starting simplification', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        try {
            // Calculate original complexity
            const originalComplexity = this.calculateComplexity(input);

            // Determine target detail level based on user preference or auto-detect
            const targetLevel = this.determineTargetLevel(input, originalComplexity);

            // Generate simplified summary
            const simplifiedSummary = this.generateSimplifiedSummary(input, targetLevel);

            // Calculate simplicity score
            const simplicityScore = this.calculateSimplicityScore(originalComplexity, targetLevel);

            // Calculate reduction percentage
            const reductionPercentage = this.calculateReductionPercentage(input, simplifiedSummary);

            const result: LoadReducerOutput = {
                simplicityScore,
                simplifiedSummary,
                detailLevel: targetLevel,
                originalComplexity,
                reductionPercentage,
                timestamp: new Date().toISOString(),
            };

            logger.info('[LoadReducer] Simplification completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                originalComplexity,
                targetLevel,
                simplicityScore,
                reductionPercentage,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[LoadReducer] Simplification failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Return moderate fallback
            return {
                simplicityScore: 5,
                simplifiedSummary: this.generateFallbackSummary(input),
                detailLevel: 'APPROPRIATE',
                originalComplexity: 0,
                reductionPercentage: 0,
                timestamp: new Date().toISOString(),
            };
        }
    }

    private calculateComplexity(input: BridgeInput): number {
        let score = 0;

        // ICD-10 codes complexity
        const icd10Count = input.anamneseData.icd10Codes?.length || 0;
        score += icd10Count * COMPLEXITY_WEIGHTS.icd10Code;

        // Triage level complexity
        if (input.anamneseData.triageResult) {
            score += COMPLEXITY_WEIGHTS.triageLevel;
        }

        // Symptom count from answers
        const symptomCount = this.countSymptoms(input.anamneseData.answers);
        score += symptomCount * COMPLEXITY_WEIGHTS.symptomCount;

        // Medication count
        const medicationCount = this.countMedications(input.anamneseData.answers);
        score += medicationCount * COMPLEXITY_WEIGHTS.medicationCount;

        // Comorbidities
        const comorbidityCount = this.countComorbidities(input.anamneseData.answers);
        score += comorbidityCount * COMPLEXITY_WEIGHTS.comorbidity;

        return score;
    }

    private countSymptoms(answers: Record<string, unknown>): number {
        let count = 0;
        const symptomKeywords = ['symptom', 'beschwerde', 'schmerz', 'pain', 'problem'];

        for (const [key, value] of Object.entries(answers)) {
            const keyLower = key.toLowerCase();
            if (symptomKeywords.some(sk => keyLower.includes(sk))) {
                const valueStr = String(value).toLowerCase();
                // Count positive responses
                if (!['nein', 'no', 'nicht', 'not', 'keine', 'none'].some(n => valueStr.includes(n))) {
                    count++;
                }
            }
        }

        return Math.min(count, 10); // Cap at 10
    }

    private countMedications(answers: Record<string, unknown>): number {
        const medicationValue = answers['medikamente'] || answers['medications'] || answers['dauermedikation'];
        if (!medicationValue) return 0;

        const meds = String(medicationValue).split(/[,;\n]/);
        return Math.min(meds.filter(m => m.trim().length > 0).length, 10);
    }

    private countComorbidities(answers: Record<string, unknown>): number {
        const comorbidityValue = answers['vorerkrankungen'] || answers['previous_conditions'] || answers['comorbidities'];
        if (!comorbidityValue) return 0;

        const conditions = String(comorbidityValue).split(/[,;\n]/);
        return Math.min(conditions.filter(c => c.trim().length > 0).length, 8);
    }

    private determineTargetLevel(
        input: BridgeInput,
        originalComplexity: number
    ): LoadReducerOutput['detailLevel'] {
        // Check user preference
        const userPreference = input.options?.detailLevel;
        if (userPreference === 'minimal') return 'MINIMAL';
        if (userPreference === 'detailed') return 'DETAILED';

        // Auto-detect based on complexity
        if (originalComplexity <= TARGET_LEVELS.MINIMAL.maxScore) {
            return 'MINIMAL';
        }
        if (originalComplexity <= TARGET_LEVELS.APPROPRIATE.maxScore) {
            return 'APPROPRIATE';
        }
        return 'DETAILED';
    }

    private generateSimplifiedSummary(
        input: BridgeInput,
        targetLevel: LoadReducerOutput['detailLevel']
    ): string {
        const parts: string[] = [];

        // Always include triage (critical info)
        if (input.anamneseData.triageResult) {
            parts.push(`**Triage:** ${input.anamneseData.triageResult.level}`);
            
            if (targetLevel !== 'MINIMAL') {
                parts.push(`Grund: ${input.anamneseData.triageResult.reasons.slice(0, 2).join(', ')}`);
            }
        }

        // Include ICD-10 codes (abbreviated based on level)
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            const codes = input.anamneseData.icd10Codes;
            
            if (targetLevel === 'MINIMAL') {
                parts.push(`**Diagnosen:** ${codes.length} erfasst`);
            } else if (targetLevel === 'APPROPRIATE') {
                parts.push(`**Hauptdiagnosen:** ${codes.slice(0, 3).join(', ')}`);
            } else {
                parts.push(`**ICD-10:** ${codes.join(', ')}`);
            }
        }

        // Include key findings
        const keyFindings = this.getKeyFindings(input, targetLevel);
        if (keyFindings.length > 0) {
            parts.push(`**Wichtige Befunde:** ${keyFindings.join(', ')}`);
        }

        // Include recommendations based on level
        if (targetLevel !== 'MINIMAL') {
            const recs = this.getKeyRecommendations(input);
            if (recs.length > 0) {
                parts.push(`**Empfohlen:** ${recs[0]}`);
            }
        }

        return parts.join(' | ');
    }

    private getKeyFindings(
        input: BridgeInput,
        targetLevel: LoadReducerOutput['detailLevel']
    ): string[] {
        const findings: string[] = [];
        const answers = input.anamneseData.answers;

        // Critical findings (always include)
        const criticalFindings = [
            'schmerz', 'pain', 'blut', 'blood', 'atemnot', 'dyspnea',
            'bewusstlos', 'unconscious', 'kollaps', 'collapse'
        ];

        for (const [key, value] of Object.entries(answers)) {
            const keyLower = key.toLowerCase();
            const valueStr = String(value).toLowerCase();

            if (criticalFindings.some(cf => keyLower.includes(cf) || valueStr.includes(cf))) {
                if (!['nein', 'no', 'nicht', 'not'].some(n => valueStr.includes(n))) {
                    findings.push(key);
                }
            }
        }

        // Additional findings based on level
        if (targetLevel === 'DETAILED') {
            const additionalFindings = ['allergie', 'allergy', 'unverträglichkeit'];
            for (const [key, value] of Object.entries(answers)) {
                const keyLower = key.toLowerCase();
                if (additionalFindings.some(af => keyLower.includes(af))) {
                    findings.push(key);
                }
            }
        }

        // Limit based on level
        const limits = { MINIMAL: 2, APPROPRIATE: 4, DETAILED: 6 };
        return findings.slice(0, limits[targetLevel]);
    }

    private getKeyRecommendations(input: BridgeInput): string[] {
        const recs: string[] = [];

        if (input.anamneseData.triageResult?.level === 'CRITICAL') {
            recs.push('SOFORT ärztliche Evaluation');
        } else if (input.anamneseData.triageResult?.level === 'WARNING') {
            recs.push('Zeitnahe Vorstellung');
        }

        if (input.anamneseData.icd10Codes?.some(c => c.startsWith('I'))) {
            recs.push('Kardiologie-Check');
        }

        return recs;
    }

    private calculateSimplicityScore(
        originalComplexity: number,
        targetLevel: LoadReducerOutput['detailLevel']
    ): number {
        // Score from 1-10 based on how well we achieved the target level
        const targetMax = TARGET_LEVELS[targetLevel].maxScore;
        
        if (originalComplexity <= targetMax) {
            return 10; // Perfect score if complexity is already appropriate
        }

        // Calculate how much we reduced
        const reductionRatio = targetMax / originalComplexity;
        return Math.round(reductionRatio * 10);
    }

    private calculateReductionPercentage(
        input: BridgeInput,
        simplifiedSummary: string
    ): number {
        const originalText = JSON.stringify(input);
        const originalLength = originalText.length;
        const simplifiedLength = simplifiedSummary.length;

        if (originalLength === 0) return 0;

        const reduction = ((originalLength - simplifiedLength) / originalLength) * 100;
        return Math.round(Math.max(0, Math.min(100, reduction)));
    }

    private generateFallbackSummary(input: BridgeInput): string {
        const parts: string[] = [];

        if (input.anamneseData.triageResult) {
            parts.push(`Triage: ${input.anamneseData.triageResult.level}`);
        }

        if (input.anamneseData.icd10Codes) {
            parts.push(`${input.anamneseData.icd10Codes.length} Diagnosen`);
        }

        if (parts.length === 0) {
            parts.push('Anamnese erfasst');
        }

        return parts.join(' | ');
    }
}

export const loadReducerAgent = new LoadReducerAgent();
