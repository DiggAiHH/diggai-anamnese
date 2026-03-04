/**
 * StaffAutoLogout — Idle Detection + Force Logout for Staff Dashboards
 * 
 * - 5 Minuten inaktiv → Warnung (30s Countdown)
 * - Timeout → Logout + Redirect to HomeScreen
 * - Reset bei Touch/Mouse/Key
 * - PrivacyOverlay: CSS-Blur auf Patientendaten bei Idle-Warning
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LogOut, Timer } from 'lucide-react';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minuten
const WARNING_DURATION_S = 30; // 30 Sekunden Countdown

interface StaffAutoLogoutProps {
  /** Staff role — used for logout route logic */
  role: 'arzt' | 'mfa' | 'admin';
  /** Callback when auto-logout triggers */
  onLogout?: () => void;
  /** Whether auto-logout is enabled (can be overridden in settings) */
  enabled?: boolean;
}

export function StaffAutoLogout({ role: _role, onLogout, enabled = true }: StaffAutoLogoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION_S);
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Reset Idle Timer ─────────────────────────────────
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setCountdown(WARNING_DURATION_S);
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    }
  }, [showWarning]);

  // ─── Listen for User Activity ─────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, resetActivity));
    return () => events.forEach(e => window.removeEventListener(e, resetActivity));
  }, [enabled, resetActivity]);

  // ─── Check Idle Every 10s ─────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const checker = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_TIMEOUT_MS && !showWarning) {
        setShowWarning(true);
        setCountdown(WARNING_DURATION_S);
      }
    }, 10_000);
    return () => clearInterval(checker);
  }, [enabled, showWarning]);

  // ─── Countdown Timer ──────────────────────────────────
  useEffect(() => {
    if (!showWarning) return;

    warningTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Force logout
          if (warningTimerRef.current) clearInterval(warningTimerRef.current);
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning]);

  // ─── Logout Action ────────────────────────────────────
  const performLogout = useCallback(() => {
    setShowWarning(false);
    // Clear auth token
    localStorage.removeItem('arzt_token');
    sessionStorage.clear();
    onLogout?.();
    navigate('/', { replace: true });
  }, [navigate, onLogout]);

  if (!enabled || !showWarning) return null;

  return (
    <>
      {/* Privacy Blur Overlay — blurs all content behind */}
      <div
        className="fixed inset-0 z-[998] backdrop-blur-md bg-black/30"
        aria-hidden="true"
      />

      {/* Warning Dialog */}
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        aria-label={t('autologout.title', 'Automatische Abmeldung')}
      >
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          {/* Warning Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            {t('autologout.title', 'Automatische Abmeldung')}
          </h2>

          <p className="text-[var(--text-secondary)] mb-4">
            {t('autologout.message', 'Sie waren längere Zeit inaktiv. Aus Sicherheitsgründen werden Sie automatisch abgemeldet.')}
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Timer className="w-5 h-5 text-red-500" />
            <span className="text-3xl font-mono font-bold text-red-500 tabular-nums">
              {countdown}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              {t('autologout.seconds', 'Sekunden')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetActivity}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              {t('autologout.stay', 'Angemeldet bleiben')}
            </button>
            <button
              onClick={performLogout}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <LogOut className="w-4 h-4" />
              {t('autologout.logout', 'Abmelden')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * PrivacyOverlay — Standalone blur overlay for manual privacy toggle
 * Used when staff manually activates privacy mode (e.g., patient approaching)
 */
interface PrivacyOverlayProps {
  active: boolean;
  onDismiss: () => void;
}

export function PrivacyOverlay({ active, onDismiss }: PrivacyOverlayProps) {
  const { t } = useTranslation();

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[997] backdrop-blur-lg bg-black/40 flex items-center justify-center cursor-pointer"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onDismiss()}
      aria-label={t('privacy.dismiss', 'Klicken zum Entsperren')}
    >
      <div className="text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-white/80 text-lg font-medium">
          {t('privacy.locked', 'Bildschirm geschützt')}
        </p>
        <p className="text-white/50 text-sm mt-1">
          {t('privacy.tap_unlock', 'Tippen zum Entsperren')}
        </p>
      </div>
    </div>
  );
}
