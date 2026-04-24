// ─── useBilling Hook ───────────────────────────────────────
// React Query hooks for Stripe Billing API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// ─── Types ─────────────────────────────────────────────────

export interface Subscription {
  id: string;
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIAL';
  stripeStatus: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  aiQuotaUsed: number;
  aiQuotaTotal: number;
  startedAt: string;
  endsAt: string | null;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  subscription: Subscription | null;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  pdfUrl: string | null;
  subscription: string | null;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  upcoming: {
    amountDue: number;
    currency: string;
    periodStart: number;
    periodEnd: number;
  } | null;
}

export interface CreateSubscriptionInput {
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  priceId?: string;
  trial?: boolean;
}

export interface SetupIntentResponse {
  clientSecret: string;
  customerId: string;
}

// ─── Query Keys ────────────────────────────────────────────

const BILLING_KEYS = {
  all: ['billing'] as const,
  subscription: () => [...BILLING_KEYS.all, 'subscription'] as const,
  paymentMethods: () => [...BILLING_KEYS.all, 'paymentMethods'] as const,
  invoices: () => [...BILLING_KEYS.all, 'invoices'] as const,
};

// ─── Query Hooks ───────────────────────────────────────────

/**
 * Get current subscription status
 */
export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: BILLING_KEYS.subscription(),
    queryFn: async () => {
      const response = await apiClient.get<SubscriptionStatus>('/billing/subscription');
      return response.data;
    },
  });
}

/**
 * Get saved payment methods
 */
export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: BILLING_KEYS.paymentMethods(),
    queryFn: async () => {
      const response = await apiClient.get<{ methods: PaymentMethod[] }>('/billing/payment-methods');
      return response.data.methods;
    },
  });
}

/**
 * Get invoices and upcoming invoice
 */
export function useInvoices() {
  return useQuery<InvoicesResponse>({
    queryKey: BILLING_KEYS.invoices(),
    queryFn: async () => {
      const response = await apiClient.get<InvoicesResponse>('/billing/invoices');
      return response.data;
    },
  });
}

// ─── Mutation Hooks ────────────────────────────────────────

/**
 * Create Setup Intent for saving payment method
 */
export function useCreateSetupIntent() {
  return useMutation<SetupIntentResponse, Error, { customerId?: string; email?: string }>({
    mutationFn: async (data) => {
      const response = await apiClient.post<SetupIntentResponse>('/billing/setup-intent', data);
      return response.data;
    },
  });
}

/**
 * Create new subscription
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<
    { subscriptionId: string; clientSecret: string | null; status: string },
    Error,
    CreateSubscriptionInput
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post<{ subscriptionId: string; clientSecret: string | null; status: string }>('/billing/subscription', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate subscription query to refetch
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription() });
    },
  });
}

/**
 * Cancel subscription at period end
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; cancelAtPeriodEnd: boolean; currentPeriodEnd: number },
    Error
  >({
    mutationFn: async () => {
      const response = await apiClient.delete<{ success: boolean; cancelAtPeriodEnd: boolean; currentPeriodEnd: number }>('/billing/subscription');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription() });
    },
  });
}

// ─── Composite Hook ────────────────────────────────────────

interface UseBillingReturn {
  // Queries
  subscription: ReturnType<typeof useSubscription>;
  paymentMethods: ReturnType<typeof usePaymentMethods>;
  invoices: ReturnType<typeof useInvoices>;

  // Mutations
  createSetupIntent: ReturnType<typeof useCreateSetupIntent>;
  createSubscription: ReturnType<typeof useCreateSubscription>;
  cancelSubscription: ReturnType<typeof useCancelSubscription>;

  // Helpers
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  canUseAi: boolean;
}

/**
 * Composite hook for all billing operations
 */
export function useBilling(): UseBillingReturn {
  const subscription = useSubscription();
  const paymentMethods = usePaymentMethods();
  const invoices = useInvoices();

  const createSetupIntent = useCreateSetupIntent();
  const createSubscription = useCreateSubscription();
  const cancelSubscription = useCancelSubscription();

  const hasActiveSubscription = 
    !!subscription.data?.hasSubscription && 
    (subscription.data.subscription?.status === 'ACTIVE' || 
     subscription.data.subscription?.status === 'TRIAL') || false;

  const isInTrial = 
    subscription.data?.subscription?.status === 'TRIAL' || false;

  const canUseAi = 
    hasActiveSubscription && 
    (subscription.data?.subscription?.aiQuotaTotal === -1 ||
     (subscription.data?.subscription?.aiQuotaUsed || 0) < 
     (subscription.data?.subscription?.aiQuotaTotal || 0));

  return {
    subscription,
    paymentMethods,
    invoices,
    createSetupIntent,
    createSubscription,
    cancelSubscription,
    hasActiveSubscription,
    isInTrial,
    canUseAi,
  };
}

export default useBilling;
