// ─── Kiosk Payment Terminal ────────────────────────────────
// Stripe Payment Integration für Kiosk-Modus (Patientenzahlungen vor Ort)
// Touch-optimierte UI mit großen Buttons und hohem Kontrast

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CreditCard, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  Receipt,
  Printer,
  ArrowLeft,
  RotateCcw,
  Euro,
  Smartphone,
  Banknote,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { 
  usePayment, 
  type PaymentType, 
  type PaymentState,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPE_DESCRIPTIONS
} from '../../hooks/usePayment';

// ─── Types ─────────────────────────────────────────────────

interface KioskPaymentTerminalProps {
  sessionId: string;
  patientId: string;
  defaultAmount?: number;
  defaultType?: PaymentType;
  onSuccess?: (receipt: { transactionId: string; amount: number; receiptUrl: string }) => void;
  onError?: (error: { code: string; message: string }) => void;
  onCancel?: () => void;
}

type PaymentMethod = 'card' | 'nfc' | 'cash';

// ─── Constants ─────────────────────────────────────────────

const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 9999.99;

const PAYMENT_TYPES: PaymentType[] = ['SELBSTZAHLER', 'IGEL', 'PRIVAT', 'COPAYMENT'];

// ─── Component ─────────────────────────────────────────────

export function KioskPaymentTerminal({
  sessionId,
  patientId,
  defaultAmount = 29.99,
  defaultType = 'IGEL',
  onSuccess,
  onError,
  onCancel,
}: KioskPaymentTerminalProps) {
  const { i18n, t } = useTranslation();
  const payment = usePayment();
  
  // Local state
  const [amount, setAmount] = useState<string>(defaultAmount.toFixed(2));
  const [paymentType, setPaymentType] = useState<PaymentType>(defaultType);
  const [description, setDescription] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Currency formatter
  const formatCurrency = useCallback((n: number) => {
    return new Intl.NumberFormat(i18n.language, { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(n);
  }, [i18n.language]);

  // Parse amount string to number
  const parseAmount = useCallback((value: string): number => {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }, []);

  // Handle amount input
  const handleAmountChange = useCallback((value: string) => {
    // Only allow numbers, comma and dot
    const cleaned = value.replace(/[^\d.,]/g, '');
    setAmount(cleaned);
  }, []);

  // Validate amount
  const isValidAmount = useCallback((): boolean => {
    const num = parseAmount(amount);
    return num >= MIN_AMOUNT && num <= MAX_AMOUNT;
  }, [amount, parseAmount]);

  // Quick amount buttons
  const quickAmounts = [10, 20, 29.99, 50, 100];

  // Start payment flow
  const handleStartPayment = useCallback(async () => {
    if (!isValidAmount()) return;

    const numAmount = parseAmount(amount);
    
    await payment.createPaymentIntent({
      sessionId,
      patientId,
      amount: numAmount,
      currency: 'EUR',
      type: paymentType,
      description: description || undefined,
    });
  }, [payment, sessionId, patientId, amount, paymentType, description, isValidAmount, parseAmount]);

  // Handle payment method selection
  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method === 'nfc') {
      payment.setPaymentState('KARTE_TIPPEN');
      // Auto-start NFC after animation
      setTimeout(() => {
        payment.processNfcPayment({
          sessionId,
          patientId,
          amount: parseAmount(amount),
          currency: 'EUR',
          type: paymentType,
          description: description || undefined,
        });
      }, 1500);
    } else if (method === 'card') {
      payment.setPaymentState('VERARBEITUNG');
      // Simulate card payment
      setTimeout(() => {
        payment.confirmCardPayment('pi_mock_secret', 'pm_mock');
      }, 1000);
    }
  }, [payment, sessionId, patientId, amount, paymentType, description, parseAmount]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    payment.clearError();
    if (selectedMethod === 'nfc') {
      payment.setPaymentState('KARTE_TIPPEN');
      setTimeout(() => {
        payment.processNfcPayment({
          sessionId,
          patientId,
          amount: parseAmount(amount),
          currency: 'EUR',
          type: paymentType,
          description: description || undefined,
        });
      }, 1500);
    } else {
      payment.setPaymentState('ZAHLUNGSMETHODE_WÄHLEN');
    }
  }, [payment, sessionId, patientId, amount, paymentType, description, selectedMethod, parseAmount]);

  // Handle new payment
  const handleNewPayment = useCallback(() => {
    payment.reset();
    setAmount(defaultAmount.toFixed(2));
    setPaymentType(defaultType);
    setDescription('');
    setSelectedMethod(null);
    setShowTypeDropdown(false);
  }, [payment, defaultAmount, defaultType]);

  // Effect: Notify parent on success/error changes
  useEffect(() => {
    if (payment.state === 'ERFOLG' && payment.transaction && onSuccess) {
      onSuccess({
        transactionId: payment.transaction.transactionId,
        amount: payment.transaction.amount,
        receiptUrl: payment.transaction.receiptUrl,
      });
    }
  }, [payment.state, payment.transaction, onSuccess]);

  useEffect(() => {
    if (payment.error && onError) {
      onError({
        code: payment.error.code,
        message: payment.error.message,
      });
    }
  }, [payment.error, onError]);

  // ─── Render Helpers ──────────────────────────────────────

  const renderAmountInput = () => (
    <div className="space-y-6">
      {/* Amount Display */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-gray-200">
        <label className="text-sm text-gray-500 mb-2 block">{t('payment.amount', 'Betrag')}</label>
        <div className="flex items-center justify-center gap-2">
          <Euro className="w-8 h-8 text-gray-400" />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-5xl font-bold text-center bg-transparent border-none outline-none w-48 text-gray-800"
            placeholder="0.00"
            aria-label={t('payment.amountInput', 'Betrag eingeben')}
          />
        </div>
        {!isValidAmount() && amount && (
          <p className="text-red-500 text-sm mt-2 flex items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {t('payment.invalidAmount', 'Bitte gültigen Betrag eingeben')}
          </p>
        )}
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-5 gap-3">
        {quickAmounts.map((quickAmount) => (
          <button
            key={quickAmount}
            onClick={() => setAmount(quickAmount.toFixed(2))}
            className="py-4 px-2 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-blue-500 hover:bg-blue-50 active:scale-95 transition-all min-h-[64px]"
          >
            {formatCurrency(quickAmount)}
          </button>
        ))}
      </div>

      {/* Payment Type Dropdown */}
      <div className="relative">
        <label className="text-sm text-gray-500 mb-2 block">{t('payment.type', 'Leistungstyp')}</label>
        <button
          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
          className="w-full py-4 px-4 bg-white border-2 border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-blue-500 transition-all min-h-[64px]"
        >
          <div>
            <span className="font-semibold text-gray-800">{PAYMENT_TYPE_LABELS[paymentType]}</span>
            <p className="text-xs text-gray-500">{PAYMENT_TYPE_DESCRIPTIONS[paymentType]}</p>
          </div>
          <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showTypeDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {PAYMENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setPaymentType(type);
                  setShowTypeDropdown(false);
                }}
                className={`w-full py-4 px-4 text-left hover:bg-blue-50 transition-colors ${paymentType === type ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
              >
                <span className="font-semibold text-gray-800">{PAYMENT_TYPE_LABELS[type]}</span>
                <p className="text-xs text-gray-500">{PAYMENT_TYPE_DESCRIPTIONS[type]}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description Input (Optional) */}
      <div>
        <label className="text-sm text-gray-500 mb-2 block">{t('payment.description', 'Beschreibung (optional)')}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('payment.descriptionPlaceholder', 'z.B. Behandlung vom 01.04.2026')}
          className="w-full py-4 px-4 bg-white border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none min-h-[64px]"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4">
        <button
          onClick={handleStartPayment}
          disabled={!isValidAmount() || payment.loading}
          className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg min-h-[72px]"
        >
          {payment.loading ? (
            <span className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              {t('payment.processing', 'Wird verarbeitet...')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <CreditCard className="w-6 h-6" />
              {t('payment.continue', 'Weiter zur Zahlung')}
            </span>
          )}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-4 text-gray-500 hover:text-gray-700 font-medium min-h-[56px]"
          >
            {t('common.cancel', 'Abbrechen')}
          </button>
        )}
      </div>
    </div>
  );

  const renderPaymentMethodSelection = () => (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl text-center">
        <p className="text-sm opacity-80 mb-1">{PAYMENT_TYPE_LABELS[paymentType]}</p>
        <p className="text-4xl font-bold">{formatCurrency(parseAmount(amount))}</p>
        {description && <p className="text-sm opacity-70 mt-1 truncate">{description}</p>}
      </div>

      <h3 className="text-xl font-bold text-gray-800 text-center">
        {t('payment.selectMethod', 'Zahlungsmethode wählen')}
      </h3>

      {/* Payment Methods */}
      <div className="space-y-4">
        <button
          onClick={() => handleSelectMethod('nfc')}
          className="w-full py-6 px-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center gap-4 min-h-[80px]"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Wifi className="w-7 h-7 text-blue-600" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-lg text-gray-800">{t('payment.nfc', 'Karte tippen')}</p>
            <p className="text-sm text-gray-500">{t('payment.nfcDescription', 'Kontaktlos mit EC- oder Kreditkarte')}</p>
          </div>
          <ArrowLeft className="w-6 h-6 text-gray-400 rotate-180" />
        </button>

        <button
          onClick={() => handleSelectMethod('card')}
          className="w-full py-6 px-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center gap-4 min-h-[80px]"
        >
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-7 h-7 text-green-600" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-lg text-gray-800">{t('payment.card', 'Karte einstecken')}</p>
            <p className="text-sm text-gray-500">{t('payment.cardDescription', 'EC-Karte oder Kreditkarte mit Chip/PIN')}</p>
          </div>
          <ArrowLeft className="w-6 h-6 text-gray-400 rotate-180" />
        </button>

        <button
          onClick={() => handleSelectMethod('cash')}
          className="w-full py-6 px-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center gap-4 min-h-[80px]"
        >
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Banknote className="w-7 h-7 text-amber-600" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-lg text-gray-800">{t('payment.cash', 'Barzahlung')}</p>
            <p className="text-sm text-gray-500">{t('payment.cashDescription', 'Bargeld an der Rezeption')}</p>
          </div>
          <ArrowLeft className="w-6 h-6 text-gray-400 rotate-180" />
        </button>
      </div>

      {/* Back Button */}
      <button
        onClick={() => payment.setPaymentState('BETRAG_EINGEBEN')}
        className="w-full py-4 text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2 min-h-[56px]"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('common.back', 'Zurück')}
      </button>
    </div>
  );

  const renderNfcTap = () => (
    <div className="text-center space-y-8 py-8">
      <div className="w-32 h-32 mx-auto bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
        <Wifi className="w-16 h-16 text-blue-500" />
      </div>
      
      <div>
        <p className="text-2xl font-bold text-gray-800 mb-2">
          {t('payment.tapCard', 'Karte bereithalten')}
        </p>
        <p className="text-gray-500">
          {t('payment.tapCardDescription', 'Halten Sie Ihre Karte an das Terminal')}
        </p>
      </div>

      {/* Animated NFC Waves */}
      <div className="flex items-center justify-center gap-1">
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Amount Display */}
      <div className="bg-gray-50 rounded-xl p-4 inline-block">
        <p className="text-sm text-gray-500">{PAYMENT_TYPE_LABELS[paymentType]}</p>
        <p className="text-2xl font-bold text-gray-800">{formatCurrency(parseAmount(amount))}</p>
      </div>

      {/* Cancel Button */}
      <button
        onClick={() => payment.setPaymentState('ZAHLUNGSMETHODE_WÄHLEN')}
        className="text-gray-500 hover:text-gray-700 font-medium"
      >
        {t('common.cancel', 'Abbrechen')}
      </button>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center space-y-8 py-12">
      <Loader2 className="w-20 h-20 mx-auto text-blue-500 animate-spin" />
      <div>
        <p className="text-2xl font-bold text-gray-800 mb-2">
          {t('payment.processingPayment', 'Zahlung wird verarbeitet...')}
        </p>
        <p className="text-gray-500">
          {t('payment.pleaseWait', 'Bitte warten Sie einen Moment')}
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4 max-w-xs mx-auto">
        <p className="text-sm text-gray-500">{PAYMENT_TYPE_LABELS[paymentType]}</p>
        <p className="text-2xl font-bold text-gray-800">{formatCurrency(parseAmount(amount))}</p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <ShieldCheck className="w-4 h-4" />
        <span>PCI DSS-konform · SSL-verschlüsselt</span>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-8 py-6">
      {/* Success Animation */}
      <div className="w-28 h-28 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
        <CheckCircle2 className="w-14 h-14 text-green-600" />
      </div>

      {/* Success Message */}
      <div>
        <p className="text-3xl font-bold text-green-700 mb-2">
          {t('payment.success', 'Zahlung erfolgreich!')}
        </p>
        <p className="text-gray-600">
          {t('payment.thankYou', 'Vielen Dank für Ihre Zahlung')}
        </p>
      </div>

      {/* Receipt Card */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 max-w-sm mx-auto text-left">
        <div className="flex items-center gap-2 text-gray-500 mb-4 pb-4 border-b">
          <Receipt className="w-5 h-5" />
          <span className="font-medium">{t('payment.receipt', 'Quittung')}</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('payment.amount', 'Betrag')}:</span>
            <span className="font-bold text-gray-800">{formatCurrency(parseAmount(amount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('payment.type', 'Typ')}:</span>
            <span className="text-gray-800">{PAYMENT_TYPE_LABELS[paymentType]}</span>
          </div>
          {payment.transaction && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t('payment.transactionId', 'Transaktion')}:</span>
              <span className="text-gray-800 font-mono text-sm">
                {payment.transaction.transactionId.slice(0, 12)}...
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">{t('payment.date', 'Datum')}:</span>
            <span className="text-gray-800">{new Date().toLocaleDateString(i18n.language)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 max-w-sm mx-auto">
        <button
          onClick={() => window.print()}
          className="w-full py-4 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[64px]"
        >
          <Printer className="w-5 h-5" />
          {t('payment.printReceipt', 'Quittung drucken')}
        </button>
        
        {payment.transaction?.receiptUrl && (
          <a
            href={payment.transaction.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[64px]"
          >
            <Receipt className="w-5 h-5" />
            {t('payment.downloadReceipt', 'Quittung herunterladen')}
          </a>
        )}
        
        <button
          onClick={handleNewPayment}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[64px]"
        >
          <RotateCcw className="w-5 h-5" />
          {t('payment.newPayment', 'Neue Zahlung')}
        </button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-8 py-6">
      {/* Error Animation */}
      <div className="w-28 h-28 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
        <XCircle className="w-14 h-14 text-red-600" />
      </div>

      {/* Error Message */}
      <div>
        <p className="text-2xl font-bold text-red-700 mb-2">
          {t('payment.error', 'Zahlung fehlgeschlagen')}
        </p>
        <p className="text-gray-600">
          {payment.error?.message || t('payment.tryAgain', 'Bitte versuchen Sie es erneut')}
        </p>
      </div>

      {/* Error Details */}
      {payment.error?.code && (
        <div className="bg-red-50 rounded-xl p-4 max-w-sm mx-auto">
          <p className="text-sm text-red-600">
            {t('payment.errorCode', 'Fehlercode')}: {payment.error.code}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 max-w-sm mx-auto">
        <button
          onClick={handleRetry}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all min-h-[64px]"
        >
          {t('payment.retry', 'Erneut versuchen')}
        </button>
        
        <button
          onClick={() => payment.setPaymentState('ZAHLUNGSMETHODE_WÄHLEN')}
          className="w-full py-4 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all min-h-[64px]"
        >
          {t('payment.changeMethod', 'Andere Zahlungsmethode')}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium"
          >
            {t('common.cancel', 'Abbrechen')}
          </button>
        )}
      </div>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────

  const renderContent = () => {
    switch (payment.state) {
      case 'BETRAG_EINGEBEN':
        return renderAmountInput();
      case 'ZAHLUNGSMETHODE_WÄHLEN':
        return renderPaymentMethodSelection();
      case 'KARTE_TIPPEN':
        return renderNfcTap();
      case 'VERARBEITUNG':
        return renderProcessing();
      case 'ERFOLG':
        return renderSuccess();
      case 'FEHLER':
        return renderError();
      default:
        return renderAmountInput();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{t('payment.terminal', 'Zahlungsterminal')}</h2>
            <p className="text-xs text-gray-500">{t('payment.secure', 'Sichere Zahlungsabwicklung')}</p>
          </div>
        </div>
        {onCancel && payment.state === 'BETRAG_EINGEBEN' && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('common.close', 'Schließen')}
          >
            <XCircle className="w-6 h-6 text-gray-400" />
          </button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" />
          <span>PCI DSS</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Smartphone className="w-4 h-4" />
          <span>NFC</span>
        </div>
        <span>•</span>
        <span>SSL-verschlüsselt</span>
      </div>
    </div>
  );
}

export default KioskPaymentTerminal;
