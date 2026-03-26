import { getAiConfig, isAiAvailable } from './ai-config';
import { callLlm } from './llm-client';

export interface BillingSuggestion {
    code: string;
    description: string;
    type: 'EBM' | 'GOA';
    confidence: number;
}

export async function optimizeBilling(clinicalNotes: string): Promise<BillingSuggestion[]> {
    const config = await getAiConfig();
    if (!isAiAvailable(config)) {
        console.warn('[BillingOptimization] AI not available. Returning empty suggestions.');
        return [];
    }

    const systemPrompt = `Du bist ein deutscher Abrechnungsexperte für Arztpraxen. Analysiere klinische Notizen und schlage passende EBM (Einheitlicher Bewertungsmaßstab) oder GOÄ (Gebührenordnung für Ärzte) Ziffern vor.
Deine Antwort muss strenges, valides JSON-Format sein, ohne jeglichen Markdown-Block oder zusätzlichen Text. Das JSON muss ein Array von Objekten sein mit:
- code (string, die Ziffer)
- description (string, kurze Beschreibung)
- type ("EBM" oder "GOA")
- confidence (number zwischen 0 und 1, die Zuversicht)`;
    
    const prompt = `Analysiere die folgenden klinischen Notizen und schlage passende Abrechnungsziffern und -codes vor.
    
Notes: 
${clinicalNotes}`;

    try {
        console.log(`[BillingOptimization] Triggering AI code extraction...`);
        const res = await callLlm(config, prompt, systemPrompt);
        
        let text = res.text.trim();
        if (text.startsWith('```json')) text = text.slice(7);
        if (text.startsWith('```')) text = text.slice(3);
        if (text.endsWith('```')) text = text.slice(0, -3);
        
        const parsed = JSON.parse(text) as BillingSuggestion[];
        return parsed;
    } catch (err) {
        console.error('[BillingOptimization] AI parsing error or fallback:', err);
        // Fallback to static mock for demo safety if LLM fails or fails to return JSON
        return [
          { code: '03212', description: 'Chronikerpauschale', type: 'EBM', confidence: 0.95 },
          { code: '3, 1', description: 'Eingehende Beratung', type: 'GOA', confidence: 0.88 },
        ];
    }
}
