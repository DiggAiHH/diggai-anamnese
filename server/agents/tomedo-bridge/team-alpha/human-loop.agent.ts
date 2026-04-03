/**
 * Team Alpha - Agent A3: Human-in-the-Loop-Controller
 * 
 * Entscheidet, wann menschliche Approvals benötigt werden.
 * High-Impact-Actions: Diagnosen, Medikation, kritische Triage
 */

import { createLogger } from '../../../logger.js';
import type {
    BridgeInput,
    BridgeAgentContext,
    HumanLoopOutput,
    IBridgeAgent,
} from '../types.js';

const logger = createLogger('HumanLoopAgent');

// Approval triggers with urgency levels
const APPROVAL_TRIGGERS = [
    { 
        condition: (input: BridgeInput) => input.anamneseData.triageResult?.level === 'CRITICAL',
        urgency: 'HIGH' as const,
        reason: 'Kritischer Triage-Befund erfordert sofortige ärztliche Überprüfung',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => input.anamneseData.triageResult?.level === 'WARNING',
        urgency: 'MEDIUM' as const,
        reason: 'Warnender Triage-Befund erfordert ärztliche Bestätigung',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => {
            const answers = JSON.stringify(input.anamneseData.answers).toLowerCase();
            return /medikament|medication|arznei|drug|verschreib/i.test(answers);
        },
        urgency: 'HIGH' as const,
        reason: 'Medikamentenbezogene Empfehlung erfordert ärztliche Verifizierung',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => {
            const codes = input.anamneseData.icd10Codes || [];
            return codes.some(c => /^[I][2][0-9]/.test(c)); // Heart conditions
        },
        urgency: 'HIGH' as const,
        reason: 'Kardiovaskulärer ICD-10 Code erfordert ärztliche Überprüfung',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => {
            const codes = input.anamneseData.icd10Codes || [];
            return codes.some(c => /^[C][0-9]/.test(c)); // Cancer
        },
        urgency: 'HIGH' as const,
        reason: 'Onkologischer Verdacht erfordert sofortige ärztliche Evaluation',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => {
            const codes = input.anamneseData.icd10Codes || [];
            return codes.some(c => /^[F][3][0-4]/.test(c)); // Depression/Suicide risk
        },
        urgency: 'HIGH' as const,
        reason: 'Psychiatrischer Befund mit Suizidrisiko - dringende ärztliche Überprüfung',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => {
            const answers = JSON.stringify(input.anamneseData.answers).toLowerCase();
            return /suizid|selbstmord|selbst.tot|suicide/i.test(answers);
        },
        urgency: 'HIGH' as const,
        reason: 'Suizidale Äußerungen erfordern sofortiges ärztliches Eingreifen',
        approverRole: 'arzt',
    },
    {
        condition: (input: BridgeInput) => input.options?.requireHumanApproval === true,
        urgency: 'MEDIUM' as const,
        reason: 'Manuelle Überprüfung auf Benutzeranfrage',
        approverRole: 'mfa',
    },
    {
        condition: (input: BridgeInput) => !input.patientData.patientId,
        urgency: 'HIGH' as const,
        reason: 'Unvollständige Patientendaten - Identitätsverifizierung erforderlich',
        approverRole: 'mfa',
    },
];

class HumanLoopAgent implements IBridgeAgent<BridgeInput, HumanLoopOutput> {
    name = 'human-loop';
    team = 'alpha' as const;
    displayName = 'Human-in-the-Loop Controller';
    description = 'Bestimmt wann menschliche Approvals erforderlich sind';
    timeoutMs = 3_000; // 3 seconds - quick decision

    async execute(input: BridgeInput, context: BridgeAgentContext): Promise<HumanLoopOutput> {
        const startTime = Date.now();
        logger.info('[HumanLoop] Evaluating approval requirements', {
            traceId: context.traceId,
            patientSessionId: input.patientSessionId,
        });

        try {
            // Check all approval triggers
            const triggeredChecks = APPROVAL_TRIGGERS
                .filter(trigger => trigger.condition(input))
                .map(trigger => ({
                    urgency: trigger.urgency,
                    reason: trigger.reason,
                    approverRole: trigger.approverRole,
                }));

            // Determine if approval is required
            const requiresApproval = triggeredChecks.length > 0;

            // Determine highest urgency
            const highestUrgency = triggeredChecks.length > 0
                ? this.getHighestUrgency(triggeredChecks.map(t => t.urgency))
                : 'LOW';

            // Combine reasons
            const combinedReason = triggeredChecks.length > 0
                ? triggeredChecks.map(t => t.reason).join('; ')
                : undefined;

            // Determine approver role (highest privilege required)
            const approverRole = triggeredChecks.length > 0
                ? this.getHighestRole(triggeredChecks.map(t => t.approverRole))
                : undefined;

            const result: HumanLoopOutput = {
                requiresApproval,
                reason: combinedReason,
                urgency: highestUrgency,
                approverRole,
                timestamp: new Date().toISOString(),
            };

            logger.info('[HumanLoop] Evaluation completed', {
                traceId: context.traceId,
                durationMs: Date.now() - startTime,
                requiresApproval,
                urgency: highestUrgency,
            });

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('[HumanLoop] Evaluation failed', {
                traceId: context.traceId,
                error: errorMsg,
            });

            // Conservative fallback: require approval on error
            return {
                requiresApproval: true,
                reason: 'Fehler bei der Automatischen Bewertung - manuelle Überprüfung erforderlich',
                urgency: 'HIGH',
                approverRole: 'arzt',
                timestamp: new Date().toISOString(),
            };
        }
    }

    private getHighestUrgency(urgencies: Array<'HIGH' | 'MEDIUM' | 'LOW'>): 'HIGH' | 'MEDIUM' | 'LOW' {
        if (urgencies.includes('HIGH')) return 'HIGH';
        if (urgencies.includes('MEDIUM')) return 'MEDIUM';
        return 'LOW';
    }

    private getHighestRole(roles: Array<string | undefined>): string | undefined {
        // Role hierarchy: arzt > mfa > admin
        if (roles.includes('arzt')) return 'arzt';
        if (roles.includes('mfa')) return 'mfa';
        if (roles.includes('admin')) return 'admin';
        return roles[0];
    }
}

export const humanLoopAgent = new HumanLoopAgent();
