import { Shield, UserRound, Users, Settings2, BookOpen, FileText, ServerCog, ActivitySquare, LogOut, Bot } from 'lucide-react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSelector } from '../LanguageSelector';
import { clearStoredStaffUser } from '../../lib/staffSession';
import { STAFF_SESSION_QUERY_KEY, useStaffSession } from '../../hooks/useStaffSession';

interface StaffNavItem {
  to: string;
  icon: ReactNode;
  label: string;
  description: string;
  roles: Array<'arzt' | 'mfa' | 'admin'>;
}

export function StaffShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useStaffSession();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/verwaltung/login" replace />;
  }

  const role = user.role;

  const items: StaffNavItem[] = [
    {
      to: '/verwaltung/arzt',
      icon: <UserRound className="w-5 h-5" />,
      label: t('verwaltung.tile.arzt', 'Arzt'),
      description: t('verwaltung.tile.arzt_desc', 'Ärztliche Übersicht & Triage'),
      roles: ['arzt', 'admin'],
    },
    {
      to: '/verwaltung/mfa',
      icon: <Users className="w-5 h-5" />,
      label: t('verwaltung.tile.mfa', 'MFA'),
      description: t('verwaltung.tile.mfa_desc', 'Wartezimmer & Praxisabläufe'),
      roles: ['mfa', 'admin'],
    },
    {
      to: '/verwaltung/admin',
      icon: <Settings2 className="w-5 h-5" />,
      label: t('verwaltung.tile.admin', 'Admin'),
      description: t('verwaltung.tile.admin_desc', 'System, Auswertungen & Security'),
      roles: ['admin'],
    },
    {
      to: '/verwaltung/system',
      icon: <ServerCog className="w-5 h-5" />,
      label: t('verwaltung.tile.system', 'System'),
      description: t('verwaltung.tile.system_desc', 'Deployment, Config, Backup'),
      roles: ['admin'],
    },
    {
      to: '/verwaltung/ti',
      icon: <ActivitySquare className="w-5 h-5" />,
      label: t('verwaltung.tile.ti', 'TI-Status'),
      description: t('verwaltung.tile.ti_desc', 'Telematikinfrastruktur'),
      roles: ['arzt', 'admin'],
    },
    {
      to: '/verwaltung/docs',
      icon: <FileText className="w-5 h-5" />,
      label: t('verwaltung.tile.docs', 'Dokumentation'),
      description: t('verwaltung.tile.docs_desc', 'Technische Produktdoku'),
      roles: ['arzt', 'mfa', 'admin'],
    },
    {
      to: '/verwaltung/handbuch',
      icon: <BookOpen className="w-5 h-5" />,
      label: t('verwaltung.tile.handbuch', 'Handbuch'),
      description: t('verwaltung.tile.handbuch_desc', 'Bedienung & Rollenabläufe'),
      roles: ['arzt', 'mfa', 'admin'],
    },
    {
      to: '/verwaltung/agents',
      icon: <Bot className="w-5 h-5" />,
      label: t('verwaltung.tile.agents', 'Agenten'),
      description: t('verwaltung.tile.agents_desc', 'DiggAI · Task-Queue · Monitoring'),
      roles: ['arzt', 'mfa', 'admin'],
    },
  ];

  const visibleItems = items.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{t('verwaltung.title', 'Verwaltungsansicht')}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{t('verwaltung.subtitle', 'Arzt · MFA · Admin · Dokumentation')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex px-2 py-1 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-primary)]">
            {role.toUpperCase()}
          </span>
          <LanguageSelector />
          <ThemeToggle />
          <button
            data-testid="staff-logout"
            onClick={() => {
              clearStoredStaffUser();
              queryClient.setQueryData(STAFF_SESSION_QUERY_KEY, null);
              void api.arztLogout().catch(() => undefined);
              navigate('/verwaltung/login', { replace: true });
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-sm transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {t('autologout.logout', 'Abmelden')}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]/40 p-4">
          <nav className="space-y-2">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group block rounded-2xl border p-4 transition-all ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/5'
                      : 'border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-blue-500/40'
                  }`
                }
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    {item.icon}
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--text-primary)] text-sm">{item.label}</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 p-4 md:p-6 pb-20 lg:pb-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <footer className="mt-auto border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 px-6 py-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-6 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            <NavLink to="/impressum" className="hover:text-blue-400 transition-colors uppercase">{t('landing.impressum', 'Impressum')}</NavLink>
            <NavLink to="/datenschutz" className="hover:text-blue-400 transition-colors uppercase">{t('landing.datenschutz', 'Datenschutz')}</NavLink>
            <NavLink to="/verwaltung/docs" className="hover:text-blue-400 transition-colors uppercase">{t('landing.docs', 'Technologie')}</NavLink>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            DiggAI Anamnese Platform &copy; {new Date().getFullYear()} &bull; {t('dsgvo_secure', 'DSGVO & AES-256 SECURED')}
          </p>
        </div>
      </footer>
    </div>
  );
}
