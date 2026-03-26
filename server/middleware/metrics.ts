// Prometheus Metrics Middleware
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create Registry
export const register = new Registry();

// Standard Node.js Metrics (GC, Memory, CPU, etc.)
collectDefaultMetrics({ register });

// HTTP Request Duration
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// HTTP Request Counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active Sessions Gauge
export const activeSessionsGauge = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of active user sessions',
  registers: [register],
});

// Database Connection Gauge
export const dbConnectionsGauge = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Triage Alerts Counter
export const triageAlertsCounter = new Counter({
  name: 'triage_alerts_total',
  help: 'Total number of triage alerts triggered',
  labelNames: ['level'], // critical, warning, info
  registers: [register],
});

// Business Metrics Gauge
export const businessMetricsGauge = new Gauge({
  name: 'business_metric',
  help: 'Business metrics',
  labelNames: ['metric_name'],
  registers: [register],
});

// API Errors Counter (for alerting)
export const apiErrorsCounter = new Counter({
  name: 'api_errors_total',
  help: 'Total API errors by route and status code',
  labelNames: ['route', 'status_code'],
  registers: [register],
});

// Middleware for Express
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;
    
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    
    // Track errors for alerting (4xx and 5xx)
    if (statusCode >= 400) {
      apiErrorsCounter.inc({ route, status_code: String(statusCode) });
    }
  });
  
  next();
}

// Metrics Endpoint Handler
export async function metricsHandler(req: any, res: any) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
