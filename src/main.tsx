import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './i18n';

import { Suspense } from 'react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider debug={import.meta.env.DEV}>
        <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>}>
          <App />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Register Service Worker for offline PWA support + auto-update
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const browserWindow = globalThis as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Check for updates every 5 minutes
        setInterval(() => registration.update(), 5 * 60 * 1000);

        // Handle waiting SW (new version available)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - activate immediately
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });

        // Reload when new SW takes over
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      }).catch(() => {
        // SW registration failed – app works fine without it
      });
    };

    const requestIdleCallback = browserWindow.requestIdleCallback;

    if (requestIdleCallback) {
      requestIdleCallback(registerServiceWorker, { timeout: 2000 });
      return;
    }

    globalThis.setTimeout(registerServiceWorker, 1200);
  });
}
