# DSA Practice Tracker

A personal tracker for 922 DSA problems across 23 topics and 6 study phases. Your progress is
saved in the browser's localStorage, and can optionally be synced to your own Supabase project so
several devices share it; the question list itself is static data. It works offline and can be
installed as an app on your phone or computer.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve the built dist/ locally
npm test          # unit tests (Vitest)
npm run test:e2e  # browser tests (Playwright, against the production build)
npm run lint      # ESLint
```

Sync is optional: with no `.env.local` the app runs entirely on local storage. See
[Syncing across devices](#syncing-across-devices) to turn it on.

## Using it

- **Tick** a problem when you've solved it. That is the only thing you have to track.
- **Review.** Solved problems come back for review 7, 30 and 90 days after you solve them.
  Re-solve one from scratch, then say how it went:
  - **Got it** moves the problem along the schedule to the next interval.
  - **Struggled** sends it back for another go in **3 days**, restarts the schedule and
    bookmarks it. Clearing that 3-day re-check with **Got it** re-earns the 7-day step, so a
    failed review runs 3 → 7 → 30 → 90 rather than jumping months ahead.

  Due reviews appear on Home and under the **Review** filter.
- **Home** is a daily board. Today's reviews come first, one row each with **Got it** and
  **Struggled** side by side. Home asks for at most **15 reviews a day**: anything beyond that
  waits, and Home says how many, with a button to take on the next batch. Nothing is dropped
  or rescheduled; the cap only limits how much of the schedule is put in front of you at once.
  Below that are **Up next** (the next unsolved steps in your current phase), **Weak spots**,
  **Saved**, untouched **Patterns**, the six-phase **Study plan**, and a 26-week **activity**
  heatmap. A new tracker gets a short "how this works" panel, once.
- **Weak spots.** Problems you've struggled with twice or more collect on Home, so the patterns
  that haven't landed are visible rather than buried.
- **Bookmark** tricky problems to save them. They collect on Home and under **Saved**.
- **Problems** is the full sheet: a sidebar of phases and topics with progress bars, and a list
  you can filter by status (**All**, **To do**, **Solved**, **Review**, **Saved**), difficulty
  and **Has notes**. **Search** always covers all 922 problems, whatever topic is selected, and
  picking a topic ends the search. **Random** opens a random unsolved problem from the list.
- **Click a problem**, anywhere on its row, for its details: a button to open it, Solved and
  Save toggles, where it sits in the review schedule, notes, and more problems from the same
  topic, with its review history folded at the bottom. When it's due, **Got it** and
  **Struggled** say what each will do before you press one. On a phone, swipe the panel down
  to close it.
- **Images in notes.** Paste a screenshot into a note, drop one onto it, or use **Add image**.
  Images are shrunk to at most 1200px wide and shown as thumbnails under the note; click one
  to see it full size. **Clear note** removes the text and its images, with an Undo.
- Problems with a note get a small note icon in every list.
- **Streak and activity.** A day counts if you solved a problem *or* reviewed one, so a day
  spent entirely on reviews keeps your streak going. A streak that ended yesterday still
  counts, so it doesn't reset before you've had a chance today.
- **Patterns** lists all 168 patterns in the sheet, so you can find the ones you haven't touched.
- The page, topic and filters are in the URL, so refresh, Back and bookmarks keep your place.
  The app also reopens wherever you left off.
- **Light and dark** follow your system until you flip the sun/moon button in the top bar.
  Motion is limited to
  short state changes and switches off under your system's reduced-motion setting.

**Keyboard:** <kbd>/</kbd> search · <kbd>j</kbd>/<kbd>k</kbd> move between problems ·
<kbd>x</kbd> tick · <kbd>b</kbd> bookmark · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close ·
<kbd>g</kbd> Got it · <kbd>s</kbd> Struggled.

<kbd>g</kbd> and <kbd>s</kbd> work on the problem that's focused in the list and inside the
open detail panel, and only when that problem is actually due for review.

**Tiers, phases and steps** come from the Excel sheet. `Core` (373 problems) covers every
pattern, `Depth` adds reps on shaky patterns, and `Stretch` is Hard + Advanced DS. Each problem's
id is its step on the sheet's study path: within each phase, Core, then Depth, then Stretch.
"Up next" follows those steps.

**Links.** A problem whose link works opens it directly; any other problem opens a Google search
for its name. `npm run check-links` checks every link (LeetCode problems that exist and are free,
GeeksforGeeks practice pages that load a real problem) and records the result as `linkVerified`,
so re-run it after changing `src/data/questions.json`. When a search leads you to the real page, use
**Paste the real link** in the problem details; the app remembers it and opens it directly.

## Backing up your progress

Progress lives only in this browser, so clearing browser data erases it. The app reminds you
when you haven't backed up in 14 days. From the **⋯** menu:

- **Export backup** downloads `dsa-progress-<date>.json`.
- **Import backup** restores from that file, and asks which way you want it:
  - **Merge** keeps everything from both sides. Where the same problem differs, the more recent
    change wins. Nothing is deleted, which makes it the safe answer and the default.
  - **Replace** throws away what is in this browser and keeps only what the file holds. While
    you are signed in this is not a local act: the entries it drops are deleted from your
    account, and therefore from every other device you are signed in to. The app says so at the
    point of asking, and offers an Undo straight afterwards.

  With nothing saved yet there is no question to ask, so the file is simply loaded. An
  unreadable file is rejected and leaves existing progress untouched.
- **Export for Excel** downloads a CSV in the Master tab's column order (`Step` through `Notes`).
  Rows line up by `Step`, so you can paste its Status, Last Revised and Notes columns into
  `DSA_Master_Sheet.xlsx`.

Backups hold note text and image references but **not the images themselves**, which stay in
this browser's IndexedDB. Importing a backup on another device keeps the text; its images show
as "Image unavailable". On start-up, stored images that no note refers to are deleted once
they're over 7 days old. So after importing an older backup, images that aren't in it will
eventually be removed.

Backups made before the sheet grew to 922 problems use the old problem numbers. Importing one
moves each entry onto the right problem automatically.

Use export/import to move progress between devices, or between your local copy and a
deployed one. Or sign in, and let sync do it.

## Syncing across devices

Optional, and off until you configure it - without it the app behaves exactly as it always has.

Sign in from the **⋯** menu and this browser's progress is mirrored to a Supabase project, so a
device signed in to the same account picks it up. Progress stays **local-first**: every change is
saved to this browser first and nothing waits on the network. The account holds a mirror, not the
original, which is why sync keeps working offline and simply catches up later.

### Setting it up

1. Create a Supabase project.
2. Run `supabase/migrations/0001_progress.sql` and then `0002_progress_hardening.sql` in the SQL
   editor. `supabase/verify.sql` checks the result: row level security on, four policies, the
   trigger in place, and no privileges at all for the `anon` role.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.
4. In the dashboard, add the app's URL under **Authentication > URL Configuration**, so the
   sign-in comes back to it. Deploy previews get a new URL each time, so they need a
   wildcard redirect rather than one fixed address - see [Deploy to Vercel](#deploy-to-vercel).
5. Set up Google, below. It is the only way in, so sync does nothing until it is done.

### Setting up Google sign-in

Google is the only way to sign in. There was a magic link once and it could not work: Supabase's
built-in email sender refuses to deliver to anyone who is not a member of the project, so for
every other person a link was "sent" and never arrived. Rather than run a mail service for a
personal tracker, sign-in is one OAuth provider and nothing else.

**1. Create the OAuth client.** In the [Google Cloud console](https://console.cloud.google.com),
under **APIs & Services > Credentials**, create an **OAuth client ID** of type **Web
application**. It needs one authorized redirect URI, and it is Supabase's callback rather than
this app's address - Google returns to Supabase, which then returns here:

```
https://<your-project>.supabase.co/auth/v1/callback
```

**2. Add test users.** A new OAuth client starts in **testing** mode, which means Google only
lets through accounts listed under **Audience > Test users**. Anyone else is turned away before
Supabase is ever involved, and comes back to the app with `access_denied`. The app recognises
that one case and says "Ask Kartik to add your Gmail", because no amount of retrying fixes it.
Add each person's Gmail there, or publish the app if you want it open to anyone.

**3. Enable the provider in Supabase.** Under **Authentication > Sign In / Providers > Google**,
turn it on and paste the **Client ID** and **Client secret** from step 1. The secret is held by
Supabase and never reaches the browser; it is not a `VITE_` variable and must never become one.

**4. Point the redirect back at the app.** Under **Authentication > URL Configuration**, the Site
URL and Redirect URLs have to include wherever the app is served from, with the trailing slash,
because that is exactly what the app asks to come back to:

```
https://your-app.vercel.app/
```

Preview deploys get a new host every time, so they need a wildcard too - see
[Deploy to Vercel](#deploy-to-vercel).

**5. Turn the button on.** Set `VITE_ENABLE_GOOGLE_AUTH=true` wherever the app is built, locally
in `.env.local` and in the host's environment variables. This is a build-time flag, so changing it
takes a redeploy rather than a restart.

That last one is worth saying plainly: with Google as the only sign-in, this flag is the on/off
switch for signing in at all. Leave it unset and the account menu says sign-in isn't available and
the app runs local-only - which is a perfectly good state to be in, just not the one you want by
accident on production.

### How two devices agree

One row per problem per account, holding the same entry the browser stores. The merge happens on
the device, and every rule in it exists to avoid losing work:

- **The same entry changed in both places.** The later change wins, by the clock of the device
  that made it - which is what the `updatedAt` on each entry is for.
- **An entry from before sync existed** has no `updatedAt` on one side, so there is no honest way
  to order the two. Those are unioned field by field instead, keeping whatever either side had.
- **Reviews** are replayed from the merged `history` rather than taken as the higher of the two
  counts, so a lapse recorded on one device isn't undone by the other's older, higher count.
- **A cleared entry** leaves a tombstone, so the deletion travels to the other devices instead of
  the row quietly coming back on the next pull. A deletion only beats changes older than itself.

The row also carries the server's own timestamp, set by a trigger. That one is never used to
decide which copy wins - only as the "everything since" marker for the next pull, so a device
with a wrong clock can misorder its own edits but can never hide its rows from another device.

**What signing in tells you.** A sign-in that just pulls your account down says nothing. When
the merge genuinely combined two sides, a toast says what changed, counting only entries that
were new to one side or different on the two, never the ones both already agreed on:

- "1 change from this device merged in"
- "2 changes merged: 1 from this device, 1 from your account"
- "1 conflict resolved by most recent", added when both sides held different versions of an
  entry

**Sync now** in the **⋯** menu always reports, and says "Nothing to merge" when that's the case.

Signing out leaves everything in this browser exactly where it was.

## How it works

| File | Purpose |
| --- | --- |
| `src/data/questions.json` | The 922 questions, and the only copy. Source data the app never writes to; `check-links` updates `linkVerified` in place. |
| `src/questions.js` | Fetches the question list as a separate asset and builds the indexes the app reads. |
| `src/data/legacyIds.json` | Maps the old 570-problem ids to the new ids, for migrating older progress. |
| `DSA_Master_Sheet.xlsx` | An offline companion, not an input: nothing in the app or `scripts/` reads it. Its Master tab holds the same 922 questions in the same order, next to plan, dashboard and pattern-coverage tabs, and **Export for Excel** writes a CSV laid out to paste into it. It is kept by hand, so `src/data/questions.json` is the source of truth; the workbook's links predate the last link update. |
| `src/App.jsx` | Composition and layout: wires the hooks below to the views. |
| `src/hooks/` | `useRoute` (hash and history), `useProgress` (saved state and every change to it), `useBackup` (export, import, reminder), `useSync` (signing in, and when to run a sync round), `useToast`, `useKeyboardShortcuts`, `useProblemLists` (counts and the filtered lists). |
| `src/route.js` | Reads and writes the page and filters in the URL hash. |
| `src/progress.js` | Updating progress entries, dates, activity days and streaks. |
| `src/review.js` | The 7 / 30 / 90 day review schedule, the 3-day relearn step, and weak-spot counting. |
| `src/keyboard.js` | Shared keyboard helpers: what counts as typing, and the review keys. |
| `src/storage.js` | Loads, validates and saves progress; tombstones and the sync cursor; backup reminders. |
| `src/sync/` | `client.js` (the Supabase client, built only when one is configured), `cloud.js` (the two requests the table ever sees), `merge.js` (which copy of an entry wins), `sync.js` (one pull, merge and push). |
| `supabase/` | The SQL behind it: the `progress` table with its policies and trigger, and `verify.sql` to check what landed. |
| `src/images.js` | Compresses note images and stores them in IndexedDB; cleans up unused ones. |
| `src/csv.js` | The Excel-ready CSV export. |
| `src/theme.js`, `src/index.css` | Light / dark theme, the colour tokens (RGB triplets as CSS variables, exposed to Tailwind in `tailwind.config.js`), and the shared component classes. Type is Archivo and IBM Plex Mono. |
| `src/components/` | `TopBar`, `AccountMenu` (sign-in and sync status), `Overview` (Home), `ProblemsPage`, `PatternsView`, `Sidebar`, `Filters`, `ProblemList`, `ProblemDetailDrawer`, `NoteImages`, `ImportDialog`, `Heatmap`, `QuestionControls`, `Toast`, `AppSkeleton`, `LoadFailed`, `Credit`, `icons`. |
| `src/components/home/` | Home's larger pieces: `DueBoard` (today's reviews), `StudyPlan`, `PatternsPreview`, and the `ListHead` / `Empty` parts its lists share. |
| `src/serviceWorker.js` | Registers the worker and surfaces the "new version ready" prompt. |
| `public/sw.js`, `public/manifest.webmanifest` | Offline support and app install. The worker is a template; `vite.config.js` stamps the build id and precache list into `dist/sw.js`. |

**Persistence.** Only what you've set is stored, keyed by question id:

```json
{
  "1": {
    "solved": true,
    "solvedAt": "2026-09-13",
    "reviewedAt": "2026-09-20",
    "reviews": 1,
    "bookmarked": true,
    "notes": "two pointers",
    "history": [{ "date": "2026-09-20", "result": "got" }],
    "updatedAt": "2026-09-20T09:14:02.511Z"
  }
}
```

`updatedAt` is stamped on every change and is only ever read by sync, to order two versions of the
same entry. Progress saved before sync existed has none, and is merged a different way (above).

`history` records how each re-solve went (`got` or `struggled`), oldest first, keeping the last
20. It drives the 3-day relearn step and the weak-spot list. Progress saved before it existed
simply has no `history` and keeps working unchanged.

Updating `src/data/questions.json` never wipes your progress. Progress saved under the old ids is moved to
the new ids once, on first load; the original is kept under `dsa-tracker-progress-before-v3`. Writes are debounced by 400 ms so a burst
of edits results in a single write. Progress saved by older versions of the app (with statuses
and confidence) is migrated on load: Solved or Mastered become ticked, and Revisit or a low
confidence become bookmarks.

## Offline and updates

**The question list is fetched, not bundled.** At 385 KB it dominated the main chunk, so the app
couldn't render until all of it had parsed. It is now a separate content-hashed JSON file that
loads alongside the app, which cut the main chunk from 537 KB to 234 KB. The service worker
precaches it, so offline still works from the first install, and a brief skeleton covers the
load. It is only re-downloaded when the question data itself changes.

The app installs a service worker (`public/sw.js`) so it opens without a network. Pages are
fetched network-first, so a new deploy shows up as soon as you're online; hashed build assets
and fonts are served cache-first.

**Each build gets its own cache.** `npm run build` rewrites `dist/sw.js` through the
`serviceWorker` plugin in `vite.config.js`, stamping in a build id derived from the names *and*
contents of everything the build emitted, plus the exact list of files to precache. The cache is
named `dsa-tracker-<build id>`, and activating a new worker deletes every other cache. Earlier
versions used a fixed name (`dsa-tracker-v1`) that never changed, so old hashed assets
accumulated forever and were never reclaimed.

**Updates ask before they apply.** A new worker installs in the background and then waits. The
running page shows **"A new version is ready · Reload"**, and only when you accept does it tell
the worker to take over and reload. It waits on purpose: taking over underneath a running page
would delete the caches that page is still using, and its hashed assets are gone from the server
after a deploy too. The prompt does not auto-dismiss, so you can't miss it.

If you ignore the prompt nothing breaks — you keep running the version you loaded with, and the
new one activates the next time every tab of the app is closed and reopened.

### If a bad service worker ships

A broken worker can keep serving a broken app from cache, and users can't fix it themselves.
The way out is a worker that deletes everything and unregisters itself. Replace the whole of
`public/sw.js` with this, commit, and deploy:

```js
// KILL SWITCH - temporary. Deletes every cache, unregisters, reloads open tabs.
// Note there is deliberately no fetch handler, so nothing is served from cache.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.navigate(client.url))),
  )
})
```

Also comment out `registerServiceWorker()` in `src/main.jsx` for that deploy, so the app doesn't
immediately register a fresh worker afterwards. And delete the `serviceWorker()` plugin from the
`plugins` array in `vite.config.js` for that deploy, or the build will fail trying to substitute
tokens this file doesn't have.

Then:

1. Deploy and confirm on a device that had the bad version: DevTools → Application → Service
   Workers should show none, and Cache Storage should be empty.
2. **Leave the kill switch deployed for at least a week.** Clients only pick it up when they
   next open the app, and anyone who doesn't visit keeps the bad worker until they do.
3. Once you're satisfied, restore `public/sw.js`, `src/main.jsx` and `vite.config.js` and deploy
   normally. Returning clients then install the fixed worker from scratch.

Browsers do not serve `sw.js` itself from the HTTP cache when checking for updates, so a bad
worker is never more than one visit away from being replaced. Nothing else is required of
Vercel — no custom headers.

**No progress is lost either way.** Caches hold only the app's own files. Progress lives in
`localStorage` and note images in IndexedDB, and neither the normal worker nor the kill switch
touches them.

## Deploy to Vercel

The app is a static build with no backend. It needs environment variables only
if you want sync; without them the deploy is the local-only app.

**From the dashboard:** push this folder to a Git repo, then at
[vercel.com/new](https://vercel.com/new) import it. Vercel detects Vite and fills in the
settings; confirm they read:

- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Click **Deploy**. Later pushes to the default branch redeploy automatically.

**Environment variables**, under Settings > Environment Variables:

| Name | Value | Environments |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://<project>.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the project's publishable key | Production, Preview, Development |
| `VITE_ENABLE_GOOGLE_AUTH` | `true` - required for sign-in to exist at all | Production, Preview, Development |

The first two are public by design: Vite inlines every `VITE_` variable into the bundle,
which is what the publishable key is for. The service role key is not a
`VITE_` variable and must never be added here - it bypasses row level security,
and the bundle is readable by anyone. Because the values are inlined at build
time, changing one takes a redeploy rather than a restart.

Tick **Preview** as well as Production if you want to try sign-in on a branch
deploy: a Preview build without them runs as the local-only app, which looks
like sync being broken. Preview URLs change per deploy, so add a wildcard under
**Authentication > URL Configuration > Redirect URLs** in Supabase
(`https://<project>-*.vercel.app/**`) or the link will come back to a URL the
project refuses to redirect to.

**From the CLI:**

```bash
npm i -g vercel
vercel          # preview deployment, accept the detected settings
vercel --prod   # production deployment
```

After a deploy, an open or installed copy picks up the new version the next time it loads.
