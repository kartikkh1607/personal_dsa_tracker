// Sync is optional. With no Supabase project configured the app is exactly what
// it was before sync existed: progress in this browser, no account, no network.
// That is also what every test and the offline build get.
const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const SYNC_CONFIGURED = Boolean(url && publishableKey)

// Google is the only way in, and it needs an OAuth client in Google Cloud plus
// the provider enabled in Supabase. The flag says that groundwork is done.
// With sync configured but this off there is no way to sign in at all, so the
// account menu says so rather than showing an empty panel.
export const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true'

// The auth library is around half the size of everything else this app ships,
// and most visitors never sign in. It is imported dynamically so it becomes its
// own chunk, fetched the first time there is a reason to have it: a session
// waiting to be restored, a sign-in link coming back, or someone starting to
// sign in. A visitor who never does never downloads it.
let clientPromise = null

export function loadClient() {
  if (!SYNC_CONFIGURED) return Promise.resolve(null)
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The code in the returning URL is exchanged explicitly, by
        // useSync, rather than by the library reading the address bar behind
        // our backs: this app rewrites its own URL as soon as it routes, and a
        // sign-in that quietly does nothing is the worst way to find that out.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    }),
  )
  return clientPromise
}

// True once the library has been asked for, so a caller can tell the difference
// between "no session" and "haven't looked yet" without triggering a download.
export function clientLoaded() {
  return clientPromise !== null
}

// A session supabase-js has already stored, without loading it to ask. It keeps
// them under sb-<project>-auth-token, splitting long ones across numbered keys,
// so the shape rather than the exact name is what's matched here: a rename
// upstream should cost a signed-in visitor one lazy load, not their session.
const SESSION_KEY_PATTERN = /^sb-.+-auth-token(\.\d+)?$/

export function hasStoredSession() {
  try {
    for (let index = 0; index < localStorage.length; index++) {
      if (SESSION_KEY_PATTERN.test(localStorage.key(index) ?? '')) return true
    }
    return false
  } catch {
    // Storage blocked, so there is nothing stored to find.
    return false
  }
}

// A sign-in landing back here, read once at import time - before React mounts
// and the router starts rewriting the address bar - and held until the sync
// hook is ready to act on it. The flow is PKCE, so what comes back is a code on
// the query string, or an error the provider wants to explain.
//
// The error *code* is kept alongside the description because the two say
// different things: the description is Google's prose, the code is what can be
// matched on. access_denied is the one worth recognising - it is what an OAuth
// client still in testing returns for anyone not on its test user list.
function readAuthCallback() {
  try {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorCode = params.get('error')
    const errorDescription = params.get('error_description')
    if (!code && !errorCode && !errorDescription) return null
    return { code, errorCode, errorDescription }
  } catch {
    return null
  }
}

let authCallback = readAuthCallback()

export function hasAuthCallback() {
  return authCallback !== null
}

// Handed over once: a code is good for a single exchange, so a second caller
// getting the same one would only produce a confusing second failure.
export function takeAuthCallback() {
  const callback = authCallback
  authCallback = null
  return callback
}

// Drops the code from the address bar once it has been spent, so a refresh
// doesn't try to redeem it again. The app's own route lives in the hash and is
// left exactly as it is.
export function clearAuthCallbackFromUrl() {
  try {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
  } catch {
    // Nothing important rests on this.
  }
}
