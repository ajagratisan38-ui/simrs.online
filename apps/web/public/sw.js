const CACHE_NAME = 'simrs-cache-v5'
const API_CACHE_NAME = 'simrs-api-cache-v5'

const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

// ═══════════════════════════════════════
// INSTALL — cache static assets
// ═══════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Some routes may not be cacheable in dev
      })
    }),
  )
  self.skipWaiting()
})

// ═══════════════════════════════════════
// ACTIVATE — clean old caches
// ═══════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
    }),
  )
  self.clients.claim()
})

// ═══════════════════════════════════════
// FETCH — network-first with cache fallback
// ═══════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  // API requests: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone()
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, cloned)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: 'OFFLINE', message: 'Anda sedang offline' },
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          })
        }),
    )
    return
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned)
            })
          }
          return response
        })
      }),
    )
    return
  }

  // HTML pages: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/')
        })
      }),
  )
})

// ═══════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {
    title: 'SIMRS',
    body: 'Ada notifikasi baru',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-96.svg',
    data: { url: '/dashboard' },
  }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    // use defaults
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/icon-96.svg',
    tag: data.tag || 'simrs-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    data: data.data || { url: '/dashboard' },
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options),
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus existing window
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})

// ═══════════════════════════════════════
// BACKGROUND SYNC
// ═══════════════════════════════════════
self.addEventListener('sync', (event) => {
  if (event.tag === 'simrs-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC' })
        })
      }),
    )
  }
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'simrs-periodic-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC' })
        })
      }),
    )
  }
})

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
