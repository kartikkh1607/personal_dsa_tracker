// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clientLoaded, hasStoredSession, loadClient, SYNC_CONFIGURED } from './client.js'

afterEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

// The callback is read when the module loads, before the app has mounted and
// started rewriting its own URL, so these load it fresh against each address
// rather than calling a function after the fact.
async function loadAt(address) {
  window.history.replaceState({}, '', address)
  vi.resetModules()
  return import('./client.js')
}

describe('the sync client', () => {
  it('stays off, and builds nothing, when no project is configured', async () => {
    // Sync is an extra, not a dependency: with no project configured the app is
    // the local-only one it has always been. This is also what pins the test
    // suite to that build rather than to whoever's .env.local is lying around.
    expect(SYNC_CONFIGURED).toBe(false)
    await expect(loadClient()).resolves.toBeNull()
    expect(clientLoaded()).toBe(false)
  })
})

// The two questions that decide whether a visitor downloads the auth library at
// all. Both have to be answerable without it, which is why they read the
// browser directly rather than asking supabase-js.
describe('deciding whether the auth library is needed', () => {
  it('finds a stored session by its shape, including one split across keys', () => {
    expect(hasStoredSession()).toBe(false)

    localStorage.setItem('sb-hstnxarxualnppkwdlli-auth-token', '{"access_token":"x"}')
    expect(hasStoredSession()).toBe(true)

    localStorage.clear()
    localStorage.setItem('sb-hstnxarxualnppkwdlli-auth-token.0', 'first half')
    expect(hasStoredSession()).toBe(true)
  })

  it('does not mistake this app`s own keys for a session', () => {
    localStorage.setItem('dsa-tracker-progress', '{"1":{"solved":true}}')
    localStorage.setItem('dsa-sync-cursor:abc', '2026-09-20T00:00:00.000Z')
    localStorage.setItem('dsa-sync-tombstones', '{}')
    expect(hasStoredSession()).toBe(false)
  })

  it('recognises a sign-in coming back without mistaking an ordinary route', async () => {
    expect((await loadAt('/')).hasAuthCallback()).toBe(false)
    // The app's own routes live in the hash, so they must not look like one.
    expect((await loadAt('/#/problems?topic=3&show=review')).hasAuthCallback()).toBe(false)

    expect((await loadAt('/?code=a-pkce-code')).hasAuthCallback()).toBe(true)
    expect((await loadAt('/?error_description=Link%20has%20expired')).hasAuthCallback()).toBe(true)
  })

  it('hands the callback over once, because a code is good for one exchange', async () => {
    const client = await loadAt('/?code=a-pkce-code#/home')

    expect(client.takeAuthCallback()).toEqual({ code: 'a-pkce-code', errorDescription: null })
    expect(client.takeAuthCallback()).toBeNull()
    expect(client.hasAuthCallback()).toBe(false)
  })

  it('clears a spent code from the address bar and leaves the route alone', async () => {
    const client = await loadAt('/?code=a-pkce-code#/problems?topic=3')

    client.clearAuthCallbackFromUrl()

    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/problems?topic=3')
  })
})
