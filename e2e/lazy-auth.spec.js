import { readdirSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// The auth library is imported dynamically, so it lands in its own chunk. The
// promise that comes with that is what these check: a visitor who never signs
// in never downloads it, and a visitor who has a session does.
//
// The chunk is identified by what is in it rather than by name, because the
// name is a content hash that changes on every build.

const ASSETS = new URL('../dist/assets/', import.meta.url)

function findAuthChunk() {
  const scripts = readdirSync(ASSETS).filter((name) => name.endsWith('.js'))
  const holding = scripts.filter((name) => readFileSync(new URL(name, ASSETS), 'utf8').includes('GoTrueClient'))
  if (holding.length !== 1) {
    throw new Error(`expected exactly one chunk holding the auth library, found ${holding.length}: ${holding.join(', ')}`)
  }
  return holding[0]
}

const authChunk = findAuthChunk()

// Every request the page makes, so a test can ask what was and was not fetched.
function recordRequests(page) {
  const urls = []
  page.on('request', (request) => urls.push(request.url()))
  return urls
}

test.beforeEach(async ({ context }) => {
  // Nothing here should reach the real project. A test that only passes
  // because it quietly talked to Supabase would be worse than no test.
  await context.route('**://*.supabase.co/**', (route) => route.abort())
})

test('a visitor who never signs in never downloads the auth library', async ({ page }) => {
  const requests = recordRequests(page)

  await page.goto('/')
  await expect(page.getByRole('button', { name: 'DSA Tracker home' })).toBeVisible()
  // Wait out anything the app might fetch after first paint.
  await page.waitForLoadState('networkidle')

  expect(requests.filter((url) => url.includes(authChunk))).toEqual([])
  // ...and the app is fully usable regardless, which is the point of sync
  // being optional.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
})

test('the sign-in form is there without the library behind it', async ({ page }) => {
  const requests = recordRequests(page)

  await page.goto('/')
  await page.getByRole('button', { name: /options/i }).click()

  // The whole signed-out account UI renders from the main chunk. Google is the
  // only way in, and its button is there before the library behind it is.
  await expect(page.getByText('Sync across devices')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()

  expect(requests.filter((url) => url.includes(authChunk))).toEqual([])
})

test('a stored session pulls the library in', async ({ page }) => {
  // What supabase-js leaves behind once someone has signed in. The token is
  // nonsense and never gets used - every request to the project is aborted
  // above - but it is what the app reads to decide the library is needed.
  await page.addInitScript(() => {
    localStorage.setItem(
      'sb-hstnxarxualnppkwdlli-auth-token',
      JSON.stringify({ access_token: 'not-a-real-token', refresh_token: 'nor-this', expires_at: 4102444800 }),
    )
  })

  const requests = recordRequests(page)
  await page.goto('/')
  await page.waitForResponse((response) => response.url().includes(authChunk), { timeout: 10_000 })

  expect(requests.filter((url) => url.includes(authChunk))).toHaveLength(1)
})

test('progress still saves locally with no account in sight', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()

  const firstTick = page.getByRole('checkbox').first()
  await firstTick.click()
  await expect(firstTick).toBeChecked()

  // Reloading is what proves it was written rather than just rendered.
  await page.reload()
  await expect(page.getByRole('checkbox').first()).toBeChecked()
})

test('the service worker does not precache the auth chunk either', () => {
  // Precaching it would download it in the background for every visitor and
  // undo the split. The fetch handler still caches it on first use, so a
  // signed-in visitor keeps working offline.
  const worker = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8')
  const precache = worker.match(/const PRECACHE = (\[[^\]]*\])/)
  expect(precache, 'sw.js should carry a substituted precache list').not.toBeNull()

  const files = JSON.parse(precache[1])
  expect(files).not.toContain(`/assets/${authChunk}`)
  // The entry chunk is precached, so the app itself still opens offline.
  expect(files.some((file) => file.endsWith('.js'))).toBe(true)
})
