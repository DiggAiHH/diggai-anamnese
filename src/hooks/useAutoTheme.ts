import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

/**
 * useAutoTheme — H2 (Arzt-Feedback 2026-05-03)
 *
 * Wenn der Theme-Store noch keine vom User explizit gesetzte Praeferenz
 * speichert (Erst-Besuch), folgt der Browser-`prefers-color-scheme`-Wert.
 * Wird die Praeferenz spaeter geaendert (matchMedia change), updaten wir
 * nur dann automatisch, wenn der User nicht manuell umgeschaltet hat.
 *
 * Persistenz: Der Store nutzt Zustand-persist. Sobald der User toggleTheme()
 * aufruft, gilt das als manuelle Wahl und wird nicht mehr ueberschrieben.
 */
export function useAutoTheme() {
  const setTheme = useThemeStore(s => s.setTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    // Auf "auto" reagieren wir nur, wenn der User noch keine Praeferenz
    // gespeichert hat. Indikator: kein anamnese-theme-Eintrag in localStorage.
    const userHasOverride = (() => {
      try {
        return Boolean(localStorage.getItem('anamnese-theme-user-override'));
      } catch {
        return false;
      }
    })();

    if (userHasOverride) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      // Nur folgen, wenn weiterhin keine Override-Wahl getroffen wurde.
      try {
        if (localStorage.getItem('anamnese-theme-user-override')) return;
      } catch {
        /* ignore */
      }
      setTheme(e.matches ? 'dark' : 'light');
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setTheme]);
}

/**
 * Markiert dass der User explizit umgeschaltet hat — fortan keine
 * automatische Anpassung an prefers-color-scheme mehr.
 */
export function markThemeOverride() {
  try {
    localStorage.setItem('anamnese-theme-user-override', '1');
  } catch {
    /* ignore */
  }
}
