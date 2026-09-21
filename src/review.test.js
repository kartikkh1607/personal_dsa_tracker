import { describe, expect, it } from 'vitest'
import { applyPatch } from './progress.js'
import { isDue, isLapsed, isWeak, lastResult, MAX_HISTORY, nextReviewDate, recordReview, reviewsOn, struggleCount } from './review.js'

const solved = (extra = {}) => ({ solved: true, solvedAt: '2026-09-01', ...extra })

describe('nextReviewDate', () => {
  it('schedules reviews 7, 30 and then 90 days apart', () => {
    expect(nextReviewDate(solved())).toBe('2026-09-08')
    expect(nextReviewDate(solved({ reviewedAt: '2026-09-08', reviews: 1 }))).toBe('2026-10-08')
    expect(nextReviewDate(solved({ reviewedAt: '2026-10-08', reviews: 2 }))).toBe('2027-01-06')
  })

  it('stops scheduling once every review is done', () => {
    expect(nextReviewDate(solved({ reviewedAt: '2027-01-06', reviews: 3 }))).toBeNull()
  })

  it('has nothing to schedule for unsolved or undated problems', () => {
    expect(nextReviewDate(undefined)).toBeNull()
    expect(nextReviewDate({ bookmarked: true })).toBeNull()
    expect(nextReviewDate({ solved: true })).toBeNull()
  })

  it('brings a struggled problem back in 3 days', () => {
    const entry = solved({ reviewedAt: '2026-09-08', history: [{ date: '2026-09-08', result: 'struggled' }] })
    expect(nextReviewDate(entry)).toBe('2026-09-11')
  })

  it('keeps rescheduling a struggle even when the ladder was already finished', () => {
    const entry = solved({ reviewedAt: '2027-01-06', reviews: 3, history: [{ date: '2027-01-06', result: 'struggled' }] })
    expect(nextReviewDate(entry)).toBe('2027-01-09')
  })
})

describe('isDue', () => {
  it('is due on and after the review date', () => {
    const entry = solved()
    expect(isDue(entry, '2026-09-07')).toBe(false)
    expect(isDue(entry, '2026-09-08')).toBe(true)
    expect(isDue(entry, '2026-09-20')).toBe(true)
  })
})

describe('recordReview', () => {
  it('advances the schedule on "got it"', () => {
    const patch = recordReview(solved(), 'got', '2026-09-08')
    expect(patch.reviews).toBe(1)
    expect(patch.reviewedAt).toBe('2026-09-08')
    expect(patch.history).toEqual([{ date: '2026-09-08', result: 'got' }])
  })

  it('resets the count and bookmarks the problem on "struggled"', () => {
    const patch = recordReview(solved({ reviews: 2, reviewedAt: '2026-10-08' }), 'struggled', '2026-11-01')
    expect(patch.reviews).toBeUndefined()
    expect(patch.bookmarked).toBe(true)
    expect(patch.reviewedAt).toBe('2026-11-01')
    expect(patch.history).toEqual([{ date: '2026-11-01', result: 'struggled' }])
  })

  it('does not count the "got it" that clears a lapse as a rung climbed', () => {
    const lapsed = solved({ reviewedAt: '2026-09-08', history: [{ date: '2026-09-08', result: 'struggled' }] })
    expect(recordReview(lapsed, 'got', '2026-09-11').reviews).toBeUndefined()
  })

  it('caps history at the most recent MAX_HISTORY reviews', () => {
    let entry = solved()
    for (let day = 1; day <= MAX_HISTORY + 5; day++) {
      entry = { ...entry, ...recordReview(entry, 'got', `2026-10-${String(day).padStart(2, '0')}`) }
    }
    expect(entry.history).toHaveLength(MAX_HISTORY)
    // The oldest fall off the front, so the newest review is still last.
    expect(entry.history[0].date).toBe('2026-10-06')
    expect(entry.history.at(-1).date).toBe('2026-10-25')
  })

  it('never mutates the entry it was given', () => {
    const entry = solved({ history: [{ date: '2026-09-08', result: 'got' }] })
    recordReview(entry, 'struggled', '2026-09-20')
    expect(entry.history).toEqual([{ date: '2026-09-08', result: 'got' }])
  })
})

// The behaviour the whole phase exists for: failing a re-solve must not push
// the problem months away, and recovering must re-earn the 7-day step.
describe('a lapse and recovery walks 3 -> 7 -> 30 -> 90', () => {
  it('follows the schedule through a struggle and back', () => {
    const step = (progress, result, today) => applyPatch(progress, 1, recordReview(progress[1], result, today))

    let progress = { 1: { solved: true, solvedAt: '2026-09-01' } }
    expect(nextReviewDate(progress[1])).toBe('2026-09-08') // +7 from the solve

    progress = step(progress, 'got', '2026-09-08')
    expect(progress[1].reviews).toBe(1)
    expect(nextReviewDate(progress[1])).toBe('2026-10-08') // +30

    progress = step(progress, 'struggled', '2026-10-08')
    expect(progress[1].reviews).toBeUndefined() // back to zero
    expect(progress[1].bookmarked).toBe(true) // auto-saved
    expect(nextReviewDate(progress[1])).toBe('2026-10-11') // +3, the relearn step

    progress = step(progress, 'got', '2026-10-11')
    expect(progress[1].reviews).toBeUndefined() // the lapse-clearing pass is not a rung
    expect(nextReviewDate(progress[1])).toBe('2026-10-18') // +7, re-earned

    progress = step(progress, 'got', '2026-10-18')
    expect(progress[1].reviews).toBe(1)
    expect(nextReviewDate(progress[1])).toBe('2026-11-17') // +30

    progress = step(progress, 'got', '2026-11-17')
    expect(nextReviewDate(progress[1])).toBe('2027-02-15') // +90

    progress = step(progress, 'got', '2027-02-15')
    expect(progress[1].reviews).toBe(3)
    expect(nextReviewDate(progress[1])).toBeNull() // ladder finished
  })
})

describe('weak problems', () => {
  const history = (...results) => results.map((result, index) => ({ date: `2026-09-0${index + 1}`, result }))

  it('counts struggles and flags two or more', () => {
    expect(struggleCount(undefined)).toBe(0)
    expect(struggleCount({ history: history('got', 'got') })).toBe(0)
    expect(struggleCount({ history: history('struggled', 'got', 'struggled') })).toBe(2)
    expect(isWeak({ history: history('struggled') })).toBe(false)
    expect(isWeak({ history: history('struggled', 'got', 'struggled') })).toBe(true)
  })

  it('reads the latest outcome for the lapse check', () => {
    expect(lastResult(undefined)).toBeNull()
    expect(lastResult({ history: [] })).toBeNull()
    expect(isLapsed({ history: history('struggled', 'got') })).toBe(false)
    expect(isLapsed({ history: history('got', 'struggled') })).toBe(true)
  })
})

describe('reviewsOn', () => {
  const entry = (history) => ({ solved: true, solvedAt: '2026-01-01', history })

  it('counts every review recorded on the day, across problems', () => {
    const progress = {
      1: entry([{ date: '2026-09-20', result: 'got' }, { date: '2026-09-21', result: 'got' }]),
      2: entry([{ date: '2026-09-21', result: 'struggled' }]),
      3: entry([{ date: '2026-09-19', result: 'got' }]),
    }
    expect(reviewsOn(progress, '2026-09-21')).toBe(2)
    expect(reviewsOn(progress, '2026-09-20')).toBe(1)
    expect(reviewsOn(progress, '2026-09-18')).toBe(0)
  })

  it('counts a problem reviewed twice in one day twice', () => {
    const progress = { 1: entry([{ date: '2026-09-21', result: 'struggled' }, { date: '2026-09-21', result: 'got' }]) }
    expect(reviewsOn(progress, '2026-09-21')).toBe(2)
  })

  it('falls back to reviewedAt for entries from before history was kept', () => {
    expect(reviewsOn({ 1: { solved: true, reviewedAt: '2026-09-21' } }, '2026-09-21')).toBe(1)
    // ...and doesn't double count when both are there.
    const both = { 1: { solved: true, reviewedAt: '2026-09-21', history: [{ date: '2026-09-21', result: 'got' }] } }
    expect(reviewsOn(both, '2026-09-21')).toBe(1)
  })

  it('ignores entries with nothing to count', () => {
    expect(reviewsOn({}, '2026-09-21')).toBe(0)
    expect(reviewsOn({ 1: { solved: true, solvedAt: '2026-09-21' } }, '2026-09-21')).toBe(0)
  })
})
