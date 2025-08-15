const CACHE_NAME = 'synapse-v1.0.0';
const STATIC_CACHE = 'synapse-static-v1.0.0';
const DYNAMIC_CACHE = 'synapse-dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/inbox',
  '/notes',
  '/tasks',
  '/manifest.json',
  // Add critical CSS and JS files here
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/v1\/auth\/me/,
  /\/api\/v1\/notes/,
  /\/api\/v1\/tasks/,
  /\/api\/v1\/ideas/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other browser-specific URLs
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:' || 
      url.protocol === 'safari-extension:' ||
      url.protocol === 'chrome:' ||
      url.protocol === 'edge:' ||
      url.protocol === 'about:') {
    return;
  }

  // Skip cross-origin requests that might have CORS issues
  if (url.origin !== self.location.origin && 
      !url.href.startsWith('https://synapse-backend-7lq6.onrender.com')) {
    return;
  }

  // Handle different types of requests with error handling
  try {
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network First with fallback to cache
      event.respondWith(networkFirstStrategy(request));
    } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
      // Static assets - Cache First
      event.respondWith(cacheFirstStrategy(request));
    } else {
      // HTML pages - Stale While Revalidate
      event.respondWith(staleWhileRevalidateStrategy(request));
    }
  } catch (error) {
    console.error('[SW] Error handling fetch:', error);
    // Fall back to default browser behavior
    return;
  }
});

// Network First Strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    // Clone the request to add proper headers if needed
    const headers = new Headers(request.headers);
    
    // Ensure proper CORS mode for API requests
    const fetchOptions = {
      method: request.method,
      headers: headers,
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache'
    };

    const networkResponse = await fetch(request.url, fetchOptions);
    
    // Cache successful API responses
    if (networkResponse && networkResponse.ok && shouldCacheApiRequest(request)) {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.warn('[SW] Failed to cache response:', cacheError);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url, error);
    
    try {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (cacheError) {
      console.warn('[SW] Cache match failed:', cacheError);
    }
    
    // Return offline fallback for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'You are currently offline. Some features may not be available.' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Skip caching for unsupported schemes
    if (request.url.startsWith('chrome-extension://') || 
        request.url.startsWith('moz-extension://') || 
        request.url.startsWith('safari-extension://')) {
      console.log('[SW] Skipping cache for extension URL:', request.url);
      return fetch(request);
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      // Additional safety check before caching
      if (!request.url.startsWith('chrome-extension://')) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch asset:', request.url);
    // Return a fallback for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      return new Response('', { status: 404, statusText: 'Image not found' });
    }
    throw error;
  }
}

// Stale While Revalidate Strategy (for HTML pages)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // If network fails and we have a cached version, return it
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise return offline page
      return caches.match('/') || new Response('Offline', { status: 503 });
    });
  
  return cachedResponse || fetchPromise;
}

// Check if API request should be cached
function shouldCacheApiRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync...');
  // Implement background sync logic here
  // For example, sync offline notes, tasks, etc.
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Synapse',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Synapse', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
}); 