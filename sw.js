const CACHE_NAME = 'linqrius-v2';
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
  // Activate updated SW immediately
  self.skipWaiting();
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  const { request } = event;

  // Network-first for navigation/HTML to ensure latest content
  const isNavigation = request.mode === 'navigate' || (request.destination === 'document');
  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isNavigation || isHTML) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Cache-first for other assets
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
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
    }).then(() => self.clients.claim())
  );
});
