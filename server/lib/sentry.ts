// Backend Sentry Error Tracking
import * as Sentry from '@sentry/node';
import { config } from '../config';

export function initSentry() {
  if (config.sentryDsn) {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.nodeEnv,
      release: config.appVersion,
      tracesSampleRate: 0.1,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
      beforeSend(event) {
        // Remove PII from Events (DSGVO Compliance)
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        // Filter out health check noise
        if (event.request?.url?.includes('/api/health') || 
            event.request?.url?.includes('/api/system/metrics')) {
          return null;
        }
        return event;
      },
    });
    console.log('[Sentry] Backend Sentry initialized');
  }
}

// Sentry v10+ uses OpenTelemetry for automatic instrumentation.
// We no longer need a manual request handler middleware.
export const sentryMiddleware = (_req: any, _res: any, next: any) => next();

/**
 * Sets up the Sentry error handler for Express.
 * In v10, this should be called as Sentry.setupExpressErrorHandler(app)
 * AFTER all other routes.
 */
export const setupSentryErrorHandler = (app: any) => {
  if (config.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }
};
