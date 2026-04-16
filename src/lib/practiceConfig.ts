/**
 * practiceConfig — Build-time practice branding for white-label deployments.
 *
 * Reads VITE_PRACTICE_* environment variables set in Netlify Dashboard
 * or .env file. Falls back to Dr. Klaproth defaults (first pilot customer).
 *
 * For BSNR-scoped routes (/:bsnr), the TenantStore from the backend
 * takes precedence. This config is used for the root "/" HomeScreen
 * and other non-tenant-scoped pages.
 */

export interface PracticeConfig {
  /** Practice display name */
  name: string;
  /** Doctor name shown in header & avatar */
  doctor: string;
  /** Specialty / subtitle shown below practice name */
  specialty: string;
  /** CSS gradient for the header logo background */
  logoGradient: string;
  /** Primary brand color (Tailwind class prefix, e.g. 'blue' or 'teal') */
  primaryColor: string;
  /** Secondary/accent color */
  accentColor: string;
  /** Tile gradients [patient, portal, telemedizin] */
  tileGradients: [string, string, string];
  /** Optional external logo URL */
  logoUrl: string | null;
  /** Practice website URL (for footer/links) */
  websiteUrl: string | null;
}

/**
 * Default config: Praxis für Gefäßmedizin, Dr. Klaproth (Husum)
 * Colors derived from praxis-fuer-gefaessmedizin.de (deep blue/teal medical theme)
 */
const KLAPROTH_DEFAULTS: PracticeConfig = {
  name: 'Praxis für Gefäßmedizin',
  doctor: 'Dr. med. Christian Klaproth',
  specialty: 'Gefäßchirurgie · Venenheilkunde',
  logoGradient: 'from-sky-600 to-blue-800',
  primaryColor: 'sky',
  accentColor: 'blue',
  tileGradients: [
    'from-sky-600 to-blue-700',
    'from-teal-500 to-emerald-600',
    'from-indigo-500 to-violet-600',
  ],
  logoUrl: null,
  websiteUrl: 'https://www.praxis-fuer-gefaessmedizin.de',
};

function env(key: string): string | undefined {
  return import.meta.env[key] as string | undefined;
}

export const practiceConfig: PracticeConfig = {
  name: env('VITE_PRACTICE_NAME') ?? KLAPROTH_DEFAULTS.name,
  doctor: env('VITE_PRACTICE_DOCTOR') ?? KLAPROTH_DEFAULTS.doctor,
  specialty: env('VITE_PRACTICE_SPECIALTY') ?? KLAPROTH_DEFAULTS.specialty,
  logoGradient: env('VITE_PRACTICE_LOGO_GRADIENT') ?? KLAPROTH_DEFAULTS.logoGradient,
  primaryColor: env('VITE_PRACTICE_PRIMARY_COLOR') ?? KLAPROTH_DEFAULTS.primaryColor,
  accentColor: env('VITE_PRACTICE_ACCENT_COLOR') ?? KLAPROTH_DEFAULTS.accentColor,
  tileGradients: [
    env('VITE_PRACTICE_TILE_1') ?? KLAPROTH_DEFAULTS.tileGradients[0],
    env('VITE_PRACTICE_TILE_2') ?? KLAPROTH_DEFAULTS.tileGradients[1],
    env('VITE_PRACTICE_TILE_3') ?? KLAPROTH_DEFAULTS.tileGradients[2],
  ],
  logoUrl: env('VITE_PRACTICE_LOGO_URL') ?? KLAPROTH_DEFAULTS.logoUrl,
  websiteUrl: env('VITE_PRACTICE_WEBSITE_URL') ?? KLAPROTH_DEFAULTS.websiteUrl,
};
