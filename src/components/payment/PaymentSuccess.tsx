// ─── Payment Success Component ─────────────────────────────
// Modul 7/8: Post-payment success screen with receipt

import { CheckCircle2, Receipt, Download, ArrowRight, Printer } from 'lucide-react';

interface PaymentSuccessProps {
  amount: number;
  transactionId: string;
  receiptUrl?: string;
  onContinue?: () => void;
}

export function PaymentSuccess({ amount, transactionId, receiptUrl, onContinue }: PaymentSuccessProps) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="max-w-md mx-auto text-center space-y-8 py-8">
      <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-14 h-14 text-green-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-green-700">Zahlung abgeschlossen</h2>
        <p className="text-4xl font-bold text-gray-800">{formatCurrency(amount)}</p>
        <p className="text-sm text-gray-400">
          Transaktions-ID: {transactionId.slice(0, 12)}...
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-medium text-gray-700 flex items-center gap-2">
          <Receipt className="w-4 h-4" /> Quittung
        </h3>
        <div className="flex gap-2">
          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Herunterladen
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Drucken
          </button>
        </div>
      </div>

      {onContinue && (
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Weiter <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default PaymentSuccess;
