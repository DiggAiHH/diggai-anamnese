/**
 * Marketing Landing Page — DiggAI Anamnese Platform
 * Zielgruppe: Arztpraxen in Deutschland
 * Enthält: Hero, Features, Preise, Beratungsbuchung, AI-Berater-Teaser
 */
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingSection } from './PricingSection';
// import { ConsultationBooking } from './ConsultationBooking';
// import { AIAdvisorTeaser } from './AIAdvisorTeaser';

const NAV_LINKS = [
    { href: '#features', label: 'Features' },
    { href: '#preise', label: 'Preise' },
    { href: '#beratung', label: 'Beratung' },
    { href: '#ki-berater', label: 'KI-Berater' },
];

const STATS = [
    { value: '270+', label: 'Medizinische Fragen' },
    { value: '13', label: 'Fachgebiete' },
    { value: '10', label: 'Triage-Regeln' },
    { value: '99,9%', label: 'Uptime SLA' },
];

const FEATURES = [
    {
        icon: '🏥',
        title: 'Digitale Patientenaufnahme',
        desc: '270+ klinische Fragen in 13 Fachgebieten. Patienten füllen den Bogen am iPad, Smartphone oder Kiosk aus — bevor sie den Arzt sehen.',
    },
    {
        icon: '⚡',
        title: 'Echtzeit-Triage',
        desc: 'Automatische Erkennung von 4 CRITICAL- und 6 WARNING-Szenarien (ACS, Suizidalität, SAH). Sofortige Arzt-Benachrichtigung via Dashboard.',
    },
    {
        icon: '🤖',
        title: 'KI-Therapievorschläge',
        desc: 'ICD-10-GM Codes, SOAP-Zusammenfassung und Therapiepläne — KI-gestützt, aber immer unter ärztlicher Kontrolle.',
    },
    {
        icon: '🔒',
        title: 'DSGVO-konform',
        desc: 'AES-256-GCM Verschlüsselung aller PII-Daten. eIDAS-konforme Einwilligung. Automatisches Löschkonzept. Audit-Logging gemäß HIPAA.',
    },
    {
        icon: '📱',
        title: 'PWA — 100% Offline',
        desc: 'Progressive Web App mit Service Worker. Funktioniert ohne Internet. Daten werden synchronisiert sobald die Verbindung wiederhergestellt ist.',
    },
    {
        icon: '🌐',
        title: '10 Sprachen',
        desc: 'Deutsch, Englisch, Türkisch, Arabisch, Ukrainisch, Spanisch, Farsi, Italienisch, Französisch, Polnisch. RTL-Unterstützung inklusive.',
    },
    {
        icon: '🏦',
        title: 'gematik TI + ePA',
        desc: 'Anbindung an die Telematik-Infrastruktur. ePA-Datenübertragung, eRezept, Versichertenstammdaten-Abgleich (VSDM).',
    },
    {
        icon: '🔗',
        title: 'PVS-Integration',
        desc: 'GDT- und HL7-Schnittstelle zu gängigen Praxis-Verwaltungssystemen (Medistar, TurboMed, Albis, CGM). Bidirektionale Datensynchronisation.',
    },
];

const TESTIMONIALS = [
    {
        text: 'Unsere Wartezeit hat sich halbiert. Die Patienten kommen mit einem fertigen Anamnesebogen — der Arzt kann sofort loslegen.',
        author: 'Dr. med. S. Mustermann',
        role: 'Hausarztpraxis, Hamburg',
    },
    {
        text: 'Das Triage-System hat uns bereits zweimal einen Herzinfarkt-Verdacht rechtzeitig gemeldet. Das ist nicht nur Effizienz — das rettet Leben.',
        author: 'Dr. med. H. Al-Shdaifat',
        role: 'Internistin, Berlin',
    },
    {
        text: 'Die KI-Zusammenfassungen sparen mir 5–8 Minuten pro Patient. Bei 30 Patienten am Tag macht das den Unterschied.',
        author: 'Dr. med. M. Fischer',
        role: 'Facharzt für Allgemeinmedizin, München',
    },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const pricingRef = useRef<HTMLDivElement>(null);

    function scrollTo(id: string) {
        document.getElementById(id.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* ─── Navbar ─────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
                        <span className="font-bold text-lg text-gray-900">DiggAI</span>
                        <span className="text-gray-400 text-sm hidden sm:block">Anamnese Platform</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        {NAV_LINKS.map(l => (
                            <button
                                key={l.href}
                                onClick={() => scrollTo(l.href)}
                                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/verwaltung/login')}
                            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Anmelden
                        </button>
                        <button
                            onClick={() => scrollTo('#preise')}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Kostenlos testen
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ────────────────────────────────────────────── */}
            <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                        DSGVO · BSI TR-03161 · eIDAS · gematik TI
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                        Digitale Patientenaufnahme{' '}
                        <span className="text-blue-600">für moderne Arztpraxen</span>
                    </h1>
                    {/* M3 (Arzt-Feedback 2026-05-03): Privacy-Promise-Tagline */}
                    <p className="text-base sm:text-lg text-gray-700 italic max-w-2xl mx-auto mb-6">
                        Ihre persönliche Patientenakte — nur Ihr Arzt und Sie sehen diese Daten.
                    </p>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                        270+ medizinische Fragen, KI-gestützte Triage, eIDAS-konforme Einwilligung — komplett offline-fähig
                        als Progressive Web App. Patienten bringen einen fertigen Anamnesebogen mit. Ärzte gewinnen Zeit.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => scrollTo('#preise')}
                            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5"
                        >
                            14 Tage kostenlos testen
                        </button>
                        <button
                            onClick={() => scrollTo('#beratung')}
                            className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-blue-300 transition-all hover:-translate-y-0.5"
                        >
                            Persönliche Beratung anfragen
                        </button>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                        Keine Kreditkarte erforderlich · Jederzeit kündbar · Hosting in Deutschland
                    </p>
                </div>

                {/* Stats */}
                <div className="max-w-4xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {STATS.map(s => (
                        <div key={s.label} className="text-center bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="text-3xl font-extrabold text-blue-600">{s.value}</div>
                            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Features ────────────────────────────────────────── */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Alles, was eine moderne Praxis braucht
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Von der digitalen Anamnese bis zur gematik-TI-Anbindung — vollständig integriert, sicher und skalierbar.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {FEATURES.map(f => (
                            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:bg-blue-50 transition-colors group">
                                <div className="text-3xl mb-3">{f.icon}</div>
                                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">{f.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Workflow ─────────────────────────────────────────── */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">Wie es funktioniert</h2>
                    <p className="text-blue-100 text-lg mb-12 max-w-2xl mx-auto">
                        In 3 Schritten von der Praxis-Registrierung zum laufenden Betrieb.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: 'Praxis registrieren', desc: 'Konto anlegen, Fragen und Fachgebiete konfigurieren. In 30 Minuten einsatzbereit.' },
                            { step: '02', title: 'Patienten einladen', desc: 'QR-Code, NFC-Chip oder SMS — der Patient füllt den Bogen auf seinem Gerät aus.' },
                            { step: '03', title: 'Arzt profitiert', desc: 'Fertiger Anamnesebogen, KI-Zusammenfassung und Triage-Alert warten im Dashboard.' },
                        ].map(step => (
                            <div key={step.step} className="text-left bg-white/10 rounded-2xl p-6">
                                <div className="text-4xl font-black text-blue-300 mb-3">{step.step}</div>
                                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                                <p className="text-blue-100 text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Testimonials ─────────────────────────────────────── */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Was Ärzte sagen</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {TESTIMONIALS.map(t => (
                            <div key={t.author} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">{t.author}</div>
                                    <div className="text-gray-500 text-xs">{t.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Pricing ─────────────────────────────────────────── */}
            <div id="preise" ref={pricingRef}>
                <PricingSection />
            </div>

            {/* ─── AI Advisor Teaser ────────────────────────────────── */}
            {/* <div id="ki-berater">
                <AIAdvisorTeaser />
            </div> */}

            {/* ─── Consultation Booking ─────────────────────────────── */}
            {/* <div id="beratung">
                <ConsultationBooking />
            </div> */}

            {/* ─── Trust Bar ───────────────────────────────────────── */}
            <section className="py-12 px-4 border-t border-gray-100 bg-white">
                <div className="max-w-5xl mx-auto">
                    <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-6">Compliance & Standards</p>
                    <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500 font-semibold">
                        {['DSGVO Art. 25 (Privacy by Design)', 'HIPAA Audit Logging', 'eIDAS Digitale Signatur', 'BSI TR-03107', 'gematik TI-ready', 'ISO 27001 (geplant)', 'Hosting: Deutschland (EU)', 'AES-256-GCM Verschlüsselung'].map(badge => (
                            <span key={badge} className="bg-gray-100 rounded-full px-3 py-1.5">{badge}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Footer ──────────────────────────────────────────── */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">D</div>
                            <span className="text-white font-bold">DiggAI</span>
                        </div>
                        <p className="text-xs leading-relaxed">Klinische Patientenaufnahme-Plattform für Arztpraxen in Deutschland.</p>
                        <p className="mt-3 text-xs">support@diggai.de</p>
                    </div>
                    <div>
                        <div className="text-white font-semibold mb-3 text-xs uppercase tracking-wide">Produkt</div>
                        <ul className="space-y-2 text-xs">
                            {['Features', 'Preise', 'KI-Berater', 'Sicherheit', 'Integrations'].map(l => (
                                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className="text-white font-semibold mb-3 text-xs uppercase tracking-wide">Ressourcen</div>
                        <ul className="space-y-2 text-xs">
                            {['Dokumentation', 'API', 'Changelog', 'Status', 'Roadmap'].map(l => (
                                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className="text-white font-semibold mb-3 text-xs uppercase tracking-wide">Rechtliches</div>
                        <ul className="space-y-2 text-xs">
                            <li><a href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</a></li>
                            <li><a href="/impressum" className="hover:text-white transition-colors">Impressum</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">AGB</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">AVV</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between text-xs">
                    <p>© 2025 DiggAI GmbH. Alle Rechte vorbehalten.</p>
                    <p className="mt-2 sm:mt-0">Made in Germany · Hosting in Frankfurt</p>
                </div>
            </footer>
        </div>
    );
}
