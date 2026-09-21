// The sync half of the options menu: signing in, and what sync is doing right
// now. Nothing here is required to use the app, so it reads as an offer rather
// than a gate - the wording exists to make clear that progress stays in this
// browser whether or not anyone ever signs in.
//
// Google is the only way in. The magic link it replaced could not work: the
// built-in Supabase sender only delivers to members of the project, so for
// everyone else a link was sent and never arrived.

const ACTION_CLASS =
  'inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-2 transition-colors hover:border-ink-3/40 hover:text-ink disabled:pointer-events-none disabled:opacity-40'

function statusLine({ status, lastSyncedAt, error }) {
  if (status === 'syncing') return 'Syncing…'
  if (status === 'error') return `Last sync failed${error ? `: ${error}` : ''}`
  if (lastSyncedAt) return `Synced at ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return 'Not synced yet'
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

export default function AccountMenu({ sync }) {
  // A build with no Supabase project behaves exactly as it did before sync
  // existed, so there is nothing to show.
  if (!sync.configured) return null

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

  // Sync is configured but Google isn't wired up, so there is no way in at
  // all. Saying that is better than an offer that cannot be taken.
  if (!sync.googleEnabled) {
    return (
      <div className="border-b border-line px-3 pb-3 pt-1.5">
        <p className="text-sm font-medium text-ink">Sync across devices</p>
        <p className="mt-0.5 text-xs leading-5 text-ink-3">
          Sign-in isn&rsquo;t available in this build. Your progress is saved in this browser as usual.
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

      <button
        type="button"
        onClick={sync.signInWithGoogle}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-ink-3/40 hover:bg-subtle"
      >
        <GoogleMark />
        Continue with Google
      </button>

      {sync.error && <p className="mt-2 text-xs leading-5 text-hard">{sync.error}</p>}
    </div>
  )
}
