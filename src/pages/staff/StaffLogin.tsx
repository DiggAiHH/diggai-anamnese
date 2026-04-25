import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArztLogin } from '../../hooks/useStaffApi';
import { normalizeStaffRole } from '../../lib/staffSession';

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
      const role = normalizeStaffRole(res.user?.role);
      if (role === 'arzt') {
        navigate('/verwaltung/arzt', { replace: true });
      } else if (role === 'mfa') {
        navigate('/verwaltung/mfa', { replace: true });
      } else {
        navigate('/verwaltung/admin', { replace: true });
      }
    } catch (err: unknown) {
      const e2 = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const backendMessage = e2?.response?.data?.message ?? e2?.response?.data?.error;
      setError(backendMessage ?? e2?.message ?? t('verwaltung.login.failed', 'Anmeldung fehlgeschlagen.'));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[var(--text-primary)]">{t('verwaltung.login.title', 'Verwaltungs-Login')}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{t('verwaltung.login.subtitle', 'Arzt · MFA · Admin')}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="staff-user" className="block text-sm font-medium text-[var(--text-secondary)]">
              {t('verwaltung.login.username', 'Benutzername')}
            </label>
            <input
              id="staff-user"
              data-testid="staff-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all"
              placeholder="doc.mustermann"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-pass" className="block text-sm font-medium text-[var(--text-secondary)]">
              {t('verwaltung.login.password', 'Passwort')}
            </label>
            <input
              id="staff-pass"
              data-testid="staff-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div 
              role="alert" 
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 animate-gentleFadeIn"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-red-500">{error}</p>
            </div>
          )}

          <button
            type="submit"
            data-testid="staff-login-submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]"
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                {t('verwaltung.login.submit', 'Sicher anmelden')}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">{t('verwaltung.login.demo', 'Demo Zugang (1-Klick)')}</p>
          <div className="grid grid-cols-3 gap-2">
            <button 
              type="button"
              onClick={() => { setUsername('arzt'); setPassword('arzt1234'); }}
              className="px-2 py-2 text-xs font-medium bg-[var(--bg-secondary)] hover:bg-blue-500/10 text-blue-500 border border-[var(--border-primary)] rounded-lg transition-colors"
            >
              Dr. Arzt
            </button>
            <button 
              type="button"
              onClick={() => { setUsername('mfa'); setPassword('mfa1234'); }}
              className="px-2 py-2 text-xs font-medium bg-[var(--bg-secondary)] hover:bg-emerald-500/10 text-emerald-500 border border-[var(--border-primary)] rounded-lg transition-colors"
            >
              MFA
            </button>
            <button 
              type="button"
              onClick={() => { setUsername('admin'); setPassword('praxis2026'); }}
              className="px-2 py-2 text-xs font-medium bg-[var(--bg-secondary)] hover:bg-purple-500/10 text-purple-500 border border-[var(--border-primary)] rounded-lg transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-primary)] text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">
            DiggAI Anamnese Platform v3.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
