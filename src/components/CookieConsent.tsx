import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Cookie, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Cookie Consent Banner — TTDSG §25 / ePrivacy-Konformität (Section 2.1.1)
 * 
 * Granulare Einwilligungsverwaltung:
 * - Essenziell (immer aktiv, nicht abwählbar)
 * - Funktional (Session-Management, Sprache, Theme)
 * - Analytik (anonyme Nutzungsstatistiken)
 * 
 * Speichert Consent-Entscheidung in localStorage + Zeitstempel.
 * Server-seitige Aufzeichnung erfolgt beim ersten API-Aufruf.
 */

interface ConsentChoices {
    essential: true;       // Immer Pflicht
    functional: boolean;   // Session, Sprache, Theme
    analytics: boolean;    // Anonyme Statistiken
    timestamp: string;     // ISO Zeitstempel
    version: string;       // Consent-Version für Änderungstracking
}

const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0.0';

function getStoredConsent(): ConsentChoices | null {
    try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ConsentChoices;
        // Invalidate if consent version has changed
        if (parsed.version !== CONSENT_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function CookieConsent() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [choices, setChoices] = useState<ConsentChoices>({
        essential: true,
        functional: true,
        analytics: false,
        timestamp: '',
        version: CONSENT_VERSION,
    });

    useEffect(() => {
        const stored = getStoredConsent();
        if (!stored) {
            // Show banner after short delay for better UX
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveConsent = useCallback((consent: ConsentChoices) => {
        const final: ConsentChoices = {
            ...consent,
            essential: true, // Always true
            timestamp: new Date().toISOString(),
            version: CONSENT_VERSION,
        };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(final));
        setVisible(false);
    }, []);

    const handleAcceptAll = useCallback(() => {
        saveConsent({ essential: true, functional: true, analytics: true, timestamp: '', version: CONSENT_VERSION });
    }, [saveConsent]);

    const handleAcceptSelected = useCallback(() => {
        saveConsent(choices);
    }, [choices, saveConsent]);

    const handleRejectOptional = useCallback(() => {
        saveConsent({ essential: true, functional: false, analytics: false, timestamp: '', version: CONSENT_VERSION });
    }, [saveConsent]);

    if (!visible) return null;

    return (
        <div
            className="fixed bottom-0 inset-x-0 z-[9998] p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={t('cookie.banner_title', 'Cookie-Einstellungen')}
        >
            <div className="max-w-3xl mx-auto bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10">
                        <Cookie className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            {t('cookie.title', 'Cookie-Einstellungen')}
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {t('cookie.subtitle', 'TTDSG §25 — Ihre Privatsphäre ist uns wichtig')}
                        </p>
                    </div>
                </div>

                {/* Info Text */}
                <div className="px-6 py-4">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {t('cookie.description',
                            'Diese Anwendung verwendet Cookies und lokalen Speicher für einen sicheren Betrieb. ' +
                            'Essenzielle Cookies sind für die Grundfunktion erforderlich und können nicht deaktiviert werden. ' +
                            'Weitere Details finden Sie in unserer Datenschutzerklärung.'
                        )}
                    </p>
                </div>

                {/* Expandable Details */}
                <div className="px-6">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors mb-3"
                        aria-expanded={expanded}
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {t('cookie.details', 'Detaillierte Einstellungen')}
                    </button>

                    {expanded && (
                        <div className="space-y-3 pb-4 animate-in slide-in-from-top-2">
                            {/* Essential — always on */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)]">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-4 h-4 text-green-500" />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                                            {t('cookie.essential', 'Essenziell')}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {t('cookie.essential_desc', 'Sicherheit, Authentifizierung, DSGVO-Einwilligung')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-green-500 font-bold uppercase tracking-wide">
                                    <Check className="w-3 h-3" />
                                    {t('cookie.always_active', 'Immer aktiv')}
                                </div>
                            </div>

                            {/* Functional */}
                            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <Cookie className="w-4 h-4 text-amber-500" />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                                            {t('cookie.functional', 'Funktional')}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {t('cookie.functional_desc', 'Sprache, Theme, Session-Verwaltung')}
                                        </p>
                                    </div>
                                </div>
                                <div className={`relative w-11 h-6 rounded-full transition-colors ${choices.functional ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${choices.functional ? 'translate-x-5' : 'translate-x-0'}`} />
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={choices.functional}
                                        onChange={(e) => setChoices(c => ({ ...c, functional: e.target.checked }))}
                                    />
                                </div>
                            </label>

                            {/* Analytics */}
                            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <Cookie className="w-4 h-4 text-purple-500" />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                                            {t('cookie.analytics', 'Statistiken')}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {t('cookie.analytics_desc', 'Anonyme Nutzungsstatistiken zur Verbesserung')}
                                        </p>
                                    </div>
                                </div>
                                <div className={`relative w-11 h-6 rounded-full transition-colors ${choices.analytics ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${choices.analytics ? 'translate-x-5' : 'translate-x-0'}`} />
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={choices.analytics}
                                        onChange={(e) => setChoices(c => ({ ...c, analytics: e.target.checked }))}
                                    />
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-[var(--border-primary)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        onClick={handleRejectOptional}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-primary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
                    >
                        <X className="w-4 h-4" />
                        {t('cookie.reject', 'Nur Essenzielle')}
                    </button>
                    {expanded && (
                        <button
                            onClick={handleAcceptSelected}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30 text-sm font-medium text-blue-500 hover:bg-blue-500/10 transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            {t('cookie.accept_selected', 'Auswahl bestätigen')}
                        </button>
                    )}
                    <button
                        onClick={handleAcceptAll}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors sm:ml-auto"
                    >
                        <Check className="w-4 h-4" />
                        {t('cookie.accept_all', 'Alle akzeptieren')}
                    </button>
                </div>

                {/* Legal Link */}
                <div className="px-6 pb-4 flex gap-4">
                    <Link
                        to="/datenschutz"
                        className="text-xs text-[var(--text-secondary)] hover:text-blue-500 underline transition-colors"
                    >
                        {t('cookie.privacy_link', 'Datenschutzerklärung')}
                    </Link>
                    <Link
                        to="/impressum"
                        className="text-xs text-[var(--text-secondary)] hover:text-blue-500 underline transition-colors"
                    >
                        {t('cookie.imprint_link', 'Impressum')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook: Prüft ob ein bestimmter Cookie-Typ erlaubt ist
 */
export function useCookieConsent(type: 'essential' | 'functional' | 'analytics'): boolean {
    const stored = getStoredConsent();
    if (!stored) return type === 'essential'; // Essential always allowed
    return stored[type];
}
