/// <reference lib="webworker" />
const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
const CACHE = 'ruddaf-owned-assets-v2';
const CORE = ['/brand/logo-mark.svg', '/brand/park-illustration.svg', '/brand/favicon.svg'];
worker.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => worker.skipWaiting())));
worker.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ruddaf-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => worker.clients.claim())));
worker.addEventListener('fetch', (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== worker.location.origin || request.mode === 'navigate') return;
  if (!url.pathname.startsWith('/brand/')) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy))); }
    return response;
  }).catch(async () => (await caches.match(request)) || Response.error()));
});
