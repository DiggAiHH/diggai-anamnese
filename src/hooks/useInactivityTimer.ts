import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT_MS  = 15 * 60 * 1000; // 15 minutes → auto-logout
const WARN_BEFORE_MS   =  2 * 60 * 1000; // show warning 2 minutes before logout
const WARN_AT_MS       = IDLE_TIMEOUT_MS - WARN_BEFORE_MS; // 13 minutes

const ACTIVITY_EVENTS  = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'scroll', 'click',
] as const;

/**
 * C18 — DSGVO-/BSI-konformer Inactivity-Timeout für das Praxis-Dashboard.
 *
 * Nur für eingeloggte Staff-User (arzt / mfa / admin).
 * Patienten-Anamnese-Formular ist bewusst ausgenommen (kein Login erforderlich).
 *
 * Verhalten:
 *  - Nach 13 Min. Inaktivität: `isWarning = true` (UI-Warnung anzeigen)
 *  - Nach 15 Min. Inaktivität: `onTimeout()` aufrufen (Logout)
 *  - Jede Benutzeraktion setzt den Timer zurück
 *
 * @param onTimeout  Callback der bei Ablauf aufgerufen wird (Logout-Logik)
 * @param enabled    Timer nur aktiv wenn true (Standard: true)
 */
export function useInactivityTimer(
  onTimeout: () => void,
  enabled = true,
): { isWarning: boolean; remainingSeconds: number; resetTimer: () => void } {
  const [isWarning, setIsWarning]           = useState(false);
  const [remainingSeconds, setRemaining]    = useState(IDLE_TIMEOUT_MS / 1000);
  const warnTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current)   clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current)   clearInterval(countdownRef.current);
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    lastActivityRef.current = Date.now();
    setIsWarning(false);
    setRemaining(IDLE_TIMEOUT_MS / 1000);

    warnTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      // Start countdown from 120 → 0
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setRemaining(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, WARN_AT_MS);

    logoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      onTimeout();
    }, IDLE_TIMEOUT_MS);
  }, [clearAllTimers, onTimeout]);

  const resetTimer = useCallback(() => {
    if (enabled) startTimers();
  }, [enabled, startTimers]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setIsWarning(false);
      setRemaining(IDLE_TIMEOUT_MS / 1000);
      return;
    }

    startTimers();

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      // Only restart if we haven't yet triggered the warning
      // (during warning phase, user must explicitly click "Eingeloggt bleiben")
      if (!isWarning) {
        startTimers();
      }
    };

    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, handleActivity, { passive: true }),
    );

    return () => {
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, handleActivity),
      );
      clearAllTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { isWarning, remainingSeconds, resetTimer };
}
