import { expect, test } from '@playwright/test'

// The difficulty filter is a listbox rather than a native select, so the
// things a select does for free - keyboard, Escape, closing when you click
// away - are checked here.

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dsa-tracker-progress') ?? '{}'))
const rowDifficulties = (page) => page.locator('[data-problem-row] .dif').allInnerTexts()

test('picking a difficulty with the mouse filters the list and closes', async ({ page }) => {
  await page.goto('/#/problems?topic=01')
  const trigger = page.getByRole('button', { name: 'Any difficulty' })
  await trigger.click()
  const list = page.getByRole('listbox', { name: 'Difficulty' })
  await expect(list).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  await list.getByRole('option', { name: 'Medium' }).click()

  await expect(list).toBeHidden()
  await expect(page.getByRole('button', { name: 'Difficulty: Medium' })).toBeFocused()
  expect(await page.evaluate(() => location.hash)).toContain('difficulty=Medium')
  // Topic 01 has Easy and Medium problems; only the Medium ones stay.
  expect(new Set(await rowDifficulties(page))).toEqual(new Set(['Medium']))
})

test('the keyboard opens, moves, picks and closes it', async ({ page }) => {
  await page.goto('/#/problems?topic=01&difficulty=Easy')
  const trigger = page.getByRole('button', { name: 'Difficulty: Easy' })
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  const list = page.getByRole('listbox', { name: 'Difficulty' })
  await expect(list).toBeFocused()
  // It opens on the current choice, which is marked.
  await expect(list.getByRole('option', { name: 'Easy' })).toHaveAttribute('aria-selected', 'true')
  await expect(list.getByRole('option', { name: 'Easy' })).toHaveAttribute('data-active', 'true')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(list).toBeHidden()
  await expect(page.getByRole('button', { name: 'Difficulty: Medium' })).toBeFocused()

  // Escape leaves the choice alone; a letter jumps to its option.
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(list).toBeHidden()
  await expect(page.getByRole('button', { name: 'Difficulty: Medium' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('a')
  await page.keyboard.press(' ')
  await expect(page.getByRole('button', { name: 'Any difficulty' })).toBeFocused()
  expect(await page.evaluate(() => location.hash)).not.toContain('difficulty=')
})

test('clicking away closes it, and page shortcuts stay off while it is open', async ({ page }) => {
  await page.goto('/#/problems?topic=01')
  await page.getByRole('button', { name: 'Any difficulty' }).click()
  const list = page.getByRole('listbox', { name: 'Difficulty' })
  await expect(list).toBeFocused()

  // x would tick the first problem anywhere else on the page.
  await page.keyboard.press('x')
  await page.waitForTimeout(600)
  expect(await stored(page)).toEqual({})

  await page.getByRole('heading', { level: 1 }).click()
  await expect(list).toBeHidden()
})
