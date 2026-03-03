import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail, Server, Database, Clock } from 'lucide-react';

/**
 * Datenschutzerklärung — DSGVO Art. 13/14 & BDSG §22 (Section 2.6)
 * Vollständige Datenschutzerklärung für medizinische Webanwendung.
 * Pflichtangaben:
 * - Verantwortlicher, DPO, Zwecke, Rechtsgrundlagen,
 * - Empfänger, Speicherdauer, Betroffenenrechte,
 * - Speziell: Gesundheitsdaten nach Art. 9 DSGVO
 */
export function DatenschutzPage() {
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
                    <div className="px-8 py-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-6 h-6 text-blue-500" />
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                {t('privacy.title', 'Datenschutzerklärung')}
                            </h1>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {t('privacy.last_updated', 'Stand: Juli 2025 — Version 2.0')}
                        </p>
                    </div>

                    <div className="px-8 py-6 space-y-8 text-sm text-[var(--text-primary)] leading-relaxed">

                        {/* §1 — Verantwortlicher */}
                        <section>
                            <SectionHeader icon={<Mail className="w-4 h-4" />} title={t('privacy.s1_title', '1. Verantwortlicher')} />
                            <p>
                                {t('privacy.s1_text',
                                    'Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:'
                                )}
                            </p>
                            <address className="mt-3 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] not-italic">
                                <strong>Dr. med. [Name]</strong><br />
                                [Praxisname]<br />
                                [Straße Nr.]<br />
                                [PLZ Ort]<br />
                                <br />
                                E-Mail: <a href="mailto:datenschutz@praxis.de" className="text-blue-500 hover:underline">datenschutz@praxis.de</a><br />
                                Telefon: [Telefonnummer]
                            </address>
                        </section>

                        {/* §2 — Datenschutzbeauftragter */}
                        <section>
                            <SectionHeader icon={<Eye className="w-4 h-4" />} title={t('privacy.s2_title', '2. Datenschutzbeauftragter')} />
                            <p>
                                {t('privacy.s2_text',
                                    'Sofern ein Datenschutzbeauftragter bestellt ist, erreichen Sie diesen unter:'
                                )}
                            </p>
                            <p className="mt-2 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]">
                                E-Mail: <a href="mailto:dsb@praxis.de" className="text-blue-500 hover:underline">dsb@praxis.de</a>
                            </p>
                        </section>

                        {/* §3 — Zwecke und Rechtsgrundlagen */}
                        <section>
                            <SectionHeader icon={<Database className="w-4 h-4" />} title={t('privacy.s3_title', '3. Zwecke und Rechtsgrundlagen der Verarbeitung')} />

                            <h4 className="font-bold mt-4 mb-2 text-[var(--text-primary)]">
                                {t('privacy.s3a_title', '3.1 Medizinische Anamnese (Kerndienst)')}
                            </h4>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Zweck:</strong> {t('privacy.s3a_purpose', 'Digitale Voraberfassung von Gesundheitsdaten für die ärztliche Behandlung')}</li>
                                <li><strong>Daten:</strong> {t('privacy.s3a_data', 'Gesundheitsdaten (Art. 9 Abs. 1 DSGVO), Kontaktdaten, Versicherungsdaten, Medikation')}</li>
                                <li><strong>Rechtsgrundlage:</strong> {t('privacy.s3a_legal', 'Art. 9 Abs. 2 lit. h DSGVO i.V.m. §22 Abs. 1 Nr. 1 lit. b BDSG (Gesundheitsvorsorge/medizinische Diagnostik); Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)')}</li>
                            </ul>

                            <h4 className="font-bold mt-4 mb-2 text-[var(--text-primary)]">
                                {t('privacy.s3b_title', '3.2 Authentifizierung und Sitzungsverwaltung')}
                            </h4>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Zweck:</strong> {t('privacy.s3b_purpose', 'Sichere Zuordnung von Fragebögen, Rollenbasierte Zugriffskontrolle')}</li>
                                <li><strong>Daten:</strong> {t('privacy.s3b_data', 'Session-ID, JWT-Token, IP-Adresse, User-Agent')}</li>
                                <li><strong>Rechtsgrundlage:</strong> {t('privacy.s3b_legal', 'Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse an IT-Sicherheit)')}</li>
                            </ul>

                            <h4 className="font-bold mt-4 mb-2 text-[var(--text-primary)]">
                                {t('privacy.s3c_title', '3.3 Kommunikation (Chat)')}
                            </h4>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Zweck:</strong> {t('privacy.s3c_purpose', 'Echtzeit-Kommunikation zwischen Patient und Praxispersonal')}</li>
                                <li><strong>Daten:</strong> {t('privacy.s3c_data', 'Nachrichteninhalt, Absender, Zeitstempel')}</li>
                                <li><strong>Rechtsgrundlage:</strong> {t('privacy.s3c_legal', 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung / vorvertragliche Maßnahmen)')}</li>
                            </ul>

                            <h4 className="font-bold mt-4 mb-2 text-[var(--text-primary)]">
                                {t('privacy.s3d_title', '3.4 Audit-Logging')}
                            </h4>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Zweck:</strong> {t('privacy.s3d_purpose', 'Nachvollziehbarkeit aller Zugriffe auf Gesundheitsdaten (Rechenschaftspflicht)')}</li>
                                <li><strong>Daten:</strong> {t('privacy.s3d_data', 'Benutzer-ID, Aktion, Ressource, IP-Adresse, Zeitstempel, User-Agent')}</li>
                                <li><strong>Rechtsgrundlage:</strong> {t('privacy.s3d_legal', 'Art. 6 Abs. 1 lit. c DSGVO (Rechtliche Verpflichtung) i.V.m. Art. 5 Abs. 2 DSGVO (Rechenschaftspflicht)')}</li>
                            </ul>
                        </section>

                        {/* §4 — Empfänger */}
                        <section>
                            <SectionHeader icon={<Server className="w-4 h-4" />} title={t('privacy.s4_title', '4. Empfänger der Daten')} />
                            <ul className="list-disc pl-6 space-y-1">
                                <li>{t('privacy.s4_r1', 'Behandelnde Ärzte und medizinisches Fachpersonal der Praxis')}</li>
                                <li>{t('privacy.s4_r2', 'Hosting-Provider: Netlify Inc. (USA) — Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO, Standardvertragsklauseln (SCC) gemäß Art. 46 Abs. 2 lit. c DSGVO')}</li>
                                <li>{t('privacy.s4_r3', 'Kein Verkauf, keine Weitergabe an Dritte zu Werbezwecken')}</li>
                            </ul>
                        </section>

                        {/* §5 — Drittlandübermittlung */}
                        <section>
                            <SectionHeader icon={<Server className="w-4 h-4" />} title={t('privacy.s5_title', '5. Übermittlung in Drittländer')} />
                            <p>
                                {t('privacy.s5_text',
                                    'Netlify Inc. (Sitz: USA) wird als Hosting-Provider eingesetzt. Die Datenübermittlung erfolgt auf Grundlage von EU-Standardvertragsklauseln (SCC) gemäß Art. 46 Abs. 2 lit. c DSGVO. Netlify ist zudem unter dem EU-US Data Privacy Framework zertifiziert. Ergänzende technische Schutzmaßnahmen: TLS 1.3, AES-256-Verschlüsselung, serverseitige Verschlüsselung sensibler Felder.'
                                )}
                            </p>
                        </section>

                        {/* §6 — Speicherdauer */}
                        <section>
                            <SectionHeader icon={<Clock className="w-4 h-4" />} title={t('privacy.s6_title', '6. Speicherdauer und Löschfristen')} />
                            <div className="overflow-x-auto mt-3">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-primary)]">
                                            <th className="text-left py-2 pr-4 font-bold">{t('privacy.s6_cat', 'Datenkategorie')}</th>
                                            <th className="text-left py-2 pr-4 font-bold">{t('privacy.s6_dur', 'Speicherdauer')}</th>
                                            <th className="text-left py-2 font-bold">{t('privacy.s6_basis', 'Grundlage')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-primary)]">
                                        <tr>
                                            <td className="py-2 pr-4">{t('privacy.s6_r1c1', 'Anamnese-Fragebögen')}</td>
                                            <td className="py-2 pr-4">{t('privacy.s6_r1c2', '10 Jahre nach letzter Behandlung')}</td>
                                            <td className="py-2">{t('privacy.s6_r1c3', '§630f Abs. 3 BGB')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4">{t('privacy.s6_r2c1', 'Audit-Logs')}</td>
                                            <td className="py-2 pr-4">{t('privacy.s6_r2c2', '3 Jahre')}</td>
                                            <td className="py-2">{t('privacy.s6_r2c3', 'Art. 5 Abs. 2 DSGVO / §257 HGB')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4">{t('privacy.s6_r3c1', 'Session-Daten')}</td>
                                            <td className="py-2 pr-4">{t('privacy.s6_r3c2', '24 Stunden nach Ablauf (automatisch)')}</td>
                                            <td className="py-2">{t('privacy.s6_r3c3', 'Datenminimierung Art. 5 Abs. 1 lit. c')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4">{t('privacy.s6_r4c1', 'Chat-Nachrichten')}</td>
                                            <td className="py-2 pr-4">{t('privacy.s6_r4c2', 'Mit Session gelöscht')}</td>
                                            <td className="py-2">{t('privacy.s6_r4c3', 'Zweckbindung Art. 5 Abs. 1 lit. b')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4">{t('privacy.s6_r5c1', 'Cookie-Consent')}</td>
                                            <td className="py-2 pr-4">{t('privacy.s6_r5c2', '1 Jahr (TTDSG §25)')}</td>
                                            <td className="py-2">{t('privacy.s6_r5c3', 'TTDSG §25 Abs. 1')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* §7 — Betroffenenrechte */}
                        <section>
                            <SectionHeader icon={<Shield className="w-4 h-4" />} title={t('privacy.s7_title', '7. Ihre Rechte als Betroffene/r')} />
                            <p className="mb-3">
                                {t('privacy.s7_intro', 'Sie haben gemäß DSGVO folgende Rechte:')}
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>{t('privacy.s7_r1', 'Auskunftsrecht (Art. 15)')}</strong> — {t('privacy.s7_r1d', 'Recht auf vollständige Auskunft über Ihre gespeicherten Daten')}</li>
                                <li><strong>{t('privacy.s7_r2', 'Berichtigungsrecht (Art. 16)')}</strong> — {t('privacy.s7_r2d', 'Korrektur unrichtiger personenbezogener Daten')}</li>
                                <li><strong>{t('privacy.s7_r3', 'Löschungsrecht (Art. 17)')}</strong> — {t('privacy.s7_r3d', 'Löschung unter Beachtung gesetzlicher Aufbewahrungsfristen (§630f BGB)')}</li>
                                <li><strong>{t('privacy.s7_r4', 'Einschränkung (Art. 18)')}</strong> — {t('privacy.s7_r4d', 'Einschränkung der Verarbeitung unter bestimmten Bedingungen')}</li>
                                <li><strong>{t('privacy.s7_r5', 'Datenübertragbarkeit (Art. 20)')}</strong> — {t('privacy.s7_r5d', 'Export Ihrer Daten in maschinenlesbarem Format (JSON/PDF)')}</li>
                                <li><strong>{t('privacy.s7_r6', 'Widerspruchsrecht (Art. 21)')}</strong> — {t('privacy.s7_r6d', 'Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen')}</li>
                                <li><strong>{t('privacy.s7_r7', 'Widerruf der Einwilligung (Art. 7 Abs. 3)')}</strong> — {t('privacy.s7_r7d', 'Jederzeitiger Widerruf erteilter Einwilligungen für die Zukunft')}</li>
                            </ul>
                            <p className="mt-3">{t('privacy.s7_authority', 'Beschwerderecht bei der zuständigen Aufsichtsbehörde (Art. 77 DSGVO).')}</p>
                        </section>

                        {/* §8 — Verschlüsselung */}
                        <section>
                            <SectionHeader icon={<Lock className="w-4 h-4" />} title={t('privacy.s8_title', '8. Technische und organisatorische Maßnahmen (TOM)')} />
                            <ul className="list-disc pl-6 space-y-1">
                                <li>{t('privacy.s8_t1', 'Transportverschlüsselung: TLS 1.3 mit HSTS (max-age=31536000, preload)')}</li>
                                <li>{t('privacy.s8_t2', 'Datenverschlüsselung: AES-256-GCM für Gesundheitsdaten (PII-Felder)')}</li>
                                <li>{t('privacy.s8_t3', 'Passwort-Hashing: bcrypt mit Salting (mind. 12 Runden)')}</li>
                                <li>{t('privacy.s8_t4', 'Content Security Policy (CSP) mit strikten Direktiven')}</li>
                                <li>{t('privacy.s8_t5', 'Rate Limiting: Brute-Force-Schutz auf Authentifizierungs-Endpunkten')}</li>
                                <li>{t('privacy.s8_t6', 'HIPAA-konformes Audit-Logging aller Datenzugriffe')}</li>
                                <li>{t('privacy.s8_t7', 'Rollenbasierte Zugriffskontrolle (RBAC): Patient, Arzt, MFA, Admin')}</li>
                                <li>{t('privacy.s8_t8', 'Automatische Session-Bereinigung (24h TTL)')}</li>
                            </ul>
                        </section>

                        {/* §9 — Cookies */}
                        <section>
                            <SectionHeader icon={<Database className="w-4 h-4" />} title={t('privacy.s9_title', '9. Cookies und lokaler Speicher')} />
                            <p>
                                {t('privacy.s9_text',
                                    'Diese Anwendung verwendet ausschließlich technisch notwendige Cookies und localStorage-Einträge. ' +
                                    'Es werden keine Tracking-Cookies oder Cookies von Drittanbietern eingesetzt.'
                                )}
                            </p>
                            <div className="overflow-x-auto mt-3">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-primary)]">
                                            <th className="text-left py-2 pr-4 font-bold">{t('privacy.s9_name', 'Name')}</th>
                                            <th className="text-left py-2 pr-4 font-bold">{t('privacy.s9_type', 'Typ')}</th>
                                            <th className="text-left py-2 pr-4 font-bold">{t('privacy.s9_purpose', 'Zweck')}</th>
                                            <th className="text-left py-2 font-bold">{t('privacy.s9_duration', 'Dauer')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-primary)]">
                                        <tr>
                                            <td className="py-2 pr-4 font-mono text-xs">dsgvo_consent</td>
                                            <td className="py-2 pr-4">localStorage</td>
                                            <td className="py-2 pr-4">{t('privacy.s9_c1', 'DSGVO-Einwilligungsstatus')}</td>
                                            <td className="py-2">{t('privacy.s9_c1d', 'Permanent')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4 font-mono text-xs">cookie_consent</td>
                                            <td className="py-2 pr-4">localStorage</td>
                                            <td className="py-2 pr-4">{t('privacy.s9_c2', 'Cookie-Einstellungen')}</td>
                                            <td className="py-2">{t('privacy.s9_c2d', '1 Jahr')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4 font-mono text-xs">session_*</td>
                                            <td className="py-2 pr-4">localStorage</td>
                                            <td className="py-2 pr-4">{t('privacy.s9_c3', 'Sitzungsverwaltung')}</td>
                                            <td className="py-2">{t('privacy.s9_c3d', 'Session')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4 font-mono text-xs">language</td>
                                            <td className="py-2 pr-4">localStorage</td>
                                            <td className="py-2 pr-4">{t('privacy.s9_c4', 'Spracheinstellung')}</td>
                                            <td className="py-2">{t('privacy.s9_c4d', 'Permanent')}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-4 font-mono text-xs">theme</td>
                                            <td className="py-2 pr-4">localStorage</td>
                                            <td className="py-2 pr-4">{t('privacy.s9_c5', 'Dark/Light-Modus')}</td>
                                            <td className="py-2">{t('privacy.s9_c5d', 'Permanent')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* §10 — Löschung */}
                        <section>
                            <SectionHeader icon={<Trash2 className="w-4 h-4" />} title={t('privacy.s10_title', '10. Automatische Datenlöschung')} />
                            <p>
                                {t('privacy.s10_text',
                                    'Nicht zugeordnete Sitzungen werden automatisch nach 24 Stunden gelöscht (Datenminimierung). ' +
                                    'Active Sessions werden nach Abschluss der Behandlung gemäß den gesetzlichen ' +
                                    'Aufbewahrungspflichten (10 Jahre, §630f BGB) archiviert und nur dem behandelnden Arzt zugänglich gemacht. ' +
                                    'Die Löschung erfolgt durch einen automatisierten Server-Job.'
                                )}
                            </p>
                        </section>

                        {/* §11 — Änderungen */}
                        <section>
                            <SectionHeader icon={<Clock className="w-4 h-4" />} title={t('privacy.s11_title', '11. Änderungen dieser Datenschutzerklärung')} />
                            <p>
                                {t('privacy.s11_text',
                                    'Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie veränderten Rechtslage oder ' +
                                    'Änderungen des Dienstes anzupassen. Die aktuelle Version ist stets unter /datenschutz abrufbar. ' +
                                    'Bei wesentlichen Änderungen informieren wir Sie über das Cookie-Consent-Banner (Re-Consent).'
                                )}
                            </p>
                        </section>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-6 flex justify-center gap-6">
                    <Link to="/impressum" className="text-sm text-[var(--text-secondary)] hover:text-blue-500 underline transition-colors">
                        {t('impressum', 'Impressum')}
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
            <span className="text-blue-500">{icon}</span>
            {title}
        </h3>
    );
}
