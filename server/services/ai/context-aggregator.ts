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
            answers: { include: { question: true }, orderBy: { answeredAt: 'asc' } },
            triageResult: true,
        },
    });

    const patient = session.patient;
    const age = patient.birthDate
        ? String(Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / 31557600000))
        : 'unbekannt';


    const answerLines = session.answers.map(a => {
        const qText = a.question?.questionText || a.questionId;
        return `- ${qText}: ${a.value ?? '—'}`;
    });

    const symptomParts = session.answers
        .filter(a => a.value && a.value !== 'nein' && a.value !== 'false')
        .map(a => {
            const qText = a.question?.questionText || a.questionId;
            return `${qText}: ${a.value}`;
        });

    return {
        gender: patient.gender || 'unbekannt',
        age,
        language: session.language || 'de',
        triageLevel: session.triageResult?.level || 'UNKNOWN',
        triageReason: session.triageResult?.reason || '',
        answers: answerLines.join('\n'),
        symptoms: symptomParts.join('; '),
    };
}
