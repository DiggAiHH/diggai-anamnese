import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, Zap, Building2, Loader2 } from 'lucide-react';

interface PricingTier {
    id: string;
    name: string;
    price: number;
    period: string;
    description: string;
    features: string[];
    cta: string;
    highlighted?: boolean;
    badge?: string;
    stripePriceId?: string;
}

/**
 * Pricing Page — DiggAI Tarifmodell
 * 
 * Zeigt 3 Tarife: Starter, Professional, Enterprise
 * Mit Stripe Checkout Integration und responsive Design
 */
export function Pricing() {
    const { t } = useTranslation();
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    // KORRIGIERTE PREISE (Meta-Synthese Fix #1)
    // Alte Preise führten zu LTV/CAC < 1 (Kapitalvernichtung)
    // Neue Preise: 79€/179€/349€ + 299€ Setup-Fee
    const tiers: PricingTier[] = [
        {
            id: 'essential',
            name: t('pricing.essential.name', 'ESSENTIAL'),
            price: 79,
            period: t('pricing.period_month', '/Monat'),
            description: t('pricing.essential.description', 'Für Einzelpraxen'),
            features: [
                t('pricing.essential.feature1', '1 Arzt'),
                t('pricing.essential.feature2', '200 Anamnesen/Monat'),
                t('pricing.essential.feature3', '3 Sprachen (DE/EN/TR)'),
                t('pricing.essential.feature4', 'PDF-Export'),
                t('pricing.essential.feature5', 'PVS-Integration'),
                t('pricing.essential.feature6', 'E-Mail Support'),
            ],
            cta: t('pricing.essential.cta', 'Jetzt starten'),
            stripePriceId: 'price_essential_xxx',
        },
        {
            id: 'professional',
            name: t('pricing.professional.name', 'PROFESSIONAL'),
            price: 179,
            period: t('pricing.period_month', '/Monat'),
            description: t('pricing.professional.description', 'Für wachsende Praxen'),
            features: [
                t('pricing.professional.feature1', '5 Ärzte'),
                t('pricing.professional.feature2', 'Unlimitierte Anamnesen'),
                t('pricing.professional.feature3', '8 Sprachen'),
                t('pricing.professional.feature4', 'KI-Auswertung inklusive'),
                t('pricing.professional.feature5', 'API-Zugang'),
                t('pricing.professional.feature6', 'Priority Support'),
                t('pricing.professional.feature7', 'PVS-Integration'),
            ],
            cta: t('pricing.professional.cta', 'Empfohlen wählen'),
            highlighted: true,
            badge: t('pricing.badge_best_value', 'Best Value'),
            stripePriceId: 'price_professional_xxx',
        },
        {
            id: 'enterprise',
            name: t('pricing.enterprise.name', 'ENTERPRISE'),
            price: 349,
            period: t('pricing.period_month', '/Monat'),
            description: t('pricing.enterprise.description', 'Für Großpraxen & Kliniken'),
            features: [
                t('pricing.enterprise.feature1', 'Unlimitierte Ärzte'),
                t('pricing.enterprise.feature2', 'Alle 10 Sprachen'),
                t('pricing.enterprise.feature3', 'White-Label Option'),
                t('pricing.enterprise.feature4', 'Custom PVS-Integration'),
                t('pricing.enterprise.feature5', 'SLA 99.9%'),
                t('pricing.enterprise.feature6', 'Dedizierter Account Manager'),
                t('pricing.enterprise.feature7', 'Prioritäres Feature-Development'),
            ],
            cta: t('pricing.enterprise.cta', 'Kontaktieren Sie uns'),
            stripePriceId: 'price_enterprise_xxx',
        },
    ];

    const handleCheckout = async (tier: PricingTier) => {
        if (tier.id === 'enterprise') {
            // Enterprise: Kontaktformular oder Mailto
            window.location.href = 'mailto:sales@diggai.de?subject=Enterprise%20Anfrage';
            return;
        }

        setLoadingTier(tier.id);

        try {
            // Stripe Checkout Session erstellen
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: tier.stripePriceId,
                    tierId: tier.id,
                    successUrl: `${window.location.origin}/pricing/success`,
                    cancelUrl: `${window.location.origin}/pricing`,
                }),
            });

            if (!response.ok) {
                throw new Error('Checkout session creation failed');
            }

            const { url } = await response.json();

            // Redirect zu Stripe Checkout
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            // Fallback: Stripe Checkout direkt öffnen (für Demo/Entwicklung)
            alert(t('pricing.checkout_error', 'Checkout ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt.'));
        } finally {
            setLoadingTier(null);
        }
    };

    const getTierIcon = (tierId: string) => {
        switch (tierId) {
            case 'essential':
                return <Zap className="w-6 h-6" />;
            case 'professional':
                return <Sparkles className="w-6 h-6" />;
            case 'enterprise':
                return <Building2 className="w-6 h-6" />;
            default:
                return null;
        }
    };

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] py-16 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                        {t('pricing.title', 'Wählen Sie Ihren Tarif')}
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                        {t('pricing.subtitle', 'Flexible Preise für jede Praxisgröße')}
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`
                                relative rounded-2xl p-8 transition-all duration-300
                                ${tier.highlighted
                                    ? 'bg-[var(--bg-card)] border-2 border-blue-500 shadow-xl shadow-blue-500/10 scale-105 md:scale-110 z-10'
                                    : 'bg-[var(--bg-card)] border border-[var(--border-primary)] shadow-lg hover:shadow-xl'
                                }
                            `}
                        >
                            {/* Badge */}
                            {tier.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold shadow-lg">
                                        <Sparkles className="w-4 h-4" />
                                        {tier.badge}
                                    </span>
                                </div>
                            )}

                            {/* Tier Header */}
                            <div className="text-center mb-8">
                                <div className={`
                                    inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4
                                    ${tier.highlighted ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}
                                `}>
                                    {getTierIcon(tier.id)}
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                                    {tier.name}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {tier.description}
                                </p>
                            </div>

                            {/* Price */}
                            <div className="text-center mb-8">
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-2xl font-semibold text-[var(--text-secondary)]">€</span>
                                    <span className="text-5xl font-bold text-[var(--text-primary)]">{tier.price}</span>
                                    <span className="text-[var(--text-secondary)]">{tier.period}</span>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8">
                                {tier.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className={`
                                            flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                                            ${tier.highlighted ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}
                                        `}>
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-sm text-[var(--text-primary)]">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                onClick={() => handleCheckout(tier)}
                                disabled={loadingTier === tier.id}
                                className={`
                                    w-full py-3.5 px-6 rounded-xl font-semibold text-sm
                                    transition-all duration-200 flex items-center justify-center gap-2
                                    ${tier.highlighted
                                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                                        : 'bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--border-primary)]/50'
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {loadingTier === tier.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('pricing.loading', 'Wird geladen...')}
                                    </>
                                ) : (
                                    tier.cta
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="mt-16 text-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                        {t('pricing.footer_note', 'Alle Preise zzgl. MwSt. Jederzeit kündbar. 14 Tage Geld-zurück-Garantie.')}
                    </p>
                </div>

                {/* Trust Badges */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span>{t('pricing.trust1', 'DSGVO-konform')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span>{t('pricing.trust2', 'AES-256 Verschlüsselung')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span>{t('pricing.trust3', 'Made in Germany')}</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
