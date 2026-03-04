// ═══════════════════════════════════════════════════════════════
// Modul 7: TreatmentFlow Engine
// ═══════════════════════════════════════════════════════════════

import { FlowAdvancePayload, FlowDelayPayload, FlowCallPayload } from './types';

export async function listFlows(praxisId?: string, activeOnly = true) {
  const prisma = (globalThis as any).__prisma;
  const where: any = {};
  if (praxisId) where.praxisId = praxisId;
  if (activeOnly) where.isActive = true;
  return prisma.treatmentFlow.findMany({
    where,
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getFlow(id: string) {
  const prisma = (globalThis as any).__prisma;
  return prisma.treatmentFlow.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function createFlow(data: {
  praxisId: string;
  name: string;
  description?: string;
  serviceType?: string;
  steps: Array<{
    order: number;
    type: string;
    roomType?: string;
    specificRoomId?: string;
    estimatedMinutes?: number;
    bufferMinutes?: number;
    requiredStaff?: string[];
    instructions: any;
    preparationVideo?: string;
    nfcCheckpointId?: string;
    condition?: string;
    isSkippable?: boolean;
  }>;
}) {
  const prisma = (globalThis as any).__prisma;
  return prisma.treatmentFlow.create({
    data: {
      praxisId: data.praxisId,
      name: data.name,
      description: data.description,
      serviceType: data.serviceType,
      steps: {
        create: data.steps.map(s => ({
          order: s.order,
          type: s.type,
          roomType: s.roomType,
          specificRoomId: s.specificRoomId,
          estimatedMinutes: s.estimatedMinutes ?? 15,
          bufferMinutes: s.bufferMinutes ?? 5,
          requiredStaff: s.requiredStaff ?? [],
          instructions: s.instructions,
          preparationVideo: s.preparationVideo,
          nfcCheckpointId: s.nfcCheckpointId,
          condition: s.condition,
          isSkippable: s.isSkippable !== false,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function updateFlow(id: string, data: { name?: string; description?: string; serviceType?: string; isActive?: boolean }) {
  const prisma = (globalThis as any).__prisma;
  return prisma.treatmentFlow.update({ where: { id }, data });
}

export async function getProgress(sessionId: string) {
  const prisma = (globalThis as any).__prisma;
  return prisma.patientFlowProgress.findUnique({
    where: { sessionId },
    include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });
}

export async function startFlow(sessionId: string, flowId: string) {
  const prisma = (globalThis as any).__prisma;
  const flow = await prisma.treatmentFlow.findUnique({
    where: { id: flowId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!flow) throw new Error('Flow not found');

  return prisma.patientFlowProgress.create({
    data: {
      sessionId,
      flowId,
      currentStep: 0,
      status: 'ACTIVE',
      stepHistory: [{ step: 0, enteredAt: new Date().toISOString(), triggeredBy: 'SYSTEM' }],
      estimatedCompletion: new Date(Date.now() + flow.steps.reduce((sum: number, s: any) => sum + (s.estimatedMinutes + s.bufferMinutes) * 60000, 0)),
    },
    include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });
}

export async function advanceFlow(payload: FlowAdvancePayload) {
  const prisma = (globalThis as any).__prisma;
  const progress = await prisma.patientFlowProgress.findUnique({
    where: { sessionId: payload.sessionId },
    include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });

  if (!progress) throw new Error('No active flow for session');
  if (progress.status !== 'ACTIVE') throw new Error('Flow is not active');

  const totalSteps = progress.flow.steps.length;
  const nextStep = payload.toStep;

  const isCompleted = nextStep >= totalSteps;
  const newHistory = [
    ...progress.stepHistory,
    {
      step: nextStep,
      enteredAt: new Date().toISOString(),
      triggeredBy: payload.triggeredBy,
      reason: payload.reason,
    },
  ];

  return prisma.patientFlowProgress.update({
    where: { sessionId: payload.sessionId },
    data: {
      currentStep: isCompleted ? totalSteps - 1 : nextStep,
      status: isCompleted ? 'COMPLETED' : 'ACTIVE',
      stepHistory: newHistory,
      ...(isCompleted && { actualCompletion: new Date() }),
    },
    include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });
}

export async function delayFlow(payload: FlowDelayPayload) {
  const prisma = (globalThis as any).__prisma;
  const progress = await prisma.patientFlowProgress.findUnique({
    where: { sessionId: payload.sessionId },
  });
  if (!progress) throw new Error('No active flow for session');

  return prisma.patientFlowProgress.update({
    where: { sessionId: payload.sessionId },
    data: {
      delayMinutes: progress.delayMinutes + payload.delayMinutes,
      delayReason: payload.reason,
      estimatedCompletion: progress.estimatedCompletion
        ? new Date(new Date(progress.estimatedCompletion).getTime() + payload.delayMinutes * 60000)
        : null,
    },
  });
}
