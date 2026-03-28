const RESERVED_HOST_PREFIXES = new Set(['localhost', '127', 'www', 'app', 'api', 'dev', 'test']);

export function resolvePraxisId(): string {
  if (typeof window === 'undefined') {
    return 'default';
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryPraxisId = searchParams.get('praxisId') || searchParams.get('p');
  if (queryPraxisId?.trim()) {
    return queryPraxisId.trim();
  }

  const host = window.location.hostname.toLowerCase();
  const [prefix] = host.split('.');
  if (prefix && !RESERVED_HOST_PREFIXES.has(prefix)) {
    return prefix;
  }

  return 'default';
}
