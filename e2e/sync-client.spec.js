import { expect, test } from '@playwright/test'

// The sync loop driven through the real app in a real browser, against a stand-
// in for the project rather than the project itself.
//
// What this does cover: what the app sends, when it sends it, what it does with
// what comes back, and that a change made offline is not lost. What it cannot
// cover is anything only the server knows - that a row really lands in the
// table, and that row level security hides one account's rows from another.
// Those need real accounts, which is a separate note in the report.

const PROJECT = 'hstnxarxualnppkwdlli'
const STORAGE_KEY = `sb-${PROJECT}-auth-token`
const USER_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const PUSH_DELAY_MS = 2500

const session = {
  access_token: 'stub-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  refresh_token: 'stub-refresh-token',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'sync-test-a@dsa-tracker.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-09-01T00:00:00.000Z',
  },
}

const cloudRow = (id, data, { deletedAt = null, serverAt = '2026-09-20T09:00:00.000Z' } = {}) => ({
  question_id: id,
  data,
  deleted_at: deletedAt,
  updated_at: serverAt,
})

// A stand-in project: the two requests cloud.js makes, and the token exchange a
// sign-in link comes back through. Everything it is asked is recorded, because
// what the app sends is half of what these tests are checking.
async function stubProject(context, { rows = [] } = {}) {
  const state = { rows: [...rows], upserts: [], pulls: [], offline: false }

  await context.route(`**://${PROJECT}.supabase.co/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (state.offline) return route.abort('internetdisconnected')

    if (url.pathname === '/auth/v1/token') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) })
    }

    if (url.pathname === '/rest/v1/progress') {
      if (request.method() === 'GET') {
        state.pulls.push(url.search)
        const since = url.searchParams.get('updated_at')?.replace('gt.', '')
        const matching = state.rows.filter((row) => !since || row.updated_at > since)
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(matching) })
      }
      if (request.method() === 'POST') {
        const batch = request.postDataJSON()
        state.upserts.push(...batch)
        // Behave like the table: upsert on (user_id, question_id), and let the
        // server clock move on, so a later pull sees what was written.
        for (const row of batch) {
          const index = state.rows.findIndex((existing) => existing.question_id === row.question_id)
          const stored = { ...row, updated_at: new Date().toISOString() }
          if (index === -1) state.rows.push(stored)
          else state.rows[index] = stored
        }
        return route.fulfill({ status: 201, body: '' })
      }
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return state
}

// Signed in already, the way a returning visit is.
async function withSession(page, { progress = null } = {}) {
  await page.addInitScript(
    ([key, value, saved]) => {
      localStorage.setItem(key, value)
      localStorage.setItem('dsa-data-version', '3')
      if (saved) localStorage.setItem('dsa-tracker-progress', saved)
    },
    [STORAGE_KEY, JSON.stringify(session), progress && JSON.stringify(progress)],
  )
}

const savedProgress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dsa-tracker-progress') ?? '{}'))

test('a first sign-in keeps both sides and says what it merged', async ({ page, context }) => {
  // This browser has been used signed-out: question 1 is ticked here and the
  // account has never heard of it. The account has question 2, from some other
  // device. Losing either would be the worst thing sync could do.
  const project = await stubProject(context, { rows: [cloudRow(2, { solved: true, solvedAt: '2026-09-02', updatedAt: '2026-09-02T10:00:00.000Z' })] })

  await page.addInitScript(
    ([verifierKey, saved]) => {
      localStorage.setItem('dsa-data-version', '3')
      localStorage.setItem('dsa-tracker-progress', saved)
      // What starting a Google sign-in leaves behind for the code to come back to.
      // supabase-js stores it JSON-encoded, and reads it back the same way -
      // a bare string is read as "no verifier" and the exchange never happens.
      localStorage.setItem(verifierKey, JSON.stringify('stub-code-verifier'))
    },
    [`${STORAGE_KEY}-code-verifier`, JSON.stringify({ 1: { solved: true, solvedAt: '2026-09-01', updatedAt: '2026-09-01T10:00:00.000Z' } })],
  )

  // The sign-in link landing back on the app.
  await page.goto('/?code=stub-auth-code')

  await expect(page.getByText('2 changes merged: 1 from this device, 1 from your account', { exact: true })).toBeVisible({ timeout: 15_000 })

  // Neither side lost, on the device...
  await expect.poll(() => savedProgress(page).then(Object.keys)).toEqual(['1', '2'])
  // ...and the one the account was missing was sent to it.
  await expect.poll(() => project.upserts.map((row) => row.question_id)).toEqual([1])
  expect(project.upserts[0]).toMatchObject({ user_id: USER_ID, deleted_at: null })
  expect(project.upserts[0].data).toMatchObject({ solved: true, solvedAt: '2026-09-01' })
})

test('ticking a problem sends that row and nothing else', async ({ page, context }) => {
  const project = await stubProject(context)
  await withSession(page)

  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()

  const firstTick = page.getByRole('checkbox').first()
  await firstTick.click()
  await expect(firstTick).toBeChecked()

  await expect.poll(() => project.upserts.length, { timeout: 15_000 }).toBe(1)
  const pushed = project.upserts[0]
  expect(pushed).toMatchObject({ user_id: USER_ID, deleted_at: null })
  expect(pushed.data.solved).toBe(true)
  expect(pushed.data.updatedAt).toEqual(expect.any(String))
  expect(typeof pushed.question_id).toBe('number')
})

test('un-ticking sends a tombstone, and the row does not come back', async ({ page, context }) => {
  // The account holds a solve. Un-ticking it here has to reach the account as a
  // deletion - otherwise the next pull hands it straight back.
  const project = await stubProject(context, {
    rows: [cloudRow(1, { solved: true, solvedAt: '2026-09-02', updatedAt: '2026-09-02T10:00:00.000Z' })],
  })
  await withSession(page)

  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()

  const tick = page.getByRole('checkbox').first()
  await expect(tick).toBeChecked({ timeout: 15_000 })

  await tick.click()
  await expect(tick).not.toBeChecked()

  await expect.poll(() => project.upserts.filter((row) => row.deleted_at !== null).length, { timeout: 15_000 }).toBe(1)
  expect(project.rows.find((row) => row.question_id === 1).deleted_at).not.toBeNull()

  // A fresh visit pulls the tombstoned row and must leave it deleted.
  await page.reload()
  await page.getByRole('button', { name: /^Problems$/ }).click()
  await expect(page.getByRole('checkbox').first()).not.toBeChecked()
  await expect.poll(() => savedProgress(page).then((saved) => saved['1'])).toBeUndefined()
})

test('a tick made offline drains once the connection is back', async ({ page, context }) => {
  const project = await stubProject(context)
  await withSession(page)

  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()
  // Let the sync that runs on load finish before cutting the connection.
  await expect.poll(() => project.pulls.length, { timeout: 15_000 }).toBeGreaterThan(0)

  project.offline = true
  await context.setOffline(true)

  const tick = page.getByRole('checkbox').first()
  await tick.click()
  await expect(tick).toBeChecked()

  // Long enough that a push would have been attempted and failed.
  await page.waitForTimeout(PUSH_DELAY_MS * 2)
  expect(project.upserts).toEqual([])
  // The tick itself is safe regardless: that is what local-first buys.
  await expect.poll(() => savedProgress(page).then((saved) => Object.keys(saved).length)).toBe(1)

  project.offline = false
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))

  await expect.poll(() => project.upserts.length, { timeout: 15_000 }).toBe(1)
  expect(project.upserts[0].data.solved).toBe(true)
})

// Importing a backup while signed in is the one thing in this app that can
// take work off a device that isn't here: a replace tombstones everything the
// file left out, and tombstones travel. These are the tests that matter for
// that, and they assert on the wire rather than on the screen - what reaches
// the account is the only thing another device ever sees.

const DATA_VERSION = 3

const backupOf = (progress, name = 'laptop.json') => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ version: DATA_VERSION, progress })),
})

async function importBackup(page, file, choice) {
  await page.getByRole('button', { name: /options/i }).click()
  await page.setInputFiles('input[type=file]', file)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: choice === 'merge' ? /^Merge/ : /^Replace/ }).click()
  await expect(dialog).toBeHidden()
}

// An old backup, holding a problem the account has never heard of and a stale
// copy of one it has.
const OLD_BACKUP = {
  3: { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' },
  2: { solved: true, solvedAt: '2026-01-02', updatedAt: '2026-01-02T10:00:00.000Z' },
}

test('importing an older backup with Merge deletes nothing on the account', async ({ page, context }) => {
  // The account holds work from another device; this browser has its own.
  const project = await stubProject(context, {
    rows: [cloudRow(2, { solved: true, solvedAt: '2026-09-10', updatedAt: '2026-09-10T10:00:00.000Z' })],
  })
  await withSession(page, { progress: { 1: { solved: true, solvedAt: '2026-09-15', updatedAt: '2026-09-15T10:00:00.000Z' } } })

  await page.goto('/')
  // Let the sign-in round settle, so both sides are here before the import.
  await expect.poll(() => savedProgress(page).then((saved) => Object.keys(saved).sort()), { timeout: 15_000 }).toEqual(['1', '2'])
  project.upserts.length = 0

  await importBackup(page, backupOf(OLD_BACKUP), 'merge')
  await expect(page.getByText(/^Merged/)).toBeVisible()

  // Long enough that any push the import caused has been made.
  await page.waitForTimeout(PUSH_DELAY_MS * 2)

  // The whole point: a merge sends no deletion, so nothing on the account and
  // nothing on any other device can be removed by it.
  expect(project.upserts.filter((row) => row.deleted_at !== null)).toEqual([])
  expect(project.rows.filter((row) => row.deleted_at !== null)).toEqual([])

  // And the account still holds everything it held, plus what the file added.
  expect(project.rows.map((row) => row.question_id).sort()).toEqual([1, 2, 3])
  // The stale copy in the file did not overwrite the newer one on the account.
  expect(project.rows.find((row) => row.question_id === 2).data.solvedAt).toBe('2026-09-10')
})

test('Replace tombstones only after the explicit choice, and undo takes it back', async ({ page, context }) => {
  const project = await stubProject(context, {
    rows: [cloudRow(2, { solved: true, solvedAt: '2026-09-10', updatedAt: '2026-09-10T10:00:00.000Z' })],
  })
  await withSession(page, { progress: { 1: { solved: true, solvedAt: '2026-09-15', updatedAt: '2026-09-15T10:00:00.000Z' } } })

  await page.goto('/')
  await expect.poll(() => savedProgress(page).then((saved) => Object.keys(saved).sort()), { timeout: 15_000 }).toEqual(['1', '2'])
  project.upserts.length = 0

  // Opening the dialog and walking away sends nothing at all.
  await page.getByRole('button', { name: /options/i }).click()
  await page.setInputFiles('input[type=file]', backupOf(OLD_BACKUP))
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(PUSH_DELAY_MS * 2)
  expect(project.upserts).toEqual([])

  // Now the explicit choice. Question 1 is not in the file, so it goes.
  await importBackup(page, backupOf(OLD_BACKUP), 'replace')
  await expect.poll(() => project.upserts.filter((row) => row.deleted_at !== null).map((row) => row.question_id), { timeout: 15_000 }).toEqual([1])
  expect(project.rows.find((row) => row.question_id === 1).deleted_at).not.toBeNull()

  // Undo has to reach the account too, or the deletion stands on every other
  // device while this one shows the entry back in place.
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => project.rows.find((row) => row.question_id === 1).deleted_at, { timeout: 15_000 }).toBeNull()
  await expect.poll(() => savedProgress(page).then((saved) => saved['1']?.solved)).toBe(true)
})
