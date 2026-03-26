// ─── Server-side i18n Helper + Typed Error ───────────────────
// Lädt Übersetzungen aus server/locales/{lang}/*.json
// Unterstützte Sprachen: de, en, tr, ar, uk, es, fa, it, fr, pl, ru

/**
 * Typed error that carries a translation key instead of a hardcoded message.
 * Route handlers translate it with the request language via t(lang, err.errorKey).
 * @example throw new LocalizedError('errors.auth.invalid_credentials')
 */
export class LocalizedError extends Error {
    constructor(public readonly errorKey: string, fallback?: string) {
        super(fallback ?? errorKey);
        this.name = 'LocalizedError';
    }
}

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TranslationMap = Record<string, string>;
const cache: Record<string, TranslationMap> = {};

const SUPPORTED_LANGS = ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl', 'ru'];
const FALLBACK_LANG = 'de';
const LOCALES_DIR = path.join(__dirname, '..', 'locales');

function loadLocale(lang: string, namespace: string): TranslationMap {
    const key = `${lang}:${namespace}`;
    if (cache[key]) return cache[key];

    const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as TranslationMap;
        cache[key] = parsed;
        return parsed;
    } catch {
        return {};
    }
}

/**
 * Translate a key for the given language (falls back to German if key missing).
 * Supports simple {{variable}} interpolation.
 *
 * @example t('en', 'errors.not_found')
 * @example t('tr', 'emails.passwordReset.subject')
 * @example t('de', 'errors.generic', 'Interner Fehler')
 */
export function t(lang: string, key: string, fallback?: string, vars?: Record<string, string>): string {
    const resolvedLang = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;

    // Key format: "namespace.dotted.path" — first segment is the file name
    const parts = key.split('.');
    const namespace = parts[0];
    const subKey = parts.slice(1).join('.');

    const primary = loadLocale(resolvedLang, namespace);
    const fallbackMap = resolvedLang !== FALLBACK_LANG ? loadLocale(FALLBACK_LANG, namespace) : {};

    let value: string | undefined = primary[subKey] ?? fallbackMap[subKey] ?? fallback;
    if (value === undefined) return fallback ?? key;

    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
        }
    }

    return value;
}

/**
 * Parse the preferred language from an Accept-Language header or locale string.
 * Returns the best-supported language code.
 */
export function parseLang(acceptLanguage?: string, accountLocale?: string): string {
    if (accountLocale && SUPPORTED_LANGS.includes(accountLocale)) return accountLocale;

    if (acceptLanguage) {
        // Parse "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7"
        const langs = acceptLanguage
            .split(',')
            .map(part => {
                const [tag, q] = part.trim().split(';q=');
                return { tag: tag.split('-')[0].toLowerCase(), q: parseFloat(q ?? '1') };
            })
            .sort((a, b) => b.q - a.q);

        for (const { tag } of langs) {
            if (SUPPORTED_LANGS.includes(tag)) return tag;
        }
    }

    return FALLBACK_LANG;
}
