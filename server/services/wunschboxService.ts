const db = (globalThis as any).__prisma as any;

/**
 * Wunschbox KI-Service
 * Phase 1 (MVP): Regelbasiertes Parsing mit Keyword-Matching
 * Phase 2 (mit API-Key): OpenAI/Anthropic API-Call
 */

interface ParsedChange {
    area: 'frontend' | 'backend' | 'database' | 'config' | 'design';
    component: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedEffort: 'XS' | 'S' | 'M' | 'L' | 'XL';
    technicalNotes: string;
    dependencies: string[];
}

// Keyword-based area detection (Phase 1 MVP)
const AREA_KEYWORDS: Record<string, string[]> = {
    frontend: ['ui', 'button', 'anzeige', 'formular', 'seite', 'design', 'farbe', 'layout', 'dark', 'theme', 'responsive', 'mobile'],
    backend: ['api', 'server', 'route', 'endpunkt', 'performance', 'schneller', 'laden', 'export', 'import', 'email', 'sms', 'benachrichtigung'],
    database: ['daten', 'speichern', 'löschen', 'archiv', 'backup', 'migration', 'tabelle'],
    config: ['einstellung', 'konfiguration', 'parameter', 'option', 'toggle', 'feature', 'aktivieren'],
    design: ['logo', 'bild', 'icon', 'animation', 'farbe', 'schrift', 'font', 'ux'],
};

const COMPONENT_KEYWORDS: Record<string, string> = {
    'warteschlange': 'Queue-System',
    'queue': 'Queue-System',
    'wartezeit': 'Wartezimmer-Engagement',
    'fragebogen': 'Fragebogen-Builder',
    'frage': 'Fragebogen-System',
    'patient': 'Patient-Flow',
    'arzt': 'Arzt-Dashboard',
    'mfa': 'MFA-Bereich',
    'admin': 'Admin-Dashboard',
    'export': 'Export-System',
    'chat': 'Chat-System',
    'triage': 'Triage-Engine',
    'rechnung': 'Payment-System',
    'termin': 'Terminverwaltung',
    'rezept': 'Rezept-Verwaltung',
    'labor': 'Labor-Integration',
    'dokument': 'Dokumenten-Management',
    'statistik': 'Analytics-Dashboard',
    'bericht': 'Reporting-System',
};

function detectArea(text: string): ParsedChange['area'] {
    const lower = text.toLowerCase();
    let bestArea: ParsedChange['area'] = 'frontend';
    let bestScore = 0;

    for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
        const score = keywords.filter(kw => lower.includes(kw)).length;
        if (score > bestScore) {
            bestScore = score;
            bestArea = area as ParsedChange['area'];
        }
    }
    return bestArea;
}

function detectComponent(text: string): string {
    const lower = text.toLowerCase();
    for (const [keyword, component] of Object.entries(COMPONENT_KEYWORDS)) {
        if (lower.includes(keyword)) return component;
    }
    return 'Allgemein';
}

function estimateEffort(text: string): ParsedChange['estimatedEffort'] {
    const lower = text.toLowerCase();
    const complexityMarkers = ['komplex', 'mehrere', 'integration', 'automatisch', 'ki', 'ai', 'api', 'schnittstelle'];
    const simpleMarkers = ['button', 'text', 'farbe', 'label', 'beschriftung', 'icon'];

    const complexCount = complexityMarkers.filter(m => lower.includes(m)).length;
    const simpleCount = simpleMarkers.filter(m => lower.includes(m)).length;

    if (complexCount >= 3) return 'XL';
    if (complexCount >= 2) return 'L';
    if (complexCount >= 1) return 'M';
    if (simpleCount >= 2) return 'XS';
    return 'S';
}

function estimatePriority(text: string): ParsedChange['priority'] {
    const lower = text.toLowerCase();
    const highMarkers = ['dringend', 'wichtig', 'kritisch', 'sofort', 'bug', 'fehler', 'crash', 'kaputt', 'geht nicht'];
    const lowMarkers = ['wäre schön', 'optional', 'irgendwann', 'nice to have', 'vielleicht'];

    if (highMarkers.some(m => lower.includes(m))) return 'high';
    if (lowMarkers.some(m => lower.includes(m))) return 'low';
    return 'medium';
}

/**
 * Phase 1 MVP: Regelbasiertes Parsing
 */
export function parseWishRuleBased(text: string): ParsedChange[] {
    // Split into sentences for multi-wish detection
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);

    if (sentences.length <= 1) {
        // Single wish
        return [{
            area: detectArea(text),
            component: detectComponent(text),
            description: text.trim(),
            priority: estimatePriority(text),
            estimatedEffort: estimateEffort(text),
            technicalNotes: 'Automatisch geparst (Regelbasiert). Manuelle Überprüfung empfohlen.',
            dependencies: [],
        }];
    }

    // Multiple sentences → multiple changes
    return sentences.map(sentence => ({
        area: detectArea(sentence),
        component: detectComponent(sentence),
        description: sentence.trim(),
        priority: estimatePriority(sentence),
        estimatedEffort: estimateEffort(sentence),
        technicalNotes: 'Automatisch aus Freitext extrahiert.',
        dependencies: [],
    }));
}

/**
 * Process a WunschboxEntry: parse and store AI results
 */
export async function processWunschboxEntry(entryId: string): Promise<ParsedChange[]> {
    const entry = await db.wunschboxEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new Error('Wunschbox-Eintrag nicht gefunden');

    // Phase 1: Rule-based parsing
    const parsed = parseWishRuleBased(entry.originalText);

    await db.wunschboxEntry.update({
        where: { id: entryId },
        data: {
            aiParsedChanges: JSON.stringify(parsed),
            status: 'AI_PROCESSED',
        },
    });

    return parsed;
}

/**
 * Generate export spec from a reviewed Wunschbox entry
 */
export async function generateExportSpec(entryId: string): Promise<string> {
    const entry = await db.wunschboxEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new Error('Wunschbox-Eintrag nicht gefunden');

    const changes: ParsedChange[] = entry.aiParsedChanges ? JSON.parse(entry.aiParsedChanges) : [];

    const totalHours = changes.reduce((sum, c) => {
        const effortMap: Record<string, number> = { XS: 1, S: 3, M: 6, L: 16, XL: 40 };
        return sum + (effortMap[c.estimatedEffort] || 4);
    }, 0);

    const spec = {
        id: entry.id,
        originalRequest: entry.originalText,
        createdAt: entry.createdAt.toISOString(),
        status: entry.status,
        adminNotes: entry.adminNotes,
        changes,
        totalEstimatedHours: totalHours,
        generatedAt: new Date().toISOString(),
    };

    const specJson = JSON.stringify(spec, null, 2);

    await db.wunschboxEntry.update({
        where: { id: entryId },
        data: { exportedSpec: specJson },
    });

    return specJson;
}
