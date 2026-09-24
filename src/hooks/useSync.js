import { useCallback, useEffect, useRef, useState } from 'react'
import { readLocal, syncCursorKey, writeLocal } from '../storage.js'
import {
  clearAuthCallbackFromUrl,
  GOOGLE_AUTH_ENABLED,
  hasAuthCallback,
  hasStoredSession,
  loadClient,
  SYNC_CONFIGURED,
  takeAuthCallback,
} from '../sync/client.js'
import { mergeSummary, mergeWasTwoSided } from '../sync/merge.js'
import { syncOnce } from '../sync/sync.js'

// Local changes are pushed on a longer delay than they are saved. A save is
// free and a round trip is not, and nothing is at risk in between: the change
// is already on disk, which is where this app's progress actually lives.
export const PUSH_DELAY_MS = 2500

// The OAuth client is in testing mode, so Google only lets through accounts on
// its test user list and turns everyone else away with access_denied. That is
// not a fault the visitor can do anything about by retrying, so it gets the one
// message that actually helps rather than Google's own wording.
export const NOT_A_TEST_USER = 'Ask Kartik to add your Gmail.'

export function signInErrorFor({ errorCode, errorDescription } = {}) {
  if (errorCode === 'access_denied') return NOT_A_TEST_USER
  return errorDescription ?? null
}

// Signing in, and keeping this browser's progress in step with the account.
//
// Every round is the same shape - pull, merge, push - and the merge is the part
// that decides anything (see sync/merge.js). This hook only decides when to run
// one and what to do with the result, which is why it holds no rules of its own
// about whose copy of an entry wins.
export function useSync({ progress, tombstones, questionIds, applySynced, showToast }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [error, setError] = useState(null)
  // Whether this visit has any business with the auth library. False for
  // someone who has never signed in, and that is the whole point: the library
  // is a separate chunk and nothing here downloads it until this turns true.
  const [authActive, setAuthActive] = useState(() => SYNC_CONFIGURED && (hasStoredSession() || hasAuthCallback()))

  // A round reads progress through this rather than closing over it, so it
  // never works from a snapshot the user has already moved past.
  const latest = useRef({ progress, tombstones })
  latest.current = { progress, tombstones }

  const running = useRef(false)
  const pending = useRef(false)
  // The progress object the last round started from, and then the one it
  // produced. Compared by identity, which is all that is needed: every change
  // makes a new object, and only a change should start a push.
  const synced = useRef(null)
  const runRef = useRef(() => {})
  // A merge is worth announcing when the user has just signed in, and not on
  // every start-up after that.
  const announceNext = useRef(false)

  useEffect(() => {
    if (!authActive) return undefined
    let active = true
    let unsubscribe = null

    loadClient().then(async (client) => {
      if (!client || !active) return

      const { data } = client.auth.onAuthStateChange((event, next) => {
        if (event === 'SIGNED_IN') announceNext.current = true
        setSession(next ?? null)
      })
      unsubscribe = () => data.subscription.unsubscribe()
      // Unmounted while the chunk was in flight.
      if (!active) {
        unsubscribe()
        return
      }

      // A sign-in coming back. Redeeming the code is what makes the session,
      // and it is worth saying so when it fails: a code that has expired or
      // already been spent is the common case, and silence looks like a
      // broken app. Google refusing outright arrives here too, with no code
      // and an error instead.
      const callback = takeAuthCallback()
      const refusal = callback && !callback.code ? signInErrorFor(callback) : null
      if (refusal) {
        setError(refusal)
        showToast(refusal, { tone: 'error' })
        clearAuthCallbackFromUrl()
      } else if (callback?.code) {
        announceNext.current = true
        // Redeeming can fail by returning an error or by throwing, depending on
        // how far it got. Either way the person is left staring at a page that
        // did nothing, so both end up saying the same thing.
        const cause = await client.auth
          .exchangeCodeForSession(callback.code)
          .then(({ error: returned }) => returned)
          .catch((thrown) => thrown)
        clearAuthCallbackFromUrl()
        if (cause) {
          setError(cause.message ?? String(cause))
          showToast('That sign-in did not go through - try again', { tone: 'error' })
        }
      }

      const { data: current } = await client.auth.getSession()
      if (active) setSession(current.session ?? null)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
    // showToast is stable, and re-running this would mean a second
    // subscription and a second attempt to spend a code already spent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authActive])

  const userId = session?.user?.id ?? null

  const run = useCallback(
    // announce: 'always' for a sync the user asked for, 'if-two-sided' for a
    // sign-in, which only has news when the merge actually combined two sides.
    async ({ announce = false } = {}) => {
      if (!userId) return
      const client = await loadClient()
      if (!client) return
      // One round at a time. A trigger arriving mid-round asks for another
      // instead of racing the one in flight.
      if (running.current) {
        pending.current = true
        return
      }

      running.current = true
      setStatus('syncing')
      try {
        const started = latest.current.progress
        synced.current = started
        const cursorKey = syncCursorKey(userId)

        const merged = await syncOnce({
          client,
          userId,
          progress: started,
          tombstones: latest.current.tombstones,
          cursor: readLocal(cursorKey),
          questionIds,
        })

        // Something changed while the round was in the air, so the merge is
        // already out of date and applying it would undo that change. Another
        // round, starting from the newer progress, will take it in.
        if (latest.current.progress !== started) {
          pending.current = true
          return
        }

        synced.current = merged.progress
        applySynced(merged)
        if (merged.cursor) writeLocal(cursorKey, merged.cursor)
        setLastSyncedAt(Date.now())
        setError(null)
        setStatus('idle')
        if (announce === 'always') showToast(mergeSummary(merged.stats) ?? 'Nothing to merge')
        else if (announce === 'if-two-sided' && mergeWasTwoSided(merged.stats)) showToast(mergeSummary(merged.stats))
      } catch (cause) {
        // A failed round changes nothing: the progress in this browser is
        // untouched and the same merge is attempted again on the next trigger.
        // Only a sync the user asked for by hand is worth a toast.
        setError(cause?.message ?? String(cause))
        setStatus('error')
        if (announce) showToast('Could not sync - your progress is still saved here', { tone: 'error' })
      } finally {
        running.current = false
        if (pending.current) {
          pending.current = false
          runRef.current()
        }
      }
    },
    [userId, questionIds, applySynced, showToast],
  )

  runRef.current = run

  // Signing in, and every start-up that finds a session already there.
  useEffect(() => {
    if (!userId) {
      setStatus('idle')
      setLastSyncedAt(null)
      return
    }
    const announce = announceNext.current
    announceNext.current = false
    runRef.current({ announce: announce && 'if-two-sided' })
  }, [userId])

  // A local change, once it has settled.
  useEffect(() => {
    if (!userId || progress === synced.current) return undefined
    const timer = setTimeout(() => {
      if (latest.current.progress !== synced.current) runRef.current()
    }, PUSH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [progress, userId])

  // Coming back to the tab, or back online, is when another device's work is
  // most likely to be sitting there waiting.
  useEffect(() => {
    if (!userId) return undefined
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') runRef.current()
    }
    function handleOnline() {
      runRef.current()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [userId])

  // The only way in. Starting a sign-in is a reason to have the auth library,
  // and a reason to be listening for the session it leads to.
  const signInWithGoogle = useCallback(async () => {
    setAuthActive(true)
    const client = await loadClient()
    if (!client) return
    setError(null)
    const { error: cause } = await client.auth.signInWithOAuth({
      provider: 'google',
      // Back here, which is where the code on the way back gets read.
      options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
    })
    // Only a failure to *start* the redirect lands here. Google turning
    // somebody away happens on its own page and comes back as a callback error.
    if (cause) {
      setError(cause.message)
      showToast('Could not start Google sign-in', { tone: 'error' })
    }
  }, [showToast])

  // Signing out leaves this browser's progress exactly where it is. It is the
  // copy the app has always run on; the account is a mirror of it.
  const signOut = useCallback(async () => {
    const client = await loadClient()
    if (!client) return
    await client.auth.signOut()
    setError(null)
    showToast('Signed out - your progress is still on this device')
  }, [showToast])

  const syncNow = useCallback(() => runRef.current({ announce: 'always' }), [])

  return {
    configured: SYNC_CONFIGURED,
    googleEnabled: GOOGLE_AUTH_ENABLED,
    email: session?.user?.email ?? null,
    signedIn: userId !== null,
    status,
    lastSyncedAt,
    error,
    signInWithGoogle,
    signOut,
    syncNow,
  }
}
