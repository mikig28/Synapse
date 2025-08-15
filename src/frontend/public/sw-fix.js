// Minimal service worker to replace the problematic one
// This will unregister itself and clean up

self.addEventListener('install', function(event) {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Clean up all caches
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW-FIX] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Unregister this service worker
      return self.registration.unregister();
    }).then(function() {
      console.log('[SW-FIX] Service worker unregistered successfully');
    })
  );
});

// Don't handle any fetch events
self.addEventListener('fetch', function(event) {
  // Let the browser handle all requests normally
  return;
});