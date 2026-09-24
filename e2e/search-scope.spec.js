import { expect, test } from '@playwright/test'

// A search covers the whole sheet and sets the selected topic aside. Picking
// a topic while one runs is asking for that topic, so it ends the search -
// if the search kept overriding it, the click would look like it did nothing.

const topics = (page) => page.locator('tbody[aria-label]').evaluateAll((groups) => groups.map((group) => group.getAttribute('aria-label')))

test('clicking a topic while searching clears the search and shows that topic', async ({ page }) => {
  await page.goto('/#/problems?topic=01')
  const search = page.getByRole('searchbox', { name: /Search problems/ })
  await search.fill('sum')
  await expect(page.getByText('Searching all problems', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Sliding Window/ }).click()

  await expect(search).toHaveValue('')
  await expect(page.getByText('Searching all problems', { exact: true })).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Sliding Window' })).toBeAttached()
  expect(await page.evaluate(() => location.hash)).toBe('#/problems?topic=03')
  // Grouped by pattern again, as a single topic is - not by topic, as a search is.
  expect(await topics(page)).not.toContain('Basics & Recursion')
})

test('picking from the phone dropdown while searching does the same', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/#/problems?topic=01')
  const search = page.getByRole('searchbox', { name: /Search problems/ })
  await search.fill('sum')
  await expect(page.getByText('Searching all problems', { exact: true })).toBeVisible()

  await page.getByLabel('Topic').selectOption({ label: 'Sliding Window (0/33)' })

  await expect(search).toHaveValue('')
  await expect(page.getByText('Searching all problems', { exact: true })).toBeHidden()
  expect(await page.evaluate(() => location.hash)).toBe('#/problems?topic=03')
})
