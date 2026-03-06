/**
 * Rule-based lite engine — no LLM required.
 * Provides fast, deterministic suggestions via keyword matching and rules.
 */

const ICD_KEYWORD_MAP: Array<{ keywords: string[]; code: string; display: string }> = [
    { keywords: ['brustschmerz', 'thoraxschmerz', 'brust', 'stechen brust'], code: 'R07.4', display: 'Brustschmerz, nicht näher bezeichnet' },
    { keywords: ['rückenschmerz', 'rücken', 'lws', 'kreuzschmerz', 'lumbalgie'], code: 'M54.5', display: 'Kreuzschmerz' },
    { keywords: ['kopfschmerz', 'migräne', 'cephalgie'], code: 'R51', display: 'Kopfschmerz' },
    { keywords: ['husten', 'reizhusten', 'produktiver husten'], code: 'R05', display: 'Husten' },
    { keywords: ['fieber', 'temperatur', 'pyrexie'], code: 'R50.9', display: 'Fieber, nicht näher bezeichnet' },
    { keywords: ['diabetes', 'blutzucker', 'hba1c', 'zucker'], code: 'E11.9', display: 'Diabetes mellitus Typ 2' },
    { keywords: ['hypertonie', 'bluthochdruck', 'blutdruck hoch'], code: 'I10', display: 'Essentielle Hypertonie' },
    { keywords: ['depression', 'niedergeschlagen', 'antriebslos', 'traurig'], code: 'F32.9', display: 'Depressive Episode' },
    { keywords: ['angst', 'panik', 'angststörung', 'panikattacke'], code: 'F41.9', display: 'Angststörung' },
    { keywords: ['übelkeit', 'erbrechen', 'nausea'], code: 'R11', display: 'Übelkeit und Erbrechen' },
    { keywords: ['durchfall', 'diarrhö', 'diarrhoe'], code: 'K59.1', display: 'Funktionelle Diarrhoe' },
    { keywords: ['verstopfung', 'obstipation', 'konstipation'], code: 'K59.0', display: 'Obstipation' },
    { keywords: ['schwindel', 'vertigo', 'benommenheit'], code: 'R42', display: 'Schwindel und Taumel' },
    { keywords: ['atemnot', 'dyspnoe', 'kurzatmig', 'luftnot'], code: 'R06.0', display: 'Dyspnoe' },
    { keywords: ['halsschmerz', 'halsweh', 'schluckbeschwerden'], code: 'J02.9', display: 'Akute Pharyngitis' },
    { keywords: ['gelenkschmerz', 'arthralgie', 'gelenk'], code: 'M25.5', display: 'Gelenkschmerz' },
    { keywords: ['schlafstörung', 'insomnie', 'schlaflos'], code: 'G47.0', display: 'Ein- und Durchschlafstörungen' },
    { keywords: ['allergie', 'allergisch', 'heuschnupfen'], code: 'T78.4', display: 'Allergie, nicht näher bezeichnet' },
    { keywords: ['hautausschlag', 'exanthem', 'ausschlag', 'dermatitis'], code: 'L30.9', display: 'Dermatitis, nicht näher bezeichnet' },
    { keywords: ['ohrenschmerz', 'otitis', 'ohr'], code: 'H92.0', display: 'Otalgie' },
];

export interface IcdSuggestion {
    code: string;
    display: string;
    confidence: number;
}

export function suggestIcdCodes(text: string): IcdSuggestion[] {
    const lower = text.toLowerCase();
    const results: IcdSuggestion[] = [];

    for (const entry of ICD_KEYWORD_MAP) {
        const matchCount = entry.keywords.filter(kw => lower.includes(kw)).length;
        if (matchCount > 0) {
            const confidence = Math.min(0.9, 0.5 + matchCount * 0.15);
            results.push({ code: entry.code, display: entry.display, confidence });
        }
    }

    return results.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

export function generateRuleSummary(answers: Array<{ question: string; value: string }>): string {
    const complaints = answers
        .filter(a => a.value && a.value !== 'nein' && a.value !== 'false' && a.value !== 'keine')
        .map(a => `${a.question}: ${a.value}`);

    if (complaints.length === 0) return 'Keine relevanten Befunde dokumentiert.';

    return `Klinische Zusammenfassung (regelbasiert):\n\nDokumentierte Befunde:\n${complaints.map(c => `• ${c}`).join('\n')}`;
}

const TEMPLATE_RULES: Array<{
    keywords: string[];
    templateCategory: string;
    reason: string;
}> = [
    { keywords: ['rücken', 'lws', 'kreuzschmerz'], templateCategory: 'muskuloskelettal', reason: 'Rückenbeschwerden' },
    { keywords: ['diabetes', 'blutzucker'], templateCategory: 'stoffwechsel', reason: 'Stoffwechselerkrankung' },
    { keywords: ['hypertonie', 'blutdruck'], templateCategory: 'kardiovaskulaer', reason: 'Bluthochdruck' },
    { keywords: ['depression', 'angst', 'panik'], templateCategory: 'psychisch', reason: 'Psychische Beschwerden' },
    { keywords: ['fieber', 'husten', 'erkältung', 'infekt'], templateCategory: 'infektioes', reason: 'Infektzeichen' },
];

export function suggestTemplateCategories(text: string): Array<{ category: string; reason: string; confidence: number }> {
    const lower = text.toLowerCase();
    const results: Array<{ category: string; reason: string; confidence: number }> = [];

    for (const rule of TEMPLATE_RULES) {
        const matches = rule.keywords.filter(kw => lower.includes(kw)).length;
        if (matches > 0) {
            results.push({
                category: rule.templateCategory,
                reason: rule.reason,
                confidence: Math.min(0.85, 0.4 + matches * 0.2),
            });
        }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
}
