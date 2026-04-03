import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Download,
  X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import {
  useSessions,
  useTerminateSession,
  useTerminateAllSessions,
  type Session,
} from '../../hooks/useSessions';
import {
  use2FAStatus,
  use2FASetup,
  useVerify2FASetup,
  useDisable2FA,
  type TwoFASetupResponse,
} from '../../hooks/use2FA';

// Utility
function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

interface SecuritySettingsState {
  hasPassword: boolean;
  trustedDevices: number;
}

/**
 * SecuritySettingsPage - User security settings and session management
 */
export function SecuritySettingsPage() {
  const { t } = useTranslation('security');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { data: twoFAStatus } = use2FAStatus();

  // Mock state - in production from API
  const [securityState] = useState<SecuritySettingsState>({
    hasPassword: true,
    trustedDevices: 2,
  });

  const hasMFA = twoFAStatus?.enabled ?? false;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {t('title', 'Sicherheit')}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {t('subtitle', 'Verwalten Sie Ihre Sicherheitseinstellungen und aktiven Sessions')}
          </p>
        </div>

        {/* Security Status Card */}
        <SecurityStatusCard state={securityState} hasMFA={hasMFA} />

        {/* Settings Sections */}
        <div className="space-y-4 mt-8">
          {/* Password Section */}
          <PasswordSection />

          {/* Two-Factor Authentication Section */}
          <TwoFactorSection hasMFA={hasMFA} />

          {/* Active Sessions Section */}
          <ActiveSessionsSection />

          {/* Trusted Devices Section */}
          <TrustedDevicesSection count={securityState.trustedDevices} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function SecurityStatusCard({ state, hasMFA }: { state: SecuritySettingsState; hasMFA: boolean }) {
  const { t } = useTranslation('security');

  const securityScore = calculateSecurityScore(state, hasMFA);

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t('score.title', 'Sicherheitsstatus')}
          </h2>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  securityScore >= 80 ? 'bg-green-500' :
                  securityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${securityScore}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {securityScore}%
            </span>
          </div>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {securityScore >= 80
              ? t('score.good', 'Ihr Account ist gut geschützt')
              : t('score.improve', 'Es gibt Verbesserungspotenzial')
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordSection() {
  const { t } = useTranslation('security');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-[var(--text-primary)]">
              {t('password.title', 'Passwort')}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('password.lastChanged', 'Zuletzt geändert vor 3 Monaten')}
            </p>
          </div>
        </div>
        <ChevronRight className={cn(
          'w-5 h-5 text-[var(--text-muted)] transition-transform',
          isOpen && 'rotate-90'
        )} />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-[var(--border-primary)]">
          <div className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="password"
                placeholder={t('password.current', 'Aktuelles Passwort')}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] text-[var(--text-primary)]"
              />
              <input
                type="password"
                placeholder={t('password.new', 'Neues Passwort')}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] text-[var(--text-primary)]"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>{t('password.reqLength', 'Mindestens 12 Zeichen')}</span>
            </div>

            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('password.change', 'Passwort ändern')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TwoFactorSection({ hasMFA }: { hasMFA: boolean }) {
  const { t } = useTranslation('security');
  const [isOpen, setIsOpen] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  return (
    <>
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-[var(--text-primary)]">
                {t('2fa.title', 'Zwei-Faktor-Authentifizierung')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {hasMFA
                  ? t('2fa.enabled', 'Aktiviert über Authenticator-App')
                  : t('2fa.disabled', 'Nicht aktiviert - erhöht die Sicherheit')
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMFA ? (
              <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                {t('active', 'Aktiv')}
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                {t('inactive', 'Inaktiv')}
              </span>
            )}
            <ChevronRight className={cn(
              'w-5 h-5 text-[var(--text-muted)] transition-transform',
              isOpen && 'rotate-90'
            )} />
          </div>
        </button>

        {isOpen && (
          <div className="px-6 pb-6 border-t border-[var(--border-primary)]">
            <div className="pt-4">
              {hasMFA ? (
                <TwoFAActiveView onDisable={() => setShowDisableModal(true)} />
              ) : (
                <TwoFAInactiveView onSetup={() => setShowSetupModal(true)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <TwoFASetupModal onClose={() => setShowSetupModal(false)} />
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <TwoFADisableModal onClose={() => setShowDisableModal(false)} />
      )}
    </>
  );
}

function TwoFAActiveView({ onDisable }: { onDisable: () => void }) {
  const { t } = useTranslation('security');

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">
              {t('2fa.active.title', '2FA ist aktiviert')}
            </p>
            <p className="text-sm text-green-700 mt-1">
              {t('2fa.active.description', 'Ihr Account ist zusätzlich geschützt.')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          {t('2fa.backupCodes', 'Backup-Codes anzeigen')}
        </button>
        <button 
          onClick={onDisable}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          {t('2fa.disable', '2FA deaktivieren')}
        </button>
      </div>
    </div>
  );
}

function TwoFAInactiveView({ onSetup }: { onSetup: () => void }) {
  const { t } = useTranslation('security');

  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">
              {t('2fa.inactive.title', '2FA ist nicht aktiviert')}
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              {t('2fa.inactive.description', 'Aktivieren Sie 2FA für zusätzlichen Schutz.')}
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={onSetup}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        {t('2fa.setup', '2FA einrichten')}
      </button>
    </div>
  );
}

function TwoFASetupModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('security');
  const setupMutation = use2FASetup();
  const verifyMutation = useVerify2FASetup();
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Start setup on mount
  useEffect(() => {
    setupMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data);
      },
      onError: () => {
        setError(t('2fa.errors.setupFailed', 'Setup fehlgeschlagen. Bitte versuchen Sie es erneut.'));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('2fa.errors.invalidCode', 'Bitte geben Sie einen gültigen 6-stelligen Code ein.'));
      return;
    }

    setError(null);
    verifyMutation.mutate(
      { code: verificationCode },
      {
        onSuccess: () => {
          onClose();
        },
        onError: () => {
          setError(t('2fa.errors.verifyFailed', 'Verifizierung fehlgeschlagen. Bitte überprüfen Sie den Code.'));
        },
      }
    );
  };

  const handleDownloadCodes = () => {
    if (!setupData?.backupCodes.length) return;

    const content = setupData.backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diggai-2fa-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('2fa.setup.title', '2FA Einrichtung')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Loading State */}
          {setupMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
              <p className="text-[var(--text-secondary)]">
                {t('2fa.setup.loading', 'QR-Code wird generiert...')}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !setupMutation.isPending && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Setup Content */}
          {setupData && !setupMutation.isPending && (
            <>
              {/* QR Code */}
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('2fa.setup.scanQr', 'Scannen Sie den QR-Code mit Ihrer Authenticator-App:')}
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={setupData.qrCodeUrl} 
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] text-center">
                  {t('2fa.setup.manualEntry', 'Manuelle Eingabe:')} {setupData.secret}
                </p>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  {t('2fa.setup.enterCode', 'Verifizierungscode eingeben')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                />
              </div>

              {/* Backup Codes */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 text-sm">
                      {t('2fa.setup.backupCodesTitle', 'Backup-Codes speichern')}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {t('2fa.setup.backupCodesDesc', 'Bewahren Sie diese Codes sicher auf. Sie ermöglichen den Zugriff, wenn Sie Ihr Gerät verlieren.')}
                    </p>
                    <button
                      onClick={handleDownloadCodes}
                      className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t('2fa.setup.downloadCodes', 'Codes herunterladen')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('cancel', 'Abbrechen')}
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending || verificationCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('verifying', 'Wird überprüft...')}
                    </>
                  ) : (
                    t('2fa.setup.verify', 'Aktivieren')
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TwoFADisableModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('security');
  const disableMutation = useDisable2FA();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDisable = () => {
    if (!code || code.length !== 6) {
      setError(t('2fa.errors.invalidCode', 'Bitte geben Sie einen gültigen 6-stelligen Code ein.'));
      return;
    }

    setError(null);
    disableMutation.mutate(
      { code },
      {
        onSuccess: () => {
          onClose();
        },
        onError: () => {
          setError(t('2fa.errors.disableFailed', 'Deaktivierung fehlgeschlagen. Bitte überprüfen Sie den Code.'));
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--bg-card)] rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('2fa.disableConfirm.title', '2FA deaktivieren')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">
                  {t('2fa.disableConfirm.warning', 'Sicherheitswarnung')}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {t('2fa.disableConfirm.description', 'Das Deaktivieren von 2FA verringert die Sicherheit Ihres Accounts. Sie müssen einen gültigen 2FA-Code eingeben, um fortzufahren.')}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Code Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              {t('2fa.disableConfirm.enterCode', '2FA-Code zur Bestätigung')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-input)] text-[var(--text-primary)]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('cancel', 'Abbrechen')}
            </button>
            <button
              onClick={handleDisable}
              disabled={disableMutation.isPending || code.length !== 6}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('disabling', 'Wird deaktiviert...')}
                </>
              ) : (
                t('2fa.disableConfirm.confirm', 'Deaktivieren')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveSessionsSection() {
  const { t } = useTranslation('security');
  const [isOpen, setIsOpen] = useState(false);
  const { data: sessions, isLoading } = useSessions();
  const terminateMutation = useTerminateSession();
  const terminateAllMutation = useTerminateAllSessions();

  const handleTerminate = (sessionId: string) => {
    terminateMutation.mutate(sessionId);
  };

  const handleTerminateAll = () => {
    terminateAllMutation.mutate();
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-[var(--text-primary)]">
              {t('sessions.title', 'Aktive Sitzungen')}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {isLoading
                ? t('sessions.loading', 'Laden...')
                : t('sessions.count', '{{count}} aktive Sitzungen', { count: sessions?.length || 0 })
              }
            </p>
          </div>
        </div>
        <ChevronRight className={cn(
          'w-5 h-5 text-[var(--text-muted)] transition-transform',
          isOpen && 'rotate-90'
        )} />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-[var(--border-primary)]">
          <div className="pt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {sessions?.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onTerminate={() => handleTerminate(session.id)}
                    isTerminating={terminateMutation.isPending && terminateMutation.variables === session.id}
                  />
                ))}

                {(sessions?.length || 0) > 1 && (
                  <button
                    onClick={handleTerminateAll}
                    disabled={terminateAllMutation.isPending}
                    className="w-full mt-4 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {terminateAllMutation.isPending
                      ? t('sessions.terminating', 'Wird beendet...')
                      : t('sessions.terminateAll', 'Alle anderen Sitzungen beenden')
                    }
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  onTerminate,
  isTerminating,
}: {
  session: Session;
  onTerminate: () => void;
  isTerminating: boolean;
}) {
  const { t } = useTranslation('security');

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      session.isCurrentSession
        ? 'border-blue-200 bg-blue-50'
        : 'border-[var(--border-primary)] bg-[var(--bg-primary)]'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            {session.deviceType === 'mobile' ? (
              <Smartphone className="w-5 h-5 text-gray-600" />
            ) : (
              <Monitor className="w-5 h-5 text-gray-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-[var(--text-primary)]">
                {session.deviceName}
              </p>
              {session.isCurrentSession && (
                <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                  {t('sessions.current', 'Aktuell')}
                </span>
              )}
              {session.isTrusted && (
                <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                  {t('sessions.trusted', 'Vertraut')}
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              {session.browser} • {session.os}
            </p>

            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
              <span>{session.location}</span>
              <span>•</span>
              <span>{session.ipHash}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(session.lastActiveAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {!session.isCurrentSession && (
          <button
            onClick={onTerminate}
            disabled={isTerminating}
            className="text-sm text-red-600 hover:text-red-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTerminating
              ? t('sessions.terminating', 'Wird beendet...')
              : t('sessions.terminate', 'Beenden')
            }
          </button>
        )}
      </div>
    </div>
  );
}

function TrustedDevicesSection({ count }: { count: number }) {
  const { t } = useTranslation('security');

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">
              {t('devices.title', 'Vertraute Geräte')}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('devices.count', '{{count}} vertraute Geräte', { count })}
            </p>
          </div>
        </div>

        <button className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
          {t('devices.manage', 'Verwalten')}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function calculateSecurityScore(state: SecuritySettingsState, hasMFA: boolean): number {
  let score = 0;

  // Password: 30 points
  if (state.hasPassword) score += 30;

  // MFA: 40 points
  if (hasMFA) score += 40;

  // Trusted devices: 10 points (max)
  score += Math.min(state.trustedDevices * 5, 10);

  // Session management: 20 points (placeholder, will be updated with real data)
  score += 20;

  return Math.min(100, score);
}

export default SecuritySettingsPage;
