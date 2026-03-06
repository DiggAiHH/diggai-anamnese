/**
 * Anonymisierungs-Service
 *
 * DSGVO-Kernkomponente: Erkennt und maskiert PHI (Personal Health Information)
 * bevor Daten den lokalen Server verlassen oder an Agenten übergeben werden.
 *
 * Pipeline:
 *   1. Regex-basierter Schnellscan (ohne LLM — für Performance)
 *   2. Ollama-basierte KI-Erkennung (für komplexe Fälle)
 *   3. Tokenisierung: Echte Werte werden durch reversible Tokens ersetzt
 *      (Schlüssel bleibt LOKAL — verlässt den Server nie!)
 *
 * WICHTIG: Kein anonymisierter Output wird als 100% sicher betrachtet.
 * Human-Review für kritische Daten bleibt Pflicht.
 */

import * as crypto from 'crypto';
import { callLlm } from './ai/llm-client';
import type { AiConfig } from './ai/ai-config';

const OLLAMA_URL     = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL   = process.env.OLLAMA_ANONYMIZE_MODEL ?? 'llama3';

// In-Memory Token-Store (in Produktion: Redis mit TTL)
// Schlüssel verlässt den Server nie!
const tokenStore = new Map<string, string>(); // token → originalValue

/** Erkannte PII-Kategorien */
export type PiiCategory =
    | 'name'
    | 'email'
    | 'phone'
    | 'address'
    | 'dob'        // Geburtsdatum
    | 'insurance'  // Versicherungsnummer / KVNR
    | 'diagnosis'  // Medizinische Diagnose (extra vorsichtig)
    | 'other';

export interface PiiMatch {
    original:  string;
    token:     string;
    category:  PiiCategory;
    start:     number;
    end:       number;
}

export interface AnonymizationResult {
    anonymized: string;
    tokens:     PiiMatch[];
    piiFound:   boolean;
}

// ─── Regex-Patterns (Schnellscan) ────────────────────────────

const REGEX_PATTERNS: { pattern: RegExp; category: PiiCategory }[] = [
    // E-Mail
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, category: 'email' },
    // Deutsche Telefonnummern
    { pattern: /(\+49|0)[1-9][0-9\s\-\/]{6,14}[0-9]/g, category: 'phone' },
    // KVNR (10 alphanumerische Zeichen, beginnt mit Buchstabe)
    { pattern: /\b[A-Z][0-9]{9}\b/g, category: 'insurance' },
    // Geburtsdatum (DD.MM.YYYY oder YYYY-MM-DD)
    { pattern: /\b(0?[1-9]|[12][0-9]|3[01])\.(0?[1-9]|1[0-2])\.(19|20)\d{2}\b/g, category: 'dob' },
    { pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\b/g, category: 'dob' },
    // Deutsche PLZ + Ort (grob)
    { pattern: /\b[0-9]{5}\s+[A-ZÄÖÜ][a-zäöü]+(?:\s[A-ZÄÖÜ]?[a-zäöü]+)*\b/g, category: 'address' },
];

class AnonymizationService {
    /**
     * Anonymisiert einen Text mit Regex + optionalem Ollama-Scan.
     *
     * @param text        - Zu anonymisierender Text
     * @param useOllama   - Ob Ollama für erweiterte PII-Erkennung genutzt wird
     */
    async anonymize(text: string, useOllama = false): Promise<AnonymizationResult> {
        if (!text || text.trim().length === 0) {
            return { anonymized: text, tokens: [], piiFound: false };
        }

        let result = text;
        const matches: PiiMatch[] = [];

        // Schritt 1: Regex-Scan
        for (const { pattern, category } of REGEX_PATTERNS) {
            pattern.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = pattern.exec(result)) !== null) {
                const original = m[0];
                const token    = this._createToken(original, category);
                matches.push({ original, token, category, start: m.index, end: m.index + original.length });
            }
        }

        // Ersetze Matches (von hinten nach vorne um Indizes zu erhalten)
        matches.sort((a, b) => b.start - a.start);
        for (const match of matches) {
            result = result.slice(0, match.start) + `[${match.token}]` + result.slice(match.end);
        }

        // Schritt 2: Ollama-Scan (optional, für unerkannte PII)
        if (useOllama && result.length > 0) {
            try {
                result = await this._ollamaAnonymize(result);
            } catch (err) {
                console.warn('[Anonymization] Ollama-Scan fehlgeschlagen (Regex-only):', err);
            }
        }

        return {
            anonymized: result,
            tokens:     matches,
            piiFound:   matches.length > 0,
        };
    }

    /**
     * Stellt das Original aus einem Token wieder her (nur lokal!).
     */
    deanonymize(anonymizedText: string): string {
        return anonymizedText.replace(/\[ANON_[A-Z]+_[0-9A-F]{8}\]/g, (token) => {
            const key = token.slice(1, -1); // eckige Klammern entfernen
            return tokenStore.get(key) ?? token;
        });
    }

    /**
     * Prüft ob ein Text PHI enthält (schneller Check ohne Anonymisierung).
     */
    containsPii(text: string): boolean {
        for (const { pattern } of REGEX_PATTERNS) {
            pattern.lastIndex = 0;
            if (pattern.test(text)) return true;
        }
        return false;
    }

    /**
     * Bereinigt veraltete Tokens aus dem Store.
     * In Produktion: Redis-TTL statt manueller Cleanup.
     */
    clearTokenStore(): void {
        tokenStore.clear();
    }

    // ─── Private ─────────────────────────────────────────────

    private _createToken(original: string, category: PiiCategory): string {
        // Deterministischer Token: gleicher Input → gleicher Token (für Konsistenz)
        const hash  = crypto.createHash('sha256').update(original).digest('hex').slice(0, 8).toUpperCase();
        const token = `ANON_${category.toUpperCase()}_${hash}`;
        tokenStore.set(token, original);
        return token;
    }

    private async _ollamaAnonymize(text: string): Promise<string> {
        const config: AiConfig = {
            provider:    'ollama',
            endpoint:    OLLAMA_URL,
            model:       OLLAMA_MODEL,
            temperature: 0.0,  // Deterministisch
            maxTokens:   2048,
            timeout:     15_000,
        };

        const systemPrompt = `Du bist ein Datenschutz-System. Deine einzige Aufgabe:
Ersetze alle personenbezogenen Daten (PHI) im folgenden Text mit [ANON_OTHER_XXXXXXXX].

PHI sind: Namen von Personen, genaue Adressen, direkte Identifikatoren die nicht bereits maskiert sind.
KEIN PHI sind: Diagnosen (nur wenn kein Name dabei), Medikamentennamen, allgemeine medizinische Begriffe.

Gib NUR den anonymisierten Text zurück, KEINE Erklärungen.`;

        const result = await callLlm(config, text, systemPrompt);
        return result.text || text;
    }
}

export const anonymizationService = new AnonymizationService();
