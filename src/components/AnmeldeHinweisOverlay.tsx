import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Phone, X } from 'lucide-react';

/**
 * @module AnmeldeHinweisOverlay
 * @description Patient-facing Hinweis-Overlay für PRIORITY-Routing-Events.
 *
 * Nachfolger von `RedFlagOverlay`. Die Komponente rendert AUSSCHLIESSLICH
 * den `patientMessage`-String der RoutingEngine — niemals den `staffMessage`.
 *
 * **Regulatorisch verbindlich (siehe `docs/REGULATORY_POSITION.md` §5.2):**
 * - Kein Titel mit medizinischem Begriff (kein „NOTFALL", kein „Verdacht", kein
 *   Krankheits-Name).
 * - Kein Disclaimer, der eine Diagnose-Aussage impliziert.
 * - Nur workflow-orientierte Aufforderung („Bitte sprechen Sie das Praxispersonal an")
 *   plus Notruf-112-Direktwahl als Sicherheits-Fallback.
 *
 * Der Patient bekommt eine handlungsrelevante Anweisung, keine medizinische
 * Bewertung. Die fachliche Einordnung erfolgt durch das Praxispersonal anhand
 * des `staffMessage`, der ausschließlich im ArztDashboard / MFADashboard sichtbar ist.
 */

export interface AnmeldeHinweis {
    /** Stabile ID der ausgelösten Routing-Regel (für Audit-Korrelation) */
    ruleId: string;
    /** Patient-sicherer Text — siehe RoutingEngine.toPatientSafeView */
    patientMessage: string;
    /** Wirft die UI in PRIORITY-Layout (rotbrauner Akzent + Notruf-Button präsent) oder INFO-Layout */
    level: 'INFO' | 'PRIORITY';
}

interface AnmeldeHinweisOverlayProps {
    hinweis: AnmeldeHinweis;
    onAcknowledge: () => void;
}

export const AnmeldeHinweisOverlay: React.FC<AnmeldeHinweisOverlayProps> = ({ hinweis, onAcknowledge }) => {
    const { t } = useTranslation();
    const [acknowledged, setAcknowledged] = useState(false);
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const isPriority = hinweis.level === 'PRIORITY';
    const accentColor = isPriority ? 'amber' : 'blue';

    return (
        <div
            data-testid="anmelde-hinweis-overlay"
            data-rule-id={hinweis.ruleId}
            data-level={hinweis.level}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-label={t('anmeldeHinweisAria', 'Hinweis zur Anmeldung')}
            aria-live="polite"
        >
            <div className="mx-4 max-w-lg w-full">
                <div className={`relative rounded-2xl overflow-hidden shadow-2xl shadow-${accentColor}-500/30`}>
                    <div className={`relative bg-gradient-to-b from-${accentColor}-950 to-gray-900 p-8 text-center`}>
                        {/* Icon — neutrales Info-Symbol, kein Warn-Dreieck */}
                        <div className={`mx-auto w-20 h-20 rounded-full bg-${accentColor}-500/20 flex items-center justify-center mb-6`}>
                            <Info className={`w-12 h-12 text-${accentColor}-300`} />
                        </div>

                        {/* Titel — bewusst neutral, KEIN medizinischer Begriff */}
                        <h2 className={`text-2xl font-bold text-${accentColor}-200 mb-4 tracking-wide`}>
                            {t('anmeldeHinweisTitle', 'Bitte sprechen Sie das Praxispersonal an')}
                        </h2>

                        {/* Patient-Message aus RoutingEngine — geht durchs CI-Gate */}
                        <p className="text-lg text-white/90 mb-6 leading-relaxed">
                            {hinweis.patientMessage}
                        </p>

                        <div className={`h-px bg-${accentColor}-500/30 my-6`} />

                        {/* Notruf 112 — als Fallback, NICHT als Diagnose-Aufforderung */}
                        <a
                            href="tel:112"
                            className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg shadow-red-600/40 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] mb-6"
                        >
                            <Phone className="w-6 h-6" />
                            {t('anmeldeHinweis112', 'Im Zweifel Notruf 112')}
                        </a>

                        {!acknowledged ? (
                            <div className="mt-6 space-y-3">
                                <p className="text-sm text-white/50">
                                    {t('anmeldeHinweisRead', 'Bitte lesen Sie den Hinweis sorgfältig.')}
                                </p>
                                <button
                                    onClick={() => { if (countdown <= 0) setAcknowledged(true); }}
                                    disabled={countdown > 0}
                                    className={`text-sm px-6 py-2 rounded-lg transition-all duration-200 ${countdown > 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-white/70 hover:text-white cursor-pointer'}`}
                                >
                                    {countdown > 0
                                        ? `${t('anmeldeHinweisWait', 'Bitte warten…')} (${countdown}s)`
                                        : t('anmeldeHinweisAck', 'Ich habe den Hinweis gelesen')}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                <p className="text-sm text-white/70">
                                    {t('anmeldeHinweisFurther', 'Möchten Sie den Anmelde-Vorgang fortsetzen?')}
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <a href="tel:112" className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                                        <Phone className="w-4 h-4" />
                                        {t('anmeldeHinweisCall112', '112 anrufen')}
                                    </a>
                                    <button onClick={onAcknowledge} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white/70 hover:text-white px-5 py-2.5 rounded-lg text-sm transition-colors">
                                        <X className="w-4 h-4" />
                                        {t('anmeldeHinweisContinue', 'Anmeldung fortsetzen')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Disclaimer — ausschließlich organisatorisch, keine medizinische Aussage */}
                        <p className="mt-8 text-xs text-white/30">
                            {t(
                                'anmeldeHinweisDisclaimer',
                                'DiggAi ist eine Anmelde-Software für Ihre Arztpraxis und kein Medizinprodukt. Ihre Angabe wird dem Praxispersonal weitergeleitet.',
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Inline Info-Banner für INFO-Hinweise (kein Vollbild) ─────────────

interface AnmeldeHinweisBannerProps {
    hinweis: AnmeldeHinweis;
    onDismiss?: () => void;
}

export const AnmeldeHinweisBanner: React.FC<AnmeldeHinweisBannerProps> = ({ hinweis, onDismiss }) => {
    const { t } = useTranslation();
    return (
        <div
            data-testid="anmelde-hinweis-banner"
            data-rule-id={hinweis.ruleId}
            className="mx-4 mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm p-4"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-blue-300">
                        {t('anmeldeHinweisBannerTitle', 'Hinweis zur Anmeldung')}
                    </p>
                    <p className="text-sm text-blue-200/80 mt-1">{hinweis.patientMessage}</p>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        aria-label={t('anmeldeHinweisDismissAria', 'Hinweis schließen')}
                        className="text-blue-400/60 hover:text-blue-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
