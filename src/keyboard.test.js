import { describe, expect, it } from 'vitest'
import { reviewOutcomeFor } from './keyboard.js'

const TODAY = '2026-09-20'
// Solved on the 1st, so the first review fell due on the 8th.
const due = { solved: true, solvedAt: '2026-09-01' }
const notDue = { solved: true, solvedAt: '2026-09-18' }

describe('reviewOutcomeFor', () => {
  it('maps g and s to the two outcomes on a due problem', () => {
    expect(reviewOutcomeFor('g', due, TODAY)).toBe('got')
    expect(reviewOutcomeFor('s', due, TODAY)).toBe('struggled')
  })

  it('does nothing on a problem that is not due yet', () => {
    expect(reviewOutcomeFor('g', notDue, TODAY)).toBeNull()
    expect(reviewOutcomeFor('s', notDue, TODAY)).toBeNull()
  })

  it('does nothing on a problem still sitting out its 3-day relearn step', () => {
    const relearning = { solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-09-19', history: [{ date: '2026-09-19', result: 'struggled' }] }
    expect(reviewOutcomeFor('g', relearning, TODAY)).toBeNull()
    // ...and works again once the 3 days are up.
    expect(reviewOutcomeFor('g', relearning, '2026-09-22')).toBe('got')
  })

  it('does nothing on an unsolved or untracked problem', () => {
    expect(reviewOutcomeFor('g', undefined, TODAY)).toBeNull()
    expect(reviewOutcomeFor('g', { bookmarked: true }, TODAY)).toBeNull()
    expect(reviewOutcomeFor('s', {}, TODAY)).toBeNull()
  })

  it('does nothing once every review on the ladder is done', () => {
    expect(reviewOutcomeFor('g', { solved: true, solvedAt: '2026-01-01', reviewedAt: '2026-06-01', reviews: 3 }, TODAY)).toBeNull()
  })

  it('ignores keys that are not review keys', () => {
    for (const key of ['x', 'b', 'j', 'k', 'G', 'S', 'Enter', '/']) {
      expect(reviewOutcomeFor(key, due, TODAY)).toBeNull()
    }
  })
})
