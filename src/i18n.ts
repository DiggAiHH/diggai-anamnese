import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import {
    APP_LANGUAGE_CODES,
    RTL_APP_LANGUAGE_CODES,
    normalizeAppLanguageCode,
} from './lib/i18n/languages';
import { registerPatientFlowResources } from './lib/patientFlow';

// RTL languages that require layout mirroring
const rtlLanguageSet = new Set<string>(RTL_APP_LANGUAGE_CODES);

function resolveLocaleBasePath(): string {
    if (typeof window === 'undefined') {
        return '/locales';
    }

    // Support both root app and /hatami sub-path deployments.
    if (window.location.pathname.startsWith('/hatami/')) {
        return '/hatami/locales';
    }

    return '/locales';
}

function formatMissingKey(key: string, defaultValue?: string): string {
    // Bug fix 2026-05-04: never show "[?]" in any environment.
    // The codebase uses two i18n key conventions in parallel:
    //   1. dotted keys with explicit fallback: t('home.title', 'Anliegen wählen')
    //   2. German text as the key itself:     t('Anliegen wählen')
    // For (1) we use the defaultValue. For (2) we treat the key itself as the
    // visible German fallback — a missing translation in EN/AR/etc gracefully
    // shows the German text instead of a "[?]" debug marker leaking to patients.

    if (typeof defaultValue === 'string' && defaultValue.trim().length > 0) {
        return defaultValue;
    }
    // If the key looks like human-readable text (contains a space or has no dot
    // separators), use it as the visible fallback.
    if (key.includes(' ') || !key.includes('.')) {
        return key;
    }
    // Truly missing dotted key with no defaultValue. Surface only in dev.
    if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) {
        const last = key.split('.').pop();
        return `[?] ${last || key}`;
    }
    // Production: silently return the key's last segment so the UI doesn't break.
    return key.split('.').pop() || key;
}

/**
 * i18n Configuration for DiggAI Anamnese Platform
 * 
 * Phase 5: Accessibility for Stressed Users
 * - RTL support for Arabic and Persian
 * - 10 supported languages
 * - Language detection and persistence
 * - Direction attribute management for accessibility
 */
i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'de',
        supportedLngs: APP_LANGUAGE_CODES,
        backend: {
            loadPath: `${resolveLocaleBasePath()}/{{lng}}/{{ns}}.json`,
        },
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['cookie', 'localStorage'],
        },
        // Accessibility: Simplified language options for cognitive accessibility
        react: {
            useSuspense: true,
            bindI18n: 'languageChanged loaded',
            bindI18nStore: 'added removed',
            nsMode: 'default',
        },
        // Arabic has 6 plural forms: zero, one, two, few (3–10), many (11–99), other (100+)
        // i18next uses suffixes: _zero, _one, _two, _few, _many, _other
        // Persian (fa) uses 2 forms: one, other
        pluralSeparator: '_',
        parseMissingKeyHandler: formatMissingKey,
    });

registerPatientFlowResources(i18n);

/**
 * Set document direction based on language
 * Critical for RTL languages (Arabic, Persian)
 */
export function setDocumentDirection(lng: string): void {
    const normalizedLanguage = normalizeAppLanguageCode(lng);
    const isRTL = rtlLanguageSet.has(normalizedLanguage);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = normalizedLanguage;
    
    // Add RTL class for CSS logical properties
    if (isRTL) {
        document.documentElement.classList.add('rtl');
        document.body.classList.add('rtl');
    } else {
        document.documentElement.classList.remove('rtl');
        document.body.classList.remove('rtl');
    }
}

// Listen for language changes and update direction
i18n.on('languageChanged', (lng) => {
    setDocumentDirection(lng);
});

// Initialize direction on load
if (typeof window !== 'undefined') {
    const currentLang = i18n.resolvedLanguage || i18n.language || 'de';
    setDocumentDirection(currentLang);
}

/**
 * Check if current language is RTL
 * Useful for conditional styling
 */
export function isRTLLanguage(lng?: string): boolean {
    const language = normalizeAppLanguageCode(lng || i18n.language);
    return rtlLanguageSet.has(language);
}

/**
 * Get text direction for a specific language
 */
export function getTextDirection(lng?: string): 'ltr' | 'rtl' {
    return isRTLLanguage(lng) ? 'rtl' : 'ltr';
}

export default i18n;
