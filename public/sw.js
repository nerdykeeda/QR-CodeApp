const CACHE_NAME = 'linqrius-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/link-shorten.html',
  '/cliqart.html',
  '/profile.html',
  '/dashboard.html',
  '/script.js',
  '/styles.css',
  '/cliqart.js',
  '/profile.js',
  '/dashboard.js',
  '/link-shortener.js',
  '/qrcode.min.js',
  '/favicon.svg',
  '/manifest.json',
  '/terms.html',
  '/privacy.html',
  '/blog.html',
  '/sitemap.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
