// Frontend Sentry Error Tracking
import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true, // DSGVO: Text maskieren
          maskAllInputs: true,
        }),
      ],
      tracesSampleRate: 0.1, // 10% Performance-Tracing
      replaysSessionSampleRate: 0.01, // 1% Session Replay
      replaysOnErrorSampleRate: 1.0, // 100% bei Fehlern
      beforeSend(event) {
        // PII-Filterung vor dem Senden
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });
    console.log('[Sentry] Frontend Sentry initialized');
  }
}

export const captureError = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
