import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import {
    APP_LANGUAGE_CODES,
    RTL_APP_LANGUAGE_CODES,
    normalizeAppLanguageCode,
} from './lib/i18n/languages';

// RTL languages that require layout mirroring
const rtlLanguageSet = new Set<string>(RTL_APP_LANGUAGE_CODES);

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
            loadPath: '/locales/{{lng}}/{{ns}}.json',
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
    });

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
