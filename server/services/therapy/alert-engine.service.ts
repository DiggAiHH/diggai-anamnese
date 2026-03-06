// ============================================
// Alert Engine Service — Real-time Clinical Alert Evaluation
// ============================================

import { prisma } from '../../db.js';
import { getIO } from '../../socket.js';
import { evaluateAlertRules, DEFAULT_ALERT_RULES } from './alert-rules.js';
import type {
  AlertSeverity,
  AlertCategory,
  AlertRule,
  ClinicalAlertData,
  CreateAlertInput,
} from './types.js';

interface AnswerContext {
  answers: Record<string, string | number>;
  medications?: Array<{ name: string; dosage?: string }>;
  triageEvents?: Array<{ level: string; atomId: string; message: string }>;
  patientAge?: number;
  patientGender?: string;
  newMedication?: { name: string; atcGroup?: string };
}

export class AlertEngine {
  private rules: AlertRule[];

  constructor(customRules?: AlertRule[]) {
    this.rules = customRules ?? DEFAULT_ALERT_RULES;
  }

  /**
   * Evaluate a single answer against all alert rules.
   * Used for real-time evaluation as each answer comes in.
   */
  async evaluateAnswer(
    sessionId: string,
    patientId: string,
    answerField: string,
    answerValue: string | number,
    existingContext?: Partial<AnswerContext>
  ): Promise<ClinicalAlertData[]> {
    const context: AnswerContext = {
      answers: { ...existingContext?.answers, [answerField]: answerValue },
      medications: existingContext?.medications ?? [],
      triageEvents: existingContext?.triageEvents ?? [],
      patientAge: existingContext?.patientAge,
      patientGender: existingContext?.patientGender,
    };

    const triggered = evaluateAlertRules(context, this.rules);
    const created: ClinicalAlertData[] = [];

    for (const alert of triggered) {
      const existing = await prisma.clinicalAlert.findFirst({
        where: {
          sessionId,
          triggerRule: alert.ruleId,
          isDismissed: false,
        },
      });
      if (existing) continue;

      const saved = await this.persistAlert({
        sessionId,
        patientId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        message: alert.message,
        triggerField: alert.triggerField,
        triggerValue: alert.triggerValue,
        triggerRule: alert.ruleId,
      });

      created.push(saved);
      this.emitAlert(saved);
    }

    return created;
  }

  /**
   * Evaluate an entire session's answers at once.
   * Used after session completion or bulk re-evaluation.
   */
  async evaluateSession(
    sessionId: string,
    patientId: string,
    context: AnswerContext
  ): Promise<ClinicalAlertData[]> {
    const triggered = evaluateAlertRules(context, this.rules);
    const created: ClinicalAlertData[] = [];

    for (const alert of triggered) {
      const existing = await prisma.clinicalAlert.findFirst({
        where: {
          sessionId,
          triggerRule: alert.ruleId,
          isDismissed: false,
        },
      });
      if (existing) continue;

      const saved = await this.persistAlert({
        sessionId,
        patientId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        message: alert.message,
        triggerField: alert.triggerField,
        triggerValue: alert.triggerValue,
        triggerRule: alert.ruleId,
      });

      created.push(saved);
      this.emitAlert(saved);
    }

    return created;
  }

  /**
   * Evaluate alerts in the context of a therapy plan.
   * Adds medication interaction checks.
   */
  async evaluateTherapyPlan(
    planId: string,
    patientId: string,
    context: AnswerContext
  ): Promise<ClinicalAlertData[]> {
    const triggered = evaluateAlertRules(context, this.rules);
    const created: ClinicalAlertData[] = [];

    for (const alert of triggered) {
      const existing = await prisma.clinicalAlert.findFirst({
        where: {
          planId,
          triggerRule: alert.ruleId,
          isDismissed: false,
        },
      });
      if (existing) continue;

      const saved = await this.persistAlert({
        planId,
        patientId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        message: alert.message,
        triggerField: alert.triggerField,
        triggerValue: alert.triggerValue,
        triggerRule: alert.ruleId,
      });

      created.push(saved);
      this.emitAlert(saved);
    }

    return created;
  }

  private async persistAlert(input: CreateAlertInput): Promise<ClinicalAlertData> {
    const alert = await prisma.clinicalAlert.create({
      data: {
        sessionId: input.sessionId,
        planId: input.planId,
        patientId: input.patientId,
        severity: input.severity,
        category: input.category,
        title: input.title,
        message: input.message,
        triggerField: input.triggerField,
        triggerValue: input.triggerValue,
        triggerRule: input.triggerRule,
      },
    });

    return alert as unknown as ClinicalAlertData;
  }

  private emitAlert(alert: ClinicalAlertData): void {
    const io = getIO();
    if (!io) return;

    io.to('arzt').emit('therapy:alert-new', {
      id: alert.id,
      severity: alert.severity,
      category: alert.category,
      title: alert.title,
      message: alert.message,
      patientId: alert.patientId,
      sessionId: alert.sessionId,
      planId: alert.planId,
      createdAt: alert.createdAt,
    });

    if (alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY') {
      io.to('arzt').emit('therapy:alert-critical', {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        patientId: alert.patientId,
        createdAt: alert.createdAt,
      });
    }
  }
}

export const alertEngine = new AlertEngine();
