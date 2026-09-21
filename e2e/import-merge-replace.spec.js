import { expect, test } from '@playwright/test'

// Importing a backup is the one action in this app that can destroy work, and
// while signed in it can destroy it on devices that aren't even here: a replace
// tombstones everything the file left out, and those deletions travel.
//
// So the dialog is the safety, and these drive it in a real browser: that the
// choice is actually offered, that merge keeps both sides, and that replace -
// the destructive one - is only ever reached deliberately and can be undone.

const DATA_VERSION = 3

// A backup file as the app writes them. Ids 3 and 4 are real questions this
// build knows, and are not the ones the tests tick by hand.
function backupOf(progress, name = 'phone.json') {
  return {
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: DATA_VERSION, progress })),
  }
}

const FROM_FILE = {
  3: { solved: true, solvedAt: '2026-01-01', updatedAt: '2026-01-01T10:00:00.000Z' },
  4: { solved: true, solvedAt: '2026-01-02', updatedAt: '2026-01-02T10:00:00.000Z' },
}

// Ticks the first problem in the list, which is what gives the import
// something to merge with or replace.
async function tickFirstProblem(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /^Problems$/ }).click()
  const firstTick = page.getByRole('checkbox').first()
  await firstTick.click()
  await expect(firstTick).toBeChecked()
}

// The options menu is where import lives; the file input behind it is hidden,
// so the file is handed straight to it.
async function chooseImportFile(page, file) {
  await page.getByRole('button', { name: /options/i }).click()
  await page.setInputFiles('input[type=file]', file)
}

async function openImportDialog(page, file) {
  await chooseImportFile(page, file)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Scoped to the dialog: the problem list behind it holds a good number of
  // questions whose names start with "Merge".
  return {
    dialog,
    merge: dialog.getByRole('button', { name: /^Merge/ }),
    replace: dialog.getByRole('button', { name: /^Replace/ }),
    cancel: dialog.getByRole('button', { name: 'Cancel' }),
  }
}

// How many problems the app currently holds progress for, read from the store
// it actually persists to rather than from the screen.
async function storedCount(page) {
  return page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('dsa-tracker-progress') ?? '{}')).length)
}

async function storedTombstones(page) {
  return page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('dsa-sync-tombstones') ?? '{}')).sort())
}

test('importing over existing progress asks instead of just replacing', async ({ page }) => {
  await tickFirstProblem(page)
  const { dialog, merge, replace } = await openImportDialog(page, backupOf(FROM_FILE))
  await expect(dialog).toContainText('phone.json')
  await expect(merge).toBeVisible()
  await expect(replace).toBeVisible()

  // Nothing has happened yet - the file is parsed and waiting, not applied.
  expect(await storedCount(page)).toBe(1)
})

test('cancelling the dialog leaves everything exactly as it was', async ({ page }) => {
  await tickFirstProblem(page)
  const { cancel } = await openImportDialog(page, backupOf(FROM_FILE))

  await cancel.click()
  await expect(page.getByRole('dialog')).toBeHidden()

  expect(await storedCount(page)).toBe(1)
  expect(await storedTombstones(page)).toEqual([])
})

test('Escape cancels too, rather than picking one of the options', async ({ page }) => {
  await tickFirstProblem(page)
  await openImportDialog(page, backupOf(FROM_FILE))

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(await storedCount(page)).toBe(1)
})

test('merging keeps both sides and deletes nothing', async ({ page }) => {
  await tickFirstProblem(page)
  const { merge } = await openImportDialog(page, backupOf(FROM_FILE))

  await merge.click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText(/Merged in 2 problems/)).toBeVisible()

  // The ticked problem plus the file's two.
  await expect.poll(() => storedCount(page)).toBe(3)
  // The part that reaches other devices: a merge writes no deletion at all.
  expect(await storedTombstones(page)).toEqual([])
})

test('merge is the default, so Enter on the open dialog takes the safe option', async ({ page }) => {
  await tickFirstProblem(page)
  await openImportDialog(page, backupOf(FROM_FILE))

  // The dialog opens focused on Merge; pressing Enter must not replace.
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeHidden()

  await expect.poll(() => storedCount(page)).toBe(3)
  expect(await storedTombstones(page)).toEqual([])
})

test('replacing drops what the file left out, and tombstones it', async ({ page }) => {
  await tickFirstProblem(page)
  const { replace } = await openImportDialog(page, backupOf(FROM_FILE))

  await replace.click()
  await expect(page.getByText(/Replaced with 2 problems/)).toBeVisible()

  await expect.poll(() => storedCount(page)).toBe(2)
  // Entry 1 was ticked here and is not in the file, so its deletion is now
  // something a signed-in device would push. This is the cost that makes
  // replace the option the user has to choose by name.
  await expect.poll(() => storedTombstones(page)).toEqual(['1'])
})

test('undo after a replace puts the old progress back and clears the deletion', async ({ page }) => {
  await tickFirstProblem(page)
  const { replace } = await openImportDialog(page, backupOf(FROM_FILE))

  await replace.click()
  await expect.poll(() => storedTombstones(page)).toEqual(['1'])

  await page.getByRole('button', { name: 'Undo' }).click()

  // Back to the one ticked problem, and the tombstone that would have deleted
  // it elsewhere is gone with it.
  await expect.poll(() => storedCount(page)).toBe(1)
  await expect.poll(() => storedTombstones(page)).toEqual(['3', '4'])
  await page.getByRole('button', { name: /^Problems$/ }).click()
  await expect(page.getByRole('checkbox').first()).toBeChecked()
})

test('importing into an empty tracker asks nothing at all', async ({ page }) => {
  await page.goto('/')
  await chooseImportFile(page, backupOf(FROM_FILE))

  // With nothing to lose, merge and replace agree, so there is no dialog.
  await expect(page.getByText(/Imported progress for 2 problems/)).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect.poll(() => storedCount(page)).toBe(2)
})
