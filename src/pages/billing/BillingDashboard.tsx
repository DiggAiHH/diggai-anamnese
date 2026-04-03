/**
 * Billing Dashboard Page
 *
 * Vollständige Abonnement-Verwaltung für Ärzte mit:
 * - Abonnement-Status Anzeige
 * - KI-Nutzungs-Quota Fortschrittsbalken
 * - Upgrade/Downgrade Buttons
 * - Stripe Portal Integration
 * - Nächste Abrechnung Anzeige
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Receipt,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useSubscription, type Subscription } from '../../hooks/useBilling';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────────

interface StripePortalResponse {
  url: string;
}

type SubscriptionTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'PAST_DUE';

// ─── Helper Functions ─────────────────────────────────────────

/**
 * Formatiert einen Unix-Timestamp zu einem lokalisierten Datum
 */
function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatiert einen Betrag in Euro
 */
function formatCurrency(amount: number | undefined, currency: string = 'EUR'): string {
  if (amount === undefined || amount === null) return '-';
  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount / 100);
}

/**
 * Gibt die deutsche Übersetzung für den Tarif zurück
 */
function getTierLabel(tier: SubscriptionTier | undefined, t: (key: string) => string): string {
  switch (tier) {
    case 'STARTER':
      return t('billing.tier.starter');
    case 'PROFESSIONAL':
      return t('billing.tier.professional');
    case 'ENTERPRISE':
      return t('billing.tier.enterprise');
    default:
      return t('billing.tier.unknown');
  }
}

/**
 * Gibt die deutsche Übersetzung für den Status zurück
 */
function getStatusLabel(status: SubscriptionStatus | undefined, t: (key: string) => string): string {
  switch (status) {
    case 'ACTIVE':
      return t('billing.status.active');
    case 'TRIAL':
      return t('billing.status.trial');
    case 'CANCELLED':
      return t('billing.status.cancelled');
    case 'PAST_DUE':
      return t('billing.status.pastDue');
    default:
      return t('billing.status.unknown');
  }
}

/**
 * Gibt die Farb-Konfiguration für den Status zurück
 */
function getStatusConfig(status: SubscriptionStatus | undefined): {
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'ACTIVE':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: <CheckCircle className="w-4 h-4 mr-1.5" />,
      };
    case 'TRIAL':
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        icon: <Clock className="w-4 h-4 mr-1.5" />,
      };
    case 'CANCELLED':
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        icon: <XCircle className="w-4 h-4 mr-1.5" />,
      };
    case 'PAST_DUE':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        icon: <AlertCircle className="w-4 h-4 mr-1.5" />,
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        icon: <AlertCircle className="w-4 h-4 mr-1.5" />,
      };
  }
}

// ─── Components ───────────────────────────────────────────────

interface SubscriptionStatusCardProps {
  subscription: Subscription | null | undefined;
  t: any;
}

/**
 * Card zur Anzeige des Abonnement-Status
 */
function SubscriptionStatusCard({ subscription, t }: SubscriptionStatusCardProps): React.ReactElement {
  const statusConfig = getStatusConfig(subscription?.status);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#2C5F8A] flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('billing.subscription.title', 'Abonnement')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('billing.subscription.subtitle', 'Ihr aktueller Plan')}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
        >
          {statusConfig.icon}
          {getStatusLabel(subscription?.status, t)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-1">
            {t('billing.tier.label', 'Tarif')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {getTierLabel(subscription?.tier, t)}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500 mb-1">
            {subscription?.status === 'TRIAL'
              ? t('billing.trialEnds', 'Testphase endet')
              : t('billing.renewsAt', 'Verlängert am')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDate(subscription?.currentPeriodEnd)}
          </p>
          {subscription?.cancelAtPeriodEnd && (
            <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('billing.willCancel', 'Wird gekündigt')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AIQuotaUsageBarProps {
  used: number;
  total: number;
  t: any;
}

/**
 * Fortschrittsbalken für KI-Nutzung
 */
function AIQuotaUsageBar({ used, total, t }: AIQuotaUsageBarProps): React.ReactElement {
  const isUnlimited = total === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((used / total) * 100));
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('billing.aiQuota.title', 'KI-Analysen')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('billing.aiQuota.subtitle', 'Nutzung diesen Monat')}
          </p>
        </div>
      </div>

      {isUnlimited ? (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-xl">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            {t('billing.aiQuota.unlimited', 'Unbegrenzte KI-Nutzung')}
          </span>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {used.toLocaleString('de-DE')} {t('billing.aiQuota.of', 'von')}{' '}
              {total.toLocaleString('de-DE')} {t('billing.aiQuota.analyses', 'Analysen')}
            </span>
            <span
              className={`text-sm font-semibold ${
                isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'
              }`}
            >
              {percentage}%
            </span>
          </div>

          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isDanger
                  ? 'bg-red-500'
                  : isWarning
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-[#4A90E2] to-[#2C5F8A]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {isWarning && (
            <div
              className={`flex items-center gap-2 text-sm ${
                isDanger ? 'text-red-600' : 'text-amber-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                {isDanger
                  ? t('billing.aiQuota.danger', 'Fast aufgebraucht! Bitte upgraden Sie.')
                  : t('billing.aiQuota.warning', 'Mehr als 80% aufgebraucht')}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface NextBillingCardProps {
  subscription: Subscription | null | undefined;
  t: any;
}

/**
 * Card zur Anzeige der nächsten Abrechnung
 */
function NextBillingCard({ subscription, t }: NextBillingCardProps): React.ReactElement | null {
  // Für Demo-Zwecke: Wenn keine Subscription-Daten verfügbar, zeigen wir Beispieldaten
  const amount = subscription?.currentPeriodEnd ? 29900 : undefined; // 299,00 EUR
  const date = subscription?.currentPeriodEnd;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#81B29A] to-[#5A8F76] flex items-center justify-center">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('billing.nextBilling.title', 'Nächste Abrechnung')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('billing.nextBilling.subtitle', 'Automatische Abbuchung')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">{t('billing.amount', 'Betrag')}</span>
          <span className="text-xl font-bold text-gray-900">
            {subscription?.tier === 'STARTER'
              ? '99,00 €'
              : subscription?.tier === 'PROFESSIONAL'
              ? '299,00 €'
              : subscription?.tier === 'ENTERPRISE'
              ? '799,00 €'
              : '-'}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">{t('billing.date', 'Datum')}</span>
          <span className="font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            {formatDate(date)}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">{t('billing.paymentMethod', 'Zahlungsmethode')}</span>
          <span className="font-medium text-gray-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            •••• 4242
          </span>
        </div>
      </div>
    </div>
  );
}

interface UpgradeDowngradeButtonsProps {
  currentTier: SubscriptionTier | undefined;
  onUpgrade: () => void;
  onDowngrade: () => void;
  t: any;
}

/**
 * Buttons für Upgrade/Downgrade
 */
function UpgradeDowngradeButtons({
  currentTier,
  onUpgrade,
  onDowngrade,
  t,
}: UpgradeDowngradeButtonsProps): React.ReactElement | null {
  const canUpgrade = currentTier === 'STARTER';
  const canDowngrade = currentTier === 'PROFESSIONAL';

  if (!canUpgrade && !canDowngrade) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {canUpgrade && (
        <Button
          variant="success"
          size="lg"
          className="flex-1"
          onClick={onUpgrade}
          icon={<ArrowUpRight className="w-5 h-5" />}
        >
          {t('billing.upgradeToProfessional', 'Upgrade zu Professional')}
        </Button>
      )}
      {canDowngrade && (
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={onDowngrade}
          icon={<ArrowDownRight className="w-5 h-5" />}
        >
          {t('billing.downgradeToStarter', 'Downgrade zu Starter')}
        </Button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export interface BillingDashboardProps {
  /** Callback bei erfolgreichem Portal-Öffnen */
  onPortalOpen?: () => void;
  /** Callback bei Fehler */
  onError?: (error: Error) => void;
}

/**
 * Billing Dashboard Page
 *
 * Hauptkomponente für die Abonnement-Verwaltung.
 * Zeigt Abonnement-Status, KI-Nutzung, nächste Abrechnung und bietet
 * Zugriff auf das Stripe Customer Portal.
 */
export function BillingDashboard({ onPortalOpen, onError }: BillingDashboardProps): React.ReactElement {
  const { t } = useTranslation();
  const { data: subscriptionData, isLoading, error } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const subscription = subscriptionData?.subscription;

  /**
   * Öffnet das Stripe Customer Portal
   */
  const openStripePortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const response = await apiClient.post<StripePortalResponse>('/checkout/portal');
      const { url } = response.data;

      if (url) {
        window.location.href = url;
        onPortalOpen?.();
      } else {
        throw new Error('Keine Portal-URL erhalten');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      const error = new Error(`Portal konnte nicht geöffnet werden: ${errorMessage}`);
      onError?.(error);
      console.error('Stripe Portal Error:', err);
    } finally {
      setPortalLoading(false);
    }
  }, [onPortalOpen, onError]);

  /**
   * Handler für Upgrade zu Professional
   */
  const handleUpgrade = useCallback(() => {
    openStripePortal();
  }, [openStripePortal]);

  /**
   * Handler für Downgrade zu Starter
   */
  const handleDowngrade = useCallback(() => {
    openStripePortal();
  }, [openStripePortal]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#4A90E2] mx-auto mb-4" />
          <p className="text-gray-600">{t('billing.loading', 'Abonnement wird geladen...')}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-2xl border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            {t('billing.error.title', 'Fehler beim Laden')}
          </h2>
          <p className="text-red-700 mb-4">
            {t('billing.error.message', 'Ihre Abonnement-Daten konnten nicht geladen werden.')}
          </p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t('common.retry', 'Erneut versuchen')}
          </Button>
        </div>
      </div>
    );
  }

  // No Subscription State
  if (!subscriptionData?.hasSubscription) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('billing.noSubscription.title', 'Kein aktives Abonnement')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('billing.noSubscription.message', 'Sie haben noch kein Abonnement. Wählen Sie einen Plan, um loszulegen.')}
          </p>
          <Button onClick={() => (window.location.href = '/pricing')} size="lg" className="w-full">
            {t('billing.noSubscription.cta', 'Plan auswählen')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('billing.pageTitle', 'Abonnement-Verwaltung')}
        </h1>
        <p className="text-gray-600">
          {t('billing.pageSubtitle', 'Verwalten Sie Ihr Abonnement, Zahlungsmethoden und Rechnungen')}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Subscription Status */}
        <div className="lg:col-span-2 space-y-6">
          <SubscriptionStatusCard subscription={subscription} t={t} />
          <AIQuotaUsageBar
            used={subscription?.aiQuotaUsed || 0}
            total={subscription?.aiQuotaTotal || 0}
            t={t}
          />
        </div>

        {/* Right Column - Next Billing & Actions */}
        <div className="space-y-6">
          <NextBillingCard subscription={subscription} t={t} />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={openStripePortal}
              loading={portalLoading}
              icon={<ExternalLink className="w-5 h-5" />}
            >
              {t('billing.openStripePortal', 'Zum Stripe Portal')}
            </Button>

            <UpgradeDowngradeButtons
              currentTier={subscription?.tier}
              onUpgrade={handleUpgrade}
              onDowngrade={handleDowngrade}
              t={t}
            />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              {t('billing.info.title', 'Was können Sie im Stripe Portal tun?')}
            </h3>
            <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
              <li>{t('billing.info.paymentMethods', 'Zahlungsmethoden verwalten')}</li>
              <li>{t('billing.info.invoices', 'Rechnungen einsehen und herunterladen')}</li>
              <li>{t('billing.info.cancel', 'Abonnement kündigen')}</li>
              <li>{t('billing.info.update', 'Rechnungsadresse aktualisieren')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for lazy loading compatibility
export default BillingDashboard;
