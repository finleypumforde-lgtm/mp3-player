// Carry-On service worker: keeps the app itself on the phone so it opens with no signal.
// Your songs live in IndexedDB (see index.html), not in this cache.
const VERSION = 'carry-on-1be0f95df2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('carry-on-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Open instantly from the cache, then quietly fetch a newer copy for next time.
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      const fresh = fetch(req)
        .then(res => { if (res && res.ok && res.type === 'basic') cache.put('./index.html', res.clone()); return res; })
        .catch(() => null);
      if (cached) { event.waitUntil(fresh); return cached; }
      return (await fresh) || new Response(
        '<!doctype html><meta name="viewport" content="width=device-width"><title>Carry-On</title><p style="font:17px -apple-system,sans-serif;padding:24px">Carry-On needs signal the first time you open it, so it can save itself to this phone.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    })());
    return;
  }

  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    return hit || fetch(req);
  })());
});
