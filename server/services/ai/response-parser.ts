/**
 * Parse and validate LLM JSON responses.
 * LLMs sometimes wrap JSON in markdown code fences or add trailing text.
 */

export function parseLlmJson<T = any>(raw: string): T {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Find the outermost JSON object or array
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;

    if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
        start = firstBrace;
    } else if (firstBracket >= 0) {
        start = firstBracket;
    }

    if (start < 0) throw new Error('No JSON found in LLM response');

    const isArray = cleaned[start] === '[';
    const closeChar = isArray ? ']' : '}';
    let depth = 0;
    let end = -1;

    for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === (isArray ? '[' : '{')) depth++;
        else if (ch === closeChar) {
            depth--;
            if (depth === 0) { end = i; break; }
        }
    }

    if (end < 0) throw new Error('Incomplete JSON in LLM response');

    return JSON.parse(cleaned.slice(start, end + 1));
}

export interface TherapySuggestion {
    diagnosis: string;
    icdCodes: string[];
    confidence: number;
    summary?: string;
    measures: Array<{
        type: string;
        title: string;
        description?: string;
        priority?: string;
        medicationName?: string;
        dosage?: string;
        duration?: string;
        confidence?: number;
        reasoning?: string;
    }>;
    warnings?: string[];
}

export interface SessionSummary {
    chiefComplaint: string;
    historyOfPresentIllness: string;
    relevantHistory?: string[];
    medications?: string[];
    allergies?: string[];
    assessment?: string;
    suggestedIcdCodes?: string[];
    redFlags?: string[];
}

export interface IcdSuggestionResult {
    suggestions: Array<{
        code: string;
        display: string;
        confidence: number;
        reasoning?: string;
    }>;
}

export function validateTherapySuggestion(data: any): TherapySuggestion {
    if (!data.diagnosis || !Array.isArray(data.measures)) {
        throw new Error('Invalid therapy suggestion: missing diagnosis or measures');
    }
    return {
        diagnosis: String(data.diagnosis),
        icdCodes: Array.isArray(data.icdCodes) ? data.icdCodes.map(String) : [],
        confidence: typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0.5,
        summary: data.summary,
        measures: data.measures.map((m: any) => ({
            type: m.type || 'CUSTOM',
            title: m.title || 'Unbenannte Maßnahme',
            description: m.description,
            priority: m.priority || 'NORMAL',
            medicationName: m.medicationName,
            dosage: m.dosage,
            duration: m.duration,
            confidence: typeof m.confidence === 'number' ? m.confidence : undefined,
            reasoning: m.reasoning,
        })),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
    };
}
