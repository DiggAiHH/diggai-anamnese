// Web Vitals Performance Monitoring
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface PerformanceMetrics {
  lcp?: number;  // Largest Contentful Paint
  inp?: number;  // Interaction to Next Paint
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

const metrics: PerformanceMetrics = {};

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

  // Sende an Analytics (Beacon API für zuverlässiges Senden)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/system/metrics/web-vitals', body);
  } else {
    fetch('/api/system/metrics/web-vitals', {
      method: 'POST',
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export function trackWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

export function trackApiPerformance(endpoint: string, duration: number) {
  fetch('/api/system/metrics/api-timing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, duration }),
    keepalive: true,
  }).catch(() => {});
}

export function getMetrics(): PerformanceMetrics {
  return { ...metrics };
}
