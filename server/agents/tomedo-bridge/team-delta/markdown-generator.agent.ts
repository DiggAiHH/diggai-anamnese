/**
 * Team Delta - Agent D1: Markdown-Protocol-Generator
 * 
 * Aggregation aller Cluster-Outputs in standardisiertes Markdown-Protokoll.
 * Erstellt das finale Übergabedokument für Ärzte/Systeme.
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    MarkdownProtocolOutput,
    IBridgeAgent,
    ExplainabilityOutput,
    EthicsComplianceOutput,
    HumanLoopOutput,
    ApiConnectorOutput,
    EpaMapperOutput,
    DocumentationOutput,
    LoadReducerOutput,
    FeedbackOutput,
    ErrorCorrectionOutput,
} from '../types.js';
import { DEFAULT_PROTOCOL_TEMPLATE } from '../types.js';

const logger = createLogger('MarkdownGeneratorAgent');

interface TeamResults {
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
}

interface MarkdownGeneratorInput {
    input: BridgeInput;
    alphaResult: TeamResults['alpha'];
    bravoResult: TeamResults['bravo'];
    charlieResult: TeamResults['charlie'];
}

class MarkdownGeneratorAgent implements IBridgeAgent<MarkdownGeneratorInput, MarkdownProtocolOutput> {
    name = 'markdown-generator';
    team = 'delta' as const;
    displayName = 'Markdown Protocol Generator';
    description = 'Erstellt das finale Markdown-Übergabeprotokoll';
    timeoutMs = 8_000; // 8 seconds

    async execute(
        data: MarkdownGeneratorInput,
        context: BridgeAgentContext
    ): Promise<MarkdownProtocolOutput> {
        const startTime = Date.now();
        logger.info('[MarkdownGenerator] Starting protocol generation', {
            traceId: context.traceId,
            patientSessionId: data.input.patientSessionId,
        });

        try {
            // Generate the complete protocol
            const protocol = this.generateProtocol(data, context);

            // Generate checksum
            const checksum = this.generateChecksum(protocol);

            // Extract sections
            const sections = this.extractSections(protocol);

            const result: MarkdownProtocolOutput = {
                protocol,
                metadata: {
                    version: '1.0.0',
                    sessionId: data.input.patientSessionId,
                    generatedAt: new Date().toISOString(),
                    checksum,
                },
                sections,
            };

            logger.info('[MarkdownGenerator] Protocol generation completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                protocolLength: protocol.length,
                sections: sections.length,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[MarkdownGenerator] Protocol generation failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Return error protocol
            return {
                protocol: this.generateErrorProtocol(data, errorMsg, context),
                metadata: {
                    version: '1.0.0-error',
                    sessionId: data.input.patientSessionId,
                    generatedAt: new Date().toISOString(),
                    checksum: 'error',
                },
                sections: ['ERROR'],
            };
        }
    }

    private generateProtocol(data: MarkdownGeneratorInput, context: BridgeAgentContext): string {
        const { input, alphaResult, bravoResult, charlieResult } = data;
        const timestamp = new Date().toLocaleString('de-DE');
        
        const lines: string[] = [];

        // =========================================================================
        // HEADER
        // =========================================================================
        lines.push(DEFAULT_PROTOCOL_TEMPLATE.header
            .replace('{timestamp}', timestamp)
            .replace('{sessionId}', input.patientSessionId)
            .replace('{traceId}', context.traceId)
        );
        lines.push('');

        // =========================================================================
        // PATIENT CONTEXT
        // =========================================================================
        lines.push('### PATIENTENKONTEXT');
        lines.push('');
        
        const patientInfo = [
            input.patientData.name ? `**Name:** ${input.patientData.name}` : null,
            input.patientData.dob ? `**Geburtsdatum:** ${input.patientData.dob}` : null,
            input.patientData.patientId ? `**Patienten-ID:** ${input.patientData.patientId}` : null,
            input.patientData.externalPatientId ? `**Externe ID:** ${input.patientData.externalPatientId}` : null,
            `**Tenant:** ${input.tenantId}`,
            `**Session:** ${input.patientSessionId.substr(0, 8)}...`,
        ].filter(Boolean);

        for (const info of patientInfo) {
            lines.push(`- ${info}`);
        }
        lines.push('');

        // =========================================================================
        // CLINICAL DECISIONS TABLE
        // =========================================================================
        lines.push('### KLINISCHE ENTSCHEIDUNGEN');
        lines.push('');
        lines.push('| Aktion | Erklärung | Compliance | GOÄ |');
        lines.push('|--------|-----------|------------|-----|');

        // Row 1: Triage
        const triageLevel = input.anamneseData.triageResult?.level || 'NORMAL';
        const triageEmoji = triageLevel === 'CRITICAL' ? '🔴' : triageLevel === 'WARNING' ? '🟡' : '🟢';
        lines.push(`| ${triageEmoji} Triage: ${triageLevel} | ${alphaResult.explainability.explanation.substring(0, 50)}... | ${alphaResult.ethics.complianceStatus} | ${bravoResult.epaMapper.goaeZiffern.slice(0, 3).join(', ')} |`);

        // Row 2: Diagnosis
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            lines.push(`| 📝 ICD-10 Codierung | ${input.anamneseData.icd10Codes.join(', ')} | ${alphaResult.ethics.complianceStatus} | ${bravoResult.epaMapper.goaeZiffern.join(', ')} |`);
        }

        // Row 3: Human Approval
        if (alphaResult.humanLoop.requiresApproval) {
            const urgencyEmoji = alphaResult.humanLoop.urgency === 'HIGH' ? '🔴' : alphaResult.humanLoop.urgency === 'MEDIUM' ? '🟡' : '🟢';
            lines.push(`| 👤 Freigabe erforderlich | ${alphaResult.humanLoop.reason?.substring(0, 40) || 'Prüfung notwendig'}... | ${urgencyEmoji} ${alphaResult.humanLoop.urgency} | - |`);
        }

        lines.push('');

        // =========================================================================
        // EXPLAINABILITY SECTION
        // =========================================================================
        lines.push('### ERKLÄRUNG DER ENTSCHEIDUNGEN');
        lines.push('');
        lines.push(`**KI-Erklärung:** ${alphaResult.explainability.explanation}`);
        lines.push('');
        lines.push(`- **Konfidenz:** ${(alphaResult.explainability.confidenceScore * 100).toFixed(1)}%`);
        lines.push(`- **Basis:** ${alphaResult.explainability.basis}`);
        lines.push('');

        // =========================================================================
        // SIMPLIFIED SUMMARY (from Load Reducer)
        // =========================================================================
        lines.push('### ZUSAMMENFASSUNG');
        lines.push('');
        lines.push(`**${charlieResult.loadReducer.simplifiedSummary}**`);
        lines.push('');
        lines.push(`*(Detail-Level: ${charlieResult.loadReducer.detailLevel}, Reduktion: ${charlieResult.loadReducer.reductionPercentage}%)*)`);
        lines.push('');

        // =========================================================================
        // FULL DOCUMENTATION
        // =========================================================================
        lines.push('### VOLLSTÄNDIGE DOKUMENTATION');
        lines.push('');
        lines.push('```markdown');
        lines.push(bravoResult.documentation.documentation);
        lines.push('```');
        lines.push('');

        // =========================================================================
        // TOMEDO SYNC STATUS
        // =========================================================================
        lines.push('### TOMEDO-SYNC-STATUS');
        lines.push('');
        
        const connectionEmoji = bravoResult.apiConnector.connectionStatus === 'ONLINE' ? '🟢' : 
                               bravoResult.apiConnector.connectionStatus === 'DEGRADED' ? '🟡' : '🔴';
        lines.push(`- **Verbindung:** ${connectionEmoji} ${bravoResult.apiConnector.connectionStatus}`);
        lines.push(`- **Letzter Sync:** ${new Date(bravoResult.apiConnector.timestamp).toLocaleString('de-DE')}`);
        
        if (bravoResult.apiConnector.latencyMs) {
            lines.push(`- **Latenz:** ${bravoResult.apiConnector.latencyMs}ms`);
        }
        
        if (bravoResult.apiConnector.syncQueue.length > 0) {
            lines.push(`- **Warteschlange:** ${bravoResult.apiConnector.syncQueue.length} Einträge`);
        }
        
        lines.push(`- **ePA Patienten-ID:** ${bravoResult.epaMapper.epaEntry.patientId}`);
        lines.push(`- **Mapping Valid:** ${bravoResult.epaMapper.mappingValidation.valid ? '✅' : '⚠️'}`);
        lines.push('');

        // =========================================================================
        // EPA ENTRY PREVIEW
        // =========================================================================
        lines.push('### EPA-EINTRAG (Vorschau)');
        lines.push('');
        lines.push('**Fallakte:**');
        lines.push('```');
        lines.push(bravoResult.epaMapper.epaEntry.fallakte.substring(0, 500));
        if (bravoResult.epaMapper.epaEntry.fallakte.length > 500) {
            lines.push('... (gekürzt)');
        }
        lines.push('```');
        lines.push('');
        
        lines.push('**Custom Eintrag:**');
        lines.push(`\`${bravoResult.epaMapper.epaEntry.customEintrag}\``);
        lines.push('');

        // =========================================================================
        // VALIDATION & QUALITY
        // =========================================================================
        lines.push('### VALIDIERUNG & QUALITÄT');
        lines.push('');
        lines.push('| Aspekt | Status | Details |');
        lines.push('|--------|--------|---------|');
        lines.push(`| Datenvalidierung | ${charlieResult.feedback.validationStatus} | ${charlieResult.feedback.errors.length} Fehler, ${charlieResult.feedback.suggestions.length} Vorschläge |`);
        lines.push(`| Fehlerkorrektur | ${charlieResult.errorCorrection.autoCorrected ? '✅ Auto' : '👤 Manuell'} | ${charlieResult.errorCorrection.corrections.length} Korrekturen |`);
        lines.push(`| Konfidenz nach Fix | ${(charlieResult.errorCorrection.confidenceAfterFix * 100).toFixed(1)}% | ${charlieResult.errorCorrection.requiresReview ? '⚠️ Review erforderlich' : '✅ Kein Review nötig'} |`);
        lines.push(`| Ethik-Check | ${alphaResult.ethics.complianceStatus} | ${alphaResult.ethics.biasFlags.length > 0 ? 'Bias-Flags: ' + alphaResult.ethics.biasFlags.join(', ') : 'Keine Bias-Flags'} |`);
        lines.push('');

        // =========================================================================
        // RECOMMENDATIONS
        // =========================================================================
        if (charlieResult.feedback.suggestions.length > 0) {
            lines.push('### EMPFEHLUNGEN');
            lines.push('');
            for (const suggestion of charlieResult.feedback.suggestions) {
                lines.push(`- [ ] ${suggestion}`);
            }
            lines.push('');
        }

        // =========================================================================
        // ERROR CORRECTIONS
        // =========================================================================
        if (charlieResult.errorCorrection.corrections.length > 0) {
            lines.push('### AUTOMATISCHE KORREKTUREN');
            lines.push('');
            for (const correction of charlieResult.errorCorrection.corrections) {
                lines.push(`- **${correction.reason}** (Confidence: ${(correction.confidence * 100).toFixed(0)}%)`);
                lines.push(`  - Original: \`${correction.original}\``);
                lines.push(`  - Korrigiert: \`${correction.corrected}\``);
            }
            lines.push('');
        }

        // =========================================================================
        // AUDIT TRAIL
        // =========================================================================
        lines.push('### AGENTEN-ÜBERSICHT');
        lines.push('');
        lines.push('| Team | Agent | Status | Timestamp |');
        lines.push('|------|-------|--------|-----------|');
        lines.push(`| Alpha | Explainability | ✅ | ${alphaResult.explainability.timestamp} |`);
        lines.push(`| Alpha | Ethics | ${alphaResult.ethics.complianceStatus} | ${alphaResult.ethics.timestamp} |`);
        lines.push(`| Alpha | HumanLoop | ${alphaResult.humanLoop.requiresApproval ? '⚠️' : '✅'} | ${alphaResult.humanLoop.timestamp} |`);
        lines.push(`| Bravo | API-Connector | ${bravoResult.apiConnector.connectionStatus} | ${bravoResult.apiConnector.timestamp} |`);
        lines.push(`| Bravo | EPA-Mapper | ${bravoResult.epaMapper.mappingValidation.valid ? '✅' : '⚠️'} | ${bravoResult.epaMapper.timestamp} |`);
        lines.push(`| Bravo | Documentation | ✅ | ${bravoResult.documentation.zeitstempel} |`);
        lines.push(`| Charlie | LoadReducer | ✅ | ${charlieResult.loadReducer.timestamp} |`);
        lines.push(`| Charlie | Feedback | ${charlieResult.feedback.validationStatus} | ${charlieResult.feedback.timestamp} |`);
        lines.push(`| Charlie | ErrorCorrection | ${charlieResult.errorCorrection.autoCorrected ? '✅' : '👤'} | ${charlieResult.errorCorrection.timestamp} |`);
        lines.push('');

        // =========================================================================
        // FOOTER
        // =========================================================================
        lines.push(DEFAULT_PROTOCOL_TEMPLATE.footer);

        return lines.join('\n');
    }

    private generateChecksum(content: string): string {
        // Simple hash for integrity checking
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    }

    private extractSections(protocol: string): string[] {
        const sectionMatches = protocol.match(/^### (.+)$/gm);
        if (!sectionMatches) return [];
        
        return sectionMatches
            .map(s => s.replace('### ', '').trim())
            .filter(s => s.length > 0);
    }

    private generateErrorProtocol(
        data: MarkdownGeneratorInput,
        error: string,
        context: BridgeAgentContext
    ): string {
        return `## DIGGAI-TOMEDO ÜBERGABEPROTOKOLL - FEHLER

**Datum:** ${new Date().toLocaleString('de-DE')}  
**Session-ID:** ${data.input.patientSessionId}  
**Trace-ID:** ${context.traceId}

### FEHLER BEI PROTOKOLLGENERIERUNG

${error}

### ROHDATEN VERFÜGBAR
Die Anamnese-Daten wurden erfasst und können manuell verarbeitet werden.

**Patient:** ${data.input.patientData.name || 'Unbekannt'}  
**Session:** ${data.input.patientSessionId}

---
*Fehlerprotokoll - Bitte IT-Support kontaktieren*
`;
    }
}

export const markdownGeneratorAgent = new MarkdownGeneratorAgent();
