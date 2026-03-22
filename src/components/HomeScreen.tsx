/**
 * HomeScreen — Shared Tablet / Kiosk Entry Point
 * 
 * Patientenansicht: Aufnahme, Patienten-Portal, Telemedizin
 * Auto-Reset nach 60s Inaktivität
 * Uhr, Datum, Praxis-Branding
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  Smartphone,
  Video,
  Clock,
  Calendar,
  Bot,
  ShieldCheck,
  Workflow,
  FlaskConical,
  ClipboardList,
  Settings,
  FileText,
  Radar,
  Building2,
  Rocket,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { preloadPatientFlow, preloadPwaPortal, preloadTelemedizin } from '../lib/routePreloaders';
import { PracticeGrowthSection } from './PracticeGrowthSection';

interface HomeTile {
  id: string;
  route: string;
  icon: React.ReactNode;
  gradient: string;
  labelKey: string;
  descKey: string;
  preload?: () => Promise<unknown>;
}

interface QuickLink {
  id: string;
  route: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void preloadPatientFlow();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  // ─── Live Clock ───────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Auto-Reset nach 60s ─────────────────────────────
  const resetTimer = useCallback(() => {
    setLastInteraction(Date.now());
  }, []);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => events.forEach(e => window.removeEventListener(e, resetTimer));
  }, [resetTimer]);

  useEffect(() => {
    const check = setInterval(() => {
      if (Date.now() - lastInteraction > 60_000) {
        // Navigate back to home if idle
        navigate('/', { replace: true });
        setLastInteraction(Date.now());
      }
    }, 5000);
    return () => clearInterval(check);
  }, [lastInteraction, navigate]);

  // ─── Tiles ────────────────────────────────────────────
  const tiles: HomeTile[] = useMemo(() => [
    {
      id: 'patient',
      route: '/patient',
      icon: <Stethoscope className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-blue-500 to-indigo-600',
      labelKey: 'home.tile.patient',
      descKey: 'home.tile.patient_desc',
      preload: preloadPatientFlow,
    },
    {
      id: 'pwa',
      route: '/pwa/login',
      icon: <Smartphone className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-emerald-500 to-teal-600',
      labelKey: 'home.tile.pwa',
      descKey: 'home.tile.pwa_desc',
      preload: preloadPwaPortal,
    },
    {
      id: 'telemedizin',
      route: '/telemedizin',
      icon: <Video className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-purple-500 to-violet-600',
      labelKey: 'home.tile.telemedizin',
      descKey: 'home.tile.telemedizin_desc',
      preload: preloadTelemedizin,
    },
  ], []);

  const practiceOpsLinks: QuickLink[] = useMemo(
    () => [
      {
        id: 'agents',
        route: '/verwaltung/agents',
        icon: <Bot className="w-5 h-5" />,
        title: t('Agenten Hub', 'Agenten Hub'),
        subtitle: t('Agent Tasks, Metriken, Runs', 'Agent Tasks, Metriken, Runs'),
        badge: t('Neu', 'Neu'),
      },
      {
        id: 'flowlive',
        route: '/flows/live',
        icon: <Radar className="w-5 h-5" />,
        title: t('Live Flow Board', 'Live Flow Board'),
        subtitle: t('Patientenfluss in Echtzeit', 'Patientenfluss in Echtzeit'),
      },
      {
        id: 'builder',
        route: '/flows/builder',
        icon: <Workflow className="w-5 h-5" />,
        title: t('Flow Builder', 'Flow Builder'),
        subtitle: t('Journeys und Behandlungspfade', 'Journeys und Behandlungspfade'),
      },
      {
        id: 'forms',
        route: '/forms/builder',
        icon: <FlaskConical className="w-5 h-5" />,
        title: t('Forms Lab', 'Forms Lab'),
        subtitle: t('Formulare bauen und testen', 'Formulare bauen und testen'),
      },
      {
        id: 'ti',
        route: '/verwaltung/ti',
        icon: <ShieldCheck className="w-5 h-5" />,
        title: t('TI Status', 'TI Status'),
        subtitle: t('Konnektor, Karten, Gesundheit', 'Konnektor, Karten, Gesundheit'),
      },
      {
        id: 'system',
        route: '/verwaltung/system',
        icon: <Settings className="w-5 h-5" />,
        title: t('System Panel', 'System Panel'),
        subtitle: t('Backups, Logs, Deploy', 'Backups, Logs, Deploy'),
      },
      {
        id: 'docs',
        route: '/verwaltung/docs',
        icon: <ClipboardList className="w-5 h-5" />,
        title: t('Dokumentation', 'Dokumentation'),
        subtitle: t('Praxiswissen und Leitfäden', 'Praxiswissen und Leitfäden'),
      },
      {
        id: 'nfc',
        route: '/nfc',
        icon: <Activity className="w-5 h-5" />,
        title: t('NFC Entry', 'NFC Entry'),
        subtitle: t('Schneller Check-in & Trigger', 'Schneller Check-in & Trigger'),
      },
    ],
    [t],
  );

  const quickLaunch: QuickLink[] = useMemo(
    () => [
      {
        id: 'kiosk',
        route: '/kiosk',
        icon: <Building2 className="w-5 h-5" />,
        title: t('Kiosk', 'Kiosk'),
        subtitle: t('Wartezimmer und Aufruf', 'Wartezimmer und Aufruf'),
      },
      {
        id: 'tele',
        route: '/telemedizin',
        icon: <Video className="w-5 h-5" />,
        title: t('Telemedizin', 'Telemedizin'),
        subtitle: t('Terminplaner und Videoraum', 'Terminplaner und Videoraum'),
      },
      {
        id: 'pwa',
        route: '/pwa/login',
        icon: <Smartphone className="w-5 h-5" />,
        title: t('Patient Portal', 'Patient Portal'),
        subtitle: t('Diary, Measures, Messages', 'Diary, Measures, Messages'),
      },
      {
        id: 'policy',
        route: '/datenschutz',
        icon: <FileText className="w-5 h-5" />,
        title: t('Datenschutz', 'Datenschutz'),
        subtitle: t('DSGVO, Transparenz, Rechte', 'DSGVO, Transparenz, Rechte'),
      },
    ],
    [t],
  );

  // ─── Date Formatting ─────────────────────────────────
  const timeStr = currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              {t('home.clinic_name', 'Praxis Dr. Klaproth')}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {t('home.subtitle', 'Digitale Anamnese & Praxis-Services')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Calendar className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-lg font-mono font-bold text-[var(--text-primary)] tabular-nums">{timeStr}</span>
          </div>
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Feature Hub */}
      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 md:p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Rocket className="w-7 h-7 text-blue-500" />
                  {t('Praxis OS Launch Hub', 'Praxis OS Launch Hub')}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {t(
                    'Alle vorbereiteten Module an einem Ort: Patient, Agenten, Management und Operations.',
                    'Alle vorbereiteten Module an einem Ort: Patient, Agenten, Management und Operations.',
                  )}
                </p>
              </div>

              <button
                onClick={() => navigate('/verwaltung/login')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                {t('Zur Verwaltungsansicht', 'Zur Verwaltungsansicht')}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => navigate(tile.route)}
                onMouseEnter={() => void tile.preload?.()}
                onFocus={() => void tile.preload?.()}
                className={`
                  group relative overflow-hidden rounded-3xl p-8 md:p-9
                  bg-gradient-to-br ${tile.gradient}
                  shadow-lg hover:shadow-2xl
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-300 ease-out
                  focus:outline-none focus:ring-4 focus:ring-white/30
                  cursor-pointer text-left
                `}
                aria-label={t(tile.labelKey, tile.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />

                <div className="relative flex flex-col gap-4 text-white">
                  <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm w-fit group-hover:bg-white/30 transition-colors">
                    {tile.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">{t(tile.labelKey, tile.id)}</h2>
                    <p className="text-sm md:text-base text-white/85 mt-1">{t(tile.descKey, '')}</p>
                  </div>
                </div>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {t('Agenten & Praxis-Funktionen', 'Agenten & Praxis-Funktionen')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {practiceOpsLinks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className="group rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 text-left hover:border-blue-400/60 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
                        {item.icon}
                        {item.title}
                      </span>
                      {item.badge ? (
                        <span className="text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {t('Schnellstart', 'Schnellstart')}
                </h3>
              </div>
              <div className="space-y-3">
                {quickLaunch.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3.5 text-left hover:border-blue-400/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      {item.icon}
                      {item.title}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{item.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <PracticeGrowthSection
            onOpenAdmin={() => navigate('/verwaltung/login')}
            onOpenAgents={() => navigate('/verwaltung/agents')}
            onOpenBuilder={() => navigate('/flows/builder')}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-[var(--text-muted)] border-t border-[var(--border-primary)]">
        <div>{t('home.footer_patient', 'Bitte wählen Sie Ihren Bereich. Dieses Gerät setzt sich nach 60 Sekunden automatisch zurück.')}</div>
        <div className="mt-1">
          <button
            onClick={() => navigate('/verwaltung/login')}
            className="underline hover:text-[var(--text-secondary)] transition-colors"
          >
            {t('home.verwaltung_link', 'Zur Verwaltungsansicht')}
          </button>
        </div>
      </footer>
    </div>
  );
}
