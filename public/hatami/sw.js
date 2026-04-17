// DiggAI Hatami Service Worker v4 (Auto-Update + path-aware)
const CACHE_VERSION = '4';
const CACHE_NAME = `diggai-anamnese-v${CACHE_VERSION}`;
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const scopedPath = (path) => `${SCOPE_PATH}${path}` || path;
const STATIC_ASSETS = [
  scopedPath('/'),
  scopedPath('/manifest.json'),
  scopedPath('/icons/icon-192.svg'),
  scopedPath('/icons/icon-512.svg'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|webp|woff2?|ttf|eot)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  if (url.pathname.startsWith(scopedPath('/locales/'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response(
        '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Praxis Hatami Offline</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#050508;color:#e2e8f0;text-align:center}.c{max-width:400px;padding:2rem}h1{font-size:1.5rem;margin-bottom:1rem}p{color:#94a3b8;margin-bottom:1.5rem}button{background:#0e7490;color:#fff;border:none;padding:.75rem 2rem;border-radius:12px;font-weight:600;cursor:pointer}</style></head><body><div class="c"><h1>Sie sind offline</h1><p>Bitte pruefen Sie Ihre Internetverbindung und versuchen Sie es erneut.</p><button onclick="location.reload()">Erneut versuchen</button></div></body></html>',
        { headers: { 'Content-Type': 'text/html' }, status: 503 }
      )))
  );
});

// ─── Push Notification Handler ─────────────────────────────

self.addEventListener('push', function(event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'DiggAI', body: event.data.text() };
  }

  const iconPath = scopedPath('/icons/icon-192.svg');
  const title = payload.title || 'Praxis Hatami';
  const options = {
    body: payload.body || '',
    icon: payload.icon || iconPath,
    badge: payload.badge || iconPath,
    tag: payload.tag || 'diggai-notification',
    data: payload.data || {},
    requireInteraction: payload.type === 'medication_reminder',
    actions: payload.type === 'medication_reminder' ? [
      { action: 'confirm', title: '✅ Genommen' },
      { action: 'skip', title: '⏭ Überspringen' }
    ] : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'confirm' && data.reminderId) {
    // Post message to all clients to confirm reminder
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'REMINDER_CONFIRMED', reminderId: data.reminderId });
        });
      })
    );
  } else {
    // Open the PWA
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow(scopedPath('/pwa'));
        }
      })
    );
  }
});