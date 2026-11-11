// Offline support.
var CACHE = 'thaical-v4';
var FILES = ['./', 'index.html', 'styles.css', 'thaical.js', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Network first so updates show at once; fall back to the cache when offline.
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return fetch(e.request).then(function (res) {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(function () { return cache.match(e.request, { ignoreSearch: true }); });
  }));
});
