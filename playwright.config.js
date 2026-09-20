import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// These run against the production build, served the way Vercel would serve it,
// because the thing under test is what the build splits out and what the
// browser then asks for. A dev server bundles differently and would prove
// nothing about either.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The service worker is checked separately, by reading the precache list
    // the build writes into dist/sw.js. Blocking it here keeps these tests
    // looking at what the page itself asks for rather than at what a worker
    // cached on some earlier run.
    serviceWorkers: 'block',
  },
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
