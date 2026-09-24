import { expect, test } from '@playwright/test'

// Home is meant to answer "what am I doing today". These cover the two things
// that had to change for it to: the review backlog is capped so today is a
// plan rather than a pile, and a cleared schedule says so instead of the card
// quietly vanishing.

test('Home says you are caught up rather than dropping the card', async ({ page }) => {
  // One problem solved today: nothing is due, but the tracker is not empty.
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    const today = new Date()
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    localStorage.setItem('dsa-tracker-progress', JSON.stringify({ 1: { solved: true, solvedAt: date, updatedAt: `${date}T10:00:00.000Z` } }))
  })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /caught up/i })).toBeVisible()
  // The empty column stays, and says why it is empty.
  await expect(page.getByRole('heading', { name: 'Weak spots · 0' })).toBeVisible()
  await expect(page.getByText(/^No weak spots/)).toBeVisible()
})

test('Home frames the day and states what is held back', async ({ page }) => {
  // More overdue reviews than the cap allows in one day.
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    const progress = {}
    for (let id = 1; id <= 40; id++) progress[id] = { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' }
    localStorage.setItem('dsa-tracker-progress', JSON.stringify(progress))
  })
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Today: 15 reviews, then Phase 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Due today — 15 of 40' })).toBeVisible()
  // The remainder is stated rather than quietly dropped.
  await expect(page.getByText(/15 of 40/)).toBeVisible()
  await expect(page.getByText(/25 more are due but held back/)).toBeVisible()
})

// The cap has to be a budget for the day, not a window onto the list. The
// difference only shows once you actually do the reviews: clearing one takes
// it out of the backlog, so a window would quietly refill itself and you could
// sit there and grind all 143. These drive the real buttons to prove it binds.

// A tracker with far more overdue reviews than a day's budget.
async function withBigBacklog(page, count = 40) {
  await page.addInitScript(([total]) => {
    localStorage.setItem('dsa-data-version', '3')
    localStorage.setItem('dsa-backup-snoozed-until', '2099-01-01')
    // Init scripts run on every navigation, reloads included, so this seeds
    // only once - otherwise a test that reloads would silently get a fresh
    // tracker and prove nothing about what survived.
    if (localStorage.getItem('dsa-tracker-progress')) return
    const progress = {}
    for (let id = 1; id <= total; id++) progress[id] = { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' }
    localStorage.setItem('dsa-tracker-progress', JSON.stringify(progress))
  }, [count])
  await page.goto('/')
}

// Clears one review from the top of the card, alternating the two outcomes so
// both paths through recordReview are exercised.
async function reviewOne(page, index) {
  const button = page.locator('[data-review-row]').first().getByRole('button', { name: index % 2 === 0 ? /^Got it:/ : /^Struggled with:/ })
  await button.click()
}

test('fifteen reviews spend the day, and Home says so', async ({ page }) => {
  await withBigBacklog(page)
  await expect(page.getByRole('heading', { name: 'Due today — 15 of 40' })).toBeVisible()

  for (let done = 0; done < 15; done++) await reviewOne(page, done)

  // The budget is gone even though 25 are still due. A window onto the list
  // would have refilled and shown another 15 here.
  await expect(page.getByRole('heading', { name: 'Done for today' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Today: reviews done' })).toBeVisible()
  await expect(page.getByText(/15 reviewed today\. 25 still due/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Due today/ })).toBeHidden()
})

test('the next batch is revealed only by asking for it', async ({ page }) => {
  await withBigBacklog(page)
  for (let done = 0; done < 15; done++) await reviewOne(page, done)
  await expect(page.getByRole('heading', { name: 'Done for today' })).toBeVisible()

  await page.getByRole('button', { name: 'Review more' }).click()

  // A deliberate act raises the budget rather than bypassing it, and what comes
  // back is the next batch of the same backlog.
  await expect(page.getByRole('heading', { name: 'Due today — 15 of 25' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Done for today' })).toBeHidden()
})

test('a backlog smaller than what is left of the budget is not held back', async ({ page }) => {
  // 20 due: 15 today, and after those the remaining 5 are all there is.
  await withBigBacklog(page, 20)
  for (let done = 0; done < 15; done++) await reviewOne(page, done)

  await expect(page.getByText(/15 reviewed today\. 5 still due/)).toBeVisible()
  await page.getByRole('button', { name: 'Review more' }).click()

  // Fewer than a full batch left, so nothing is held back and the card says so.
  await expect(page.getByRole('heading', { name: 'Due today — 5', exact: true })).toBeVisible()
  await expect(page.getByText(/held back/)).toBeHidden()
})

test('clearing the whole backlog reaches caught up, not done for today', async ({ page }) => {
  // Exactly one batch due, so finishing it empties the backlog entirely.
  await withBigBacklog(page, 15)
  for (let done = 0; done < 15; done++) await reviewOne(page, done)

  await expect(page.getByRole('heading', { name: /caught up/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Done for today' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Review more' })).toBeHidden()
})

test('the day"s count survives a reload, so the cap is not reset by refreshing', async ({ page }) => {
  await withBigBacklog(page)
  for (let done = 0; done < 15; done++) await reviewOne(page, done)
  await expect(page.getByRole('heading', { name: 'Done for today' })).toBeVisible()

  // Counted from the reviews recorded in history, which are on disk - not from
  // anything this visit happens to be holding. Progress writes are debounced,
  // so the last one is given time to land rather than racing the reload.
  await expect
    .poll(() =>
      page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('dsa-tracker-progress') ?? '{}')).filter((e) => e.history).length),
    )
    .toBe(15)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Done for today' })).toBeVisible()
  // The headline says the same thing in its own words, so this pins the card's.
  await expect(page.getByText(/15 reviewed today\. 25 still due/)).toBeVisible()
})
