// ═══════════════════════════════════════════════════════════════
// Modul 7: Checkout Wizard — Post-visit data handling
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type CheckoutAction = 'keep' | 'export' | 'delete';

interface CheckoutWizardProps {
  sessionId: string;
  onComplete?: (action: CheckoutAction) => void;
}

export function CheckoutWizard({ sessionId: _sessionId, onComplete }: CheckoutWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'choose' | 'confirm' | 'done'>('choose');
  const [selectedAction, setSelectedAction] = useState<CheckoutAction | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedAction) return;
    setLoading(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    setStep('done');
    setLoading(false);
    onComplete?.(selectedAction);
  };

  const actions: { key: CheckoutAction; icon: string; title: string; desc: string; color: string }[] = [
    {
      key: 'keep',
      icon: '📁',
      title: t('checkout.keep_title', 'Daten aufbewahren'),
      desc: t('checkout.keep_desc', 'Ihre Daten werden 30 Tage sicher gespeichert und danach automatisch gelöscht.'),
      color: 'border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    },
    {
      key: 'export',
      icon: '📤',
      title: t('checkout.export_title', 'Daten exportieren'),
      desc: t('checkout.export_desc', 'Laden Sie Ihre Daten als PDF oder JSON herunter, bevor sie gelöscht werden.'),
      color: 'border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20',
    },
    {
      key: 'delete',
      icon: '🗑️',
      title: t('checkout.delete_title', 'Sofort löschen'),
      desc: t('checkout.delete_desc', 'Alle personenbezogenen Daten werden umgehend und unwiderruflich gelöscht (DSGVO Art. 17).'),
      color: 'border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20',
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {step === 'choose' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <span className="text-4xl mb-3 block">👋</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {t('checkout.title', 'Vielen Dank für Ihren Besuch!')}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              {t('checkout.subtitle', 'Was möchten Sie mit Ihren Daten tun?')}
            </p>
          </div>

          {actions.map(action => (
            <button
              key={action.key}
              onClick={() => { setSelectedAction(action.key); setStep('confirm'); }}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${action.color} ${
                selectedAction === action.key ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{action.icon}</span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{action.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{action.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 'confirm' && selectedAction && (
        <div className="text-center space-y-6">
          <span className="text-5xl block">{actions.find(a => a.key === selectedAction)?.icon}</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t('checkout.confirm_title', 'Bitte bestätigen')}
          </h2>
          <p className="text-[var(--text-secondary)]">
            {actions.find(a => a.key === selectedAction)?.desc}
          </p>

          {selectedAction === 'delete' && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                ⚠️ {t('checkout.delete_warning', 'Diese Aktion kann nicht rückgängig gemacht werden!')}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('choose')}
              className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl font-medium border border-[var(--border-primary)]"
            >
              {t('checkout.back', 'Zurück')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-white transition-colors ${
                selectedAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {loading ? t('checkout.processing', 'Verarbeite…') : t('checkout.confirm', 'Bestätigen')}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t('checkout.done', 'Erledigt!')}
          </h2>
          <p className="text-[var(--text-secondary)]">
            {t('checkout.done_message', 'Wir wünschen Ihnen gute Besserung. Auf Wiedersehen!')}
          </p>
        </div>
      )}
    </div>
  );
}

export default CheckoutWizard;
