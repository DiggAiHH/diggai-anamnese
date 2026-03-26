import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from './store/sessionStore';
import { useThemeStore } from './store/themeStore';
import './index.css';
import { useEffect, lazy, Suspense, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { CookieConsent } from './components/CookieConsent';
import { PWAShell } from './components/pwa/PWAShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { StaffShell } from './components/staff/StaffShell';
import { ToastContainer } from './components/ui/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdateNotification } from './components/UpdateNotification';
import { preloadPatientFlow } from './lib/routePreloaders';
const HomeScreen = lazy(() => import('./components/HomeScreen').then(m => ({ default: m.HomeScreen })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const Questionnaire = lazy(() => import('./components/Questionnaire').then(m => ({ default: m.Questionnaire })));
const SessionRecoveryDialog = lazy(() => import('./components/SessionRecoveryDialog').then(m => ({ default: m.SessionRecoveryDialog })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const AgentDashboard = lazy(() => import('./pages/agents/AgentDashboard').then(m => ({ default: m.AgentDashboard })));
const SystemPanel = lazy(() => import('./pages/SystemPanel').then(m => ({ default: m.SystemPanel })));
const TIStatusPanel = lazy(() => import('./pages/TIStatusPanel').then(m => ({ default: m.TIStatusPanel })));
const NfcLanding = lazy(() => import('./pages/nfc/NfcLanding').then(m => ({ default: m.NfcLanding })));
const PatientFlowLiveBoard = lazy(() => import('./pages/flows/PatientFlowLiveBoard').then(m => ({ default: m.PatientFlowLiveBoard })));
const CheckoutWizard = lazy(() => import('./pages/checkout/CheckoutWizard').then(m => ({ default: m.CheckoutWizard })));
const AnonymousFeedbackForm = lazy(() => import('./pages/checkout/AnonymousFeedbackForm').then(m => ({ default: m.AnonymousFeedbackForm })));
const KioskDashboard = lazy(() => import('./pages/kiosk/KioskDashboard').then(m => ({ default: m.KioskDashboard })));
const TreatmentFlowBuilder = lazy(() => import('./pages/flows/TreatmentFlowBuilder').then(m => ({ default: m.TreatmentFlowBuilder })));
const DataDeletionConfirm = lazy(() => import('./pages/checkout/DataDeletionConfirm').then(m => ({ default: m.DataDeletionConfirm })));
const VideoRoom = lazy(() => import('./pages/telemedizin/VideoRoom').then(m => ({ default: m.VideoRoom })));
const TelemedizinScheduler = lazy(() => import('./pages/telemedizin/TelemedizinScheduler').then(m => ({ default: m.TelemedizinScheduler })));
const FormBuilderPage = lazy(() => import('./pages/forms/FormBuilderPage').then(m => ({ default: m.FormBuilderPage })));
const FormRunnerPage = lazy(() => import('./pages/forms/FormRunnerPage').then(m => ({ default: m.FormRunnerPage })));
const PrivateEpaDashboard = lazy(() => import('./pages/epa/PrivateEpaDashboard').then(m => ({ default: m.PrivateEpaDashboard })));
const SharedEpaView = lazy(() => import('./pages/epa/SharedEpaView').then(m => ({ default: m.SharedEpaView })));

// Lazy-load heavy dashboard routes (code splitting → ~60% smaller initial bundle)
const ArztDashboard = lazy(() => import('./pages/ArztDashboard').then(m => ({ default: m.ArztDashboard })));
const MFADashboard = lazy(() => import('./pages/MFADashboard').then(m => ({ default: m.MFADashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PraxisDashboard = lazy(() => import('./pages/PraxisDashboard').then(m => ({ default: m.PraxisDashboard })));
const DokumentationPage = lazy(() => import('./pages/DokumentationPage').then(m => ({ default: m.DokumentationPage })));
const PwaLogin = lazy(() => import('./pages/pwa/PwaLogin'));
const PwaDashboard = lazy(() => import('./pages/pwa/PwaDashboard'));
const PwaDiary = lazy(() => import('./pages/pwa/PwaDiary'));
const PwaMeasures = lazy(() => import('./pages/pwa/PwaMeasures'));
const PwaMessages = lazy(() => import('./pages/pwa/PwaMessages'));
const PwaSettings = lazy(() => import('./pages/pwa/PwaSettings'));
const PwaDiaryTrends = lazy(() => import('./pages/pwa/PwaDiaryTrends'));
const PwaEmailVerification = lazy(() => import('./pages/pwa/PwaEmailVerification'));
const PwaAppointments = lazy(() => import('./pages/pwa/PwaAppointments'));
const PwaReminderConfig = lazy(() => import('./pages/pwa/PwaReminderConfig'));
const PwaReels = lazy(() => import('./pages/pwa/PwaReels'));
const PwaCommunity = lazy(() => import('./pages/pwa/PwaCommunity'));
const HandbuchPage = lazy(() => import('./pages/HandbuchPage').then(m => ({ default: m.HandbuchPage })));
const DatenschutzPage = lazy(() => import('./pages/DatenschutzPage').then(m => ({ default: m.DatenschutzPage })));
const ImpressumPage = lazy(() => import('./pages/ImpressumPage').then(m => ({ default: m.ImpressumPage })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const StaffLogin = lazy(() => import('./pages/staff/StaffLogin'));

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
// Memory Leak Fix: Added gcTime (cacheTime) to prevent unlimited cache growth
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000, // 5 minutes - prevents unlimited cache growth
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    }
  },
});

function CheckoutWizardRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <CheckoutWizard sessionId={sessionId ?? ''} />;
}

function DataDeletionConfirmRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  return (
    <DataDeletionConfirm
      sessionId={sessionId ?? ''}
      onConfirm={() => navigate(`/checkout/${sessionId}`)}
      onCancel={() => navigate(`/checkout/${sessionId}`)}
    />
  );
}

function PatientApp() {
  const flowStep = useSessionStore(state => state.flowStep);

  useEffect(() => {
    void preloadPatientFlow();
  }, []);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <div className="min-h-screen transition-colors duration-500">
        {flowStep === 'landing' ? (
          <LandingPage />
        ) : (
          <Questionnaire />
        )}
        <SessionRecoveryDialog />
      </div>
    </Suspense>
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
        <ToastContainer />
        <OfflineIndicator position="top" showQueueDetails />
        <InstallPrompt minVisits={2} dismissCooldownDays={30} />
        <UpdateNotification position="top" />
        
        {/* Skip-to-content link for keyboard/screen-reader users */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
          {t('app.skip_to_content', 'Zum Inhalt springen')}
        </a>
        <main id="main-content">
          <Routes>
          {/* Patientenansicht */}
          <Route path="/" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><HomeScreen /></Suspense></RouteErrorBoundary>} />

          {/* Patient-Flow */}
          <Route path="/patient" element={<RouteErrorBoundary routeType="patient"><PatientApp /></RouteErrorBoundary>} />

          {/* Verwaltungsansicht */}
          <Route path="/verwaltung/login" element={<RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><StaffLogin /></Suspense></RouteErrorBoundary>} />
          <Route path="/verwaltung" element={<RouteErrorBoundary routeType="staff"><StaffShell /></RouteErrorBoundary>}>
            <Route index element={<Navigate to="/verwaltung/arzt" replace />} />
            <Route path="arzt" element={<ProtectedRoute allowedRoles={['arzt', 'admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><ArztDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
            <Route path="mfa" element={<ProtectedRoute allowedRoles={['mfa', 'admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><MFADashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="admin"><Suspense fallback={<DashboardLoading />}><AdminDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
            <Route path="docs" element={<ProtectedRoute allowedRoles={['arzt', 'mfa', 'admin']} redirectTo="/verwaltung/login"><Suspense fallback={<DashboardLoading />}><DokumentationPage /></Suspense></ProtectedRoute>} />
            <Route path="handbuch" element={<ProtectedRoute allowedRoles={['arzt', 'mfa', 'admin']} redirectTo="/verwaltung/login"><Suspense fallback={<DashboardLoading />}><HandbuchPage /></Suspense></ProtectedRoute>} />
            {/* Modul 6: System & TI Admin Panels (lazy-loaded, role-protected) */}
            <Route path="system" element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="admin"><Suspense fallback={<DashboardLoading />}><SystemPanel /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
            <Route path="ti" element={<ProtectedRoute allowedRoles={['arzt', 'admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><TIStatusPanel /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
            {/* DiggAI Agent Dashboard */}
            <Route path="agents" element={<ProtectedRoute allowedRoles={['arzt', 'mfa', 'admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><AgentDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
            {/* Praxis Business Dashboard (ROI, Leistungen, Rechnungen) */}
            <Route path="business" element={<ProtectedRoute allowedRoles={['arzt', 'admin']} redirectTo="/verwaltung/login"><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><PraxisDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
          </Route>

          {/* Datenschutzerklärung — DSGVO Art. 13/14 (lazy-loaded) */}
          <Route path="/datenschutz" element={<Suspense fallback={<DashboardLoading />}><DatenschutzPage /></Suspense>} />

          {/* Impressum — §5 DDG (lazy-loaded) */}
          <Route path="/impressum" element={<Suspense fallback={<DashboardLoading />}><ImpressumPage /></Suspense>} />

          {/* Pricing Page */}
          <Route path="/pricing" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><Pricing /></Suspense></RouteErrorBoundary>} />

          {/* Modul 7: NFC & Flow Routes */}
          <Route path="/nfc" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><NfcLanding /></Suspense></RouteErrorBoundary>} />
          <Route path="/flows/live" element={<RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><PatientFlowLiveBoard /></Suspense></RouteErrorBoundary>} />
          <Route path="/checkout/:sessionId" element={<RouteErrorBoundary routeType="patient"><Suspense fallback={<DashboardLoading />}><CheckoutWizardRoute /></Suspense></RouteErrorBoundary>} />
          <Route path="/feedback" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><AnonymousFeedbackForm praxisId="default" /></Suspense></RouteErrorBoundary>} />

          {/* Modul 7/8: Kiosk + Payment + Flow Builder (role-protected) */}
          <Route path="/kiosk" element={<ProtectedRoute allowedRoles={['mfa', 'arzt', 'admin']}><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><KioskDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/flows/builder" element={<ProtectedRoute allowedRoles={['arzt', 'admin']}><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><TreatmentFlowBuilder /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/flows/builder/:flowId" element={<ProtectedRoute allowedRoles={['arzt', 'admin']}><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><TreatmentFlowBuilder /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/checkout/:sessionId/delete" element={<RouteErrorBoundary routeType="patient"><Suspense fallback={<DashboardLoading />}><DataDeletionConfirmRoute /></Suspense></RouteErrorBoundary>} />

          {/* Modul 9: Telemedizin */}
          <Route path="/telemedizin" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><TelemedizinScheduler /></Suspense></RouteErrorBoundary>} />
          <Route path="/telemedizin/room/:sessionId" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><VideoRoom /></Suspense></RouteErrorBoundary>} />

          {/* Modul 10: Forms */}
          <Route path="/forms/builder" element={<RouteErrorBoundary routeType="admin"><Suspense fallback={<DashboardLoading />}><FormBuilderPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/forms/builder/:formId" element={<RouteErrorBoundary routeType="admin"><Suspense fallback={<DashboardLoading />}><FormBuilderPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/forms/run/:formId" element={<RouteErrorBoundary routeType="patient"><Suspense fallback={<DashboardLoading />}><FormRunnerPage /></Suspense></RouteErrorBoundary>} />

          {/* Modul 11: Private ePA (role-protected) */}
          <Route path="/epa/:patientId" element={<ProtectedRoute allowedRoles={['arzt', 'admin']}><RouteErrorBoundary routeType="staff"><Suspense fallback={<DashboardLoading />}><PrivateEpaDashboard /></Suspense></RouteErrorBoundary></ProtectedRoute>} />
          <Route path="/epa/shared/:token" element={<RouteErrorBoundary routeType="default"><Suspense fallback={<DashboardLoading />}><SharedEpaView /></Suspense></RouteErrorBoundary>} />

          {/* PWA Patient Portal */}
          <Route path="/pwa/login" element={<RouteErrorBoundary routeType="pwa"><Suspense fallback={<DashboardLoading />}><PwaLogin /></Suspense></RouteErrorBoundary>} />
          <Route path="/pwa/verify-email" element={<RouteErrorBoundary routeType="pwa"><Suspense fallback={<DashboardLoading />}><PwaEmailVerification /></Suspense></RouteErrorBoundary>} />
          <Route path="/pwa" element={<RouteErrorBoundary routeType="pwa"><PWAShell /></RouteErrorBoundary>}>
            <Route path="dashboard" element={<Suspense fallback={<DashboardLoading />}><PwaDashboard /></Suspense>} />
            <Route path="diary" element={<Suspense fallback={<DashboardLoading />}><PwaDiary /></Suspense>} />
            <Route path="diary/trends" element={<Suspense fallback={<DashboardLoading />}><PwaDiaryTrends /></Suspense>} />
            <Route path="measures" element={<Suspense fallback={<DashboardLoading />}><PwaMeasures /></Suspense>} />
            <Route path="messages" element={<Suspense fallback={<DashboardLoading />}><PwaMessages /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<DashboardLoading />}><PwaSettings /></Suspense>} />
            <Route path="appointments" element={<Suspense fallback={<DashboardLoading />}><PwaAppointments /></Suspense>} />
            <Route path="reminders" element={<Suspense fallback={<DashboardLoading />}><PwaReminderConfig /></Suspense>} />
            <Route path="reels" element={<Suspense fallback={<DashboardLoading />}><PwaReels /></Suspense>} />
            <Route path="community" element={<Suspense fallback={<DashboardLoading />}><PwaCommunity /></Suspense>} />
            <Route index element={<Suspense fallback={<DashboardLoading />}><PwaDashboard /></Suspense>} />
          </Route>

          {/* Legacy staff route redirects */}
          <Route path="/arzt" element={<Navigate to="/verwaltung/arzt" replace />} />
          <Route path="/mfa" element={<Navigate to="/verwaltung/mfa" replace />} />
          <Route path="/admin" element={<Navigate to="/verwaltung/admin" replace />} />
          <Route path="/admin/system" element={<Navigate to="/verwaltung/system" replace />} />
          <Route path="/admin/ti" element={<Navigate to="/verwaltung/ti" replace />} />
          <Route path="/docs" element={<Navigate to="/verwaltung/docs" replace />} />
          <Route path="/handbuch" element={<Navigate to="/verwaltung/handbuch" replace />} />

          {/* 404 Fallback */}
          <Route path="*" element={<Suspense fallback={<DashboardLoading />}><NotFoundPage /></Suspense>} />
          </Routes>
          <KeyboardShortcutsHelp />
          <CookieConsent />
        </main>      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
