// ─── Pricing Table ─────────────────────────────────────────
// Displays 3-Tier Pricing with Stripe Checkout integration
// Starter / Professional / Enterprise

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, Building2, User, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StripeSetupIntentProvider } from './StripeProvider';
import { SetupIntentForm } from './CheckoutForm';

export interface PricingTier {
  id: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  name: string;
  price: number; // in cents
  priceFormatted: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  icon: React.ReactNode;
  ctaText: string;
}

export interface PricingTableProps {
  onSubscribe?: (tier: PricingTier['id']) => void;
  currentTier?: PricingTier['id'] | null;
  isLoading?: boolean;
}

/**
 * Pricing Table Component
 * 
 * Displays three subscription tiers with Stripe integration.
 * Handles subscription flow with Setup Intent for PCI compliance.
 */
export function PricingTable({ onSubscribe, currentTier, isLoading }: PricingTableProps) {
  const { t, i18n } = useTranslation();
  const [selectedTier, setSelectedTier] = useState<PricingTier['id'] | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSetupIntent, setIsCreatingSetupIntent] = useState(false);

  // Define pricing tiers
  const tiers: PricingTier[] = [
    {
      id: 'STARTER',
      name: t('pricing.starter.name', 'Starter'),
      price: 4900,
      priceFormatted: '€49.00',
      description: t('pricing.starter.description', 'Perfekt für kleine Praxen'),
      features: [
        t('pricing.starter.feature1', '1 Arzt'),
        t('pricing.starter.feature2', '100 Anamnesen/Monat'),
        t('pricing.starter.feature3', '2 Sprachen (DE/EN)'),
        t('pricing.starter.feature4', 'PDF-Export'),
        t('pricing.starter.feature5', 'E-Mail Support'),
      ],
      icon: <User className="w-6 h-6" />,
      ctaText: t('pricing.starter.cta', 'Kostenlos testen'),
    },
    {
      id: 'PROFESSIONAL',
      name: t('pricing.professional.name', 'Professional'),
      price: 9900,
      priceFormatted: '€99.00',
      description: t('pricing.professional.description', 'Für wachsende Praxen'),
      features: [
        t('pricing.professional.feature1', '3 Ärzte'),
        t('pricing.professional.feature2', 'Unlimitierte Anamnesen'),
        t('pricing.professional.feature3', '5 Sprachen'),
        t('pricing.professional.feature4', '500 KI-Auswertungen inkl.'),
        t('pricing.professional.feature5', 'PVS-Export'),
        t('pricing.professional.feature6', 'Priority Support'),
      ],
      highlighted: true,
      icon: <Sparkles className="w-6 h-6" />,
      ctaText: t('pricing.professional.cta', 'Kostenlos testen'),
    },
    {
      id: 'ENTERPRISE',
      name: t('pricing.enterprise.name', 'Enterprise'),
      price: 19900,
      priceFormatted: '€199.00',
      description: t('pricing.enterprise.description', 'Für große Praxen & Kliniken'),
      features: [
        t('pricing.enterprise.feature1', 'Unlimitierte Ärzte'),
        t('pricing.enterprise.feature2', 'Alle 10 Sprachen'),
        t('pricing.enterprise.feature3', 'Unlimitierte KI-Auswertungen'),
        t('pricing.enterprise.feature4', 'API-Zugang'),
        t('pricing.enterprise.feature5', 'Dedizierter Account Manager'),
        t('pricing.enterprise.feature6', 'Custom Integration'),
      ],
      icon: <Building2 className="w-6 h-6" />,
      ctaText: t('pricing.enterprise.cta', 'Kontaktieren Sie uns'),
    },
  ];

  const handleSelectTier = async (tier: PricingTier['id']) => {
    setSelectedTier(tier);
    setError(null);

    if (tier === 'ENTERPRISE') {
      // For Enterprise, redirect to contact form
      window.location.href = '/contact?plan=enterprise';
      return;
    }

    // Create setup intent for Starter and Professional
    setIsCreatingSetupIntent(true);
    try {
      // const response = await api.post('/billing/setup-intent', {});
      // setSetupIntentSecret(response.data.clientSecret);
      setSetupIntentSecret('seti_mock_secret');
      setShowPaymentModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      onSubscribe?.(tier);
    } finally {
      setIsCreatingSetupIntent(false);
    }
  };

  const handleSetupSuccess = () => {
    setShowPaymentModal(false);
    if (selectedTier) {
      onSubscribe?.(selectedTier);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
    }).format(price / 100);
  };

  return (
    <div className="w-full">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">{t('pricing.error', 'Fehler')}</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const isSelected = selectedTier === tier.id && isCreatingSetupIntent;

          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                tier.highlighted
                  ? 'border-blue-500 bg-blue-50/50 shadow-lg scale-105 z-10'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
            >
              {/* Badge */}
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                    {t('pricing.recommended', 'Empfohlen')}
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                    {t('pricing.current', 'Aktuell')}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                  tier.highlighted ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tier.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(tier.price)}
                  </span>
                  <span className="text-gray-500">/{t('pricing.month', 'Monat')}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {t('pricing.plusVat', 'zzgl. MwSt.')}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 ${
                      tier.highlighted ? 'text-blue-500' : 'text-green-500'
                    }`} />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleSelectTier(tier.id)}
                disabled={isCurrent || isLoading || isSelected}
                variant={tier.highlighted ? 'primary' : 'secondary'}
                className="w-full"
                size="lg"
              >
                {isSelected ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('pricing.loading', 'Lädt...')}
                  </>
                ) : isCurrent ? (
                  t('pricing.currentPlan', 'Aktueller Plan')
                ) : (
                  tier.ctaText
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={t('pricing.paymentTitle', 'Zahlungsmethode hinzufügen')}
        size="md"
      >
        <div className="p-4">
          <p className="text-gray-600 mb-6">
            {t('pricing.paymentDescription', 'Ihre Zahlungsmethode wird sicher bei Stripe gespeichert. Sie werden erst nach dem 14-tägigen Testzeitraum belastet.')}
          </p>
          
          {setupIntentSecret ? (
            <StripeSetupIntentProvider clientSecret={setupIntentSecret}>
              <SetupIntentForm
                onSuccess={handleSetupSuccess}
                onError={(err) => setError(err)}
                buttonText={t('pricing.startTrial', 'Testzeitraum starten')}
              />
            </StripeSetupIntentProvider>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </Modal>

      {/* Trust Badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>SSL-gesichert</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span>PCI-DSS Level 1</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>14 Tage kostenlos testen</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple Pricing Card for use in other contexts
 */
export function PricingCard({
  tier,
  onSelect,
  isCurrent,
}: {
  tier: PricingTier;
  onSelect?: () => void;
  isCurrent?: boolean;
}) {
  const { t, i18n } = useTranslation();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
    }).format(price / 100);
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${
      isCurrent ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
        {tier.highlighted && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            {t('pricing.recommended', 'Empfohlen')}
          </span>
        )}
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold">{formatPrice(tier.price)}</span>
        <span className="text-gray-500">/{t('pricing.month', 'Monat')}</span>
      </div>

      <ul className="space-y-2 mb-6">
        {tier.features.slice(0, 4).map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        onClick={onSelect}
        disabled={isCurrent}
        variant={isCurrent ? 'secondary' : 'primary'}
        className="w-full"
      >
        {isCurrent ? t('pricing.current', 'Aktuell') : tier.ctaText}
      </Button>
    </div>
  );
}

export default PricingTable;
