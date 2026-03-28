// ── CustomForm / FormBuilder Service ────────────────────────────────

import { randomUUID } from 'crypto';
import type {
  AiGenerateInput,
  CreateFormInput,
  CustomFormRecord,
  FormQuestion,
  UpdateFormInput,
} from './types';
import { encrypt } from '../encryption';

const prisma = () => (globalThis as any).__prisma;

interface FormAccessOptions {
  praxisId?: string;
  requireActive?: boolean;
  requesterRole?: 'patient' | 'arzt' | 'mfa' | 'admin';
  requesterSessionId?: string;
}

function buildEncryptedCustomFormAnswer(formId: string, questionId: string, value: unknown) {
  const normalizedValue = value === undefined ? null : value;

  return {
    value: JSON.stringify({
      type: 'custom-form',
      formId,
      questionId,
      data: '[encrypted]',
      redacted: true,
      dataType: Array.isArray(normalizedValue) ? 'array' : typeof normalizedValue,
    }),
    encryptedValue: encrypt(JSON.stringify({
      type: 'custom-form',
      formId,
      questionId,
      data: normalizedValue,
    })),
  };
}

// ── CRUD ────────────────────────────────────────────────────────────

export async function createForm(input: CreateFormInput): Promise<CustomFormRecord> {
  const db = prisma();
  return db.customForm.create({
    data: {
      id: randomUUID(),
      praxisId: input.praxisId,
      createdBy: input.createdBy,
      name: input.name,
      description: input.description ?? null,
      aiGenerated: false,
      aiPrompt: null,
      logic: input.logic ?? {},
      questions: input.questions as any,
      tags: input.tags ?? [],
      ageRange: input.ageRange ?? null,
      usageCount: 0,
      isActive: false,
      version: 1,
    },
  });
}

export async function getForm(id: string, options?: FormAccessOptions): Promise<CustomFormRecord> {
  const db = prisma();
  const form = await db.customForm.findFirst({
    where: {
      id,
      ...(options?.praxisId ? { praxisId: options.praxisId } : {}),
      ...(options?.requireActive ? { isActive: true } : {}),
    },
  });
  if (!form) throw new Error(`Form not found: ${id}`);
  return form;
}

export async function listForms(
  praxisId: string,
  opts?: { isActive?: boolean; tag?: string },
): Promise<CustomFormRecord[]> {
  const db = prisma();
  const where: Record<string, any> = { praxisId };
  if (opts?.isActive !== undefined) where.isActive = opts.isActive;
  if (opts?.tag) where.tags = { has: opts.tag };
  return db.customForm.findMany({ where, orderBy: { updatedAt: 'desc' } });
}

export async function updateForm(
  id: string,
  input: UpdateFormInput,
  options?: FormAccessOptions,
): Promise<CustomFormRecord> {
  const db = prisma();
  const existing = await getForm(id, options);
  return db.customForm.update({
    where: { id },
    data: {
      ...input,
      questions: input.questions !== undefined ? (input.questions as any) : undefined,
      logic: input.logic !== undefined ? (input.logic as any) : undefined,
      ageRange: input.ageRange !== undefined ? (input.ageRange as any) : undefined,
      version: existing.version + 1,
    },
  });
}

export async function deleteForm(id: string, options?: FormAccessOptions): Promise<CustomFormRecord> {
  const db = prisma();
  await getForm(id, options);
  return db.customForm.update({
    where: { id },
    data: { isActive: false },
  });
}

// ── Publish / Usage ─────────────────────────────────────────────────

export async function publishForm(id: string, options?: FormAccessOptions): Promise<CustomFormRecord> {
  const db = prisma();
  await getForm(id, options);
  return db.customForm.update({
    where: { id },
    data: { isActive: true },
  });
}

export async function incrementUsage(id: string, options?: FormAccessOptions): Promise<CustomFormRecord> {
  const db = prisma();
  await getForm(id, options);
  return db.customForm.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}

// ── Stats ───────────────────────────────────────────────────────────

export async function submitForm(
  formId: string,
  data: { sessionId: string; answers: Record<string, unknown>; submittedAt?: string },
  options?: FormAccessOptions,
) {
  const db = prisma();
  const form = await getForm(formId, { ...options, requireActive: true });

  if (options?.requesterRole === 'patient') {
    if (!options.requesterSessionId) {
      throw new Error('Missing patient session context');
    }

    if (options.requesterSessionId !== data.sessionId) {
      throw new Error('Session mismatch');
    }
  }

  const submittedAt = new Date();
  const session = await db.patientSession.findFirst({
    where: {
      id: data.sessionId,
      ...(options?.praxisId ? { tenantId: options.praxisId } : {}),
    },
    select: { id: true },
  });

  if (!session) {
    throw new Error(`Session not found: ${data.sessionId}`);
  }

  const allowedQuestionIds = new Set(
    Array.isArray(form.questions)
      ? (form.questions as FormQuestion[]).map((question) => question.id)
      : [],
  );
  const persistedEntries = Object.entries(data.answers).filter(([questionId]) => allowedQuestionIds.has(questionId));

  if (persistedEntries.length === 0) {
    throw new Error('No valid answers provided');
  }

  await db.$transaction([
    ...persistedEntries.map(([questionId, value]) =>
      (() => {
        const storage = buildEncryptedCustomFormAnswer(form.id, questionId, value);

        return db.answer.upsert({
          where: {
            sessionId_atomId: {
              sessionId: data.sessionId,
              atomId: `FORM:${form.id}:${questionId}`,
            },
          },
          create: {
            sessionId: data.sessionId,
            atomId: `FORM:${form.id}:${questionId}`,
            value: storage.value,
            encryptedValue: storage.encryptedValue,
            answeredAt: submittedAt,
          },
          update: {
            value: storage.value,
            encryptedValue: storage.encryptedValue,
            answeredAt: submittedAt,
          },
        });
      })(),
    ),
    db.customForm.update({
      where: { id: form.id },
      data: { usageCount: { increment: 1 } },
    }),
  ]);

  return {
    formId,
    sessionId: data.sessionId,
    answersCount: persistedEntries.length,
    submittedAt: submittedAt.toISOString(),
  };
}

export async function getFormStats(praxisId: string) {
  const db = prisma();
  const [total, active, aiGenerated, usageAgg] = await Promise.all([
    db.customForm.count({ where: { praxisId } }),
    db.customForm.count({ where: { praxisId, isActive: true } }),
    db.customForm.count({ where: { praxisId, aiGenerated: true } }),
    db.customForm.aggregate({
      where: { praxisId },
      _sum: { usageCount: true },
    }),
  ]);
  return {
    totalForms: total,
    activeForms: active,
    aiGeneratedCount: aiGenerated,
    totalUsage: usageAgg._sum.usageCount ?? 0,
  };
}

// ── AI Generate (mock / template-matching) ──────────────────────────

const TEMPLATE_BANK: Record<string, FormQuestion[]> = {
  allergy: [
    { id: 'allergy_type', type: 'SELECT', label: 'Which type of allergy?', required: true, options: ['Food', 'Medication', 'Environmental', 'Other'] },
    { id: 'allergy_details', type: 'TEXTAREA', label: 'Please describe your allergy symptoms', required: true, placeholder: 'e.g. swelling, rash, breathing difficulty' },
    { id: 'allergy_severity', type: 'SCALE', label: 'How severe are your reactions? (1-10)', required: true, validation: { min: 1, max: 10 } },
    { id: 'allergy_medication', type: 'TEXT', label: 'Current allergy medication', required: false, placeholder: 'e.g. Cetirizine' },
  ],
  pain: [
    { id: 'pain_location', type: 'TEXT', label: 'Where is the pain located?', required: true },
    { id: 'pain_duration', type: 'SELECT', label: 'How long have you had this pain?', required: true, options: ['Less than a week', '1-4 weeks', '1-6 months', 'More than 6 months'] },
    { id: 'pain_level', type: 'SCALE', label: 'Rate your pain level (1-10)', required: true, validation: { min: 1, max: 10 } },
    { id: 'pain_type', type: 'RADIO', label: 'Type of pain', required: true, options: ['Sharp', 'Dull', 'Throbbing', 'Burning', 'Aching'] },
    { id: 'pain_triggers', type: 'MULTI_SELECT', label: 'What triggers the pain?', required: false, options: ['Movement', 'Rest', 'Stress', 'Eating', 'Weather'] },
  ],
  mental: [
    { id: 'mental_mood', type: 'SCALE', label: 'How would you rate your current mood? (1-10)', required: true, validation: { min: 1, max: 10 } },
    { id: 'mental_sleep', type: 'SELECT', label: 'How is your sleep quality?', required: true, options: ['Very poor', 'Poor', 'Average', 'Good', 'Very good'] },
    { id: 'mental_symptoms', type: 'MULTI_SELECT', label: 'Are you experiencing any of the following?', required: true, options: ['Anxiety', 'Depression', 'Insomnia', 'Lack of motivation', 'Irritability', 'Difficulty concentrating'] },
    { id: 'mental_duration', type: 'SELECT', label: 'How long have you been experiencing these symptoms?', required: true, options: ['Less than 2 weeks', '2-4 weeks', '1-3 months', 'More than 3 months'] },
    { id: 'mental_notes', type: 'TEXTAREA', label: 'Anything else you would like to share?', required: false },
  ],
  general: [
    { id: 'general_reason', type: 'TEXTAREA', label: 'Reason for visit', required: true, placeholder: 'Please describe your main concern' },
    { id: 'general_symptoms', type: 'MULTI_SELECT', label: 'Current symptoms', required: false, options: ['Fever', 'Cough', 'Fatigue', 'Headache', 'Nausea', 'Dizziness'] },
    { id: 'general_medications', type: 'TEXTAREA', label: 'Current medications', required: false, placeholder: 'List any medications you are currently taking' },
    { id: 'general_allergies', type: 'TEXT', label: 'Known allergies', required: false },
    { id: 'general_history', type: 'TEXTAREA', label: 'Relevant medical history', required: false },
  ],
};

function matchTemplate(prompt: string): FormQuestion[] {
  const lower = prompt.toLowerCase();
  if (/allerg/i.test(lower)) return TEMPLATE_BANK.allergy;
  if (/schmerz|pain|ache/i.test(lower)) return TEMPLATE_BANK.pain;
  if (/mental|psych|depress|angst|anxiety|mood/i.test(lower)) return TEMPLATE_BANK.mental;
  return TEMPLATE_BANK.general;
}

export async function aiGenerate(input: AiGenerateInput): Promise<CustomFormRecord> {
  const questions = matchTemplate(input.prompt);
  const db = prisma();
  return db.customForm.create({
    data: {
      id: randomUUID(),
      praxisId: input.praxisId,
      createdBy: input.createdBy,
      name: `AI: ${input.prompt.slice(0, 60)}`,
      description: `Auto-generated form from prompt: "${input.prompt}"`,
      aiGenerated: true,
      aiPrompt: input.prompt,
      logic: {},
      questions: questions as any,
      tags: ['ai-generated'],
      ageRange: null,
      usageCount: 0,
      isActive: false,
      version: 1,
    },
  });
}
