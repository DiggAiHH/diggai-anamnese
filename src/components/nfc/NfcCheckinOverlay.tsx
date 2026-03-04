// ═══════════════════════════════════════════════════════════════
// Modul 7: NFC Check-in Overlay Component
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NfcCheckinOverlayProps {
  checkpointType: string;
  roomName: string;
  onClose: () => void;
  onFeedback?: () => void;
}

export function NfcCheckinOverlay({ checkpointType, roomName, onClose, onFeedback }: NfcCheckinOverlayProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--bg-primary)] rounded-3xl p-8 mx-4 max-w-sm w-full shadow-2xl transform animate-in zoom-in-95 duration-300">
        {/* Success animation */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t('nfc.checkin_success', 'Erfolgreich eingecheckt!')}
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">{roomName}</p>
        </div>

        {/* Station-specific message */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
          {checkpointType === 'ENTRANCE' && (
            <p className="text-sm text-[var(--text-primary)]">
              {t('nfc.entrance_message', 'Willkommen! Bitte nehmen Sie im Wartezimmer Platz.')}
            </p>
          )}
          {checkpointType === 'WAITING' && (
            <p className="text-sm text-[var(--text-primary)]">
              {t('nfc.waiting_message', 'Sie sind registriert. Wir rufen Sie auf, sobald Sie an der Reihe sind.')}
            </p>
          )}
          {checkpointType === 'LAB' && (
            <p className="text-sm text-[var(--text-primary)]">
              {t('nfc.lab_message', 'Bitte setzen Sie sich hin. Die MFA wird gleich bei Ihnen sein.')}
            </p>
          )}
          {checkpointType === 'EKG' && (
            <p className="text-sm text-[var(--text-primary)]">
              {t('nfc.ekg_message', 'Bitte machen Sie den Oberkörper frei. Das EKG beginnt in Kürze.')}
            </p>
          )}
          {checkpointType === 'CONSULTATION' && (
            <p className="text-sm text-[var(--text-primary)]">
              {t('nfc.consultation_message', 'Der Arzt wird gleich bei Ihnen sein.')}
            </p>
          )}
          {checkpointType === 'CHECKOUT' && (
            <p className="text-sm text-[var(--text-primary)]">
              {t('nfc.checkout_message', 'Vielen Dank für Ihren Besuch! Gute Besserung.')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            {t('nfc.continue', 'Weiter')}
          </button>

          {checkpointType === 'CHECKOUT' && onFeedback && (
            <button
              onClick={onFeedback}
              className="w-full py-3 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl font-medium transition-colors border border-[var(--border-primary)]"
            >
              {t('nfc.leave_feedback', 'Feedback hinterlassen')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NfcCheckinOverlay;
