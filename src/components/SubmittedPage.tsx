import React from 'react';
import { CheckCircle, Download, Home, Clock, ShieldCheck, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubmittedPageProps {
    sessionId?: string;
    patientName?: string;
    selectedService?: string;
    onReset: () => void;
    onPDF: () => void;
    onSecurePackage: () => void;
    onSendPackageLink?: () => void;
    canSendPackageLink?: boolean;
}

/**
 * Bestätigungsseite nach erfolgreichem Absenden
 */
export const SubmittedPage: React.FC<SubmittedPageProps> = ({
    sessionId,
    patientName,
    selectedService,
    onReset,
    onPDF,
    onSecurePackage,
    onSendPackageLink,
    canSendPackageLink = false,
}) => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-lg w-full text-center">
                {/* Success Animation */}
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/30 flex items-center justify-center animate-pulse">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
                        {t('Vielen Dank!')}
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                        {t('Ihre Angaben wurden erfolgreich übermittelt.')}
                    </p>
                </div>

                {/* Info Card */}
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 mb-6 text-left space-y-4">
                    {patientName && (
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                                {t('Patient:')} <strong className="text-[var(--text-primary)]">{patientName}</strong>
                            </span>
                        </div>
                    )}
                    {selectedService && (
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                                {t('Anliegen:')} <strong className="text-[var(--text-primary)]">{t(selectedService)}</strong>
                            </span>
                        </div>
                    )}
                    {sessionId && (
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                                {t('Referenz:')} <span className="font-mono text-lg tracking-widest font-bold text-[var(--accent)]">{sessionId.slice(0, 8).toUpperCase()}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Was passiert jetzt? */}
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 mb-8 text-left">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t('Was passiert als Nächstes?')}</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-400">1</span>
                            </div>
                            {t('Ihre Angaben werden vom Praxisteam geprüft')}
                        </li>
                        <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-400">2</span>
                            </div>
                            {t('Bei Rückfragen werden wir Sie kontaktieren')}
                        </li>
                        <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-blue-400">3</span>
                            </div>
                            {t('Sie können diese Seite nun schließen')}
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                    <button
                        onClick={onSecurePackage}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        {t('Verschlüsselte Datei herunterladen')}
                    </button>
                    <button
                        onClick={onPDF}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm font-medium transition-all"
                    >
                        <Download className="w-4 h-4" />
                        {t('PDF-Bericht herunterladen')}
                    </button>
                    {canSendPackageLink && onSendPackageLink && (
                        <button
                            onClick={onSendPackageLink}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm font-medium transition-all"
                        >
                            <Mail className="w-4 h-4" />
                            {t('Download-Link per E-Mail')}
                        </button>
                    )}
                    <button
                        onClick={onReset}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Home className="w-4 h-4" />
                        {t('Zurück zum Start')}
                    </button>
                </div>

                {/* Security Footer */}
                <div className="mt-12 flex items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t('Alle Daten sind Ende-zu-Ende verschlüsselt gespeichert')}</span>
                </div>
            </div>
        </div>
    );
};
