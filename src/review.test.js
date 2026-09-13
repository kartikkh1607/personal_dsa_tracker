import { describe, expect, it } from 'vitest'
import { isDue, nextReviewDate } from './review.js'

describe('nextReviewDate', () => {
  it('schedules reviews 7, 30 and then 90 days apart', () => {
    expect(nextReviewDate({ solved: true, solvedAt: '2026-09-01' })).toBe('2026-09-08')
    expect(nextReviewDate({ solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-09-08', reviews: 1 })).toBe('2026-10-08')
    expect(nextReviewDate({ solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-10-08', reviews: 2 })).toBe('2027-01-06')
  })

  it('stops scheduling once every review is done', () => {
    expect(nextReviewDate({ solved: true, solvedAt: '2026-09-01', reviewedAt: '2027-01-06', reviews: 3 })).toBeNull()
  })

  it('has nothing to schedule for unsolved or undated problems', () => {
    expect(nextReviewDate(undefined)).toBeNull()
    expect(nextReviewDate({ bookmarked: true })).toBeNull()
    expect(nextReviewDate({ solved: true })).toBeNull()
  })
})

describe('isDue', () => {
  it('is due on and after the review date', () => {
    const entry = { solved: true, solvedAt: '2026-09-01' }
    expect(isDue(entry, '2026-09-07')).toBe(false)
    expect(isDue(entry, '2026-09-08')).toBe(true)
    expect(isDue(entry, '2026-09-20')).toBe(true)
  })
})
