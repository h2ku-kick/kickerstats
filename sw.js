/* Offline-Speicher: App-Dateien und Fotos bleiben auf dem Handy.
   Bei jeder Änderung an der App VERSION hochzählen, dann holt sich jedes Handy die neue Fassung. */
const VERSION = 'h2ku-v2';
const SHELL = ['./', 'index.html', 'style.css', 'data.js', 'article.js', 'app.js', 'manifest.webmanifest', 'img/crest.png', 'img/icon-192.png', 'img/team.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('script.google')) return;          // Daten immer frisch
  if (url.origin === location.origin && /\.(html|js|css|webmanifest)$|\/$/.test(url.pathname)) {
    // App-Dateien: erst Netz (neueste Version), sonst Speicher
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // Fotos, Schriften: erst Speicher, sonst Netz
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  })));
});
