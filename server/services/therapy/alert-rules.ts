import type { AlertRule, AlertCategory, AlertSeverity } from './types';

// ─── Default Clinical Alert Rules ───────────────────────────

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'bp-critical',
    name: 'Kritischer Blutdruck',
    category: 'VITAL_SIGN',
    severity: 'CRITICAL',
    condition: {
      field: 'answers.blutdruck_systolisch',
      operator: 'gt',
      value: 180,
    },
    titleTemplate: 'Kritischer Blutdruck',
    messageTemplate: 'Systolischer Blutdruck {{value}} mmHg — sofortige ärztliche Bewertung empfohlen',
  },
  {
    id: 'bp-warning',
    name: 'Erhöhter Blutdruck',
    category: 'VITAL_SIGN',
    severity: 'WARNING',
    condition: {
      field: 'answers.blutdruck_systolisch',
      operator: 'gt',
      value: 140,
    },
    titleTemplate: 'Erhöhter Blutdruck',
    messageTemplate: 'Systolischer Blutdruck {{value}} mmHg — Kontrolle empfohlen',
  },
  {
    id: 'pain-high',
    name: 'Starke Schmerzen',
    category: 'VITAL_SIGN',
    severity: 'WARNING',
    condition: {
      field: 'answers.schmerzskala',
      operator: 'gt',
      value: 8,
    },
    titleTemplate: 'Starke Schmerzen (>8/10)',
    messageTemplate: 'Patient gibt Schmerzintensität {{value}}/10 an',
  },
  {
    id: 'suicide-risk',
    name: 'Suizidalität',
    category: 'SYMPTOM_PATTERN',
    severity: 'EMERGENCY',
    condition: {
      field: 'answers.suizidalitaet',
      operator: 'in',
      value: ['ja', 'manchmal', 'gedanken', 'häufig'],
    },
    titleTemplate: '⚠️ SUIZIDALITÄT — Sofortiges Handeln erforderlich',
    messageTemplate: 'Patient äußert Suizidgedanken. Sofortige ärztliche Beurteilung!',
  },
  {
    id: 'chest-pain-smoker',
    name: 'Brustschmerz + Raucher',
    category: 'SYMPTOM_PATTERN',
    severity: 'WARNING',
    condition: {
      field: 'answers.hauptbeschwerde',
      operator: 'contains',
      value: 'brustschmerz',
      andConditions: [
        { field: 'answers.rauchen', operator: 'eq', value: 'ja' },
      ],
    },
    titleTemplate: 'Risikokonstellation: Brustschmerz + Raucher',
    messageTemplate: 'Patient berichtet Brustschmerzen bei positiver Raucheranamnese',
  },
  {
    id: 'dyspnea-acute',
    name: 'Akute Atemnot',
    category: 'VITAL_SIGN',
    severity: 'CRITICAL',
    condition: {
      field: 'answers.hauptbeschwerde',
      operator: 'contains',
      value: 'atemnot',
    },
    titleTemplate: 'Akute Atemnot',
    messageTemplate: 'Patient berichtet akute Atemnot — ärztliche Beurteilung prioritär',
  },
  {
    id: 'triage-escalation',
    name: 'Triage-Eskalation',
    category: 'TRIAGE_ESCALATION',
    severity: 'WARNING',
    condition: {
      field: 'triage.level',
      operator: 'eq',
      value: 'CRITICAL',
    },
    titleTemplate: 'Triage-Eskalation: CRITICAL',
    messageTemplate: 'Triage hat kritisches Niveau erreicht — {{value}}',
  },
  {
    id: 'nsaid-ass-interaction',
    name: 'NSAID + ASS Interaktion',
    category: 'DRUG_INTERACTION',
    severity: 'WARNING',
    condition: {
      field: 'medications.active',
      operator: 'contains',
      value: 'ASS',
      andConditions: [
        { field: 'therapy.newMedication.atcGroup', operator: 'eq', value: 'M01A' },
      ],
    },
    titleTemplate: 'Medikamenten-Interaktion: NSAID + ASS',
    messageTemplate: 'Kombination von NSAID mit ASS erhöht gastrointestinales Blutungsrisiko',
  },
  {
    id: 'allergy-penicillin',
    name: 'Penicillin-Allergie',
    category: 'ALLERGY_CONFLICT',
    severity: 'CRITICAL',
    condition: {
      field: 'answers.allergien',
      operator: 'contains',
      value: 'penicillin',
    },
    titleTemplate: 'Penicillin-Allergie dokumentiert',
    messageTemplate: 'Patient hat eine Penicillin-Allergie angegeben — bei Medikamentenverordnung beachten!',
  },
  {
    id: 'age-over-65-poly',
    name: 'Polypharmazie bei Senioren',
    category: 'AGE_RISK',
    severity: 'INFO',
    condition: {
      field: 'patient.age',
      operator: 'gt',
      value: 65,
      andConditions: [
        { field: 'medications.count', operator: 'gt', value: 5 },
      ],
    },
    titleTemplate: 'Polypharmazie-Risiko (>65J, >5 Medikamente)',
    messageTemplate: 'Patient über 65 mit mehr als 5 Dauermedikamenten — Interaktionscheck empfohlen',
  },
];

// ─── Alert Evaluation Engine ────────────────────────────────

/**
 * Evaluates alert rules against provided context.
 * Returns array of triggered alerts (severity + category + title + message).
 */
export function evaluateAlertRules(
  context: {
    answers: Record<string, string | number>;
    medications?: Array<{ name: string; dosage?: string }>;
    triageEvents?: Array<{ level: string; atomId: string; message: string }>;
    patientAge?: number;
    patientGender?: string;
    newMedication?: { name: string; atcGroup?: string };
  },
  rules: AlertRule[] = DEFAULT_ALERT_RULES
): Array<{
  ruleId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  triggerField: string;
  triggerValue: string;
}> {
  const triggered: Array<{
    ruleId: string;
    severity: AlertSeverity;
    category: AlertCategory;
    title: string;
    message: string;
    triggerField: string;
    triggerValue: string;
  }> = [];

  for (const rule of rules) {
    const { field, operator, value, andConditions } = rule.condition;

    // Resolve the field value from context
    const fieldValue = resolveField(field, context);
    if (fieldValue === undefined) continue;

    // Check primary condition
    if (!checkCondition(fieldValue, operator, value)) continue;

    // Check AND conditions
    if (andConditions && andConditions.length > 0) {
      const allAndMet = andConditions.every(cond => {
        const condValue = resolveField(cond.field, context);
        return condValue !== undefined && checkCondition(condValue, cond.operator as any, cond.value);
      });
      if (!allAndMet) continue;
    }

    // Rule triggered — build alert
    const message = rule.messageTemplate.replace(/\{\{value\}\}/g, String(fieldValue));
    triggered.push({
      ruleId: rule.id,
      severity: rule.severity,
      category: rule.category,
      title: rule.titleTemplate,
      message,
      triggerField: field,
      triggerValue: String(fieldValue),
    });
  }

  return triggered;
}

// ─── Helpers ────────────────────────────────────────────────

function resolveField(
  field: string,
  context: Record<string, any>
): string | number | undefined {
  const parts = field.split('.');
  let current: any = context;

  for (const part of parts) {
    if (current == null) return undefined;
    if (typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' || typeof current === 'number'
    ? current
    : undefined;
}

function checkCondition(
  fieldValue: string | number,
  operator: string,
  ruleValue: string | number | string[]
): boolean {
  switch (operator) {
    case 'eq':
      return String(fieldValue).toLowerCase() === String(ruleValue).toLowerCase();

    case 'gt':
      return Number(fieldValue) > Number(ruleValue);

    case 'lt':
      return Number(fieldValue) < Number(ruleValue);

    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());

    case 'regex': {
      try {
        return new RegExp(String(ruleValue), 'i').test(String(fieldValue));
      } catch {
        return false;
      }
    }

    case 'in':
      if (Array.isArray(ruleValue)) {
        return ruleValue.some(v => String(v).toLowerCase() === String(fieldValue).toLowerCase());
      }
      return false;

    default:
      return false;
  }
}
