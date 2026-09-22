import { expect, test } from '@playwright/test'

// Clearing a note and deleting an image used to stop and ask, with
// window.confirm, and "this can't be undone" was true - the bytes went
// immediately. Both are reversible now, so the prompt is gone and an Undo takes
// its place. These check the reversal actually restores something usable.

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dsa-tracker-progress') ?? '{}'))

// A problem with a note already on it, opened in the detail drawer.
async function openNotedProblem(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    if (localStorage.getItem('dsa-tracker-progress')) return
    localStorage.setItem(
      'dsa-tracker-progress',
      JSON.stringify({ 1: { solved: true, solvedAt: '2026-09-01', notes: 'Two pointers, one from each end.', updatedAt: '2026-09-01T10:00:00.000Z' } }),
    )
  })
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()
  await page.getByRole('button', { name: /Print 1 to N using Recursion/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('clearing a note asks nothing and offers an undo instead', async ({ page }) => {
  await openNotedProblem(page)

  // No confirm to answer: if one appeared the click would hang here.
  await page.getByRole('button', { name: /clear note/i }).click()

  await expect(page.getByText('Note cleared')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
  await expect.poll(() => stored(page).then((saved) => saved['1']?.notes)).toBeUndefined()
})

test('undo brings the note back', async ({ page }) => {
  await openNotedProblem(page)
  await page.getByRole('button', { name: /clear note/i }).click()

  await page.getByRole('button', { name: 'Undo' }).click()

  await expect.poll(() => stored(page).then((saved) => saved['1']?.notes)).toBe('Two pointers, one from each end.')
})

test('the skip link is the first stop and lands on the content', async ({ page }) => {
  await page.goto('/')
  // The question list is fetched, and until it arrives the app renders a
  // skeleton with no skip link in it. Tabbing straight after goto races that
  // fetch and lands on the skeleton's scrollable <main>, which Chrome makes
  // focusable. Wait for the real app before asking what the first stop is.
  await expect(page.getByRole('button', { name: 'Skip to content' })).toBeAttached()

  await page.locator('body').press('Tab')

  await expect(page.locator(':focus')).toHaveText(/skip to content/i)

  await page.locator(':focus').press('Enter')
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main-content')
})

test('skipping does not throw away the route', async ({ page }) => {
  // The obvious implementation is an href="#main-content" anchor. This app
  // keeps its route in the hash, so that anchor would overwrite it and bounce
  // you back to Home - fixing one accessibility problem by adding a worse bug.
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/problems')

  await page.getByRole('button', { name: 'Skip to content' }).press('Enter')

  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main-content')
  // Still on Problems, and the hash still says so.
  expect(await page.evaluate(() => location.hash)).toBe('#/problems')
  await expect(page.getByRole('heading', { level: 1, name: 'All problems' })).toBeVisible()
})

test('the review buttons say what they will do, not just which one they are', async ({ page }) => {
  // The consequence used to live in a title attribute, which screen readers do
  // not reliably announce - so "what happens if I press this" was reachable by
  // hovering and no other way.
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    if (localStorage.getItem('dsa-tracker-progress')) return
    localStorage.setItem(
      'dsa-tracker-progress',
      JSON.stringify({ 1: { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' } }),
    )
  })
  await page.goto('/')

  await expect(page.getByRole('button', { name: /Struggled with: .*Comes back in 3 days, and is saved for revision/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Got it: .*Schedules the next review further out/ }).first()).toBeVisible()
})

test('a new tracker explains itself, once', async ({ page }) => {
  await page.goto('/')

  const card = page.getByRole('region', { name: 'How this works' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Tick a problem when you solve it')
  await expect(card).toContainText('Solved problems come back')
  await expect(card).toContainText('stays in this browser')

  await card.getByRole('button', { name: 'Got it' }).click()
  await expect(card).toBeHidden()

  // Dismissed for good: an introduction that keeps introducing itself is a
  // banner, not an introduction.
  await page.reload()
  await expect(page.getByRole('region', { name: 'How this works' })).toBeHidden()
})

test('the introduction stays out of the way once there is progress', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dsa-data-version', '3')
    if (localStorage.getItem('dsa-tracker-progress')) return
    localStorage.setItem(
      'dsa-tracker-progress',
      JSON.stringify({ 1: { solved: true, solvedAt: '2026-09-21', updatedAt: '2026-09-21T10:00:00.000Z' } }),
    )
  })
  await page.goto('/')

  // Never dismissed, but a tracker with work in it has already answered the
  // questions the card asks.
  await expect(page.getByRole('region', { name: 'How this works' })).toBeHidden()
})
