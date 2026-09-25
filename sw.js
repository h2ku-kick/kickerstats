/* Offline-Speicher: App-Dateien und Fotos bleiben auf dem Handy.
   Bei jeder Änderung an der App VERSION hochzählen, dann holt sich jedes Handy die neue Fassung. */
const VERSION = 'h2ku-v20';
const SHELL = ['./', 'index.html', 'style.css', 'data.js', 'article.js', 'app.js', 'game.js', 'manifest.webmanifest', 'img/crest.png', 'img/icon-192.png', 'img/team.jpg'];

// Beim Installieren am Browser-Zwischenspeicher vorbei laden, damit keine alte Datei im Offline-Speicher landet
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('script.google')) return;          // Daten immer frisch
  if (url.origin === location.origin && /\.(html|js|css|webmanifest)$|\/$/.test(url.pathname)) {
    // App-Dateien: immer zuerst die neueste Fassung vom Server (ohne Browser-Zwischenspeicher), offline aus dem Speicher
    const key = url.origin + url.pathname;
    e.respondWith(fetch(key, { cache: 'no-store' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key).then(hit => hit || caches.match('./'))));
    return;
  }
  // Fotos, Schriften: erst Speicher, sonst Netz
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  })));
});
