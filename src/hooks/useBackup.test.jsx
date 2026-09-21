// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import legacyIds from '../data/legacyIds.json'
import { DATA_VERSION } from '../storage.js'
import { parseBackup, useBackup } from './useBackup.js'

const IDS = new Set(['1', '2', '3', '4', '5'])

// parseBackup is the gate between a stranger's file and the user's progress,
// so it gets the bulk of the attention here.
describe('parseBackup', () => {
  it('reads a current versioned backup', () => {
    const file = JSON.stringify({ version: DATA_VERSION, progress: { 1: { solved: true, solvedAt: '2026-09-01' } } })
    expect(parseBackup(file, IDS)).toEqual({ 1: { solved: true, solvedAt: '2026-09-01' } })
  })

  it('rejects unreadable JSON without throwing', () => {
    expect(parseBackup('not json at all', IDS)).toBeNull()
    expect(parseBackup('', IDS)).toBeNull()
    expect(parseBackup('{"unclosed":', IDS)).toBeNull()
  })

  it('rejects valid JSON that is not a backup', () => {
    expect(parseBackup('[1,2,3]', IDS)).toBeNull()
    expect(parseBackup('"a string"', IDS)).toBeNull()
    expect(parseBackup('null', IDS)).toBeNull()
    // A versioned backup whose ids are all unknown is rejected outright.
    expect(parseBackup(JSON.stringify({ version: DATA_VERSION, progress: { 999: { solved: true } } }), IDS)).toBeNull()
  })

  it('refuses a file whose entries all drop out, rather than importing nothing', () => {
    // A bare object is read as a pre-v3 backup and its unknown ids vanish in
    // the id remap. Importing the empty result would wipe real progress while
    // the prompt said "0 entries", so the file is rejected instead.
    expect(parseBackup(JSON.stringify({ 999: { solved: true } }), IDS)).toBeNull()
    expect(parseBackup(JSON.stringify({ 999: { solved: true }, 1000: { bookmarked: true } }), IDS)).toBeNull()
  })

  it('refuses a file whose entries are all unrecognisable shapes', () => {
    expect(parseBackup(JSON.stringify({ 1: { score: 10 }, 2: { rating: 'x' } }), IDS)).toBeNull()
  })

  it('still accepts a file where only some entries survive', () => {
    const file = JSON.stringify({ version: DATA_VERSION, progress: { 1: { solved: true }, 999: { solved: true } } })
    expect(parseBackup(file, IDS)).toEqual({ 1: { solved: true } })
  })

  it('strips fields it does not recognise and keeps the rest', () => {
    const file = JSON.stringify({ 1: { solved: true, solvedAt: '2026-09-01', link: 'javascript:alert(1)', evil: true } })
    expect(parseBackup(file, IDS)).toEqual({ 1: { solved: true, solvedAt: '2026-09-01' } })
  })

  it('still migrates a pre-v3 backup written with the old question ids', () => {
    const parsed = parseBackup(JSON.stringify({ 15: { solved: true } }), new Set([String(legacyIds[15])]))
    expect(parsed).toEqual({ [legacyIds[15]]: { solved: true } })
  })

  it('treats a genuinely empty backup as empty progress, not as a failure', () => {
    // It claims nothing and delivers nothing, which is consistent.
    expect(parseBackup(JSON.stringify({ version: DATA_VERSION, progress: {} }), IDS)).toEqual({})
    expect(parseBackup('{}', IDS)).toEqual({})
  })
})

describe('useBackup import', () => {
  const fileOf = (text, name = 'backup.json') => ({ name, text: () => Promise.resolve(text) })
  const versioned = (progress) => JSON.stringify({ version: DATA_VERSION, progress })

  function setup(progress = {}) {
    const replaceProgress = vi.fn()
    const mergeIntoProgress = vi.fn()
    const restoreProgress = vi.fn()
    const showToast = vi.fn()
    const view = renderHook(() =>
      useBackup({ progress, replaceProgress, mergeIntoProgress, restoreProgress, questions: [], questionIds: IDS, today: '2026-09-20', showToast }),
    )
    return { ...view, replaceProgress, mergeIntoProgress, restoreProgress, showToast }
  }

  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('reports a bad file and leaves progress alone', async () => {
    const { result, replaceProgress, mergeIntoProgress, showToast } = setup({ 1: { solved: true } })
    await act(() => result.current.handleImport(fileOf('garbage')))
    expect(replaceProgress).not.toHaveBeenCalled()
    expect(mergeIntoProgress).not.toHaveBeenCalled()
    expect(result.current.pendingImport).toBeNull()
    expect(showToast).toHaveBeenCalledWith('That file is not a valid progress backup', { tone: 'error' })
  })

  it('refuses a file that would import as nothing, without asking anything', async () => {
    const { result, replaceProgress, showToast } = setup({ 1: { solved: true } })
    // Readable JSON, claims an entry, but nothing in it is ours.
    await act(() => result.current.handleImport(fileOf(JSON.stringify({ 999: { solved: true } }))))
    expect(result.current.pendingImport).toBeNull()
    expect(replaceProgress).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('That file is not a valid progress backup', { tone: 'error' })
  })

  it('imports without asking when there is nothing to lose', async () => {
    const { result, mergeIntoProgress, replaceProgress, showToast } = setup({})
    await act(() => result.current.handleImport(fileOf(versioned({ 1: { solved: true } }))))
    // No question worth asking: with nothing here, merge and replace agree.
    expect(result.current.pendingImport).toBeNull()
    expect(replaceProgress).not.toHaveBeenCalled()
    expect(mergeIntoProgress).toHaveBeenCalledWith({ 1: { solved: true } })
    expect(showToast).toHaveBeenCalledWith('Imported progress for 1 problem')
  })

  it('asks before touching existing progress, naming the file', async () => {
    const { result, replaceProgress, mergeIntoProgress } = setup({ 1: { solved: true } })
    await act(() => result.current.handleImport(fileOf(versioned({ 2: { solved: true }, 3: { solved: true } }), 'phone.json')))

    expect(result.current.pendingImport).toMatchObject({ fileName: 'phone.json', count: 2 })
    // Nothing happens until the question is answered.
    expect(replaceProgress).not.toHaveBeenCalled()
    expect(mergeIntoProgress).not.toHaveBeenCalled()
  })

  it('cancelling leaves progress exactly as it was', async () => {
    const { result, replaceProgress, mergeIntoProgress } = setup({ 1: { solved: true } })
    await act(() => result.current.handleImport(fileOf(versioned({ 2: { solved: true } }))))
    act(() => result.current.cancelImport())

    expect(result.current.pendingImport).toBeNull()
    expect(replaceProgress).not.toHaveBeenCalled()
    expect(mergeIntoProgress).not.toHaveBeenCalled()
  })

  it('merging keeps what only this browser had, and never replaces', async () => {
    const { result, mergeIntoProgress, replaceProgress, showToast } = setup({ 1: { solved: true, updatedAt: '2026-09-20T10:00:00.000Z' } })
    await act(() => result.current.handleImport(fileOf(versioned({ 2: { solved: true, updatedAt: '2026-09-19T10:00:00.000Z' } }))))
    act(() => result.current.confirmImport('merge'))

    expect(replaceProgress).not.toHaveBeenCalled()
    const merged = mergeIntoProgress.mock.calls[0][0]
    // Both sides survive: the file adds 2 without costing 1.
    expect(Object.keys(merged).sort()).toEqual(['1', '2'])
    expect(showToast).toHaveBeenCalledWith('Merged in 1 problem')
  })

  it('merging an older backup cannot undo newer local work', async () => {
    // The same problem, solved here and later un-solved, against a file that
    // still remembers it as solved. The newer change is the local one.
    const { result, mergeIntoProgress } = setup({ 1: { bookmarked: true, updatedAt: '2026-09-20T10:00:00.000Z' } })
    await act(() => result.current.handleImport(fileOf(versioned({ 1: { solved: true, solvedAt: '2026-09-01', updatedAt: '2026-08-01T10:00:00.000Z' } }))))
    act(() => result.current.confirmImport('merge'))

    expect(mergeIntoProgress.mock.calls[0][0]).toEqual({ 1: { bookmarked: true, updatedAt: '2026-09-20T10:00:00.000Z' } })
  })

  it('says so plainly when a re-imported backup adds nothing', async () => {
    const { result, showToast } = setup({ 1: { solved: true, updatedAt: '2026-09-20T10:00:00.000Z' } })
    await act(() => result.current.handleImport(fileOf(versioned({ 1: { solved: true, updatedAt: '2026-09-01T10:00:00.000Z' } }))))
    act(() => result.current.confirmImport('merge'))

    expect(showToast).toHaveBeenCalledWith('Merged - nothing new in that file')
  })

  it('replacing only happens on the explicit choice, and offers an undo', async () => {
    const before = { 1: { solved: true }, 5: { bookmarked: true } }
    const { result, replaceProgress, mergeIntoProgress, restoreProgress, showToast } = setup(before)
    await act(() => result.current.handleImport(fileOf(versioned({ 2: { solved: true } }))))
    act(() => result.current.confirmImport('replace'))

    expect(mergeIntoProgress).not.toHaveBeenCalled()
    expect(replaceProgress).toHaveBeenCalledWith({ 2: { solved: true } })

    const [message, options] = showToast.mock.calls.at(-1)
    expect(message).toBe('Replaced with 1 problem')
    // The undo puts back exactly what was there before the replace.
    expect(options.action.label).toBe('Undo')
    act(() => options.action.onClick())
    expect(restoreProgress).toHaveBeenCalledWith(before)
  })
})

describe('useBackup reminder', () => {
  beforeEach(() => localStorage.clear())

  it('stays quiet until there is enough progress to be worth losing', () => {
    const few = Object.fromEntries([1, 2, 3].map((id) => [id, { solved: true }]))
    const many = Object.fromEntries([1, 2, 3, 4, 5, 6].map((id) => [id, { solved: true }]))
    const render = (progress) =>
      renderHook(() => useBackup({ progress, replaceProgress: vi.fn(), mergeIntoProgress: vi.fn(), restoreProgress: vi.fn(), questions: [], questionIds: IDS, today: '2026-09-20', showToast: vi.fn() }))

    expect(render(few).result.current.showBackupReminder).toBe(false)
    expect(render(many).result.current.showBackupReminder).toBe(true)
  })

  it('records the backup date on export and stops reminding', () => {
    const progress = Object.fromEntries([1, 2, 3, 4, 5, 6].map((id) => [id, { solved: true }]))
    const { result, rerender } = renderHook(() =>
      useBackup({ progress, replaceProgress: vi.fn(), mergeIntoProgress: vi.fn(), restoreProgress: vi.fn(), questions: [], questionIds: IDS, today: '2026-09-20', showToast: vi.fn() }),
    )
    expect(result.current.showBackupReminder).toBe(true)

    // jsdom has no real downloads and implements neither of these, so they are
    // installed rather than spied on. Only the bookkeeping matters here.
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    act(() => result.current.handleExport())
    rerender()

    expect(localStorage.getItem('dsa-last-backup')).toBe('2026-09-20')
    expect(result.current.showBackupReminder).toBe(false)
  })

  it('snoozing silences the reminder for a week', () => {
    const progress = Object.fromEntries([1, 2, 3, 4, 5, 6].map((id) => [id, { solved: true }]))
    const { result, rerender } = renderHook(() =>
      useBackup({ progress, replaceProgress: vi.fn(), mergeIntoProgress: vi.fn(), restoreProgress: vi.fn(), questions: [], questionIds: IDS, today: '2026-09-20', showToast: vi.fn() }),
    )
    act(() => result.current.snoozeBackup())
    rerender()
    expect(localStorage.getItem('dsa-backup-snoozed-until')).toBe('2026-09-27')
    expect(result.current.showBackupReminder).toBe(false)
  })
})
