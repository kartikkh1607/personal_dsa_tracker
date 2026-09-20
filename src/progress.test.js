import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activityFrom, addDays, applyPatch, daysBetween, hasNote, localDate, streakFrom } from './progress.js'

describe('hasNote', () => {
  it('counts real text or any image, but not blank text', () => {
    expect(hasNote(undefined)).toBe(false)
    expect(hasNote({ solved: true })).toBe(false)
    expect(hasNote({ notes: '  \n\t ' })).toBe(false)
    expect(hasNote({ notes: 'two pointers' })).toBe(true)
    expect(hasNote({ notes: ' ', images: ['img_abc123def'] })).toBe(true)
    expect(hasNote({ images: [] })).toBe(false)
  })
})

describe('applyPatch', () => {
  it('adds fields and drops ones set to empty values', () => {
    expect(applyPatch({}, 1, { solved: true, solvedAt: '2026-09-13' })).toEqual({ 1: { solved: true, solvedAt: '2026-09-13' } })
    expect(applyPatch({ 1: { solved: true, notes: 'x' } }, 1, { solved: false, solvedAt: undefined })).toEqual({ 1: { notes: 'x' } })
  })

  it('removes an entry once nothing is left in it', () => {
    expect(applyPatch({ 1: { bookmarked: true } }, 1, { bookmarked: false })).toEqual({})
  })

  it('never mutates the progress it was given', () => {
    const progress = { 1: { solved: true } }
    applyPatch(progress, 1, { notes: 'two pointers' })
    expect(progress).toEqual({ 1: { solved: true } })
  })
})

describe('dates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 13, 10, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('formats local dates with day offsets', () => {
    expect(localDate()).toBe('2026-09-13')
    expect(localDate(-13)).toBe('2026-08-31')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-09-01', '2026-09-13')).toBe(12)
    expect(daysBetween('2026-09-13', '2026-09-13')).toBe(0)
  })

  it('counts a streak that ends today or yesterday', () => {
    expect(streakFrom(new Set(['2026-09-13', '2026-09-12', '2026-09-10']))).toBe(2)
    expect(streakFrom(new Set(['2026-09-12', '2026-09-11']))).toBe(2)
    expect(streakFrom(new Set(['2026-09-10']))).toBe(0)
    expect(streakFrom(new Set())).toBe(0)
  })

  // The point of the change: reviewing is practice too, so a day of nothing but
  // reviews has to keep the streak alive.
  it('keeps a streak alive on a day of reviews only', () => {
    const progress = {
      1: { solved: true, solvedAt: '2026-09-11' },
      2: { solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-09-13', history: [{ date: '2026-09-12', result: 'got' }, { date: '2026-09-13', result: 'struggled' }] },
    }
    const days = activityFrom(progress)
    expect(streakFrom(new Set(days.keys()))).toBe(3) // 11th solved, 12th and 13th reviewed
  })

  it('still counts a review-only streak that ended yesterday', () => {
    const progress = { 1: { solved: true, solvedAt: '2026-08-01', history: [{ date: '2026-09-12', result: 'got' }] } }
    expect(streakFrom(new Set(activityFrom(progress).keys()))).toBe(1)
  })
})

describe('activityFrom', () => {
  it('counts solves and reviews separately on the same day', () => {
    const progress = {
      1: { solved: true, solvedAt: '2026-09-13' },
      2: { solved: true, solvedAt: '2026-09-13' },
      3: { solved: true, solvedAt: '2026-09-01', history: [{ date: '2026-09-13', result: 'got' }] },
    }
    expect(activityFrom(progress).get('2026-09-13')).toEqual({ solves: 2, reviews: 1 })
  })

  it('counts every review in the history, not just the last', () => {
    const progress = {
      1: {
        solved: true,
        solvedAt: '2026-09-01',
        reviewedAt: '2026-09-20',
        history: [
          { date: '2026-09-08', result: 'got' },
          { date: '2026-09-20', result: 'struggled' },
        ],
      },
    }
    const days = activityFrom(progress)
    expect(days.get('2026-09-08')).toEqual({ solves: 0, reviews: 1 })
    expect(days.get('2026-09-20')).toEqual({ solves: 0, reviews: 1 })
    expect(days.get('2026-09-01')).toEqual({ solves: 1, reviews: 0 })
  })

  it('does not double count reviewedAt when a history covers it', () => {
    const progress = { 1: { solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-09-08', history: [{ date: '2026-09-08', result: 'got' }] } }
    expect(activityFrom(progress).get('2026-09-08')).toEqual({ solves: 0, reviews: 1 })
  })

  it('falls back to reviewedAt for progress saved before history existed', () => {
    const progress = { 1: { solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-09-08', reviews: 1 } }
    expect(activityFrom(progress).get('2026-09-08')).toEqual({ solves: 0, reviews: 1 })
  })

  it('ignores entries with nothing to count', () => {
    expect(activityFrom({})).toEqual(new Map())
    expect(activityFrom({ 1: { bookmarked: true }, 2: { notes: 'x' } })).toEqual(new Map())
  })
})
