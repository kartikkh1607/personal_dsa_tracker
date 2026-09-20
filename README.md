# DSA Practice Tracker

A personal tracker for 922 DSA problems across 23 topics and 6 study phases. Your progress is
saved in the browser's localStorage; the question list itself is static data. It works offline
and can be installed as an app on your phone or computer.

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
npm run lint      # ESLint
```

## Using it

- **Tick** a problem when you've solved it. That is the only thing you have to track.
- **Review.** Solved problems come back for review 7, 30 and 90 days after you solve them.
  Re-solve one from scratch, then say how it went:
  - **Got it** moves the problem along the schedule to the next interval.
  - **Struggled** sends it back for another go in **3 days**, restarts the schedule and
    bookmarks it. Clearing that 3-day re-check with **Got it** re-earns the 7-day step, so a
    failed review runs 3 → 7 → 30 → 90 rather than jumping months ahead.

  Due reviews appear on Home and under the **Review** filter.
- **Weak spots.** Problems you've struggled with twice or more collect in their own card on
  Home, so the patterns that haven't landed are visible rather than buried.
- **Bookmark** tricky problems to save them. They collect on Home and under **Saved**.
- **Click a problem** for its details: notes, the problem link, review dates, and more problems
  from the same topic. On a phone, swipe the panel down to close it.
- **Images in notes.** Paste a screenshot into a note, or use **Add image**. Images are
  shrunk to at most 1200px wide and shown as thumbnails under the note; click one to see it
  full size. **Clear note** removes the text and its images.
- Problems with a note get a small note icon and a green edge in every list. **Has notes** on the
  Problems page shows only those.
- **Streak and activity.** A day counts if you solved a problem *or* reviewed one, so a day
  spent entirely on reviews keeps your streak going. A streak that ended yesterday still
  counts, so it doesn't reset before you've had a chance today.
- **Home** shows what's due, what to solve next, your progress and activity, the study plan,
  and pattern coverage.
- **Patterns** lists all 168 patterns in the sheet, so you can find the ones you haven't touched.
- **Random** opens a random unsolved problem from the current list.
- The page, topic and filters are in the URL, so refresh, Back and bookmarks keep your place.
  The app also reopens wherever you left off.

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
- **Import backup** restores from that file. This replaces current progress, so export first
  if you have anything you want to keep. An unreadable file is rejected and leaves your
  existing progress untouched.
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
deployed one.

## How it works

| File | Purpose |
| --- | --- |
| `src/data/questions.json` | The 922 questions, and the only copy. Source data the app never writes to; `check-links` updates `linkVerified` in place. |
| `src/questions.js` | Fetches the question list as a separate asset and builds the indexes the app reads. |
| `src/data/legacyIds.json` | Maps the old 570-problem ids to the new ids, for migrating older progress. |
| `DSA_Master_Sheet.xlsx` | The same question list as an Excel workbook. |
| `src/App.jsx` | Composition and layout: wires the hooks below to the views. |
| `src/hooks/` | `useRoute` (hash and history), `useProgress` (saved state and every change to it), `useBackup` (export, import, reminder), `useToast`, `useKeyboardShortcuts`, `useProblemLists` (counts and the filtered lists). |
| `src/route.js` | Reads and writes the page and filters in the URL hash. |
| `src/progress.js` | Updating progress entries, dates, activity days and streaks. |
| `src/review.js` | The 7 / 30 / 90 day review schedule, the 3-day relearn step, and weak-spot counting. |
| `src/keyboard.js` | Shared keyboard helpers: what counts as typing, and the review keys. |
| `src/storage.js` | Loads, validates and saves progress; backup reminders. |
| `src/images.js` | Compresses note images and stores them in IndexedDB; cleans up unused ones. |
| `src/csv.js` | The Excel-ready CSV export. |
| `src/theme.js`, `src/index.css` | Light / dark theme and the colour tokens every component uses. |
| `src/components/` | `TopBar`, `Overview` (Home), `ProblemsPage`, `PatternsView`, `Sidebar`, `Filters`, `ProblemList`, `ProblemDetailDrawer`, `NoteImages`, `Heatmap`, `QuestionControls`, `Toast`, `AppSkeleton`, `LoadFailed`, `icons`. |
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
    "history": [{ "date": "2026-09-20", "result": "got" }]
  }
}
```

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

The app is a static build with no backend or environment variables.

**From the dashboard:** push this folder to a Git repo, then at
[vercel.com/new](https://vercel.com/new) import it. Vercel detects Vite and fills in the
settings; confirm they read:

- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Click **Deploy**. Later pushes to the default branch redeploy automatically.

**From the CLI:**

```bash
npm i -g vercel
vercel          # preview deployment, accept the detected settings
vercel --prod   # production deployment
```

After a deploy, an open or installed copy picks up the new version the next time it loads.
