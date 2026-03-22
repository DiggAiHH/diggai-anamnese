import { prisma } from '../../db';

export interface SessionContext {
    gender: string;
    age: string;
    language: string;
    triageLevel: string;
    triageReason: string;
    answers: string;
    symptoms: string;
}

export async function aggregateSessionContext(sessionId: string): Promise<SessionContext> {
    const session = await prisma.patientSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
            patient: true,
            answers: { orderBy: { answeredAt: 'asc' } },
            triageEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });

    const patient = session.patient;
    const age = patient?.birthDate
        ? String(Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / 31557600000))
        : 'unbekannt';


    const answerLines = session.answers.map((a: { atomId: string; value: string | null }) => {
        return `- ${a.atomId}: ${a.value ?? '—'}`;
    });

    const symptomParts = session.answers
        .filter((a: { value: string | null }) => a.value && a.value !== 'nein' && a.value !== 'false')
        .map((a: { atomId: string; value: string | null }) => {
            return `${a.atomId}: ${a.value}`;
        });

    const latestTriage = session.triageEvents[0];

    return {
        gender: patient?.gender || 'unbekannt',
        age,
        language: 'de',
        triageLevel: latestTriage?.level || 'UNKNOWN',
        triageReason: latestTriage?.message || '',
        answers: answerLines.join('\n'),
        symptoms: symptomParts.join('; '),
    };
}
