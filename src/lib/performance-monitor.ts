// Web Vitals Performance Monitoring
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { resolveApiBaseUrl } from './runtimeEndpoints';

interface PerformanceMetrics {
  lcp?: number;  // Largest Contentful Paint
  inp?: number;  // Interaction to Next Paint
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

const metrics: PerformanceMetrics = {};
const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL as string | undefined);
const WEB_VITALS_ENDPOINT = `${API_BASE_URL}/system/metrics/web-vitals`;
const API_TIMING_ENDPOINT = `${API_BASE_URL}/system/metrics/api-timing`;

function isSameOriginApiBase(apiBaseUrl: string): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const resolvedUrl = new URL(apiBaseUrl, window.location.origin);
    return resolvedUrl.origin === window.location.origin;
  } catch {
    return true;
  }
}

const crossOriginMetricsEnabled = import.meta.env.VITE_ENABLE_CROSS_ORIGIN_METRICS === 'true';
const disableCrossOriginMetricsByDefault = !crossOriginMetricsEnabled && !isSameOriginApiBase(API_BASE_URL);

let webVitalsEndpointDisabled = disableCrossOriginMetricsByDefault;
let apiTimingEndpointDisabled = disableCrossOriginMetricsByDefault;

function shouldDisableEndpoint(status: number): boolean {
  return status === 404 || status >= 500;
}

function postKeepaliveJson(url: string, body: string, endpoint: 'webVitals' | 'apiTiming'): void {
  if (endpoint === 'webVitals' && webVitalsEndpointDisabled) {
    return;
  }

  if (endpoint === 'apiTiming' && apiTimingEndpointDisabled) {
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'include',
  })
    .then((response) => {
      if (shouldDisableEndpoint(response.status)) {
        if (endpoint === 'webVitals') {
          webVitalsEndpointDisabled = true;
        } else {
          apiTimingEndpointDisabled = true;
        }
      }
    })
    .catch(() => {
      if (endpoint === 'webVitals') {
        webVitalsEndpointDisabled = true;
      } else {
        apiTimingEndpointDisabled = true;
      }
    });
}

function sendToAnalytics(metric: Metric) {
  // Store locally
  switch (metric.name) {
    case 'LCP': metrics.lcp = metric.value; break;
    case 'INP': metrics.inp = metric.value; break;
    case 'CLS': metrics.cls = metric.value; break;
    case 'FCP': metrics.fcp = metric.value; break;
    case 'TTFB': metrics.ttfb = metric.value; break;
  }

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Send analytics as keepalive request to the resolved backend API.
  postKeepaliveJson(WEB_VITALS_ENDPOINT, body, 'webVitals');
}

export function trackWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

export function trackApiPerformance(endpoint: string, duration: number) {
  postKeepaliveJson(API_TIMING_ENDPOINT, JSON.stringify({ endpoint, duration }), 'apiTiming');
}

export function getMetrics(): PerformanceMetrics {
  return { ...metrics };
}
