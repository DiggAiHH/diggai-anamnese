import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AIService {
    /**
     * Generiert eine klinische Zusammenfassung und ICD-10 Vorschläge basierend auf den Session-Antworten.
     * In einer echten Umgebung würde hier ein OpenAI/Kimi/DeepSeek Call stattfinden.
     */
    static async generateClinicalSummary(sessionId: string) {
        const session = await prisma.patientSession.findUnique({
            where: { id: sessionId },
            include: {
                answers: true
            }
        });

        if (!session) throw new Error('Session not found');

        // Fetch all atoms to get the question texts
        const atoms = await prisma.medicalAtom.findMany();
        const atomMap = new Map(atoms.map(a => [a.id, a]));

        // Extrahiere relevante Antworten für die KI
        const clinicalData = session.answers.map(a => {
            const atom = atomMap.get(a.atomId);
            return {
                question: atom?.questionText || 'Unbekannte Frage',
                answer: JSON.parse(a.value),
                section: atom?.section || 'basis'
            };
        });

        // SIMULATION EINES LLM CALLS (PROMPT ENGINEERING)
        // In Produktion:
        // const response = await openai.chat.completions.create({
        //   model: 'gpt-4o',
        //   messages: [{ role: 'system', content: 'Du bist ein erfahrener Arzt. Fasse die Anamnese zusammen und schlage ICD-10 Codes vor.' }, ...]
        // });

        const summary = `Der Patient (m/w/d) stellte sich mit Beschwerden im Bereich ${clinicalData.find(d => d.question.includes('Wo'))?.answer || 'unspezifisch'
            } vor. Die Symptomatik besteht seit ${clinicalData.find(d => d.question.includes('lange'))?.answer || 'unbekannt'
            }. Es liegen Vorerkrankungen wie ${clinicalData.find(d => d.section === 'vorerkrankungen')?.answer || 'keine angegeben'
            } vor.`;

        // Beispielhafte ICD-10 Codes basierend auf Keywords
        const icdCodes = [];
        const fullText = JSON.stringify(clinicalData).toLowerCase();

        if (fullText.includes('brustschmerz')) icdCodes.push({ code: 'R07.4', label: 'Brustschmerz, nicht näher bezeichnet' });
        if (fullText.includes('rücken')) icdCodes.push({ code: 'M54.5', label: 'Kreuzschmerz' });
        if (fullText.includes('husten')) icdCodes.push({ code: 'R05', label: 'Husten' });
        if (fullText.includes('diabetes')) icdCodes.push({ code: 'E11.9', label: 'Diabetes mellitus, Typ 2' });

        return {
            summary,
            icdCodes,
            generatedAt: new Date()
        };
    }
}
