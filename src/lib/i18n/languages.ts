export type AppLanguageDirection = 'ltr' | 'rtl';

export interface AppLanguage {
  readonly code: string;
  readonly name: string;
  readonly flag: string;
  readonly dir: AppLanguageDirection;
}

export const APP_LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ro', name: 'Română', flag: '🇷🇴', dir: 'ltr' },
  { code: 'bg', name: 'Български', flag: '🇧🇬', dir: 'ltr' },
] as const satisfies readonly AppLanguage[];

export type AppLanguageCode = (typeof APP_LANGUAGES)[number]['code'];

export const APP_LANGUAGE_CODES = APP_LANGUAGES.map((language) => language.code) as AppLanguageCode[];

export const RTL_APP_LANGUAGE_CODES = APP_LANGUAGES
  .filter((language) => language.dir === 'rtl')
  .map((language) => language.code) as AppLanguageCode[];

const appLanguageCodeSet = new Set<string>(APP_LANGUAGE_CODES);

export function normalizeAppLanguageCode(
  language: string | null | undefined,
  fallback: AppLanguageCode = 'de',
): AppLanguageCode {
  if (!language) return fallback;

  const normalizedLanguage = language.split('-')[0].toLowerCase();
  if (appLanguageCodeSet.has(normalizedLanguage)) {
    return normalizedLanguage as AppLanguageCode;
  }

  return fallback;
}

export function getAppLanguage(
  language: string | null | undefined,
): (typeof APP_LANGUAGES)[number] {
  const normalizedLanguage = normalizeAppLanguageCode(language);
  return (
    APP_LANGUAGES.find((appLanguage) => appLanguage.code === normalizedLanguage) ?? APP_LANGUAGES[0]
  );
}
