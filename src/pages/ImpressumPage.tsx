import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building, Mail, Phone, Scale, Globe, Shield, Stethoscope } from 'lucide-react';

/**
 * Impressum — §5 TMG / §5 DDG (Digitale-Dienste-Gesetz) / §18 MStV
 * Pflichtangaben für gewerbliche Webseiten in Deutschland.
 * 
 * HINWEIS: Platzhalter [xxx] müssen vom Praxisinhaber ausgefüllt werden!
 */
export function ImpressumPage() {
    const { t } = useTranslation();

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Back Navigation */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-blue-500 transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('back_home', 'Zurück zur Startseite')}
                </Link>

                <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-emerald-500/5 to-blue-500/5">
                        <div className="flex items-center gap-3 mb-2">
                            <Scale className="w-6 h-6 text-emerald-500" />
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                {t('imprint.title', 'Impressum')}
                            </h1>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {t('imprint.legal_basis', 'Angaben gemäß §5 DDG (Digitale-Dienste-Gesetz)')}
                        </p>
                    </div>

                    <div className="px-8 py-6 space-y-8 text-sm text-[var(--text-primary)] leading-relaxed">

                        {/* Anbieter */}
                        <section>
                            <SectionHeader icon={<Building className="w-4 h-4" />} title={t('imprint.s1_title', 'Angaben zum Diensteanbieter')} />
                            <address className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] not-italic space-y-1">
                                <p className="font-bold text-base">{t('imprint.s1_name', 'Dr. med. [Vorname Nachname]')}</p>
                                <p>{t('imprint.s1_praxis', '[Praxisname]')}</p>
                                <p>{t('imprint.s1_street', '[Straße Hausnummer]')}</p>
                                <p>{t('imprint.s1_city', '[PLZ Ort]')}</p>
                                <p>{t('imprint.s1_country', 'Deutschland')}</p>
                            </address>
                        </section>

                        {/* Kontakt */}
                        <section>
                            <SectionHeader icon={<Mail className="w-4 h-4" />} title={t('imprint.s2_title', 'Kontakt')} />
                            <div className="space-y-2">
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[var(--text-secondary)]" />
                                    {t('imprint.s2_phone', 'Telefon: [Nummer]')}
                                </p>
                                <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
                                    {t('imprint.s2_email', 'E-Mail:')}{' '}
                                    <a href="mailto:kontakt@praxis.de" className="text-blue-500 hover:underline">kontakt@praxis.de</a>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
                                    {t('imprint.s2_web', 'Web:')}{' '}
                                    <a href="https://diggai-drklaproth.netlify.app" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                                        diggai-drklaproth.netlify.app
                                    </a>
                                </p>
                            </div>
                        </section>

                        {/* Berufsrechtliche Angaben */}
                        <section>
                            <SectionHeader icon={<Stethoscope className="w-4 h-4" />} title={t('imprint.s3_title', 'Berufsrechtliche Angaben')} />
                            <ul className="space-y-2">
                                <li><strong>{t('imprint.s3_job', 'Berufsbezeichnung:')}</strong> {t('imprint.s3_job_val', 'Arzt / Ärztin (verliehen in der Bundesrepublik Deutschland)')}</li>
                                <li><strong>{t('imprint.s3_chamber', 'Zuständige Kammer:')}</strong> {t('imprint.s3_chamber_val', 'Ärztekammer [Bundesland], [Adresse]')}</li>
                                <li><strong>{t('imprint.s3_kv', 'Kassenärztliche Vereinigung:')}</strong> {t('imprint.s3_kv_val', 'KV [Bundesland]')}</li>
                                <li>
                                    <strong>{t('imprint.s3_regulations', 'Berufsordnung:')}</strong>{' '}
                                    {t('imprint.s3_regulations_val', 'Berufsordnung der zuständigen Ärztekammer, einsehbar unter:')}{' '}
                                    <a href="https://www.bundesaerztekammer.de" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                                        www.bundesaerztekammer.de
                                    </a>
                                </li>
                            </ul>
                        </section>

                        {/* Aufsichtsbehörde */}
                        <section>
                            <SectionHeader icon={<Shield className="w-4 h-4" />} title={t('imprint.s4_title', 'Zuständige Aufsichtsbehörde')} />
                            <p>
                                {t('imprint.s4_text', 'Ärztekammer [Bundesland] als zuständige Approbationsbehörde')}
                            </p>
                        </section>

                        {/* USt-Id */}
                        <section>
                            <SectionHeader icon={<Scale className="w-4 h-4" />} title={t('imprint.s5_title', 'Umsatzsteuer-Identifikationsnummer')} />
                            <p>
                                {t('imprint.s5_text', 'Umsatzsteuer-Identifikationsnummer gemäß §27a UStG: [DE XXX XXX XXX]')}
                            </p>
                            <p className="mt-2 text-[var(--text-secondary)]">
                                {t('imprint.s5_note', 'Ärztliche Leistungen sind gemäß §4 Nr. 14 UStG von der Umsatzsteuer befreit.')}
                            </p>
                        </section>

                        {/* Streitbeilegung */}
                        <section>
                            <SectionHeader icon={<Scale className="w-4 h-4" />} title={t('imprint.s6_title', 'Online-Streitbeilegung')} />
                            <p>
                                {t('imprint.s6_text',
                                    'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:'
                                )}{' '}
                                <a
                                    href="https://ec.europa.eu/consumers/odr/"
                                    className="text-blue-500 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    https://ec.europa.eu/consumers/odr/
                                </a>
                            </p>
                            <p className="mt-2">
                                {t('imprint.s6_note',
                                    'Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'
                                )}
                            </p>
                        </section>

                        {/* Haftungsausschluss */}
                        <section>
                            <SectionHeader icon={<Shield className="w-4 h-4" />} title={t('imprint.s7_title', 'Haftungsausschluss')} />
                            <h4 className="font-bold mt-2 mb-1">{t('imprint.s7a_title', 'Haftung für Inhalte')}</h4>
                            <p>
                                {t('imprint.s7a_text',
                                    'Die medizinischen Fragebögen dieser Anwendung dienen ausschließlich der Voraberfassung von Gesundheitsdaten ' +
                                    'und ersetzen keine ärztliche Diagnose oder Behandlung. Die erhobenen Daten werden vertraulich behandelt ' +
                                    'und dienen ausschließlich der Unterstützung des behandelnden Arztes.'
                                )}
                            </p>
                            <h4 className="font-bold mt-4 mb-1">{t('imprint.s7b_title', 'Haftung für Links')}</h4>
                            <p>
                                {t('imprint.s7b_text',
                                    'Unser Angebot enthält Links zu externen Websites, auf deren Inhalte wir keinen Einfluss haben. ' +
                                    'Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.'
                                )}
                            </p>
                        </section>

                        {/* Technische Umsetzung */}
                        <section>
                            <SectionHeader icon={<Globe className="w-4 h-4" />} title={t('imprint.s8_title', 'Technische Umsetzung')} />
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>{t('imprint.s8_dev', 'Entwicklung:')}</strong> DiggAI</li>
                                <li><strong>{t('imprint.s8_hosting', 'Hosting:')}</strong> Netlify Inc., 2325 3rd Street Suite 215, San Francisco, CA 94107, USA</li>
                                <li><strong>{t('imprint.s8_tech', 'Technologie:')}</strong> React, TypeScript, Prisma, SQLite, AES-256-GCM</li>
                            </ul>
                        </section>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-6 flex justify-center gap-6">
                    <Link to="/datenschutz" className="text-sm text-[var(--text-secondary)] hover:text-blue-500 underline transition-colors">
                        {t('privacy.title', 'Datenschutzerklärung')}
                    </Link>
                    <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-blue-500 underline transition-colors">
                        {t('back_home', 'Zurück zur Startseite')}
                    </Link>
                </div>
            </div>
        </main>
    );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-primary)]">
            <span className="text-emerald-500">{icon}</span>
            {title}
        </h3>
    );
}
