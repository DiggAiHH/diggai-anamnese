/**
 * Impressum — Einbettbare Kurzfassung
 *
 * Kompakte, wiederverwendbare Komponente für Footer und eingebettete
 * Ansichten. Für die vollständige Impressumsseite → ImpressumPage.tsx.
 *
 * Pflichtangaben gemäß §5 DDG (Digitale-Dienste-Gesetz).
 * HINWEIS: Platzhalter [xxx] vom Praxisinhaber zu ersetzen.
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

interface ImpressumProps {
    /** Wenn true, zeigt den vollständigen Link zur Impressumsseite. Default: true */
    showLink?: boolean;
    /** Optionale CSS-Klassen für den Wrapper */
    className?: string;
}

export function Impressum({ showLink = true, className = '' }: ImpressumProps) {
    const { t } = useTranslation();

    return (
        <aside
            className={`text-xs text-[var(--text-secondary)] leading-relaxed ${className}`}
            aria-label={t('imprint.title', 'Impressum')}
        >
            <div className="flex items-center gap-1.5 mb-2 font-semibold text-[var(--text-primary)]">
                <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t('imprint.title', 'Impressum')}</span>
            </div>

            <address className="not-italic space-y-0.5">
                <p className="font-medium">{t('imprint.s1_name', 'Dr. med. [Vorname Nachname]')}</p>
                <p>{t('imprint.s1_praxis', '[Praxisname]')}</p>
                <p>{t('imprint.s1_street', '[Straße Hausnummer]')}</p>
                <p>{t('imprint.s1_city', '[PLZ Ort]')}</p>

                <div className="pt-1 space-y-0.5">
                    <p>
                        {t('imprint.phone_label', 'Tel.')}:{' '}
                        <a
                            href="tel:[TELEFON]"
                            className="hover:text-blue-500 transition-colors"
                        >
                            {t('imprint.phone_value', '[Telefonnummer]')}
                        </a>
                    </p>
                    <p>
                        {t('imprint.email_label', 'E-Mail')}:{' '}
                        <a
                            href="mailto:[EMAIL]"
                            className="hover:text-blue-500 transition-colors"
                        >
                            {t('imprint.email_value', '[praxis@example.de]')}
                        </a>
                    </p>
                </div>

                <p className="pt-1">
                    {t('imprint.ust_label', 'USt-IdNr.')}:{' '}
                    {t('imprint.ust_value', '[DE-Nummer]')}
                </p>
            </address>

            {showLink && (
                <p className="mt-2">
                    <Link
                        to="/impressum"
                        className="underline underline-offset-2 hover:text-blue-500 transition-colors"
                    >
                        {t('imprint.full_link', 'Vollständiges Impressum')} →
                    </Link>
                </p>
            )}
        </aside>
    );
}
