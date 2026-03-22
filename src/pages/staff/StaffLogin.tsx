import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArztLogin } from '../../hooks/useStaffApi';
import { setAuthToken } from '../../api/client';

export default function StaffLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginMutation = useArztLogin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError(t('verwaltung.login.fill', 'Bitte Benutzername und Passwort eingeben.'));
      return;
    }

    try {
      const res = await loginMutation.mutateAsync({ username: username.trim(), password });
      setAuthToken(res.token);

      const role = String(res.user?.role || '').toLowerCase();
      if (role === 'arzt') {
        navigate('/verwaltung/arzt', { replace: true });
      } else if (role === 'mfa') {
        navigate('/verwaltung/mfa', { replace: true });
      } else {
        navigate('/verwaltung/admin', { replace: true });
      }
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e2?.response?.data?.message ?? e2?.message ?? t('verwaltung.login.failed', 'Anmeldung fehlgeschlagen.'));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[var(--text-primary)]">{t('verwaltung.login.title', 'Verwaltungs-Login')}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{t('verwaltung.login.subtitle', 'Arzt · MFA · Admin')}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-user" className="block text-sm text-[var(--text-secondary)] mb-1">
              {t('verwaltung.login.username', 'Benutzername')}
            </label>
            <input
              id="staff-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label htmlFor="staff-pass" className="block text-sm text-[var(--text-secondary)] mb-1">
              {t('verwaltung.login.password', 'Passwort')}
            </label>
            <input
              id="staff-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('verwaltung.login.submit', 'Anmelden')}
          </button>
        </form>
      </div>
    </div>
  );
}
