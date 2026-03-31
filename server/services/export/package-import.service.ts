import { prisma } from '../../db';
import { encrypt, hashEmail, isPIIAtom } from '../encryption';
import type { EncryptedPackagePayload, MfaImportResult } from './package.service';

function inferAnswerType(value: unknown): string {
  if (Array.isArray(value)) return 'multiselect';
  switch (typeof value) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'object':
      return 'other';
    default:
      return 'text';
  }
}

export async function importEncryptedPackagePayload(params: {
  tenantId: string;
  checksum: string;
  payload: EncryptedPackagePayload;
  importedByUserId?: string | null;
  sourceFilename?: string | null;
}): Promise<MfaImportResult> {
  const existingLog = await prisma.packageImportLog.findUnique({
    where: {
      tenantId_packageId: {
        tenantId: params.tenantId,
        packageId: params.payload.packageId,
      },
    },
  });

  if (existingLog?.sessionId) {
    return {
      status: 'already_imported',
      packageId: params.payload.packageId,
      sessionId: existingLog.sessionId,
      preview: params.payload,
    };
  }

  const existingSession = await prisma.patientSession.findUnique({
    where: { id: params.payload.sessionId },
  });

  if (existingSession) {
    await prisma.packageImportLog.create({
      data: {
        tenantId: params.tenantId,
        sessionId: existingSession.id,
        packageId: params.payload.packageId,
        checksum: params.checksum,
        importedByUserId: params.importedByUserId || null,
        importStatus: 'ALREADY_PRESENT',
        sourceFilename: params.sourceFilename || null,
        metadata: JSON.stringify({ reason: 'session-already-exists' }),
      },
    });

    return {
      status: 'already_imported',
      packageId: params.payload.packageId,
      sessionId: existingSession.id,
      preview: params.payload,
    };
  }

  const patientEmailHash = params.payload.patient.email
    ? hashEmail(params.payload.patient.email)
    : `imported-anonymous-${params.payload.packageId}`;

  let patient = await prisma.patient.findFirst({
    where: {
      tenantId: params.tenantId,
      hashedEmail: patientEmailHash,
    },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        tenantId: params.tenantId,
        hashedEmail: patientEmailHash,
        encryptedName: params.payload.patient.name ? encrypt(params.payload.patient.name) : null,
        birthDate: params.payload.patient.birthDate ? new Date(params.payload.patient.birthDate) : null,
        gender: params.payload.patient.gender || null,
      },
    });
  }

  const session = await prisma.patientSession.create({
    data: {
      id: params.payload.sessionId,
      tenantId: params.tenantId,
      patientId: patient.id,
      isNewPatient: true,
      gender: params.payload.patient.gender || null,
      birthDate: params.payload.patient.birthDate ? new Date(params.payload.patient.birthDate) : null,
      encryptedName: params.payload.patient.name ? encrypt(params.payload.patient.name) : null,
      status: params.payload.status,
      selectedService: params.payload.service,
      insuranceType: params.payload.patient.insuranceType || null,
      createdAt: new Date(params.payload.createdAt),
      completedAt: params.payload.completedAt ? new Date(params.payload.completedAt) : null,
    },
  });

  if (params.payload.answers.length > 0) {
    await prisma.answer.createMany({
      data: params.payload.answers.map((answer) => {
        const pii = isPIIAtom(answer.atomId) && typeof answer.value === 'string';
        const encryptedValue = pii && typeof answer.value === 'string'
          ? encrypt(answer.value)
          : null;
        return {
          sessionId: session.id,
          atomId: answer.atomId,
          value: JSON.stringify({
            type: inferAnswerType(answer.value),
            data: pii ? '[encrypted]' : answer.value,
            redacted: pii,
          }),
          encryptedValue,
          answeredAt: new Date(answer.answeredAt),
        };
      }),
    });
  }

  if (params.payload.triageEvents.length > 0) {
    await prisma.triageEvent.createMany({
      data: params.payload.triageEvents.map((event) => ({
        sessionId: session.id,
        level: event.level,
        atomId: event.atomId,
        triggerValues: JSON.stringify({ imported: true }),
        message: event.message,
        createdAt: new Date(event.createdAt),
      })),
    });
  }

  await prisma.packageImportLog.create({
    data: {
      tenantId: params.tenantId,
      sessionId: session.id,
      packageId: params.payload.packageId,
      checksum: params.checksum,
      importedByUserId: params.importedByUserId || null,
      importStatus: 'COMPLETED',
      sourceFilename: params.sourceFilename || null,
      metadata: JSON.stringify({ importedAnswerCount: params.payload.answers.length }),
    },
  });

  return {
    status: 'imported',
    packageId: params.payload.packageId,
    sessionId: session.id,
    preview: params.payload,
  };
}
