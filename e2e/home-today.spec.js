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
  await expect(page.getByRole('heading', { name: 'No weak spots' })).toBeVisible()
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

  await expect(page.getByRole('heading', { level: 1, name: 'Today: 15 reviews' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Today’s reviews · 15' })).toBeVisible()
  // The remainder is stated rather than quietly dropped.
  await expect(page.getByText(/15 of 40/)).toBeVisible()
  await expect(page.getByText(/25 more are due but held back/)).toBeVisible()
})
