// ─── usePayment Hook ───────────────────────────────────────
// Stripe Payment Integration für Kiosk-Modus (Patientenzahlungen vor Ort)

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

// ─── Types ─────────────────────────────────────────────────

export type PaymentType = 'SELBSTZAHLER' | 'IGEL' | 'PRIVAT' | 'COPAYMENT';

export type PaymentState = 
  | 'BETRAG_EINGEBEN' 
  | 'ZAHLUNGSMETHODE_WÄHLEN' 
  | 'KARTE_TIPPEN' 
  | 'VERARBEITUNG' 
  | 'ERFOLG' 
  | 'FEHLER';

export interface PaymentIntentData {
  sessionId: string;
  patientId: string;
  amount: number;
  currency: 'EUR';
  type: PaymentType;
  description?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
}

export interface NfcPaymentData {
  sessionId: string;
  patientId: string;
  amount: number;
  currency: 'EUR';
  type: PaymentType;
  description?: string;
  token?: string;
}

export interface NfcPaymentResponse {
  success: boolean;
  transactionId: string;
  receiptUrl: string;
  amount: number;
  timestamp: string;
}

export interface ReceiptData {
  transactionId: string;
  amount: number;
  currency: string;
  type: PaymentType;
  description?: string;
  timestamp: string;
  patientName?: string;
  receiptNumber: string;
}

export interface PaymentError {
  code: string;
  message: string;
  declineCode?: string;
}

// ─── Payment Type Labels ───────────────────────────────────

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  SELBSTZAHLER: 'Selbstzahler',
  IGEL: 'IGeL-Leistung',
  PRIVAT: 'Privatrechnung',
  COPAYMENT: 'Zuzahlung',
};

export const PAYMENT_TYPE_DESCRIPTIONS: Record<PaymentType, string> = {
  SELBSTZAHLER: 'Direktzahlung durch den Patienten',
  IGEL: 'Individuelle Gesundheitsleistung (nicht von der KV abgedeckt)',
  PRIVAT: 'Rechnung für Privatpatienten',
  COPAYMENT: 'Zuzahlung nach §§ 28, 62 SGB V',
};

// ─── Hook ──────────────────────────────────────────────────

export interface UsePaymentReturn {
  // State
  state: PaymentState;
  loading: boolean;
  error: PaymentError | null;
  paymentIntent: PaymentIntentResponse | null;
  transaction: NfcPaymentResponse | null;
  receipt: ReceiptData | null;

  // Actions
  createPaymentIntent: (data: PaymentIntentData) => Promise<PaymentIntentResponse | null>;
  processNfcPayment: (data: NfcPaymentData) => Promise<NfcPaymentResponse | null>;
  confirmCardPayment: (clientSecret: string, paymentMethodId: string) => Promise<boolean>;
  getReceipt: (transactionId: string) => Promise<ReceiptData | null>;
  
  // State Management
  setPaymentState: (state: PaymentState) => void;
  reset: () => void;
  clearError: () => void;
}

/**
 * Hook für Stripe Payment Integration im Kiosk-Modus
 * Unterstützt Payment Intents, NFC/Tap-to-Pay und Quittungen
 */
export function usePayment(): UsePaymentReturn {
  const [state, setState] = useState<PaymentState>('BETRAG_EINGEBEN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [transaction, setTransaction] = useState<NfcPaymentResponse | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(() => {
    setState('BETRAG_EINGEBEN');
    setLoading(false);
    setError(null);
    setPaymentIntent(null);
    setTransaction(null);
    setReceipt(null);
  }, []);

  const setPaymentState = useCallback((newState: PaymentState) => {
    setState(newState);
  }, []);

  /**
   * Erstellt einen Payment Intent über das Backend
   */
  const createPaymentIntent = useCallback(async (
    data: PaymentIntentData
  ): Promise<PaymentIntentResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<PaymentIntentResponse>('/payment/intent', {
        sessionId: data.sessionId,
        patientId: data.patientId,
        amount: Math.round(data.amount * 100), // Convert to cents for Stripe
        currency: data.currency,
        type: data.type,
        description: data.description,
      });

      setPaymentIntent(response.data);
      setState('ZAHLUNGSMETHODE_WÄHLEN');
      return response.data;
    } catch (err) {
      const paymentError: PaymentError = {
        code: 'payment_intent_failed',
        message: err instanceof Error ? err.message : 'Payment Intent konnte nicht erstellt werden',
      };
      setError(paymentError);
      setState('FEHLER');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verarbeitet NFC/Tap-to-Pay Zahlung
   */
  const processNfcPayment = useCallback(async (
    data: NfcPaymentData
  ): Promise<NfcPaymentResponse | null> => {
    setLoading(true);
    setError(null);
    setState('VERARBEITUNG');

    try {
      // Simulate network delay for NFC tap detection (in real implementation, this would be actual NFC)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await apiClient.post<NfcPaymentResponse>('/payment/nfc', {
        sessionId: data.sessionId,
        patientId: data.patientId,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        type: data.type,
        description: data.description,
        token: data.token,
      });

      setTransaction(response.data);
      setState('ERFOLG');
      return response.data;
    } catch (err) {
      const paymentError: PaymentError = {
        code: 'nfc_payment_failed',
        message: err instanceof Error ? err.message : 'NFC-Zahlung fehlgeschlagen',
      };
      setError(paymentError);
      setState('FEHLER');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Bestätigt eine Kartenzahlung mit Stripe
   */
  const confirmCardPayment = useCallback(async (
    _clientSecret: string,
    _paymentMethodId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setState('VERARBEITUNG');

    try {
      // In a real implementation, this would use Stripe.js
      // const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      //   payment_method: paymentMethodId
      // });
      
      // For now, simulate the confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success (90% success rate)
      const success = Math.random() > 0.1;
      
      if (success) {
        setState('ERFOLG');
        return true;
      } else {
        throw new Error('Kartenzahlung wurde abgelehnt');
      }
    } catch (err) {
      const paymentError: PaymentError = {
        code: 'card_declined',
        message: err instanceof Error ? err.message : 'Kartenzahlung fehlgeschlagen',
        declineCode: 'generic_decline',
      };
      setError(paymentError);
      setState('FEHLER');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Ruft die Quittung für eine Transaktion ab
   */
  const getReceipt = useCallback(async (
    transactionId: string
  ): Promise<ReceiptData | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<ReceiptData>(`/payment/receipt/${transactionId}`);
      setReceipt(response.data);
      return response.data;
    } catch (err) {
      const paymentError: PaymentError = {
        code: 'receipt_failed',
        message: err instanceof Error ? err.message : 'Quittung konnte nicht geladen werden',
      };
      setError(paymentError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    state,
    loading,
    error,
    paymentIntent,
    transaction,
    receipt,
    createPaymentIntent,
    processNfcPayment,
    confirmCardPayment,
    getReceipt,
    setPaymentState,
    reset,
    clearError,
  };
}

export default usePayment;
