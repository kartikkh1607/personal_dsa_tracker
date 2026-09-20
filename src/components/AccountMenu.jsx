import { useState } from 'react'

// The sync half of the options menu: signing in, and what sync is doing right
// now. Nothing here is required to use the app, so it reads as an offer rather
// than a gate - the wording exists to make clear that progress stays in this
// browser whether or not anyone ever signs in.

const ACTION_CLASS =
  'inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-2 transition-colors hover:border-ink-3/40 hover:text-ink disabled:pointer-events-none disabled:opacity-40'
const PRIMARY_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-brand-contrast transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40'
const INPUT_CLASS =
  'h-9 w-full min-w-0 rounded-lg border border-line bg-canvas px-3 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20'

function statusLine({ status, lastSyncedAt, error }) {
  if (status === 'syncing') return 'Syncing…'
  if (status === 'error') return `Last sync failed${error ? `: ${error}` : ''}`
  if (lastSyncedAt) return `Synced at ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return 'Not synced yet'
}

export default function AccountMenu({ sync }) {
  const [email, setEmail] = useState('')

  // A build with no Supabase project behaves exactly as it did before sync
  // existed, so there is nothing to show.
  if (!sync.configured) return null

  function handleSubmit(event) {
    event.preventDefault()
    const address = email.trim()
    if (address !== '') sync.signInWithEmail(address)
  }

  if (sync.signedIn) {
    return (
      <div className="border-b border-line px-3 pb-3 pt-1.5">
        <p className="truncate text-sm font-medium text-ink" title={sync.email ?? undefined}>
          {sync.email}
        </p>
        <p className={`mt-0.5 text-xs leading-5 ${sync.status === 'error' ? 'text-hard' : 'text-ink-3'}`}>
          {statusLine(sync)}
        </p>
        <div className="mt-2 flex gap-2">
          <button type="button" className={ACTION_CLASS} onClick={sync.syncNow} disabled={sync.status === 'syncing'}>
            Sync now
          </button>
          <button type="button" className={ACTION_CLASS} onClick={sync.signOut}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (sync.linkSentTo) {
    return (
      <div className="border-b border-line px-3 pb-3 pt-1.5">
        <p className="text-sm font-medium text-ink">Check your email</p>
        <p className="mt-0.5 text-xs leading-5 text-ink-3">
          A sign-in link is on its way to {sync.linkSentTo}. Open it in this browser to finish signing in.
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-line px-3 pb-3 pt-1.5">
      <p className="text-sm font-medium text-ink">Sync across devices</p>
      <p className="mt-0.5 text-xs leading-5 text-ink-3">
        Sign in to mirror this browser&rsquo;s progress to your other devices. It stays saved here either way.
      </p>

      <form className="mt-2 flex gap-2" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className={INPUT_CLASS}
        />
        <button type="submit" className={PRIMARY_CLASS} disabled={sync.status === 'sending'}>
          {sync.status === 'sending' ? 'Sending…' : 'Send link'}
        </button>
      </form>

      {sync.googleEnabled && (
        <button type="button" className={`${ACTION_CLASS} mt-2 w-full`} onClick={sync.signInWithGoogle}>
          Continue with Google
        </button>
      )}

      {sync.error && <p className="mt-2 text-xs leading-5 text-hard">{sync.error}</p>}
    </div>
  )
}
