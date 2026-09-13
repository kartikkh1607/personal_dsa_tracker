# DSA Practice Tracker

A personal tracker for 570 DSA problems across 23 topics. Status and confidence are saved in
your browser's localStorage; the question list itself is static data.

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

## How it works

| File | Purpose |
| --- | --- |
| `src/data/questions.json` | The 570 questions. Read-only source data - never written to. |
| `src/constants.js` | Statuses, difficulties, colour styles, and the `isDone` rule. |
| `src/progress.js` | Reads status/confidence out of the saved-progress map. |
| `src/storage.js` | Loads and saves progress under the single key `dsa-tracker-progress`. |
| `src/useIsNarrow.js` | Picks the table or the card layout, so only one is ever rendered. |
| `src/App.jsx` | State, counting, filtering, export/import. |
| `src/components/QuestionControls.jsx` | Status pill, confidence dots, difficulty label, link button. |
| `src/components/` | `TopBar`, `Sidebar`, `Filters`, `QuestionTable`, `QuestionCards`. |

**"Done"** means status is `Solved` or `Mastered`. That single rule (`isDone` in
`src/constants.js`) drives the top-bar count, the percentage, and every sidebar topic bar.

**Confidence** is a 1-5 rating shown as five dots. Click a dot to set it, click the active
dot to clear it back to blank.

**Persistence.** Only your status and confidence are stored, keyed by question id:

```json
{ "1": { "status": "Solved", "confidence": "4" } }
```

On load the saved state is merged onto the static question list, so updating
`questions.json` never wipes your progress. Writes are debounced by 400 ms so a burst of
edits results in a single write.

## Backing up your progress

localStorage is cleared if you clear browser data, so back up regularly.

- **Export progress** downloads `dsa-progress.json`.
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
