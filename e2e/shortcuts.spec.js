import { expect, test } from '@playwright/test'

// The row shortcuts used to require a focused row: j/k started from the first
// one when nothing was focused, but x, b, g and s just returned. Pressing a
// documented key and having nothing happen reads as a broken keyboard, so they
// now agree with j/k - and move focus to the row they acted on, because acting
// on a row nobody is looking at would be worse than not acting.

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dsa-tracker-progress') ?? '{}'))

async function openProblems(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()
  await expect(page.getByRole('checkbox').first()).toBeVisible()
  // Nothing is focused: the page has just been navigated with the mouse.
  await page.evaluate(() => document.activeElement?.blur())
}

test('x ticks the first row when nothing is focused', async ({ page }) => {
  await openProblems(page)

  await page.keyboard.press('x')

  await expect(page.getByRole('checkbox').first()).toBeChecked()
  await expect.poll(() => stored(page).then((saved) => saved['1']?.solved)).toBe(true)
})

test('b saves the first row when nothing is focused', async ({ page }) => {
  await openProblems(page)

  await page.keyboard.press('b')

  await expect.poll(() => stored(page).then((saved) => saved['1']?.bookmarked)).toBe(true)
})

test('falling back to the first row also moves focus there', async ({ page }) => {
  await openProblems(page)

  await page.keyboard.press('x')

  // The row acted on is now the focused one, so j/k carry on from it rather
  // than jumping back to the top.
  const focusedRowId = await page.evaluate(() => document.activeElement?.closest('[data-problem-row]')?.dataset.questionId)
  expect(focusedRowId).toBe('1')
})

test('g records a review on the first row when it is due and nothing is focused', async ({ page }) => {
  // Solved long enough ago that the first review is overdue.
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    localStorage.setItem(
      'dsa-tracker-progress',
      JSON.stringify({ 1: { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' } }),
    )
  })
  await openProblems(page)

  await page.keyboard.press('g')

  // A cleared review advances the schedule, which is what reviews: 1 means.
  await expect.poll(() => stored(page).then((saved) => saved['1']?.reviews)).toBe(1)
})

test('s on the first row records a struggle and saves it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    localStorage.setItem(
      'dsa-tracker-progress',
      JSON.stringify({ 1: { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' } }),
    )
  })
  await openProblems(page)

  await page.keyboard.press('s')

  // A struggle bookmarks the problem - a re-solve you failed is what the saved
  // list is for.
  await expect.poll(() => stored(page).then((saved) => saved['1']?.bookmarked)).toBe(true)
})

test('g and s stay inert on a problem that is not due', async ({ page }) => {
  // Unsolved, so there is no schedule to advance.
  await openProblems(page)

  await page.keyboard.press('g')
  await page.keyboard.press('s')

  expect(await stored(page)).toEqual({})
})

test('the shortcut hint lists every key the page listens for', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()

  const hint = page.locator('p', { has: page.locator('kbd', { hasText: 'j' }) }).last()
  for (const key of ['j', 'k', 'x', 'b', 'g', 's', 'Enter', '/']) {
    await expect(hint.locator('kbd', { hasText: new RegExp(`^${key === '/' ? '\\/' : key}$`) }).first()).toBeVisible()
  }
})

test('the hint is reachable below the large breakpoint', async ({ page }) => {
  // It used to appear only from 1024px up, which hid every shortcut from
  // anyone on a smaller window - a keyboard is not a thing only wide screens
  // have. Still hidden on phones, where there is no keyboard to hint at.
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()

  await expect(page.locator('kbd', { hasText: /^g$/ }).first()).toBeVisible()
})
