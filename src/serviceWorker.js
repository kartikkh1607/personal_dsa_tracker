// Registers the offline worker and reports when a new version is waiting.
//
// A waiting worker does not take over on its own, and a plain reload will not
// activate it either: the page stays controlled by the old worker throughout
// the navigation. So the only way to pick up a deploy is to ask the waiting
// worker to skip waiting and then reload once it has taken control, which is
// what the "Update available" prompt does.

let waiting = null
const listeners = new Set()

// Tells the app a new version is ready. Late subscribers are told immediately,
// so it doesn't matter whether the update lands before or after React mounts.
export function onUpdateAvailable(listener) {
  listeners.add(listener)
  if (waiting) listener()
  return () => listeners.delete(listener)
}

function announce(worker) {
  waiting = worker
  for (const listener of listeners) listener()
}

export function applyUpdate() {
  if (!waiting) {
    window.location.reload()
    return
  }
  // Reload only once the new worker is actually in charge, otherwise the fresh
  // page would be served by the old one and nothing would change.
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage({ type: 'SKIP_WAITING' })
}

// A worker that reaches "installed" while another one already controls the
// page is an update. Without a controller it's the very first install, which
// needs no prompt.
function watchForUpdate(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    announce(registration.waiting)
    return
  }
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) announce(installing)
    })
  })
}

// Skipped in dev so cached files never hide code changes while working.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(watchForUpdate)
      .catch(() => {
        // The app works fine without offline support.
      })
  })
}
