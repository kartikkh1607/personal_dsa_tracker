// Offline support. Pages load network-first so a new deploy shows up right away,
// falling back to the cached app when offline. Build assets have content hashes
// in their names and fonts never change, so those are served cache-first.
const CACHE = 'dsa-tracker-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function cacheCopy(request, response) {
  const copy = response.clone()
  caches.open(CACHE).then((cache) => cache.put(request, copy))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) cacheCopy('/index.html', response)
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  const sameOrigin = url.origin === self.location.origin
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          // Font files come back "opaque" (cross-origin without CORS) but are still fine to cache.
          if (response.ok || response.type === 'opaque') cacheCopy(request, response)
          return response
        }),
    ),
  )
})
