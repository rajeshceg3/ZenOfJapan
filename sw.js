const CACHE_NAME = 'zen-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './audio.js',
  './manifest.json',
  './assets/audio/zen-garden.mp3',
  './assets/audio/bamboo-flute.mp3',
  './assets/audio/temple-chants.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation requests: Network first, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
            return caches.match(event.request);
        })
    );
    return;
  }

  // Audio files: Cache first, fall back to network
  if (event.request.destination === 'audio') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
    return;
  }

  // Default: Stale-while-revalidate for everything else (JS, CSS)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});
