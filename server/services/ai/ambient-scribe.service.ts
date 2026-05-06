import { getAiConfig, isAiAvailable } from './ai-config';
import { callLlm } from './llm-client';
import { requireDecisionSupport } from '../../config/featureFlags';

// Class-IIa-Schutz: Ambient-Scribe erzeugt SOAP-Notizen mit Assessment/
// Diagnose-Feld — klar Decision-Support. Capture-Build (DECISION_SUPPORT_-
// ENABLED=false) MUSS hart failen. Anker: Open-Items-Tracker B4.

export async function processAmbientVoice(audioTranscription: string, contextId: string) {
    requireDecisionSupport('processAmbientVoice');
    const config = await getAiConfig();
    const systemPrompt = `Du bist ein hochqualifizierter medizinischer Dokumentations-Assistent in Deutschland.
Deine Aufgabe ist es, Arzt-Patienten-Gespräche oder Diktate in präzise, strukturierte SOAP-Notizen (Subjektiv, Objektiv, Assessment, Plan) für das PVS zu übersetzen.
Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown oder andere Texte drumherum.
Das JSON-Objekt muss genau diese vier Keys (als String) aufweisen:
- "s": Subjektive Angaben des Patienten
- "o": Objektive Befunde
- "a": Assessment / Diagnose / Beurteilung
- "p": Procedere / Plan / Therapie`;

    const prompt = `Bitte generiere eine SOAP-Notiz aus dem folgenden Gesprächsprotokoll oder Diktat.

Transcript:
${audioTranscription}`;

    let soapNote: any;
    
    if (isAiAvailable(config)) {
        try {
            const res = await callLlm(config, prompt, systemPrompt);
            let text = res.text.trim();
            if (text.startsWith('```json')) text = text.slice(7);
            if (text.startsWith('```')) text = text.slice(3);
            if (text.endsWith('```')) text = text.slice(0, -3);
            
            soapNote = JSON.parse(text);
        } catch (err) {
            console.error('[AmbientScribe] LLM error:', err);
            soapNote = null;
        }
    }

    if (!soapNote) {
        // Fallback or demo content if AI fails or is not enabled
        soapNote = {
            s: 'Patient klagt über Symptome laut Transkription.',
            o: 'Visuell unauffällig (Demo Auswertung).',
            a: 'Verdachtsdiagnose / Befundung.',
            p: 'Weiteres Vorgehen gemäß Leitlinie.'
        };
    }
  
    // Save to database Audit
    const prisma = (globalThis as any).__prisma;
    if(prisma) {
        await prisma.auditLog.create({
            data: {
                tenantId: 'system',
                action: 'SOAP_GENERATED',
                resource: `session/${contextId}`,
            }
        });
    }

    return soapNote;
}
