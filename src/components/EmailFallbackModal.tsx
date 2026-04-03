import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmailFallbackModalProps {
  open: boolean;
  onContinuePhoneOnly: () => void;
  onProvideEmail: () => void;
  isLoading?: boolean;
}

/**
 * EmailFallbackModal
 * 
 * Graceful fallback for new patients who don't have an email address.
 * 
 * Handles:
 * - Explains why email is important (system digitalization)
 * - Offers phone-only fallback for accessibility
 * - Sets patient flag: emailStatus = PHONE_ONLY
 * 
 * This ensures we don't exclude:
 * - Elderly patients (nicht-digital)
 * - Users without email (extremly rare in 2026)
 * - But encourages email for better UX/process efficiency
 */
export const EmailFallbackModal: React.FC<EmailFallbackModalProps> = ({
  open,
  onContinuePhoneOnly,
  onProvideEmail,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={() => {}} // Non-dismissible — forces a decision
      size="md"
      showCloseButton={false}
      trapFocus={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {t('emailFallback.title', 'Keine E-Mail-Adresse?')}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t('emailFallback.subtitle', 'Das ist verstanden — hier sind Ihre Optionen:')}
            </p>
          </div>
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        </div>

        {/* Explanation */}
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-3">
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm mb-2">
              ✉️ {t('emailFallback.whyEmail', 'Warum ist eine E-Mail wichtig?')}
            </h3>
            <ul className="text-xs text-[var(--text-muted)] space-y-1">
              <li>✓ {t('emailFallback.benefit1', 'Schnellere Terminbestätigungen')}</li>
              <li>✓ {t('emailFallback.benefit2', 'Rezepte digital übertragen')}</li>
              <li>✓ {t('emailFallback.benefit3', 'Erinnerungen vor Terminen')}</li>
              <li>✓ {t('emailFallback.benefit4', 'Unser System funktioniert damit besser')}</li>
            </ul>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400">
            {t('emailFallback.warning', 'Wenn Sie jetzt keine E-Mail angeben, werden wir Sie auf dem Telefonweg kontaktieren. Das ist möglich, dauert aber länger.')}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="primary"
            onClick={onProvideEmail}
            disabled={isLoading}
            fullWidth
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            {t('emailFallback.buttonProvideNow', '📧 Jetzt E-Mail eingeben')}
          </Button>

          <Button
            variant="secondary"
            onClick={onContinuePhoneOnly}
            disabled={isLoading}
            fullWidth
          >
            {t('emailFallback.buttonPhoneOnly', '📞 Ohne E-Mail weitermachen')}
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-[var(--text-muted)] text-center">
          {t('emailFallback.footer', 'Sie können Ihre E-Mail jederzeit später in Ihrem Profil hinzufügen.')}
        </p>
      </div>
    </Modal>
  );
};
