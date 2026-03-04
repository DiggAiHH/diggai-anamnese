/**
 * HomeScreen — Shared Tablet / Kiosk Entry Point
 * 
 * 4 Kacheln: Patient, Arzt, MFA, Lieferant
 * Auto-Reset nach 60s Inaktivität
 * Uhr, Datum, Praxis-Branding
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Stethoscope, Shield, Users, Truck, Clock, Calendar } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

interface HomeTile {
  id: string;
  route: string;
  icon: React.ReactNode;
  gradient: string;
  labelKey: string;
  descKey: string;
}

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastInteraction, setLastInteraction] = useState(Date.now());

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
  const tiles: HomeTile[] = [
    {
      id: 'patient',
      route: '/patient',
      icon: <Stethoscope className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-blue-500 to-indigo-600',
      labelKey: 'home.tile.patient',
      descKey: 'home.tile.patient_desc',
    },
    {
      id: 'arzt',
      route: '/arzt',
      icon: <Shield className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-emerald-500 to-teal-600',
      labelKey: 'home.tile.arzt',
      descKey: 'home.tile.arzt_desc',
    },
    {
      id: 'mfa',
      route: '/mfa',
      icon: <Users className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-purple-500 to-violet-600',
      labelKey: 'home.tile.mfa',
      descKey: 'home.tile.mfa_desc',
    },
    {
      id: 'lieferant',
      route: '/lieferant',
      icon: <Truck className="w-16 h-16 md:w-20 md:h-20" />,
      gradient: 'from-amber-500 to-orange-600',
      labelKey: 'home.tile.lieferant',
      descKey: 'home.tile.lieferant_desc',
    },
  ];

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

      {/* Tiles Grid */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="grid grid-cols-2 gap-6 md:gap-8 max-w-3xl w-full">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => navigate(tile.route)}
              className={`
                group relative overflow-hidden rounded-3xl p-8 md:p-10
                bg-gradient-to-br ${tile.gradient}
                shadow-lg hover:shadow-2xl
                transform hover:scale-[1.03] active:scale-[0.98]
                transition-all duration-300 ease-out
                focus:outline-none focus:ring-4 focus:ring-white/30
                cursor-pointer
              `}
              aria-label={t(tile.labelKey, tile.id)}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />

              <div className="relative flex flex-col items-center gap-4 text-white">
                <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                  {tile.icon}
                </div>
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold">
                    {t(tile.labelKey, tile.id)}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 mt-1">
                    {t(tile.descKey, '')}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-[var(--text-muted)] border-t border-[var(--border-primary)]">
        {t('home.footer', 'Bitte wählen Sie Ihren Bereich. Dieses Gerät setzt sich nach 60 Sekunden automatisch zurück.')}
      </footer>
    </div>
  );
}
