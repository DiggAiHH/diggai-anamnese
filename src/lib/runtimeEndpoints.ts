const PRODUCTION_API_FALLBACK = 'https://api.diggai.de/api';
const PRODUCTION_SOCKET_FALLBACK = 'https://api.diggai.de';

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /replace_with/i,
  /railway_url/i,
  /your[-_ ]?api[-_ ]?url/i,
  /example\.com/i,
  /^undefined$/i,
  /^null$/i,
];

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isKnownProductionHost(hostname: string): boolean {
  return hostname === 'diggai.de'
    || hostname.endsWith('.diggai.de')
    || hostname.endsWith('.netlify.app');
}

export function isLikelyPlaceholderUrl(value: string | undefined | null): boolean {
  if (!value) {
    return true;
  }

  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getWindowHostname(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.hostname.toLowerCase();
}

export function resolveApiBaseUrl(configuredApiUrl?: string): string {
  if (!isLikelyPlaceholderUrl(configuredApiUrl)) {
    return trimTrailingSlash(configuredApiUrl as string);
  }

  const hostname = getWindowHostname();
  if (!hostname) {
    return '/api';
  }

  if (isLocalHost(hostname)) {
    return '/api';
  }

  if (isKnownProductionHost(hostname)) {
    return PRODUCTION_API_FALLBACK;
  }

  return '/api';
}

export function resolveSocketBaseUrl(configuredSocketUrl?: string, configuredApiUrl?: string): string {
  if (!isLikelyPlaceholderUrl(configuredSocketUrl)) {
    return trimTrailingSlash(configuredSocketUrl as string);
  }

  const apiBaseUrl = resolveApiBaseUrl(configuredApiUrl);

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }

  const hostname = getWindowHostname();
  if (hostname && isKnownProductionHost(hostname)) {
    return PRODUCTION_SOCKET_FALLBACK;
  }

  if (hostname && isLocalHost(hostname) && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return 'http://localhost:3000';
}
