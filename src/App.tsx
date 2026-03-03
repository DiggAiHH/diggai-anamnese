import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from './store/sessionStore';
import { useThemeStore } from './store/themeStore';
import { LandingPage } from './components/LandingPage';
import { Questionnaire } from './components/Questionnaire';
import { SessionRecoveryDialog } from './components/SessionRecoveryDialog';
import './index.css';
import { useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { CookieConsent } from './components/CookieConsent';

// Lazy-load heavy dashboard routes (code splitting → ~60% smaller initial bundle)
const ArztDashboard = lazy(() => import('./pages/ArztDashboard').then(m => ({ default: m.ArztDashboard })));
const MFADashboard = lazy(() => import('./pages/MFADashboard').then(m => ({ default: m.MFADashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DokumentationPage = lazy(() => import('./pages/DokumentationPage').then(m => ({ default: m.DokumentationPage })));
const HandbuchPage = lazy(() => import('./pages/HandbuchPage').then(m => ({ default: m.HandbuchPage })));
const DatenschutzPage = lazy(() => import('./pages/DatenschutzPage').then(m => ({ default: m.DatenschutzPage })));
const ImpressumPage = lazy(() => import('./pages/ImpressumPage').then(m => ({ default: m.ImpressumPage })));

// Suspense fallback for lazy routes
function DashboardLoading() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">{t('app.dashboard_loading', 'Dashboard wird geladen…')}</p>
      </div>
    </div>
  );
}

// React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    }
  },
});

function PatientApp() {
  const flowStep = useSessionStore(state => state.flowStep);

  return (
    <div className="min-h-screen transition-colors duration-500">
      {flowStep === 'landing' ? (
        <LandingPage />
      ) : (
        <Questionnaire />
      )}
      <SessionRecoveryDialog />
    </div>
  );
}

function App() {
  const { t } = useTranslation();
  // Initialize theme from persisted store on mount
  const theme = useThemeStore(state => state.theme);
  useEffect(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Skip-to-content link for keyboard/screen-reader users */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
          {t('app.skip_to_content', 'Zum Inhalt springen')}
        </a>
        <main id="main-content">
          <Routes>
          {/* Arzt-Dashboard (lazy-loaded) */}
          <Route path="/arzt" element={<Suspense fallback={<DashboardLoading />}><ArztDashboard /></Suspense>} />

          {/* MFA-Dashboard (lazy-loaded) */}
          <Route path="/mfa" element={<Suspense fallback={<DashboardLoading />}><MFADashboard /></Suspense>} />

          {/* Admin-Dashboard (lazy-loaded) */}
          <Route path="/admin" element={<Suspense fallback={<DashboardLoading />}><AdminDashboard /></Suspense>} />

          {/* Dokumentation (lazy-loaded) */}
          <Route path="/docs" element={<Suspense fallback={<DashboardLoading />}><DokumentationPage /></Suspense>} />

          {/* Bedienungsanleitung / Handbuch (lazy-loaded) */}
          <Route path="/handbuch" element={<Suspense fallback={<DashboardLoading />}><HandbuchPage /></Suspense>} />

          {/* Datenschutzerklärung — DSGVO Art. 13/14 (lazy-loaded) */}
          <Route path="/datenschutz" element={<Suspense fallback={<DashboardLoading />}><DatenschutzPage /></Suspense>} />

          {/* Impressum — §5 DDG (lazy-loaded) */}
          <Route path="/impressum" element={<Suspense fallback={<DashboardLoading />}><ImpressumPage /></Suspense>} />

          {/* Patient-Flow (Standard) */}
          <Route
            path="*"
            element={<PatientApp />}
          />
          </Routes>
          <KeyboardShortcutsHelp />
          <CookieConsent />
        </main>      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
