/**
 * Team Bravo - Agent B3: Dokumentations-Generator
 * 
 * Erstellung strukturierter Befundtexte, Custom-Karteieinträge.
 * Unterstützt Spracherkennungs-Platzhalter.
 * 
 * @phase PHASE_1_REAL_API - Echte Tomedo API Integration
 */

import { createLogger } from '../../../logger.js';
import { createTomedoApiClient, type Karteieintrag } from '../../../services/pvs/tomedo-api.client.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    DocumentationOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('DocumentationAgent');

// Medical documentation templates
const TEMPLATES = {
    anamnese: {
        header: '## Anamnesebericht',
        sections: ['Anamnese', 'Befund', 'Beurteilung', 'Empfehlung'],
    },
    befund: {
        header: '## Befundbericht',
        sections: ['Einleitung', 'Befund', 'Diagnose', 'Therapie'],
    },
    therapie: {
        header: '## Therapieplan',
        sections: ['Diagnose', 'Therapieziele', 'Maßnahmen', 'Kontrolle'],
    },
};

interface DocumentationSyncResult {
    tomedoCompositionId?: string;
    tomedoCompositionRef?: string;
    syncStatus: 'synced' | 'pending' | 'failed' | 'skipped';
    syncError?: string;
}

class DocumentationAgent implements IBridgeAgent<BridgeInput, DocumentationOutput> {
    name = 'documentation';
    team = 'bravo' as const;
    displayName = 'Documentation Generator';
    description = 'Erstellt strukturierte Befundtexte und Karteieinträge';
    timeoutMs = 15_000; // 15 seconds (includes API calls)

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<DocumentationOutput> {
        const startTime = Date.now();
        logger.info('[Documentation] Starting generation', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
            connectionId: input.connectionId,
        });

        try {
            // Determine document type
            const karteityp = this.determineKarteityp(input);
            
            // Generate documentation
            const documentation = this.generateDocumentation(input, karteityp);
            
            // Extract sections
            const sections = this.extractSections(documentation);
            
            // Count words
            const wordCount = documentation.split(/\s+/).length;

            // Try to sync to Tomedo
            const syncResult = await this.syncToTomedo(input, documentation, karteityp, context);

            const result: DocumentationOutput = {
                documentation,
                karteityp,
                zeitstempel: new Date().toISOString(),
                sections,
                wordCount,
                tomedoCompositionId: syncResult.tomedoCompositionId,
                tomedoCompositionRef: syncResult.tomedoCompositionRef,
                tomedoSyncStatus: syncResult.syncStatus,
                tomedoSyncError: syncResult.syncError,
            };

            logger.info('[Documentation] Generation completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                karteityp,
                wordCount,
                sections: sections.length,
                syncStatus: syncResult.syncStatus,
                tomedoCompositionId: syncResult.tomedoCompositionId,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[Documentation] Generation failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Return fallback documentation
            return {
                documentation: this.generateFallbackDocumentation(input, errorMsg),
                karteityp: 'Sonstiges',
                zeitstempel: new Date().toISOString(),
                sections: ['Fehler'],
                wordCount: 0,
                tomedoSyncStatus: 'failed',
                tomedoSyncError: errorMsg,
            };
        }
    }

    private async syncToTomedo(
        input: BridgeInput,
        documentation: string,
        karteityp: DocumentationOutput['karteityp'],
        context: BridgeAgentContext
    ): Promise<DocumentationSyncResult> {
        const result: DocumentationSyncResult = {
            syncStatus: 'pending',
        };

        try {
            // Load connection
            const { prisma } = await import('../../../db.js');
            const connection = await prisma.pvsConnection.findFirst({
                where: {
                    id: input.connectionId,
                    pvsType: 'TOMEDO',
                    isActive: true,
                },
            });

            if (!connection) {
                result.syncStatus = 'skipped';
                result.syncError = 'No active Tomedo connection';
                return result;
            }

            // Convert to connection data
            const connectionData = this.toConnectionData(connection);
            const client = createTomedoApiClient(connectionData);

            // Test connection
            const connectionTest = await client.testConnection();
            if (!connectionTest.ok) {
                result.syncStatus = 'failed';
                result.syncError = `Tomedo API: ${connectionTest.message}`;
                return result;
            }

            // We need a patient ID to create a Karteieintrag
            // This should come from the EPA-Mapper output (stored in metadata)
            // For now, we search by patient data
            let patientId: string | undefined = input.patientData.externalPatientId;
            let fallakteId: string | undefined;

            if (!patientId && input.patientData.name) {
                const searchResults = await client.searchPatient({ 
                    name: input.patientData.name 
                });
                if (searchResults.length > 0) {
                    patientId = searchResults[0].pvsPatientId;
                }
            }

            if (!patientId) {
                result.syncStatus = 'skipped';
                result.syncError = 'No patient found/created in Tomedo';
                return result;
            }

            // Create Fallakte if needed
            const fallakte = await client.createFallakte(patientId, {
                startDate: new Date().toISOString(),
                reason: `DiggAI ${karteityp}`,
            });
            fallakteId = fallakte.id;

            // Create Karteieintrag
            const karteieintrag: Karteieintrag = {
                type: karteityp,
                content: documentation,
                icd10Codes: input.anamneseData.icd10Codes,
                metadata: {
                    sessionId: input.patientSessionId,
                    tenantId: input.tenantId,
                    triageLevel: input.anamneseData.triageResult?.level,
                    source: 'DiggAI-Tomedo-Bridge',
                },
            };

            const compositionId = await client.addKarteieintrag(fallakteId, karteieintrag);

            result.tomedoCompositionId = compositionId;
            result.tomedoCompositionRef = `Composition/${compositionId}`;
            result.syncStatus = 'synced';

            logger.info('[Documentation] Created Tomedo Karteieintrag', {
                traceId: context.traceId,
                compositionId,
                fallakteId,
                patientId,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.syncStatus = 'failed';
            result.syncError = errorMsg;
            logger.error('[Documentation] Tomedo sync failed', {
                traceId: context.traceId,
                error: errorMsg,
            });
        }

        return result;
    }

    private determineKarteityp(input: BridgeInput): DocumentationOutput['karteityp'] {
        // Determine type based on anamnese data
        
        if (input.anamneseData.triageResult?.level === 'CRITICAL') {
            return 'Befund';
        }

        if (input.anamneseData.soapSummary) {
            return 'Anamnese';
        }

        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            return 'Befund';
        }

        // Check for therapy-related keywords in answers
        const answers = JSON.stringify(input.anamneseData.answers).toLowerCase();
        if (/therapie|behandlung|medikation|verschreib/i.test(answers)) {
            return 'Therapieplan';
        }

        return 'Anamnese';
    }

    private generateDocumentation(
        input: BridgeInput,
        karteityp: DocumentationOutput['karteityp']
    ): string {
        const lines: string[] = [];
        const timestamp = new Date().toLocaleString('de-DE');

        // Header
        lines.push(`${TEMPLATES[karteityp.toLowerCase() as keyof typeof TEMPLATES]?.header || '## Dokumentation'}`);
        lines.push('');
        lines.push(`**Erstellt:** ${timestamp}`);
        lines.push(`**Quelle:** DiggAi Anamnese`);
        lines.push(`**Session:** ${input.patientSessionId.substr(0, 8)}`);
        lines.push('');

        // Patient context
        lines.push('### Patientenkontext');
        if (input.patientData.name) {
            lines.push(`- Patient: ${input.patientData.name}`);
        }
        if (input.patientData.dob) {
            lines.push(`- Geb.: ${input.patientData.dob}`);
        }
        if (input.patientData.patientId) {
            lines.push(`- Patienten-ID: ${input.patientData.patientId}`);
        }
        lines.push('');

        // Anamnese section
        lines.push('### Anamnese');
        const hauptbeschwerde = this.findHauptbeschwerde(input.anamneseData.answers);
        if (hauptbeschwerde) {
            lines.push(`**Hauptbeschwerde:** ${hauptbeschwerde}`);
            lines.push('');
        }

        // Key findings
        const keyFindings = this.extractKeyFindings(input.anamneseData.answers);
        if (keyFindings.length > 0) {
            lines.push('**Wesentliche Befunde:**');
            for (const finding of keyFindings) {
                lines.push(`- ${finding}`);
            }
            lines.push('');
        }

        // Triage result
        if (input.anamneseData.triageResult) {
            lines.push('### Triage-Ergebnis');
            lines.push(`**Level:** ${input.anamneseData.triageResult.level}`);
            if (input.anamneseData.triageResult.reasons.length > 0) {
                lines.push('**Gründe:**');
                for (const reason of input.anamneseData.triageResult.reasons) {
                    lines.push(`- ${reason}`);
                }
            }
            lines.push('');
        }

        // ICD-10 Diagnoses
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            lines.push('### Diagnosen (ICD-10-GM)');
            for (const code of input.anamneseData.icd10Codes) {
                lines.push(`- ${code}: ${this.getIcd10Description(code)}`);
            }
            lines.push('');
        }

        // SOAP Summary
        if (input.anamneseData.soapSummary) {
            lines.push('### Zusammenfassung (SOAP)');
            lines.push(input.anamneseData.soapSummary);
            lines.push('');
        }

        // Voice recognition placeholders
        lines.push('### Arztnotizen');
        lines.push('[ARZTN_NOTIZ] Hier können handschriftliche oder gesprochene Notizen ergänzt werden.');
        lines.push('');

        // Recommendations
        lines.push('### Empfohlene Maßnahmen');
        const recommendations = this.generateRecommendations(input);
        for (const rec of recommendations) {
            lines.push(`- [ ] ${rec}`);
        }
        lines.push('');

        // Footer
        lines.push('---');
        lines.push('*Dokumentation erstellt durch DiggAi-Tomedo-Bridge*');
        lines.push('*DSGVO-konform • FHIR-kompatibel*');

        return lines.join('\n');
    }

    private findHauptbeschwerde(answers: Record<string, unknown>): string | null {
        const hauptbeschwerdeKeys = [
            'hauptbeschwerde', 'chief_complaint', 'beschwerde', 'symptom'
        ];

        for (const key of hauptbeschwerdeKeys) {
            if (key in answers && answers[key]) {
                return String(answers[key]).substring(0, 200);
            }
        }

        return null;
    }

    private extractKeyFindings(answers: Record<string, unknown>): string[] {
        const findings: string[] = [];
        const relevantKeys = [
            'schmerz', 'pain', 'blut', 'blood', 'atemnot', 'dyspnea',
            'fieber', 'fever', 'gewichtsverlust', 'weight_loss',
            'allergie', 'allergy', 'unverträglichkeit', 'intolerance',
            'vorerkrankung', 'previous_condition', 'operation',
            'medikament', 'medication', 'dauermedikation'
        ];

        for (const [key, value] of Object.entries(answers)) {
            const keyLower = key.toLowerCase();
            const valueStr = String(value).toLowerCase();

            // Check if key is relevant
            if (relevantKeys.some(rk => keyLower.includes(rk))) {
                // Only include non-negative responses
                if (!['nein', 'no', 'nicht', 'not', 'keine', 'none'].some(n => valueStr.includes(n))) {
                    findings.push(`${key}: ${String(value).substring(0, 100)}`);
                }
            }
        }

        return findings.slice(0, 8); // Max 8 findings
    }

    private getIcd10Description(code: string): string {
        // Simplified ICD-10 descriptions
        const descriptions: Record<string, string> = {
            'I10': 'Essentielle Hypertonie',
            'I21': 'Akuter Myokardinfarkt',
            'I25': 'Chronische ischämische Herzkrankheit',
            'I50': 'Herzinsuffizienz',
            'J44': 'Chronische obstruktive Lungenkrankheit',
            'J45': 'Asthma bronchiale',
            'K29': 'Gastritis',
            'G43': 'Migräne',
            'G40': 'Epilepsie',
            'F32': 'Depressive Episode',
            'F41': 'Angststörung',
            'E10': 'Diabetes mellitus Typ 1',
            'E11': 'Diabetes mellitus Typ 2',
            'L20': 'Endogenes Ekzem',
            'L40': 'Psoriasis',
            'M79': 'Fibromyalgie',
            'M06': 'Rheumatoide Arthritis',
            'N18': 'Chronische Nierenkrankheit',
        };

        // Try exact match
        if (descriptions[code]) {
            return descriptions[code];
        }

        // Try category match
        const category = code.substring(0, 3);
        if (descriptions[category]) {
            return descriptions[category];
        }

        return 'Weitere Abklärung erforderlich';
    }

    private generateRecommendations(input: BridgeInput): string[] {
        const recommendations: string[] = [];

        // Based on triage level
        if (input.anamneseData.triageResult?.level === 'CRITICAL') {
            recommendations.push('SOFORTIGE ärztliche Evaluierung erforderlich');
            recommendations.push('Notfallmanagement prüfen');
        } else if (input.anamneseData.triageResult?.level === 'WARNING') {
            recommendations.push('Zeitnahe ärztliche Vorstellung empfohlen');
        }

        // Based on ICD-10 codes
        if (input.anamneseData.icd10Codes?.some(c => c.startsWith('I'))) {
            recommendations.push('Kardiologische Abklärung');
            recommendations.push('EKG durchführen');
        }

        if (input.anamneseData.icd10Codes?.some(c => c.startsWith('E'))) {
            recommendations.push('Diabetes-Monitoring');
            recommendations.push('HbA1c bestimmen');
        }

        // Default recommendations
        if (recommendations.length === 0) {
            recommendations.push('Routinekontrolle in 3-6 Monaten');
            recommendations.push('Bei Verschlechterung vorzeitige Vorstellung');
        }

        return recommendations;
    }

    private extractSections(documentation: string): string[] {
        const sectionMatches = documentation.match(/^### (.+)$/gm);
        if (!sectionMatches) return [];
        
        return sectionMatches
            .map(s => s.replace('### ', '').trim())
            .filter(s => s.length > 0);
    }

    private generateFallbackDocumentation(input: BridgeInput, error: string): string {
        return `## Dokumentation - FEHLER

**Session:** ${input.patientSessionId}
**Zeit:** ${new Date().toLocaleString('de-DE')}

### Fehler bei Dokumentationsgenerierung
${error}

### Rohdaten
Bitte manuelle Dokumentation erstellen basierend auf der Anamnese-Session.

---
*Fehlerprotokoll - Bitte IT-Support kontaktieren*
`;
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
}

export const documentationAgent = new DocumentationAgent();
