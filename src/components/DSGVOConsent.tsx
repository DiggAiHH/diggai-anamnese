import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, FileText, Lock, ChevronDown, Check, X } from 'lucide-react';

interface DSGVOConsentProps {
    onAccept: () => void;
    onDecline: () => void;
    praxisName?: string;
}

/**
 * DSGVO-Einwilligungserklärung
 * Muss vor Beginn des Fragebogens akzeptiert werden
 */
export const DSGVOConsent: React.FC<DSGVOConsentProps> = ({
    onAccept,
    onDecline,
    praxisName = 'Gemeinschaftspraxis'
}) => {
    const [accepted, setAccepted] = useState({
        datenverarbeitung: false,
        medizinischeDaten: false,
        widerruf: false,
    });
    const [showDetails, setShowDetails] = useState(false);
    const { t } = useTranslation();

    const allAccepted = Object.values(accepted).every(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="dsgvo-title">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-8 pt-8 pb-6 border-b border-[var(--border-primary)]">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 id="dsgvo-title" className="text-xl font-bold text-[var(--text-primary)]">{t('Datenschutz-Einwilligung')}</h2>
                                <p className="text-sm text-[var(--text-muted)]">{t('dsgvoSubtitle', 'Gemäß DSGVO Art. 6, Art. 9')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                        {/* Einführung */}
                        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] p-4">
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {t('dsgvoIntro', 'Sehr geehrte Patientin, sehr geehrter Patient,')}
                                <br /><br />
                                {t('dsgvoIntroBody', 'um Sie bestmöglich versorgen zu können, erheben und verarbeiten wir im Rahmen dieses digitalen Anamnesebogens personenbezogene und medizinische Daten. Bitte lesen Sie die folgenden Hinweise sorgfältig durch.')}
                            </p>
                        </div>

                        {/* Checkbox 1: Datenverarbeitung */}
                        <ConsentCheckbox
                            checked={accepted.datenverarbeitung}
                            onChange={(v) => setAccepted(prev => ({ ...prev, datenverarbeitung: v }))}
                            title={t('dsgvoConsent1Title', 'Einwilligung in die Datenverarbeitung')}
                            description={t('dsgvoConsent1Desc', `Ich willige ein, dass die ${praxisName} meine im Fragebogen angegebenen personenbezogenen Daten (Name, Geburtsdatum, Kontaktdaten, Versicherungsstatus) zum Zweck der Behandlungsplanung und Terminvorbereitung verarbeitet.`)}
                        />

                        {/* Checkbox 2: Medizinische Daten */}
                        <ConsentCheckbox
                            checked={accepted.medizinischeDaten}
                            onChange={(v) => setAccepted(prev => ({ ...prev, medizinischeDaten: v }))}
                            title={t('dsgvoConsent2Title', 'Verarbeitung besonderer Kategorien (Gesundheitsdaten)')}
                            description={t('dsgvoConsent2Desc', 'Ich willige gemäß Art. 9 Abs. 2 lit. a DSGVO ausdrücklich in die Verarbeitung meiner Gesundheitsdaten (Vorerkrankungen, Medikamente, Symptome, Allergien) ein. Diese Daten werden ausschließlich für die medizinische Versorgung verwendet.')}
                        />

                        {/* Checkbox 3: Widerruf */}
                        <ConsentCheckbox
                            checked={accepted.widerruf}
                            onChange={(v) => setAccepted(prev => ({ ...prev, widerruf: v }))}
                            title={t('dsgvoConsent3Title', 'Widerrufsrecht & Datenlöschung')}
                            description={t('dsgvoConsent3Desc', 'Mir ist bekannt, dass ich diese Einwilligung jederzeit ohne Angabe von Gründen widerrufen kann. Ein Widerruf hat keine Auswirkungen auf die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung. Zur Löschung meiner Daten kann ich mich jederzeit an die Praxis wenden.')}
                        />

                        {/* Details Toggle */}
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            <span>{t('dsgvoFullPolicy', 'Vollständige Datenschutzerklärung')}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                        </button>

                        {showDetails && (
                            <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] p-5 space-y-4 text-xs text-[var(--text-muted)] leading-relaxed">
                                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('dsgvoPolicy1Title', '1. Verantwortliche Stelle')}</h4>
                                <p>{t('dsgvoPolicy1Text', `${praxisName} (Adresse wird in der Praxis ausgehängt)`)}</p>

                                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('dsgvoPolicy2Title', '2. Zweck der Verarbeitung')}</h4>
                                <p>{t('dsgvoPolicy2Text', 'Die Daten werden zur Vorbereitung und Durchführung Ihrer medizinischen Behandlung erhoben (Art. 6 Abs. 1 lit. b DSGVO i.V.m. Art. 9 Abs. 2 lit. h DSGVO).')}</p>

                                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('dsgvoPolicy3Title', '3. Speicherdauer')}</h4>
                                <p>{t('dsgvoPolicy3Text', 'Ihre Daten werden gemäß den ärztlichen Aufbewahrungsfristen (§ 630f BGB: 10 Jahre nach Abschluss der Behandlung) gespeichert.')}</p>

                                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('dsgvoPolicy4Title', '4. Technische Maßnahmen')}</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>{t('dsgvoPolicy4a', 'Verschlüsselte Übertragung (TLS 1.3)')}</li>
                                    <li>{t('dsgvoPolicy4b', 'AES-256-GCM Verschlüsselung für personenbezogene Daten')}</li>
                                    <li>{t('dsgvoPolicy4c', 'Pseudonymisierte Speicherung (SHA-256 Hash der E-Mail)')}</li>
                                    <li>{t('dsgvoPolicy4d', 'Zugriffskontrolle über JWT-basierte Authentifizierung')}</li>
                                    <li>{t('dsgvoPolicy4e', 'HIPAA-konformes Audit-Logging aller Datenzugriffe')}</li>
                                </ul>

                                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('dsgvoPolicy5Title', '5. Ihre Rechte')}</h4>
                                <p>{t('dsgvoPolicy5Text', 'Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21), Beschwerde bei der Aufsichtsbehörde.')}</p>

                                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">{t('dsgvoPolicy6Title', '6. Kontakt Datenschutzbeauftragter')}</h4>
                                <p>{t('dsgvoPolicy6Text', 'Kontaktdaten des/der betrieblichen Datenschutzbeauftragten sind in der Praxis einsehbar.')}</p>
                            </div>
                        )}

                        {/* Zusatzinfo */}
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-300/80 leading-relaxed">
                                {t('dsgvoSecurityNote', 'Ihre Daten werden durch AES-256-GCM verschlüsselt und ausschließlich für die medizinische Behandlung verwendet. Sie verlassen zu keinem Zeitpunkt den abgesicherten Bereich.')}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-[var(--border-primary)] flex flex-col sm:flex-row items-center gap-3">
                        <button
                            onClick={onDecline}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all text-sm"
                        >
                            <X className="w-4 h-4" />
                            {t('Ablehnen')}
                        </button>
                        <button
                            onClick={onAccept}
                            disabled={!allAccepted}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium text-sm transition-all ${allAccepted
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {allAccepted ? t('dsgvoAccept', 'Einwilligen & Fortfahren') : t('dsgvoPleaseConfirm', 'Bitte alle Punkte bestätigen')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Checkbox Component ─────────────────────────────────────

const ConsentCheckbox: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    title: string;
    description: string;
}> = ({ checked, onChange, title, description }) => (
    <button
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${checked
            ? 'border-blue-500/40 bg-blue-500/10'
            : 'border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
            }`}
    >
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-blue-400 bg-blue-500' : 'border-[var(--border-primary)]'
            }`}>
            {checked && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        <div>
            <p className={`text-sm font-semibold mb-1 ${checked ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{title}</p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
        </div>
    </button>
);
