import { describe, expect, it } from 'vitest'
import legacyIds from './data/legacyIds.json'
import questions from './data/questions.json'
import { hasNote } from './progress.js'
import { DATA_VERSION, needsBackupReminder, progressFromBackup, remapLegacyIds, sanitizeProgress } from './storage.js'

const IDS = new Set(['1', '2', '3', '4', '5'])

describe('sanitizeProgress', () => {
  it('rejects anything that is not a progress object', () => {
    expect(sanitizeProgress(null, IDS)).toBeNull()
    expect(sanitizeProgress([], IDS)).toBeNull()
    expect(sanitizeProgress('solved', IDS)).toBeNull()
  })

  it('accepts an empty object as empty progress', () => {
    expect(sanitizeProgress({}, IDS)).toEqual({})
  })

  it('migrates the old status and confidence format', () => {
    const legacy = {
      1: { status: 'Solved', confidence: '5' },
      2: { status: 'Mastered', confidence: '2' },
      3: { status: 'Attempted', confidence: '' },
      4: { status: 'Revisit', confidence: '1' },
    }
    expect(sanitizeProgress(legacy, IDS)).toEqual({
      1: { solved: true },
      2: { solved: true, bookmarked: true },
      4: { bookmarked: true },
    })
  })

  it('keeps valid fields and drops invalid ones', () => {
    const input = {
      1: { solved: true, solvedAt: '2026-09-01', reviewedAt: 'yesterday', reviews: 2, notes: '   ', link: 'javascript:alert(1)' },
      5: { bookmarked: true, notes: 'hash map of complements', link: 'https://leetcode.com/problems/two-sum/' },
    }
    expect(sanitizeProgress(input, IDS)).toEqual({
      1: { solved: true, solvedAt: '2026-09-01', reviews: 2 },
      5: { bookmarked: true, notes: 'hash map of complements', link: 'https://leetcode.com/problems/two-sum/' },
    })
  })

  it('does not keep review dates on unsolved problems', () => {
    expect(sanitizeProgress({ 1: { solvedAt: '2026-09-01', reviews: 1, bookmarked: true } }, IDS)).toEqual({ 1: { bookmarked: true } })
  })

  it('rejects files with no recognisable entries for known problems', () => {
    expect(sanitizeProgress({ 999: { solved: true } }, IDS)).toBeNull()
    expect(sanitizeProgress({ 1: { score: 10 } }, IDS)).toBeNull()
  })

  it('keeps note images even when the note text is empty or blank', () => {
    const input = {
      1: { notes: '   ', images: ['img_abc123def'] },
      2: { images: ['img_abc123def', 'img_abc123def', 'img_zzz999yyy'] },
    }
    const clean = sanitizeProgress(input, IDS)
    expect(clean).toEqual({ 1: { images: ['img_abc123def'] }, 2: { images: ['img_abc123def', 'img_zzz999yyy'] } })
    expect(hasNote(clean[1])).toBe(true)
  })

  it('keeps well formed review history and drops the items that are not', () => {
    const input = {
      1: {
        solved: true,
        solvedAt: '2026-09-01',
        history: [
          { date: '2026-09-08', result: 'got' },
          { date: 'last tuesday', result: 'got' },
          { date: '2026-09-11', result: 'nailed it' },
          { date: '2026-09-15', result: 'struggled' },
          null,
          'got',
          { result: 'got' },
        ],
      },
    }
    expect(sanitizeProgress(input, IDS)[1].history).toEqual([
      { date: '2026-09-08', result: 'got' },
      { date: '2026-09-15', result: 'struggled' },
    ])
  })

  it('rejects history that is not an array, and drops an empty one', () => {
    expect(sanitizeProgress({ 1: { solved: true, history: 'got' } }, IDS)).toEqual({ 1: { solved: true } })
    expect(sanitizeProgress({ 1: { solved: true, history: [] } }, IDS)).toEqual({ 1: { solved: true } })
    expect(sanitizeProgress({ 1: { solved: true, history: [{ date: 'nope', result: 'got' }] } }, IDS)).toEqual({ 1: { solved: true } })
  })

  it('caps stored history at the most recent 20 reviews', () => {
    const history = Array.from({ length: 30 }, (_, index) => ({ date: `2026-09-${String(index + 1).padStart(2, '0')}`, result: 'got' }))
    const clean = sanitizeProgress({ 1: { solved: true, history } }, IDS)
    expect(clean[1].history).toHaveLength(20)
    expect(clean[1].history[0].date).toBe('2026-09-11')
    expect(clean[1].history.at(-1).date).toBe('2026-09-30')
  })

  it('does not keep review history on an unsolved problem', () => {
    expect(sanitizeProgress({ 1: { bookmarked: true, history: [{ date: '2026-09-08', result: 'got' }] } }, IDS)).toEqual({ 1: { bookmarked: true } })
  })

  it('strips extra fields smuggled into a history item', () => {
    const input = { 1: { solved: true, history: [{ date: '2026-09-08', result: 'got', note: '<script>', reviews: 99 }] } }
    expect(sanitizeProgress(input, IDS)[1].history).toEqual([{ date: '2026-09-08', result: 'got' }])
  })

  it('drops malformed image ids and empty image lists', () => {
    expect(sanitizeProgress({ 1: { solved: true, images: ['../x', 42, 'img_'] }, 2: { images: 'img_abc123def' } }, IDS)).toEqual({ 1: { solved: true } })
  })
})

describe('old question ids', () => {
  it('moves progress onto the renumbered ids', () => {
    expect(remapLegacyIds({ 1: { solved: true }, 2: { notes: 'x' }, 9: { solved: true } }, { 1: 10, 2: 20 })).toEqual({ 10: { solved: true }, 20: { notes: 'x' } })
  })

  it('maps every old id to a distinct existing problem', () => {
    const ids = new Set(questions.map((question) => question.id))
    const targets = Object.values(legacyIds)
    expect(targets).toHaveLength(570)
    expect(new Set(targets).size).toBe(570)
    expect(targets.every((id) => ids.has(id))).toBe(true)
  })

  it('follows problems that moved or were renamed', () => {
    const problem = (oldId) => questions.find((question) => question.id === legacyIds[oldId]).problem
    expect(problem(15)).toBe('Majority Element')
    expect(problem(351)).toBe('Lowest Common Ancestor of a BST')
  })

  it('reads versioned backups as-is and remaps older bare ones', () => {
    const progress = { 11: { solved: true } }
    expect(progressFromBackup({ version: DATA_VERSION, progress })).toBe(progress)
    expect(progressFromBackup({ 15: { solved: true } })).toEqual({ [legacyIds[15]]: { solved: true } })
  })
})

describe('needsBackupReminder', () => {
  const base = { progressCount: 10, lastBackup: null, snoozedUntil: null, today: '2026-09-13' }

  it('stays quiet until there is progress worth backing up', () => {
    expect(needsBackupReminder({ ...base, progressCount: 4 })).toBe(false)
    expect(needsBackupReminder(base)).toBe(true)
  })

  it('reminds again 14 days after the last backup', () => {
    expect(needsBackupReminder({ ...base, lastBackup: '2026-09-01' })).toBe(false)
    expect(needsBackupReminder({ ...base, lastBackup: '2026-08-30' })).toBe(true)
  })

  it('respects "remind me later" until the snooze date', () => {
    expect(needsBackupReminder({ ...base, snoozedUntil: '2026-09-15' })).toBe(false)
    expect(needsBackupReminder({ ...base, snoozedUntil: '2026-09-13' })).toBe(true)
  })
})
