const CACHE_NAME = 'crack-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  '/firebase.js',
  '/db.js',
  '/app.js',
  '/images/site_overview.jpg',
  '/images/223-CH-308.jpg',
  '/images/223-CH-306.jpg',
  '/images/224-CH326.jpg',
  '/images/224-CH-328.jpg',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
