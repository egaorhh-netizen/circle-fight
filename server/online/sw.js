// Service Worker — автообновление при каждом запуске
const CACHE = 'circle-fight-v1';

// При установке — кэшируем основные файлы
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/', '/style.css', '/swords.js', '/game.js', '/manifest.json'
    ]).catch(() => {}))
  );
});

// При активации — удаляем старые кэши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Стратегия: сначала сеть, при ошибке — кэш
// Это гарантирует что игра всегда обновляется автоматически
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
