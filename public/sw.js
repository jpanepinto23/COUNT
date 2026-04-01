const CACHE_NAME = 'count-v1'
const STATIC_ASSETS = ['/', '/home', '/log', '/rewards', '/leaderboard', '/rank']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'COUNT'
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/home' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/home'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
