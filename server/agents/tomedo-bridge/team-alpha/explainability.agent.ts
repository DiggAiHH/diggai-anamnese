/**
 * Team Alpha - Agent A1: Explainability-Engine
 * 
 * Generiert Echtzeit-Erklärungen für medizinische Entscheidungen.
 * Studien-basiert: "Interactive Transparency" erhöht Trust um 42%
 * Constraint: Vermeide "cognitive overload" – max. 3 Sätze
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    ExplainabilityOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('ExplainabilityAgent');

interface ExplainabilityInput {
    decision: string;
    context: string;
    icd10Codes?: string[];
    triageLevel?: string;
}

class ExplainabilityAgent implements IBridgeAgent<BridgeInput, ExplainabilityOutput> {
    name = 'explainability';
    team = 'alpha' as const;
    displayName = 'Explainability Engine';
    description = 'Generiert verständliche Erklärungen für medizinische Entscheidungen';
    timeoutMs = 10_000; // 10 seconds - this is a quick analysis

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<ExplainabilityOutput> {
        const startTime = Date.now();
        logger.info('[Explainability] Starting analysis', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        try {
            // Extract key medical decisions from anamnese data
            const decisions = this.extractDecisions(input);
            
            // Generate explanations for each decision
            const explanations = decisions.map(d => this.generateExplanation(d, input));
            
            // Combine into concise summary (max 3 sentences)
            const combinedExplanation = this.combineExplanations(explanations);
            
            // Calculate confidence based on data completeness
            const confidenceScore = this.calculateConfidence(input);
            
            // Determine basis (studies, guidelines)
            const basis = this.determineBasis(input);

            const result: ExplainabilityOutput = {
                explanation: combinedExplanation,
                confidenceScore,
                basis,
                timestamp: new Date().toISOString(),
            };

            logger.info('[Explainability] Analysis completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                confidenceScore,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[Explainability] Analysis failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Return graceful fallback
            return {
                explanation: 'Erklärung nicht verfügbar - bitte manuelle Überprüfung',
                confidenceScore: 0,
                basis: 'error_fallback',
                timestamp: new Date().toISOString(),
            };
        }
    }

    private extractDecisions(input: BridgeInput): ExplainabilityInput[] {
        const decisions: ExplainabilityInput[] = [];
        const answers = input.anamneseData.answers;

        // Extract triage decision if present
        if (input.anamneseData.triageResult) {
            decisions.push({
                decision: `Triage-Level: ${input.anamneseData.triageResult.level}`,
                context: input.anamneseData.triageResult.reasons.join(', '),
                triageLevel: input.anamneseData.triageResult.level,
            });
        }

        // Extract ICD-10 based decisions
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            decisions.push({
                decision: `ICD-10 Diagnose: ${input.anamneseData.icd10Codes.join(', ')}`,
                context: 'Basierend auf Anamnese-Antworten',
                icd10Codes: input.anamneseData.icd10Codes,
            });
        }

        // Extract symptom-based decisions from answers
        const criticalSymptoms = this.identifyCriticalSymptoms(answers);
        if (criticalSymptoms.length > 0) {
            decisions.push({
                decision: 'Kritische Symptome identifiziert',
                context: criticalSymptoms.join(', '),
            });
        }

        // If no specific decisions, create general summary
        if (decisions.length === 0) {
            decisions.push({
                decision: 'Anamnese erfasst',
                context: 'Standard-Anamnese ohne kritische Befunde',
            });
        }

        return decisions;
    }

    private identifyCriticalSymptoms(answers: Record<string, unknown>): string[] {
        const criticalSymptoms: string[] = [];
        const symptomKeywords = [
            'schmerz', 'pain', 'blut', 'blood', 'atemnot', 'dyspnea',
            'bewusstlos', 'unconscious', 'kollaps', 'collapse', 'fieber', 'fever'
        ];

        for (const [key, value] of Object.entries(answers)) {
            const valueStr = String(value).toLowerCase();
            if (symptomKeywords.some(kw => valueStr.includes(kw) || key.toLowerCase().includes(kw))) {
                criticalSymptoms.push(`${key}: ${value}`);
            }
        }

        return criticalSymptoms;
    }

    private generateExplanation(decision: ExplainabilityInput, input: BridgeInput): string {
        const { decision: decisionText, context, triageLevel, icd10Codes } = decision;

        // High-priority explanations for critical cases
        if (triageLevel === 'CRITICAL') {
            return `Dringender Handlungsbedarf: ${context}. Sofortige ärztliche Evaluierung erforderlich.`;
        }

        if (triageLevel === 'WARNING') {
            return `Auffällige Befunde: ${context}. Weitere Abklärung empfohlen.`;
        }

        // ICD-10 explanations
        if (icd10Codes && icd10Codes.length > 0) {
            return `Diagnostische Einordnung: ${icd10Codes.join(', ')} basierend auf ${context}.`;
        }

        // Default explanation
        return `${decisionText}. ${context ? `Grundlage: ${context}.` : ''}`;
    }

    private combineExplanations(explanations: string[]): string {
        // Combine all explanations into max 3 sentences
        let combined = explanations.join(' ');
        
        // Split into sentences
        const sentences = combined.match(/[^.!?]+[.!?]+/g) || [combined];
        
        // Take max 3 sentences
        const limitedSentences = sentences.slice(0, 3);
        
        // Clean up and join
        return limitedSentences
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .join(' ');
    }

    private calculateConfidence(input: BridgeInput): number {
        let confidence = 0.5; // Base confidence

        // Increase confidence with more complete data
        const answerCount = Object.keys(input.anamneseData.answers).length;
        confidence += Math.min(answerCount * 0.01, 0.2); // Max +0.2 for many answers

        // Increase with triage result
        if (input.anamneseData.triageResult) {
            confidence += 0.1;
        }

        // Increase with ICD-10 codes
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            confidence += 0.1;
        }

        // Decrease if patient data incomplete
        if (!input.patientData.patientId || !input.patientData.name) {
            confidence -= 0.1;
        }

        // Clamp between 0 and 1
        return Math.max(0, Math.min(1, confidence));
    }

    private determineBasis(input: BridgeInput): string {
        const bases: string[] = [];

        if (input.anamneseData.icd10Codes) {
            bases.push('ICD-10-GM');
        }

        if (input.anamneseData.triageResult) {
            bases.push('DiggAi-TriageEngine');
        }

        if (input.anamneseData.soapSummary) {
            bases.push('SOAP-Struktur');
        }

        if (bases.length === 0) {
            bases.push('Anamnese-Daten');
        }

        return bases.join(', ');
    }
}

export const explainabilityAgent = new ExplainabilityAgent();
