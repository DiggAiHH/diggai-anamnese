import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Smartphone, History, AlertTriangle } from 'lucide-react';
import { TOTPInput } from '../components/auth/TOTPInput';

// Sections
function PasswordChangeSection() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError(t('security.passwordsDontMatch', 'Passwörter stimmen nicht überein'));
      return;
    }
    
    if (newPassword.length < 12) {
      setError(t('security.passwordTooShort', 'Mindestens 12 Zeichen'));
      return;
    }
    
    // TODO: API call
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          {t('security.password.title', 'Passwort ändern')}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('security.password.current', 'Aktuelles Passwort')}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('security.password.new', 'Neues Passwort')}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('security.password.requirements', 'Mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Zahl, Sonderzeichen')}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('security.password.confirm', 'Passwort bestätigen')}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-green-600 text-sm">
            {t('security.password.success', 'Passwort erfolgreich geändert')}
          </div>
        )}
        
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('security.password.submit', 'Passwort ändern')}
        </button>
      </form>
    </section>
  );
}

function TwoFactorSection() {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'intro' | 'qr' | 'verify' | 'backup'>('intro');
  const [verificationCode, setVerificationCode] = useState('');

  const handleEnable = () => {
    setShowSetup(true);
    setSetupStep('intro');
  };

  const handleVerify = () => {
    // TODO: API call
    setSetupStep('backup');
  };

  if (showSetup) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {t('security.2fa.setup.title', 'Zwei-Faktor-Authentifizierung einrichten')}
          </h2>
        </div>
        
        {setupStep === 'intro' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('security.2fa.setup.description', 
                '2FA schützt Ihren Account zusätzlich. Sie benötigen eine Authentifizierungs-App wie Google Authenticator oder 1Password.')}
            </p>
            <button
              onClick={() => setSetupStep('qr')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('security.2fa.setup.start', 'Einrichtung starten')}
            </button>
          </div>
        )}
        
        {setupStep === 'qr' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('security.2fa.setup.scan', 'Scannen Sie den QR-Code mit Ihrer Authentifizierungs-App:')}
            </p>
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              {/* QR Code placeholder */}
              <span className="text-gray-400 text-sm">QR Code</span>
            </div>
            <button
              onClick={() => setSetupStep('verify')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('security.2fa.setup.next', 'Weiter')}
            </button>
          </div>
        )}
        
        {setupStep === 'verify' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('security.2fa.setup.verify', 'Geben Sie den 6-stelligen Code aus Ihrer App ein:')}
            </p>
            <TOTPInput 
              value={verificationCode} 
              onChange={setVerificationCode}
              onComplete={handleVerify}
            />
            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {t('security.2fa.setup.verifyButton', 'Verifizieren')}
            </button>
          </div>
        )}
        
        {setupStep === 'backup' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">
                {t('security.2fa.backup.title', 'Backup-Codes speichern')}
              </h3>
              <p className="text-yellow-700 text-sm mb-3">
                {t('security.2fa.backup.description', 
                  'Bewahren Sie diese Codes an einem sicheren Ort auf. Sie benötigen sie, wenn Sie keinen Zugriff auf Ihre Authentifizierungs-App haben.')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <code key={i} className="bg-white px-2 py-1 rounded text-sm font-mono">
                    {Math.random().toString(36).substring(2, 10).toUpperCase()}
                  </code>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setIsEnabled(true); setShowSetup(false); }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('security.2fa.backup.complete', 'Einrichtung abschließen')}
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-green-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('security.2fa.title', 'Zwei-Faktor-Authentifizierung')}
            </h2>
            <p className="text-sm text-gray-500">
              {isEnabled 
                ? t('security.2fa.enabled', '2FA ist aktiv')
                : t('security.2fa.disabled', '2FA ist nicht aktiviert')}
            </p>
          </div>
        </div>
        
        {isEnabled ? (
          <button
            onClick={() => setIsEnabled(false)}
            className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            {t('security.2fa.disable', 'Deaktivieren')}
          </button>
        ) : (
          <button
            onClick={handleEnable}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {t('security.2fa.enable', 'Aktivieren')}
          </button>
        )}
      </div>
    </section>
  );
}

function ActiveSessionsSection() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([
    {
      id: '1',
      deviceName: 'Chrome on Windows',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Berlin, DE',
      ipHash: 'a1b2***',
      lastActiveAt: new Date(),
      isCurrentSession: true,
      isTrusted: true,
    },
  ]);

  const handleTerminate = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const handleTerminateAll = () => {
    setSessions(sessions.filter(s => s.isCurrentSession));
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {t('security.sessions.title', 'Aktive Sessions')}
          </h2>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleTerminateAll}
            className="text-sm text-red-600 hover:text-red-700"
          >
            {t('security.sessions.terminateAll', 'Alle anderen beenden')}
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              session.isCurrentSession 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-lg">
                  {session.os === 'Windows' ? '🪟' : session.os === 'macOS' ? '🍎' : '📱'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {session.deviceName}
                  {session.isCurrentSession && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      {t('security.sessions.current', 'Aktuell')}
                    </span>
                  )}
                  {session.isTrusted && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      {t('security.sessions.trusted', 'Vertraut')}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {session.location} • IP: {session.ipHash}
                </p>
                <p className="text-xs text-gray-400">
                  {t('security.sessions.lastActive', 'Zuletzt aktiv')}: {session.lastActiveAt.toLocaleString()}
                </p>
              </div>
            </div>
            
            {!session.isCurrentSession && (
              <button
                onClick={() => handleTerminate(session.id)}
                className="text-sm text-red-600 hover:text-red-700 px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50"
              >
                {t('security.sessions.terminate', 'Beenden')}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Main Page
export default function SecuritySettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            {t('security.title', 'Sicherheit')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('security.subtitle', 'Verwalten Sie Ihre Sicherheitseinstellungen und aktiven Sessions')}
          </p>
        </div>

        <div className="space-y-6">
          <TwoFactorSection />
          <PasswordChangeSection />
          <ActiveSessionsSection />
        </div>
      </div>
    </div>
  );
}
