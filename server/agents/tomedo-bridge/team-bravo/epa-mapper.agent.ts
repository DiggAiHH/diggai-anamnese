/**
 * Team Bravo - Agent B2: ePA-Mapper
 * 
 * Transformation DiggAi-Outputs in Tomedo-ePA-Struktur.
 * Erstellt: Stammdaten, Diagnosen, Leistungsfavoriten
 * 
 * @phase PHASE_1_REAL_API - Echte Tomedo API Integration
 */

import { createLogger } from '../../../logger.js';
import { createTomedoApiClient, type TomedoPatient, type TomedoFallakte } from '../../../services/pvs/tomedo-api.client.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    EpaMapperOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('EpaMapperAgent');

// GOÄ Ziffern Mapping basierend auf ICD-10 Codes
const GOAE_MAPPING: Record<string, string[]> = {
    // Kardiologie
    'I10': ['0300'], // Hypertonie
    'I21': ['0300', '0330'], // Herzinfarkt
    'I25': ['0300', '0330'], // KHK
    'I50': ['0300', '0330'], // Herzinsuffizienz
    
    // Pneumologie
    'J44': ['0300', '0330'], // COPD
    'J45': ['0300', '0320'], // Asthma
    'J18': ['0300', '0330'], // Pneumonie
    
    // Gastroenterologie
    'K29': ['0300', '0330'], // Gastritis
    'K50': ['0300', '0330'], // Morbus Crohn
    'K51': ['0300', '0330'], // Colitis ulcerosa
    
    // Neurologie
    'G43': ['0300', '0320'], // Migräne
    'G40': ['0300', '0320'], // Epilepsie
    'G20': ['0300', '0330'], // Parkinson
    
    // Psychiatrie
    'F32': ['0300', '0320'], // Depression
    'F41': ['0300', '0320'], // Angststörung
    'F84': ['0300', '0320'], // Autismus
    
    // Endokrinologie
    'E10': ['0300', '0320'], // Diabetes Typ 1
    'E11': ['0300', '0320'], // Diabetes Typ 2
    'E03': ['0300', '0320'], // Hypothyreose
    
    // Dermatologie
    'L20': ['0300', '0320'], // Neurodermitis
    'L40': ['0300', '0320'], // Psoriasis
    
    // Rheumatologie
    'M79': ['0300', '0320'], // Fibromyalgie
    'M06': ['0300', '0330'], // RA
    
    // Urologie
    'N18': ['0300', '0330'], // CKD
    'N40': ['0300', '0320'], // BPH
    
    // Default
    'DEFAULT': ['0300'],
};

interface EpaMappingResult {
    patientId: string;
    tomedoPatientId?: string;
    tomedoPatientRef?: string;
    fallakteId?: string;
    fallakteRef?: string;
    createdInTomedo: boolean;
    syncStatus: 'synced' | 'pending' | 'failed';
    syncError?: string;
}

class EpaMapperAgent implements IBridgeAgent<BridgeInput, EpaMapperOutput> {
    name = 'epa-mapper';
    team = 'bravo' as const;
    displayName = 'ePA Mapper';
    description = 'Transformiert DiggAi-Daten in Tomedo-ePA-Struktur';
    timeoutMs = 15_000; // 15 seconds (includes API calls)

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<EpaMapperOutput> {
        const startTime = Date.now();
        logger.info('[EpaMapper] Starting ePA mapping', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
            connectionId: input.connectionId,
        });

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
                logger.warn('[EpaMapper] No active Tomedo connection', {
                    connectionId: input.connectionId,
                });
                return this.buildFallbackOutput(input, 'No active Tomedo connection');
            }

            // Convert to connection data
            const connectionData = this.toConnectionData(connection);
            const client = createTomedoApiClient(connectionData);

            // Test connection first
            const connectionTest = await client.testConnection();
            if (!connectionTest.ok) {
                logger.warn('[EpaMapper] Tomedo API not available', {
                    error: connectionTest.message,
                });
                return this.buildFallbackOutput(input, `Tomedo API: ${connectionTest.message}`);
            }

            // Try to sync with Tomedo
            const syncResult = await this.syncToTomedo(input, client, context);

            // Build patient ID
            const patientId = syncResult.tomedoPatientId || 
                             input.patientData.externalPatientId || 
                             input.patientData.patientId || 
                             `dig-${input.patientSessionId.substr(0, 8)}`;

            // Map to Tomedo ePA structure
            const epaEntry = this.buildEpaEntry(input, patientId, syncResult);

            // Determine GOÄ Ziffern
            const goaeZiffern = this.determineGoaeZiffern(input);

            // Validate mapping
            const mappingValidation = this.validateMapping(epaEntry, goaeZiffern);

            const result: EpaMapperOutput = {
                epaEntry,
                goaeZiffern,
                mappingValidation,
                timestamp: new Date().toISOString(),
                tomedoSync: {
                    patientId: syncResult.tomedoPatientId,
                    patientRef: syncResult.tomedoPatientRef,
                    fallakteId: syncResult.fallakteId,
                    fallakteRef: syncResult.fallakteRef,
                    created: syncResult.createdInTomedo,
                    status: syncResult.syncStatus,
                    error: syncResult.syncError,
                },
            };

            logger.info('[EpaMapper] ePA mapping completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                patientId: epaEntry.patientId,
                tomedoPatientId: syncResult.tomedoPatientId,
                fallakteId: syncResult.fallakteId,
                syncStatus: syncResult.syncStatus,
                goaeCount: goaeZiffern.length,
                valid: mappingValidation.valid,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[EpaMapper] ePA mapping failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            return this.buildFallbackOutput(input, errorMsg);
        }
    }

    private async syncToTomedo(
        input: BridgeInput,
        client: ReturnType<typeof createTomedoApiClient>,
        context: BridgeAgentContext
    ): Promise<EpaMappingResult> {
        const result: EpaMappingResult = {
            patientId: input.patientData.patientId || input.patientSessionId,
            createdInTomedo: false,
            syncStatus: 'pending',
        };

        try {
            // Step 1: Search for existing patient
            let tomedoPatient: TomedoPatient | null = null;
            
            if (input.patientData.externalPatientId) {
                try {
                    tomedoPatient = await client.getPatient(input.patientData.externalPatientId);
                    result.tomedoPatientId = tomedoPatient.id;
                    result.tomedoPatientRef = `Patient/${tomedoPatient.id}`;
                    logger.info('[EpaMapper] Found existing Tomedo patient by ID', {
                        traceId: context.traceId,
                        patientId: tomedoPatient.id,
                    });
                } catch (e) {
                    // Patient not found, will create new
                }
            }

            // Search by name if available
            if (!tomedoPatient && input.patientData.name) {
                const searchResults = await client.searchPatient({ 
                    name: input.patientData.name 
                });
                if (searchResults.length > 0) {
                    // Use first match (could be enhanced with DOB matching)
                    result.tomedoPatientId = searchResults[0].pvsPatientId;
                    result.tomedoPatientRef = `Patient/${searchResults[0].pvsPatientId}`;
                    logger.info('[EpaMapper] Found existing Tomedo patient by name', {
                        traceId: context.traceId,
                        patientId: result.tomedoPatientId,
                        matches: searchResults.length,
                    });
                }
            }

            // Step 2: Create patient if not found
            if (!result.tomedoPatientId) {
                // Parse name if available
                const nameParts = this.parsePatientName(input.patientData.name);
                
                if (nameParts.firstName && nameParts.lastName) {
                    const newPatient = await client.createPatient({
                        firstName: nameParts.firstName,
                        lastName: nameParts.lastName,
                        birthDate: input.patientData.dob,
                        gender: this.inferGender(input),
                    });
                    
                    result.tomedoPatientId = newPatient.id;
                    result.tomedoPatientRef = `Patient/${newPatient.id}`;
                    result.createdInTomedo = true;
                    
                    logger.info('[EpaMapper] Created new Tomedo patient', {
                        traceId: context.traceId,
                        patientId: newPatient.id,
                    });
                }
            }

            // Step 3: Create Fallakte if we have a patient
            if (result.tomedoPatientId) {
                const fallakte = await client.createFallakte(result.tomedoPatientId, {
                    startDate: new Date().toISOString(),
                    reason: this.buildFallakteReason(input),
                });
                
                result.fallakteId = fallakte.id;
                result.fallakteRef = `Encounter/${fallakte.id}`;
                result.syncStatus = 'synced';
                
                logger.info('[EpaMapper] Created Tomedo Fallakte', {
                    traceId: context.traceId,
                    fallakteId: fallakte.id,
                    patientId: result.tomedoPatientId,
                });
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.syncStatus = 'failed';
            result.syncError = errorMsg;
            logger.error('[EpaMapper] Tomedo sync failed', {
                traceId: context.traceId,
                error: errorMsg,
            });
        }

        return result;
    }

    private buildEpaEntry(
        input: BridgeInput, 
        patientId: string,
        syncResult: EpaMappingResult
    ): EpaMapperOutput['epaEntry'] {
        const timestamp = new Date().toISOString();
        
        // Build Fallakte (case file) content
        const fallakteContent = this.buildFallakteContent(input, syncResult);
        
        // Build Custom Eintrag (custom entry)
        const customEintrag = this.buildCustomEintrag(input, syncResult);

        return {
            patientId,
            fallakte: fallakteContent,
            customEintrag,
            metadata: {
                source: 'DiggAi-Anamnese',
                sessionId: input.patientSessionId,
                tenantId: input.tenantId,
                createdAt: timestamp,
                version: '1.0',
                icd10Codes: input.anamneseData.icd10Codes || [],
                triageLevel: input.anamneseData.triageResult?.level || 'NORMAL',
                // Tomedo sync metadata
                tomedoPatientId: syncResult.tomedoPatientId,
                tomedoPatientRef: syncResult.tomedoPatientRef,
                tomedoFallakteId: syncResult.fallakteId,
                tomedoFallakteRef: syncResult.fallakteRef,
                tomedoCreated: syncResult.createdInTomedo,
                tomedoSyncStatus: syncResult.syncStatus,
                ...(syncResult.syncError && { tomedoSyncError: syncResult.syncError }),
            },
        };
    }

    private buildFallakteContent(input: BridgeInput, syncResult: EpaMappingResult): string {
        const parts: string[] = [];
        
        // Header
        parts.push('=== DIGGAI ANAMNESE ===');
        parts.push(`Session: ${input.patientSessionId}`);
        parts.push(`Erstellt: ${new Date().toLocaleString('de-DE')}`);
        
        // Tomedo references
        if (syncResult.tomedoPatientRef) {
            parts.push(`Tomedo Patient: ${syncResult.tomedoPatientRef}`);
        }
        if (syncResult.fallakteRef) {
            parts.push(`Tomedo Fallakte: ${syncResult.fallakteRef}`);
        }
        if (syncResult.syncStatus === 'failed') {
            parts.push(`Sync Status: FEHLER - ${syncResult.syncError || 'Unbekannter Fehler'}`);
        }
        parts.push('');

        // Triage
        if (input.anamneseData.triageResult) {
            parts.push(`TRIAGE: ${input.anamneseData.triageResult.level}`);
            parts.push(`Gründe: ${input.anamneseData.triageResult.reasons.join(', ')}`);
            parts.push('');
        }

        // ICD-10
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            parts.push(`ICD-10: ${input.anamneseData.icd10Codes.join(', ')}`);
            parts.push('');
        }

        // SOAP Summary
        if (input.anamneseData.soapSummary) {
            parts.push('ZUSAMMENFASSUNG:');
            parts.push(input.anamneseData.soapSummary);
            parts.push('');
        }

        // Key answers
        parts.push('KERNBEFUNDE:');
        const keyAnswers = this.extractKeyAnswers(input.anamneseData.answers);
        for (const [key, value] of Object.entries(keyAnswers)) {
            parts.push(`- ${key}: ${value}`);
        }

        return parts.join('\n');
    }

    private buildCustomEintrag(input: BridgeInput, syncResult: EpaMappingResult): string {
        const parts: string[] = [];
        
        // Structured for Tomedo's custom entry format
        parts.push('[DIGGAI]');
        
        if (input.anamneseData.triageResult) {
            parts.push(`Triage: ${input.anamneseData.triageResult.level}`);
        }
        
        if (input.anamneseData.icd10Codes) {
            parts.push(`ICD: ${input.anamneseData.icd10Codes.join(' ')}`);
        }

        // Add sync status
        if (syncResult.syncStatus === 'synced') {
            parts.push(`Sync: OK (${syncResult.createdInTomedo ? 'neu' : 'bestehend'})`);
        } else if (syncResult.syncStatus === 'failed') {
            parts.push(`Sync: FEHLER`);
        }

        // Add relevant findings
        const findings = this.extractFindings(input.anamneseData.answers);
        if (findings.length > 0) {
            parts.push(`Befunde: ${findings.join(', ')}`);
        }

        parts.push(`[ID:${input.patientSessionId.substr(0, 8)}]`);

        return parts.join(' | ');
    }

    private parsePatientName(name?: string): { firstName: string; lastName: string } {
        if (!name) return { firstName: 'Unbekannt', lastName: 'Patient' };
        
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return {
                firstName: parts[0],
                lastName: parts.slice(1).join(' '),
            };
        }
        return { firstName: name, lastName: '' };
    }

    private inferGender(input: BridgeInput): 'male' | 'female' | 'other' | undefined {
        // Try to infer from answers
        const answers = JSON.stringify(input.anamneseData.answers).toLowerCase();
        if (answers.includes('männlich') || answers.includes('male')) return 'male';
        if (answers.includes('weiblich') || answers.includes('female')) return 'female';
        if (answers.includes('divers') || answers.includes('other')) return 'other';
        return undefined;
    }

    private buildFallakteReason(input: BridgeInput): string {
        const hauptbeschwerde = this.extractKeyAnswers(input.anamneseData.answers).hauptbeschwerde;
        if (hauptbeschwerde) {
            return `Anamnese: ${hauptbeschwerde.substring(0, 100)}`;
        }
        if (input.anamneseData.icd10Codes && input.anamneseData.icd10Codes.length > 0) {
            return `ICD-10: ${input.anamneseData.icd10Codes.join(', ')}`;
        }
        return 'Digitale Anamnese via DiggAI';
    }

    private buildFallbackOutput(input: BridgeInput, error: string): EpaMapperOutput {
        return {
            epaEntry: {
                patientId: input.patientData.patientId || `dig-${input.patientSessionId.substr(0, 8)}`,
                fallakte: `Fehler bei Tomedo-Sync: ${error}`,
                customEintrag: `[DIGGAI] Sync: FEHLER - ${error}`,
                metadata: { 
                    error: true, 
                    syncError: error,
                    sessionId: input.patientSessionId,
                },
            },
            goaeZiffern: ['0300', '2500'],
            mappingValidation: {
                valid: false,
                errors: [error],
            },
            timestamp: new Date().toISOString(),
        };
    }

    private extractKeyAnswers(answers: Record<string, unknown>): Record<string, string> {
        const keyAnswers: Record<string, string> = {};
        const importantKeys = [
            'hauptbeschwerde', 'chief_complaint',
            'schmerz', 'pain',
            'allergien', 'allergies',
            'medikamente', 'medications',
            'vorerkrankungen', 'previous_conditions',
        ];

        for (const key of importantKeys) {
            if (key in answers) {
                keyAnswers[key] = String(answers[key]).substring(0, 100);
            }
        }

        return keyAnswers;
    }

    private extractFindings(answers: Record<string, unknown>): string[] {
        const findings: string[] = [];
        
        // Look for positive findings
        for (const [key, value] of Object.entries(answers)) {
            const valueStr = String(value).toLowerCase();
            if (valueStr.includes('ja') || valueStr.includes('yes') || valueStr.includes('positiv')) {
                findings.push(key);
            }
        }

        return findings.slice(0, 5); // Max 5 findings
    }

    private determineGoaeZiffern(input: BridgeInput): string[] {
        const ziffern = new Set<string>();
        
        // Add base consultation
        ziffern.add('0300');

        // Map ICD-10 codes to GOÄ
        const icd10Codes = input.anamneseData.icd10Codes || [];
        
        for (const code of icd10Codes) {
            // Try exact match first
            if (GOAE_MAPPING[code]) {
                GOAE_MAPPING[code].forEach(z => ziffern.add(z));
                continue;
            }

            // Try category match (first 3 characters)
            const category = code.substring(0, 3);
            if (GOAE_MAPPING[category]) {
                GOAE_MAPPING[category].forEach(z => ziffern.add(z));
                continue;
            }

            // Try block match (first character)
            const block = code.substring(0, 1);
            const blockMapping: Record<string, string[]> = {
                'I': ['0300', '0330'], // Cardiology
                'J': ['0300', '0330'], // Pneumology
                'K': ['0300', '0330'], // Gastro
                'G': ['0300', '0330'], // Neurology
                'F': ['0300', '0320'], // Psychiatry
                'E': ['0300', '0320'], // Endocrinology
                'N': ['0300', '0320'], // Urology/Nephrology
            };
            
            if (blockMapping[block]) {
                blockMapping[block].forEach(z => ziffern.add(z));
            }
        }

        // Add extended consultation for complex cases
        if (icd10Codes.length > 2 || input.anamneseData.triageResult?.level === 'WARNING') {
            ziffern.add('0330');
        }

        // Add documentation fee
        ziffern.add('2500');

        return Array.from(ziffern).sort();
    }

    private validateMapping(
        epaEntry: EpaMapperOutput['epaEntry'],
        goaeZiffern: string[]
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate patient ID
        if (!epaEntry.patientId || epaEntry.patientId === 'unknown') {
            errors.push('Ungültige Patienten-ID');
        }

        // Validate fallakte content
        if (!epaEntry.fallakte || epaEntry.fallakte.length < 10) {
            errors.push('Fallakte zu kurz oder leer');
        }

        // Validate GOÄ Ziffern
        if (goaeZiffern.length === 0) {
            errors.push('Keine GOÄ Ziffern zugeordnet');
        }

        // Check for invalid Ziffern
        const validZiffernPattern = /^[0-9]{4}$/;
        for (const z of goaeZiffern) {
            if (!validZiffernPattern.test(z)) {
                errors.push(`Ungültige GOÄ Ziffer: ${z}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
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

export const epaMapperAgent = new EpaMapperAgent();
