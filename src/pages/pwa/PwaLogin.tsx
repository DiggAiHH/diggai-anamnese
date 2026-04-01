import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePwaLogin, usePwaRegister } from '../../hooks/usePatientApi';
import { usePwaStore } from '../../store/pwaStore';

type Tab = 'login' | 'register';

export default function PwaLogin() {
  const navigate = useNavigate();
  const login = usePwaStore((s) => s.login);
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>('login');

  // ── Login state ──
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Register state ──
  const [regPatientNumber, setRegPatientNumber] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);

  const loginMutation = usePwaLogin();
  const registerMutation = usePwaRegister();

  // ── Handlers ──

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!identifier.trim() || !password) {
      setLocalError(t('Bitte füllen Sie dieses Pflichtfeld aus'));
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await loginMutation.mutateAsync({ identifier: identifier.trim(), password }) as any;
      login(res.token ?? res.data?.token, res.accountId ?? res.data?.accountId, res.patientId ?? res.data?.patientId);
      navigate('/pwa/dashboard', { replace: true });
    } catch (err: unknown) {
      const e = err as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      setLocalError(e?.response?.data?.message ?? e?.message ?? t('verwaltung.login.failed'));
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!regPatientNumber.trim() || !regBirthDate || !regPassword) {
      setLocalError(t('Bitte füllen Sie dieses Pflichtfeld aus'));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setLocalError(t('patternLock.mismatch'));
      return;
    }
    if (regPassword.length < 12) {
      setLocalError(t('Neues Passwort (mind. 12 Zeichen)'));
      return;
    }

    try {
      await registerMutation.mutateAsync({
        patientNumber: regPatientNumber.trim(),
        birthDate: regBirthDate,
        password: regPassword,
        email: regEmail.trim() || undefined,
      });

      // Auto-login after successful registration
      const loginRes = await loginMutation.mutateAsync({
        identifier: regEmail.trim() || regPatientNumber.trim(),
        password: regPassword,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
      login(
        loginRes.token ?? loginRes.data?.token,
        loginRes.accountId ?? loginRes.data?.accountId,
        loginRes.patientId ?? loginRes.data?.patientId,
      );
      navigate('/pwa/dashboard', { replace: true });
    } catch (err: unknown) {
      const e = err as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      setLocalError(e?.response?.data?.message ?? e?.message ?? t('verwaltung.login.failed'));
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;
  const errorMsg = localError;

  // ── UI ──

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-100 text-sky-600">
            <Heart className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DiggAI</h1>
          <p className="text-sm text-gray-500">{t('home.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          {(['login', 'register'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              data-testid={tabKey === 'login' ? 'pwa-tab-login' : 'pwa-tab-register'}
              onClick={() => { setTab(tabKey); setLocalError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                tab === tabKey ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tabKey === 'login' ? t('verwaltung.login.submit') : t('certify.submit')}
            </button>
          ))}
        </div>

        {/* Error */}
        {errorMsg && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 space-y-4">
              {/* Identifier */}
              <div className="space-y-1.5">
                <label htmlFor="login-identifier" className="block text-sm font-medium text-gray-700">
                  {t('E-Mail-Adresse, Telefonnummer oder Patientennummer')}
                </label>
                <input
                  id="login-identifier"
                  data-testid="pwa-login-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('z. B. max@beispiel.de, 01701234567 oder P-10001')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">
                  {t('Melden Sie sich mit Ihrer E-Mail-Adresse, Telefonnummer oder Patientennummer an.')}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                  {t('verwaltung.login.password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    data-testid="pwa-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              data-testid="pwa-login-submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('verwaltung.login.submit')}
            </button>

            <p className="text-center text-xs text-gray-400">
              <button
                type="button"
                onClick={() => {/* TODO: PIN login flow */}}
                className="underline hover:text-sky-600 transition-colors"
              >
                {t('PIN festlegen')}
              </button>
            </p>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 space-y-4">
              {/* Patient number */}
              <div className="space-y-1.5">
                <label htmlFor="reg-patient" className="block text-sm font-medium text-gray-700">
                  {t('certify.patient_number')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-patient"
                  data-testid="pwa-register-patient-number"
                  type="text"
                  value={regPatientNumber}
                  onChange={(e) => setRegPatientNumber(e.target.value)}
                  placeholder={t('patientIdentify.patientNumber')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500">
                  {t('Wir nutzen Ihre Patientennummer nur, um Ihr bestehendes Praxiskonto sicher zuzuordnen.')}
                </p>
              </div>

              {/* Birth date */}
              <div className="space-y-1.5">
                <label htmlFor="reg-birthdate" className="block text-sm font-medium text-gray-700">
                  {t('Geburtsdatum')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-birthdate"
                  data-testid="pwa-register-birth-date"
                  type="date"
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500">
                  {t('Das Geburtsdatum dient ausschließlich dem sicheren Abgleich mit Ihrer Patientenakte.')}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
                  {t('E-Mail-Adresse (optional)')}
                </label>
                <input
                  id="reg-email"
                  data-testid="pwa-register-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder={t('E-Mail-Adresse (optional)')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">
                  {t('verwaltung.login.password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    data-testid="pwa-register-password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={t('Neues Passwort (mind. 12 Zeichen)')}
                    minLength={12}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700">
                  {t('Muster bestätigen')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    data-testid="pwa-register-confirm-password"
                    type={showRegConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder={t('Muster bestätigen')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              data-testid="pwa-register-submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('certify.submit')}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 pt-2">
          © {new Date().getFullYear()} DiggAI · {t('Datenschutz-Einwilligung')} & {t('security')}
        </p>
      </div>
    </div>
  );
}
