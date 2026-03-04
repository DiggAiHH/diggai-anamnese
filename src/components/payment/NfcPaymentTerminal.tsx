// ─── NFC Payment Terminal ──────────────────────────────────
// Modul 7/8: Tap-to-Pay UI component for kiosk/checkout

import { useState } from 'react';
import { CreditCard, Wifi, CheckCircle2, XCircle, Loader2, ShieldCheck, Receipt } from 'lucide-react';

type PaymentState = 'idle' | 'waiting' | 'processing' | 'success' | 'error';
type PaymentType = 'SELBSTZAHLER' | 'IGEL' | 'PRIVAT' | 'COPAYMENT';

interface NfcPaymentTerminalProps {
  sessionId: string;
  patientId: string;
  amount: number;
  type: PaymentType;
  description?: string;
  onSuccess?: (transactionId: string, receiptUrl: string) => void;
  onCancel?: () => void;
}

export function NfcPaymentTerminal({
  sessionId: _sessionId,
  patientId: _patientId,
  amount,
  type,
  description,
  onSuccess,
  onCancel,
}: NfcPaymentTerminalProps) {
  const [state, setState] = useState<PaymentState>('idle');
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  const startPayment = async () => {
    setState('waiting');

    // Simulate NFC tap detection + processing
    await new Promise(r => setTimeout(r, 3000));
    setState('processing');
    await new Promise(r => setTimeout(r, 2000));

    // In production: would call api.paymentNfcCharge()
    const success = Math.random() > 0.1; // 90% success rate in demo
    if (success) {
      const txId = `tx_${Date.now()}`;
      const url = `/api/payment/receipt/${txId}`;
      setReceiptUrl(url);
      setState('success');
      onSuccess?.(txId, url);
    } else {
      setState('error');
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  const typeLabels: Record<PaymentType, string> = {
    SELBSTZAHLER: 'Selbstzahler',
    IGEL: 'IGeL-Leistung',
    PRIVAT: 'Privatrechnung',
    COPAYMENT: 'Zuzahlung',
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        {/* Amount Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
          <p className="text-sm opacity-80 mb-1">{typeLabels[type]}</p>
          <p className="text-4xl font-bold">{formatCurrency(amount)}</p>
          {description && <p className="text-sm opacity-70 mt-1">{description}</p>}
        </div>

        {/* Payment Area */}
        <div className="p-8">
          {state === 'idle' && (
            <div className="text-center space-y-6">
              <button
                onClick={startPayment}
                className="w-full py-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all shadow-lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <CreditCard className="w-7 h-7" />
                  <span>Jetzt bezahlen</span>
                </div>
              </button>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <ShieldCheck className="w-4 h-4" />
                <span>PCI DSS-konform · Keine Kartendaten gespeichert</span>
              </div>
              {onCancel && (
                <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">
                  Abbrechen
                </button>
              )}
            </div>
          )}

          {state === 'waiting' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-24 h-24 mx-auto bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
                <Wifi className="w-12 h-12 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-800">Karte bereithalten</p>
                <p className="text-gray-500 mt-1">Halten Sie Ihre Karte an das Terminal</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {state === 'processing' && (
            <div className="text-center space-y-4 py-4">
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
              <p className="text-lg text-gray-600">Zahlung wird verarbeitet...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-green-700">Bezahlung erfolgreich!</p>
                <p className="text-gray-500 mt-1">{formatCurrency(amount)} abgebucht</p>
              </div>
              {receiptUrl && (
                <button className="flex items-center justify-center gap-2 mx-auto px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all">
                  <Receipt className="w-4 h-4" /> Quittung anzeigen
                </button>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-700">Zahlung fehlgeschlagen</p>
                <p className="text-gray-500 mt-1">Bitte versuchen Sie es erneut</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setState('idle')}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  Erneut versuchen
                </button>
                {onCancel && (
                  <button onClick={onCancel} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                    Abbrechen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NfcPaymentTerminal;
