/**
 * Test Data Factories
 * Provides factory functions for creating test data
 */
import { faker } from '@faker-js/faker';
import type {
  Patient,
  PatientSession,
  Answer,
  TriageEvent,
  TherapyPlan,
  ClinicalAlert,
  TherapyMeasure,
  PaymentTransaction,
  Tenant
} from '@prisma/client';

// Placeholder types for models not in Prisma schema
type User = any;
type Praxis = any;

// UUID Generator - creates valid UUID v4
export const generateUUID = () => faker.string.uuid();

// Helper to generate a valid UUID from a seed string (for consistent test data)
export const generateUUIDFromSeed = (seed: string): string => {
  // Create a deterministic UUID-like format from a seed
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pad = (n: number, len: number) => n.toString(16).padStart(len, '0');
  return `${pad(hash, 8)}-${pad(hash >> 8, 4)}-4${pad(hash >> 12, 3)}-${pad((hash >> 16) & 0x3f | 0x80, 2)}${pad(hash >> 24, 2)}-${pad(hash, 12)}`;
};

export const Factories = {
  user: (overrides: Partial<User> = {}): User => ({
    id: generateUUID(),
    email: faker.internet.email(),
    passwordHash: faker.string.alphanumeric(60),
    role: 'ARZT',
    praxisId: generateUUID(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides
  }),
  
  patient: (overrides: Partial<Patient> = {}): Patient => ({
    id: generateUUID(),
    tenantId: generateUUID(),
    patientNumber: `P-${faker.number.int({ min: 10000, max: 99999 })}`,
    hashedEmail: faker.string.alphanumeric(64),
    encryptedName: faker.string.alphanumeric(64),
    gender: faker.helpers.arrayElement(['M', 'F', 'D']),
    birthDate: faker.date.past({ years: 50 }),
    securityPattern: null,
    verifiedAt: null,
    verifiedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as any),
  
  session: (overrides: Partial<PatientSession> = {}): PatientSession => ({
    id: generateUUID(),
    tenantId: generateUUID(),
    status: 'ACTIVE',
    patientId: generateUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    ...overrides
  } as any),
  
  answer: (overrides: Partial<Answer> = {}): Answer => ({
    id: generateUUID(),
    sessionId: generateUUID(),
    atomId: '0001',
    value: faker.lorem.word(),
    encryptedValue: null,
    timeSpentMs: 0,
    answeredAt: new Date(),
    ...overrides
  } as any),
  
  triageEvent: (overrides: Partial<TriageEvent> = {}): TriageEvent => ({
    id: generateUUID(),
    sessionId: generateUUID(),
    level: faker.helpers.arrayElement(['CRITICAL', 'WARNING', 'INFO']),
    atomId: 'CRITICAL_ACS',
    triggerValues: '{}',
    message: 'Triage event',
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: new Date(),
    ...overrides
  } as any),
  
  therapyPlan: (overrides: Partial<TherapyPlan> = {}): TherapyPlan => ({
    id: generateUUID(),
    sessionId: generateUUID(),
    patientId: generateUUID(),
    title: faker.lorem.sentence(3),
    diagnosis: faker.lorem.sentence(),
    icdCodes: ['A01'],
    status: 'ACTIVE',
    aiGenerated: false,
    aiModel: null,
    aiConfidence: null,
    aiPromptHash: null,
    pvsExported: false,
    pvsExportedAt: null,
    createdBy: generateUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as any),
  
  therapyMeasure: (overrides: Partial<TherapyMeasure> = {}): TherapyMeasure => ({
    id: generateUUID(),
    planId: generateUUID(),
    type: faker.helpers.arrayElement(['MEDICATION', 'PROCEDURE', 'LIFESTYLE', 'REFERRAL', 'CUSTOM']) as any,
    title: faker.lorem.sentence(3),
    description: faker.lorem.paragraph(),
    status: 'PLANNED' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as any),
  
  clinicalAlert: (overrides: Partial<ClinicalAlert> = {}): ClinicalAlert => ({
    id: generateUUID(),
    patientId: generateUUID(),
    sessionId: generateUUID(),
    planId: null,
    severity: faker.helpers.arrayElement(['CRITICAL', 'WARNING', 'INFO']) as any,
    category: 'CUSTOM' as any,
    title: faker.lorem.sentence(3),
    message: faker.lorem.paragraph(),
    createdAt: new Date(),
    ...overrides
  } as any),
  
  paymentTransaction: (overrides: Partial<PaymentTransaction> = {}): PaymentTransaction => ({
    id: generateUUID(),
    sessionId: generateUUID(),
    patientId: generateUUID(),
    amount: faker.number.int({ min: 1000, max: 10000 }),
    currency: 'EUR',
    type: 'SELBSTZAHLER' as any,
    status: 'COMPLETED' as any,
    nfcCardToken: null,
    refundedAt: null,
    metadata: null,
    createdAt: new Date(),
    completedAt: null,
    ...overrides
  } as any),
  
  praxis: (overrides: Partial<Praxis> = {}): Praxis => ({
    id: generateUUID(),
    name: faker.company.name(),
    subdomain: faker.internet.domainWord(),
    plan: 'BASIS',
    status: 'ACTIVE',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  tenant: (overrides: Partial<Tenant> = {}): Tenant => ({
    id: generateUUID(),
    name: faker.company.name(),
    subdomain: faker.internet.domainWord(),
    plan: 'STARTER' as any,
    status: 'ACTIVE' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as any)
};

// Factory for creating related test data scenarios
export const Scenarios = {
  completeSession: () => {
    const patient = Factories.patient();
    const session = Factories.session({ patientId: patient.id });
    const answers = [
      Factories.answer({ sessionId: session.id, atomId: '0001' }),
      Factories.answer({ sessionId: session.id, atomId: '0002' }),
    ];
    return { patient, session, answers };
  },
  
  criticalTriage: () => {
    const { patient, session, answers } = Scenarios.completeSession();
    const triageEvent = Factories.triageEvent({
      sessionId: session.id,
      level: 'CRITICAL',
    } as any);
    return { patient, session, answers, triageEvent };
  },
  
  therapyWithAlerts: () => {
    const patient = Factories.patient();
    const session = Factories.session({ patientId: patient.id });
    const plan = Factories.therapyPlan({ 
      patientId: patient.id, 
      sessionId: session.id 
    });
    const alert = Factories.clinicalAlert({
      patientId: patient.id,
      sessionId: session.id,
      planId: plan.id,
    } as any);
    return { patient, session, plan, alert };
  }
};
