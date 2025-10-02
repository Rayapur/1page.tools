// Service Worker for 1Page Tools PWA
const CACHE_NAME = '1page-tools-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/css/theme.css',
  '/assets/images/1page-logo.png',
  '/assets/images/android-chrome-192x192.png',
  '/assets/images/android-chrome-512x512.png',
  '/assets/images/apple-touch-icon.png',
  '/assets/images/favicon-16x16.png',
  '/assets/images/favicon-32x32.png',
  '/assets/images/favicon.ico',
  '/manifest.json',
  // Core tool pages
  '/math/calculator.html',
  '/math/scientificcalculator.html',
  '/math/unitconverter.html',
  '/math/percentage.html',
  // Games (high engagement)
  '/games/wordle.html',
  '/games/memory.html',
  '/games/2048.html',
  '/games/mathquiz.html',
  '/games/typing.html',
  '/games/simon.html',
  '/games/spellingbee.html',
  '/games/geography.html',
  '/games/tictactoe.html',
  '/games/wordsearch.html',
  // Text tools
  '/text/caseconverter.html',
  '/text/textcounter.html',
  '/text/textdiff.html',
  '/text/loremipsum.html',
  // Code tools
  '/code/base64encoder.html',
  '/code/jsonformatter.html',
  '/code/xmlformatter.html',
  '/code/csvtojson.html',
  '/code/regextester.html',
  // Image tools
  '/image/imagecropper.html',
  '/image/imageresizer.html',
  '/image/imagecompressor.html',
  '/image/imageconverter.html',
  '/image/imageblur.html',
  '/image/imagerotator.html',
  // Web tools
  '/web/qrcodegenerator.html',
  '/web/urlencoder.html',
  '/web/favicongenerator.html',
  // Security tools
  '/security/passwordgenerator.html',
  '/security/hashgenerator.html',
  '/security/guidgenerator.html',
  '/security/emailvalidator.html',
  // Color tools
  '/color/colorpicker.html',
  '/color/colorpickerimage.html',
  // DateTime tools
  '/datetime/countdowntimer.html',
  '/datetime/stopwatch.html',
  '/datetime/timer.html',
  '/datetime/epochconverter.html',
  '/datetime/timezoneconverter.html',
  // PDF tools
  '/pdf/topdf.html',
  '/pdf/pdftoimage.html',
  '/pdf/pdfpasswordremover.html',
  '/pdf/pdfspliter.html',
  '/pdf/pdfsticher.html',
  // CSV tools
  '/csv/chartgenerator.html',
  '/csv/colorcsv.html',
  // Audio tools
  '/audio/audioconverter.html',
  // Geo tools
  '/geo/ipgeoloc.html',
  // Legal pages
  '/privacy-policy.html',
  '/terms-of-use.html'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (except for essential resources)
  if (url.origin !== location.origin) {
    // Allow Google Fonts and AdSense
    if (url.origin.includes('fonts.googleapis.com') || 
        url.origin.includes('fonts.gstatic.com') ||
        url.origin.includes('pagead2.googlesyndication.com') ||
        url.origin.includes('googleads.g.doubleclick.net')) {
      event.respondWith(
        fetch(request)
          .catch(() => {
            // Return offline fallback for external resources
            return new Response('', { status: 503, statusText: 'Service Unavailable' });
          })
      );
    }
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // HTML pages - cache first, then network
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request)
              .then(response => {
                if (response.status === 200) {
                  const responseClone = response.clone();
                  caches.open(DYNAMIC_CACHE)
                    .then(cache => cache.put(request, responseClone));
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => cache.put(request, responseClone));
              }
              return response;
            })
            .catch(() => {
              // Return offline page for HTML requests
              return caches.match('/index.html');
            });
        })
    );
  } else {
    // Static assets - cache first
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => cache.put(request, responseClone));
              }
              return response;
            })
            .catch(() => {
              // Return appropriate fallback based on request type
              if (request.destination === 'image') {
                return new Response('', { status: 404 });
              }
              return new Response('', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any offline actions that need to be synced
      console.log('Background sync triggered')
    );
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/images/android-chrome-192x192.png',
      badge: '/assets/images/favicon-32x32.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Open App',
          icon: '/assets/images/favicon-32x32.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/assets/images/favicon-32x32.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle app install prompt
self.addEventListener('beforeinstallprompt', event => {
  console.log('App install prompt available');
  // Store the event for later use
  event.preventDefault();
  self.deferredPrompt = event;
});

// Cache management
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker loaded successfully');
