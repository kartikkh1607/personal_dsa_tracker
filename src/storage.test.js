import { describe, expect, it } from 'vitest'
import { needsBackupReminder, sanitizeProgress } from './storage.js'

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
