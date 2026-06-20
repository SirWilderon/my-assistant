// Minimal service worker - required for PWA installability
// Does not cache anything, just needs to exist and register

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests normally (no offline caching)
  event.respondWith(fetch(event.request));
});
