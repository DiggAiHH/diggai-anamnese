/**
 * @deprecated Verwende `AnmeldeHinweisOverlay` aus `./AnmeldeHinweisOverlay.tsx`.
 *
 * Diese Komponente rendert das diagnostisch formulierte `alert.message`-Feld
 * direkt an den Patienten (Titel „MEDIZINISCHER NOTFALL" + Symbol-Warnung).
 * Das wäre als Hersteller-Output unter MDR Art. 2(1) ein medizinischer Zweck
 * und würde DiggAi in MDR Klasse IIa/IIb drücken (siehe `docs/REGULATORY_POSITION.md`).
 *
 * Nachfolge-Komponente `AnmeldeHinweisOverlay` rendert ausschließlich den
 * `patientMessage`-String (workflow-only) und verwendet einen neutralen Titel
 * sowie ein Info-Icon. Der Code-Pfad hier bleibt für Übergangszeit funktional,
 * darf in produktiven Patient-Pfaden aber NICHT mehr gemountet werden.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Phone, X } from 'lucide-react';
import type { TriageAlert } from '../store/sessionStore';

interface RedFlagOverlayProps {
    alert: TriageAlert;
    onAcknowledge: () => void;
}

/**
 * Vollbild-Overlay für CRITICAL Triage-Alerts
 * Zeigt Notfall-Anweisungen, 112-Button und Bestätigungs-Flow
 */
export const RedFlagOverlay: React.FC<RedFlagOverlayProps> = ({ alert, onAcknowledge }) => {
    const { t } = useTranslation();
    const [acknowledged, setAcknowledged] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // 5-Sekunden Countdown bevor Fortfahren möglich ist
    React.useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="Medical Emergency Alert" aria-live="assertive">
            <div className="mx-4 max-w-lg w-full animate-in fade-in zoom-in duration-300">
                {/* Pulsierender roter Rahmen */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-red-500/30">
                    {/* Animierter Rand */}
                    <div className="absolute inset-0 rounded-2xl border-4 border-red-500 animate-pulse" />

                    <div className="relative bg-gradient-to-b from-red-950 to-gray-900 p-8 text-center">
                        {/* Icon */}
                        <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 animate-pulse">
                            <AlertTriangle className="w-12 h-12 text-red-400" />
                        </div>

                        {/* Titel */}
                        <h2 className="text-2xl font-bold text-red-400 mb-4 tracking-wide">
                            ⚠️ {t('MEDIZINISCHER NOTFALL')}
                        </h2>

                        {/* Nachricht */}
                        <p className="text-lg text-white/90 mb-6 leading-relaxed">
                            {alert.message}
                        </p>

                        {/* Separator */}
                        <div className="h-px bg-red-500/30 my-6" />

                        {/* Notruf-Button */}
                        <a
                            href="tel:112"
                            className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg shadow-red-600/40 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98] mb-6"
                        >
                            <Phone className="w-6 h-6" />
                            {t('Notruf 112 anrufen')}
                        </a>

                        {/* Fortfahren */}
                        {!acknowledged ? (
                            <div className="mt-6 space-y-3">
                                <p className="text-sm text-white/50">
                                    {t('redFlagReadWarning', 'Bitte lesen Sie die Warnung sorgfältig.')}
                                </p>
                                <button
                                    onClick={() => {
                                        if (countdown <= 0) setAcknowledged(true);
                                    }}
                                    disabled={countdown > 0}
                                    className={`text-sm px-6 py-2 rounded-lg transition-all duration-200 ${countdown > 0
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white/70 hover:text-white cursor-pointer'
                                        }`}
                                >
                                    {countdown > 0
                                        ? `${t('redFlagWait', 'Bitte warten...')} (${countdown}s)`
                                        : t('redFlagAck', 'Ich habe die Warnung gelesen')
                                    }
                                </button>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                <p className="text-sm text-yellow-400">
                                    ⚡ {t('redFlagConfirm', 'Sind Sie sicher, dass Sie ohne sofortige medizinische Hilfe fortfahren möchten?')}
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <a
                                        href="tel:112"
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Phone className="w-4 h-4" />
                                        {t('redFlagCall112', 'Doch 112 anrufen')}
                                    </a>
                                    <button
                                        onClick={onAcknowledge}
                                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white/70 hover:text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        {t('redFlagContinue', 'Trotzdem fortfahren')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <p className="mt-8 text-xs text-white/30">
                            {t('redFlagDisclaimer', 'Diese Warnung wird automatisch an das Praxispersonal übermittelt. Ihre Angabe wird dokumentiert.')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Inline Warning Banner ──────────────────────────────────

interface WarningBannerProps {
    alert: TriageAlert;
    onDismiss?: () => void;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ alert, onDismiss }) => {
    const { t } = useTranslation();
    return (
        <div className="mx-4 mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm p-4" role="alert" aria-live="polite">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-300">{t('Hinweis')}</p>
                    <p className="text-sm text-yellow-200/80 mt-1">{alert.message}</p>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} aria-label={t('Hinweis schließen', 'Hinweis schließen')} className="text-yellow-400/60 hover:text-yellow-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
