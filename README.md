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
  Re-solve one from scratch, then press **Revised**. Due reviews appear on Home and under the
  **Review** filter.
- **Bookmark** tricky problems to save them. They collect on Home and under **Saved**.
- **Click a problem** for its details: notes, the problem link, review dates, and more problems
  from the same topic. On a phone, swipe the panel down to close it.
- **Home** shows what's due, what to solve next, your progress and activity, the study plan,
  and pattern coverage.
- **Patterns** lists all 168 patterns in the sheet, so you can find the ones you haven't touched.
- **Random** opens a random unsolved problem from the current list.
- The page, topic and filters are in the URL, so refresh, Back and bookmarks keep your place.
  The app also reopens wherever you left off.

**Keyboard:** <kbd>/</kbd> search · <kbd>j</kbd>/<kbd>k</kbd> move between problems ·
<kbd>x</kbd> tick · <kbd>b</kbd> bookmark · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close.

**Tiers, phases and steps** come from the Excel sheet. `Core` (373 problems) covers every
pattern, `Depth` adds reps on shaky patterns, and `Stretch` is Hard + Advanced DS. Each problem's
id is its step on the sheet's study path: within each phase, Core, then Depth, then Stretch.
"Up next" follows those steps.

**Links.** A problem whose link works opens it directly; any other problem opens a Google search
for its name. `npm run check-links` checks every link (LeetCode problems that exist and are free,
GeeksforGeeks practice pages that load a real problem) and records the result as `linkVerified`,
so re-run it after changing `questions.json`. When a search leads you to the real page, use
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

Backups made before the sheet grew to 922 problems use the old problem numbers. Importing one
moves each entry onto the right problem automatically.

Use export/import to move progress between devices, or between your local copy and a
deployed one.

## How it works

| File | Purpose |
| --- | --- |
| `src/data/questions.json` | The 922 questions. Read-only source data - never written to. |
| `src/data/legacyIds.json` | Maps the old 570-problem ids to the new ids, for migrating older progress. |
| `DSA_Master_Sheet.xlsx` | The same question list as an Excel workbook. |
| `src/App.jsx` | State, counting, "up next", reviews, filtering, keyboard shortcuts, export/import. |
| `src/route.js` | Reads and writes the page and filters in the URL hash. |
| `src/progress.js` | Updating progress entries, dates and streaks. |
| `src/review.js` | The 7 / 30 / 90 day review schedule. |
| `src/storage.js` | Loads, validates and saves progress; backup reminders. |
| `src/csv.js` | The Excel-ready CSV export. |
| `src/theme.js`, `src/index.css` | Light / dark theme and the colour tokens every component uses. |
| `src/components/` | `TopBar`, `Overview` (Home), `PatternsView`, `Sidebar`, `Filters`, `ProblemList`, `ProblemDetailDrawer`, `Heatmap`, `QuestionControls`, `Toast`, `icons`. |
| `public/sw.js`, `public/manifest.webmanifest` | Offline support and app install. |

**Persistence.** Only what you've set is stored, keyed by question id:

```json
{ "1": { "solved": true, "solvedAt": "2026-09-13", "reviewedAt": "2026-09-20", "reviews": 1, "bookmarked": true, "notes": "two pointers" } }
```

Updating `questions.json` never wipes your progress. Progress saved under the old ids is moved to
the new ids once, on first load; the original is kept under `dsa-tracker-progress-before-v3`. Writes are debounced by 400 ms so a burst
of edits results in a single write. Progress saved by older versions of the app (with statuses
and confidence) is migrated on load: Solved or Mastered become ticked, and Revisit or a low
confidence become bookmarks.

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
