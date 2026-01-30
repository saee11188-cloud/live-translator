const CACHE_NAME = 'live-translator-v4-force-update';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './icon.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Force activation immediately
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all pages immediately
});

self.addEventListener('fetch', (e) => {
    // Try network first, then cache (Network-First strategy for better updates)
    e.respondWith(
        fetch(e.request)
            .then((res) => {
                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, resClone);
                });
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
