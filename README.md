# DSA Practice Tracker

A personal tracker for 570 DSA problems across 23 topics and 6 study phases. Your progress is
saved in the browser's localStorage; the question list itself is static data.

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
```

## Using it

- **Tick** a problem when you've solved it. That is the only thing you have to track.
- **Bookmark** tricky problems to save them for revision. They collect on the Home page and
  under the **Saved** filter.
- **Click a problem** to open its details: notes, the problem link, and more problems from the
  same topic.
- **Home** shows your progress, a streak, what to solve next, and the study plan.
- Press <kbd>/</kbd> anywhere to jump to search. The moon/sun button switches theme.

**Tiers and phases** come from the Excel sheet. `Core` (295 problems, two per pattern) is the
real target, `Depth` adds reps on shaky patterns, and `Stretch` (Hard + Advanced DS) can wait.
Topics are grouped into six phases, studied in order. "Up next" follows that plan: every Core
problem phase by phase, then Depth, then Stretch. **Core only** filters the list to Core.

**Links.** Entries with `linkVerified: false` open a web search, because GeeksforGeeks problem
URLs change over time. When you find the real page, use **Paste the real link** in the problem
details; the app remembers it.

## How it works

| File | Purpose |
| --- | --- |
| `src/data/questions.json` | The 570 questions. Read-only source data - never written to. |
| `DSA_Master_Sheet.xlsx` | The same question list as an Excel workbook. |
| `src/constants.js` | Difficulties, tiers, and topic-name helpers. |
| `src/progress.js` | Updating progress entries, dates and streaks. |
| `src/storage.js` | Loads, validates and saves progress under the key `dsa-tracker-progress`. |
| `src/theme.js` | Light / dark / system theme. |
| `src/index.css` | Colour tokens (light and dark) used by every component. |
| `src/App.jsx` | State, counting, "up next", filtering, export/import. |
| `src/components/` | `TopBar`, `Overview` (Home), `Sidebar`, `Filters`, `ProblemList`, `ProblemDetailDrawer`, `QuestionControls`, `Toast`, `icons`. |

**Persistence.** Only what you've set is stored, keyed by question id:

```json
{ "1": { "solved": true, "solvedAt": "2026-09-13", "bookmarked": true, "notes": "two pointers" } }
```

Updating `questions.json` never wipes your progress. Writes are debounced by 400 ms so a
burst of edits results in a single write. Progress saved by older versions of the app (with
statuses and confidence) is migrated on load: Solved or Mastered become ticked, and Revisit or
a low confidence become bookmarks.

## Backing up your progress

localStorage is cleared if you clear browser data, so back up regularly from the **⋯** menu.

- **Export progress** downloads `dsa-progress-<date>.json`.
- **Import progress** restores from that file. This replaces current progress, so export
  first if you have anything you want to keep. An unreadable file is rejected and leaves
  your existing progress untouched.

Progress is per-browser and per-device — use export/import to move between your laptop and
your phone.

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

Note that a deployed copy has its own localStorage, separate from your local dev copy —
export from one and import into the other to carry progress across.
