/**
 * Input-Sanitization Service — K-05 & K-06 Fix
 * 
 * Schützt gegen:
 * - Stored XSS (HTML/Script-Injection in DB-Feldern)
 * - HTML Injection in Chat-Nachrichten, Antworten, BG-Daten
 * - CSV Injection (bereits in export.ts implementiert)
 * 
 * Nutzt sanitize-html um alle HTML-Tags und Attribute zu entfernen.
 * Für medizinische Daten erlauben wir KEIN HTML — nur Plaintext.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Entfernt ALLE HTML-Tags und Attribute aus einem String.
 * Für medizinische/PII-Daten — kein HTML erlaubt.
 */
export function sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    return sanitizeHtml(input, {
        allowedTags: [],        // Keine HTML-Tags erlaubt
        allowedAttributes: {},  // Keine Attribute erlaubt
        disallowedTagsMode: 'recursiveEscape', // Entfernt Tags komplett
    }).trim();
}

/**
 * Sanitize ein Objekt rekursiv — alle String-Werte werden sanitized.
 * Nützlich für req.body Objekte.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeText(value);
        } else if (Array.isArray(value)) {
            result[key] = value.map(item => {
                if (typeof item === 'string') return sanitizeText(item);
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    return sanitizeObject(item as Record<string, unknown>);
                }
                return item;
            });
        } else if (value && typeof value === 'object') {
            result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}

/**
 * Express Middleware: Sanitize alle String-Werte in req.body
 * Anwenden auf alle Routes die User-Input akzeptieren.
 */
export function sanitizeBody(req: { body: Record<string, unknown> }, _res: unknown, next: () => void): void {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}
