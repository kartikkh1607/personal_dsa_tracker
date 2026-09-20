// Offline support. Pages load network-first so a new deploy shows up right away,
// falling back to the cached app when offline. Build assets have content hashes
// in their names and fonts never change, so those are served cache-first.
//
// BUILD_ID and PRECACHE below are rewritten in dist/ at build time by the
// serviceWorker plugin in vite.config.js. The values here are the fallbacks
// used in dev, where the worker isn't registered anyway. Keeping them real
// values (rather than placeholder tokens) keeps this file valid, lintable JS.
const BUILD_ID = 'dev'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

// The cache name carries the build id, so every deploy writes to a fresh cache
// and activate() drops the previous one. The old constant name ('dsa-tracker-v1')
// never changed, which let stale hashed assets pile up forever; anything that
// isn't the current cache is now deleted, including that one.
const CACHE = `dsa-tracker-${BUILD_ID}`
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // One unreachable file must not fail the whole install, which would
      // leave the old worker in charge indefinitely.
      Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
    ),
  )
  // Deliberately no skipWaiting(): a new worker waits until the page asks for
  // it. Taking over under a running page would pull hashed chunks out from
  // under it - they're gone from both the new cache and the server after a
  // deploy. The page shows an "Update available" prompt and reloads instead.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// The page's "Reload" prompt sends this once the user accepts the update.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
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
