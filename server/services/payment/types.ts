// ─── Payment Service Types ─────────────────────────────────
// Modul 7/8: Kiosk + Payment

export interface PaymentIntent {
  id: string;
  sessionId: string;
  patientId: string;
  amount: number;
  currency: string;
  type: 'SELBSTZAHLER' | 'IGEL' | 'PRIVAT' | 'COPAYMENT';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  providerIntentId?: string;
  clientSecret?: string;
}

export interface CreatePaymentIntentInput {
  sessionId: string;
  patientId: string;
  amount: number;
  currency?: string;
  type: 'SELBSTZAHLER' | 'IGEL' | 'PRIVAT' | 'COPAYMENT';
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface NfcChargeInput {
  sessionId: string;
  patientId: string;
  amount: number;
  type: 'SELBSTZAHLER' | 'IGEL' | 'PRIVAT' | 'COPAYMENT';
  nfcCardToken: string;
  description?: string;
}

export interface PaymentWebhookEvent {
  type: string;
  data: {
    intentId: string;
    status: string;
    amount?: number;
    receiptUrl?: string;
    failureReason?: string;
  };
}

export interface PaymentReceipt {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description?: string;
  receiptUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  transactionCount: number;
  averageAmount: number;
  byType: { type: string; count: number; total: number }[];
  byStatus: { status: string; count: number }[];
  recentTransactions: PaymentReceipt[];
}

export const PAYMENT_PROVIDERS = ['stripe', 'adyen', 'sumup'] as const;
export type PaymentProvider = typeof PAYMENT_PROVIDERS[number];

export const SUPPORTED_CURRENCIES = ['EUR'] as const;
export const MAX_AMOUNT = 10000; // €10,000 max single transaction
export const MIN_AMOUNT = 0.50; // €0.50 minimum
