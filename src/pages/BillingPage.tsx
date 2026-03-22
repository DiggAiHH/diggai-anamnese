// ─── Billing Page ──────────────────────────────────────────
// Example page demonstrating Stripe Integration v2 usage

import { useTranslation } from 'react-i18next';
import { StripeProvider } from '../components/billing/StripeProvider';
import { PricingTable } from '../components/billing/PricingTable';
import { useBilling } from '../hooks/useBilling';
import { Loader2, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';

/**
 * Billing Page
 * 
 * Demonstrates:
 * - StripeProvider wrapping
 * - PricingTable integration
 * - useBilling hook usage
 * - Subscription status display
 */
export default function BillingPage() {
  const { t } = useTranslation();
  const {
    subscription,
    paymentMethods,
    invoices,
    cancelSubscription,
    hasActiveSubscription,
    isInTrial,
    canUseAi,
  } = useBilling();

  const handleSubscribe = async (tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE') => {
    // This is called after successful payment method collection
    console.log('Subscription selected:', tier);
    // Optionally show success toast or redirect
  };

  const handleCancel = async () => {
    if (confirm(t('billing.confirmCancel', 'Möchten Sie Ihr Abonnement wirklich kündigen?'))) {
      await cancelSubscription.mutateAsync();
    }
  };

  // Loading state
  if (subscription.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const sub = subscription.data?.subscription;

  return (
    <StripeProvider>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('billing.title', 'Abonnement & Billing')}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('billing.subtitle', 'Verwalten Sie Ihr Abonnement, Zahlungsmethoden und Rechnungen')}
          </p>
        </div>

        {/* Current Subscription Status */}
        {hasActiveSubscription && sub && (
          <div className="mb-12 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('billing.currentPlan', 'Aktuelles Abonnement')}
              </h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                sub.status === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
                sub.status === 'PAST_DUE' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {sub.status === 'ACTIVE' && <CheckCircle className="w-4 h-4 mr-1" />}
                {sub.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500">{t('billing.tier', 'Tarif')}</p>
                <p className="text-lg font-medium">{sub.tier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('billing.aiQuota', 'KI-Nutzung')}</p>
                <p className="text-lg font-medium">
                  {sub.aiQuotaTotal === -1 ? '∞' : `${sub.aiQuotaUsed} / ${sub.aiQuotaTotal}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('billing.renewsAt', 'Verlängert am')}</p>
                <p className="text-lg font-medium">
                  {new Date(sub.currentPeriodEnd * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>

            {isInTrial && (
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="text-blue-700">
                  {t('billing.trialActive', 'Sie befinden sich in der 14-tägigen Testphase.')}
                </p>
              </div>
            )}

            {sub.cancelAtPeriodEnd && (
              <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                <p className="text-yellow-700">
                  {t('billing.willCancel', 'Ihr Abonnement endet am {{date}}', {
                    date: new Date(sub.currentPeriodEnd * 1000).toLocaleDateString()
                  })}
                </p>
              </div>
            )}

            {!sub.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                disabled={cancelSubscription.isPending}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                {cancelSubscription.isPending 
                  ? t('billing.cancelling', 'Wird gekündigt...')
                  : t('billing.cancel', 'Abonnement kündigen')
                }
              </button>
            )}
          </div>
        )}

        {/* Pricing Table */}
        {!hasActiveSubscription && (
          <div className="mb-12">
            <PricingTable
              onSubscribe={handleSubscribe}
              currentTier={sub?.tier || null}
            />
          </div>
        )}

        {/* Payment Methods */}
        {paymentMethods.data && paymentMethods.data.length > 0 && (
          <div className="mb-12 p-6 bg-white rounded-xl border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('billing.paymentMethods', 'Zahlungsmethoden')}
            </h2>
            <div className="space-y-3">
              {paymentMethods.data.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium capitalize">{method.card?.brand}</p>
                      <p className="text-sm text-gray-500">
                        •••• {method.card?.last4} | {method.card?.expMonth}/{method.card?.expYear}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        {invoices.data?.invoices && invoices.data.invoices.length > 0 && (
          <div className="p-6 bg-white rounded-xl border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('billing.invoices', 'Rechnungen')}
            </h2>
            <div className="space-y-3">
              {invoices.data.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invoice.number || 'Rechnung'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(invoice.created * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {(invoice.amountDue / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </p>
                    <span className={`text-sm ${
                      invoice.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StripeProvider>
  );
}
