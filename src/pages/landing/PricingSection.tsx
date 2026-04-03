import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Plan {
    id: 'starter' | 'professional' | 'enterprise';
    name: string;
    price: number; // EUR/Monat
    description: string;
    features: string[];
    highlighted: boolean;
    badge?: string;
    cta: string;
}

const PLANS: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 79,
        description: 'Ideal für Einzelpraxen und Hausarztpraxen.',
        cta: 'Jetzt starten',
        highlighted: false,
        features: [
            '1 Arzt + 1 MFA',
            'Bis zu 200 Patienten/Monat',
            '270+ Anamnese-Fragen (13 Fachgebiete)',
            'DSGVO-konforme Speicherung (AES-256)',
            'PDF-Export & eIDAS-Signatur',
            'PWA-Patientenportal',
            '14 Tage kostenlos testen',
            'E-Mail-Support (48h)',
        ],
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 189,
        description: 'Für wachsende Praxen mit KI-Triage und unbegrenzten Patienten.',
        cta: 'Professional testen',
        highlighted: true,
        badge: 'Empfohlen',
        features: [
            'Bis zu 3 Ärzte + unbegrenzt MFA',
            'Unbegrenzte Patienten/Monat',
            'KI-Triage (10 CRITICAL/WARNING Regeln)',
            'KI-Therapievorschläge (ICD-10-GM)',
            'Echtzeit-Dashboard (Socket.IO)',
            'Telemedizin-Modul',
            'DiggAI 5-Agenten-System',
            'Geführtes Onboarding (Video-Call 60 Min)',
            'Prioritäts-Support (24h)',
            '14 Tage kostenlos testen',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 399,
        description: 'Für Facharztpraxen, MVZ und Klinikambulanzen.',
        cta: 'Enterprise anfragen',
        highlighted: false,
        badge: 'Full-Stack',
        features: [
            'Unbegrenzte Ärzte + MFA',
            'Unbegrenzte Patienten/Monat',
            'Alles aus Professional',
            'gematik TI + ePA-Anbindung',
            'PVS-Integration (GDT/HL7)',
            'NFC Tap-to-Pay Kiosk',
            'Weißes Label (eigenes Logo)',
            'AI Berater (automatisierte Praxisoptimierung)',
            'Persönliches Onboarding vor Ort (1 Tag)',
            '24/7 Phone-Support + SLA 4h',
        ],
    },
];

export function PricingSection() {
    useNavigate(); // für zukünftige Navigation
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ email: '', praxisName: '' });

    async function startCheckout(planId: 'starter' | 'professional' | 'enterprise') {
        if (!formData.email || !formData.praxisName) {
            setShowForm(planId);
            return;
        }

        setLoading(planId);
        setError(null);
        try {
            const res = await fetch('/api/checkout/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    email: formData.email,
                    praxisName: formData.praxisName,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.message || 'Fehler beim Checkout');
            window.location.href = data.url;
        } catch (err: any) {
            setError(err.message);
            setLoading(null);
        }
    }

    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Transparente Preise, keine versteckten Kosten
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        14 Tage kostenlos testen. Danach monatlich kündbar. Hosting in Deutschland, Abrechnung in EUR.
                    </p>
                </div>

                {error && (
                    <div className="max-w-md mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {PLANS.map(plan => (
                        <div
                            key={plan.id}
                            className={`rounded-2xl border-2 p-8 relative bg-white transition-all ${
                                plan.highlighted
                                    ? 'border-blue-500 shadow-xl shadow-blue-100 scale-105'
                                    : 'border-gray-200 shadow-sm hover:border-blue-200'
                            }`}
                        >
                            {plan.badge && (
                                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${
                                    plan.highlighted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {plan.badge}
                                </span>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-gray-900">€{plan.price}</span>
                                    <span className="text-gray-500">/Monat</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">zzgl. MwSt. · 14 Tage kostenlos</p>
                            </div>

                            <ul className="space-y-2.5 mb-8">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                                        <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* Inline form for email/praxisName before checkout */}
                            {showForm === plan.id && (
                                <div className="mb-4 space-y-2">
                                    <input
                                        type="email"
                                        placeholder="Praxis-E-Mail"
                                        value={formData.email}
                                        onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Praxisname"
                                        value={formData.praxisName}
                                        onChange={e => setFormData(d => ({ ...d, praxisName: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    if (plan.id === 'enterprise' && showForm !== 'enterprise') {
                                        document.getElementById('beratung')?.scrollIntoView({ behavior: 'smooth' });
                                    } else {
                                        startCheckout(plan.id);
                                    }
                                }}
                                disabled={loading === plan.id}
                                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                                    plan.highlighted
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                        : 'bg-gray-900 text-white hover:bg-gray-800'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading === plan.id ? 'Wird geladen...' : plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Custom/Volume note */}
                <div className="mt-12 text-center">
                    <p className="text-gray-600 text-sm">
                        MVZ mit mehr als 5 Ärzten oder Klinik?{' '}
                        <button
                            onClick={() => document.getElementById('beratung')?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-blue-600 font-semibold hover:underline"
                        >
                            Individuelles Angebot anfragen
                        </button>
                    </p>
                </div>

                {/* FAQ */}
                <div className="mt-16 max-w-3xl mx-auto">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Häufige Fragen</h3>
                    <div className="space-y-4">
                        {[
                            {
                                q: 'Kann ich nach dem Test kündigen?',
                                a: 'Ja. Kein Vertrag, keine Mindestlaufzeit. Sie können monatlich kündigen. Nach der 14-Tage-Testphase wird erst abgerechnet.',
                            },
                            {
                                q: 'Wo werden die Daten gespeichert?',
                                a: 'Ausschließlich auf deutschen Servern (Frankfurt, EU). Vollständig DSGVO-konform. Kein Transfer in Drittstaaten.',
                            },
                            {
                                q: 'Welche Zahlungsmethoden werden akzeptiert?',
                                a: 'Kreditkarte (Visa, Mastercard) und SEPA-Lastschrift. Abrechnung monatlich oder jährlich (10% Rabatt).',
                            },
                            {
                                q: 'Gibt es einen Auftragsverarbeitungsvertrag (AVV)?',
                                a: 'Ja. Der AVV gemäß DSGVO Art. 28 wird automatisch bei Vertragsabschluss bereitgestellt.',
                            },
                        ].map(faq => (
                            <details key={faq.q} className="bg-white border border-gray-200 rounded-xl p-4 group">
                                <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center">
                                    {faq.q}
                                    <span className="text-gray-400 text-lg group-open:rotate-45 transition-transform">+</span>
                                </summary>
                                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
