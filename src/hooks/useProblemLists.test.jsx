// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { REVIEW_DAILY_CAP, useHomeLists } from './useProblemLists.js'

const TODAY = '2026-09-21'

// Only the fields the home lists actually read.
const questionsUpTo = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, topic: '1. Basics', pattern: 'Basics', phase: 1 }))

// Solved on the given day and never reviewed, so the first review fell due a
// week later. The earlier the solve, the more overdue it is now.
const solvedOn = (date) => ({ solved: true, solvedAt: date, updatedAt: `${date}T10:00:00.000Z` })

function listsFor(progress, count = 40) {
  const questions = questionsUpTo(count)
  const { result } = renderHook(() => useHomeLists({ questions, progress, today: TODAY }))
  return result.current
}

describe('the review backlog cap', () => {
  it('holds today to the cap while still counting the whole backlog', () => {
    // 40 problems, all solved months ago, so every one of them is overdue.
    const progress = Object.fromEntries(questionsUpTo(40).map((q) => [q.id, solvedOn('2026-01-01')]))
    const { reviewToday, reviewBacklog } = listsFor(progress)

    expect(reviewBacklog).toHaveLength(40)
    expect(reviewToday).toHaveLength(REVIEW_DAILY_CAP)
  })

  it('takes the most overdue first, so the cap delays the least urgent work', () => {
    // Question 1 is the freshest solve and question 30 the oldest, so the
    // backlog should come back in the opposite order to the ids.
    const progress = Object.fromEntries(
      questionsUpTo(30).map((q) => [q.id, solvedOn(`2026-0${Math.ceil((31 - q.id) / 10)}-01`)]),
    )
    const { reviewToday, reviewBacklog } = listsFor(progress, 30)

    const dueDates = reviewBacklog.map((q) => progress[q.id].solvedAt)
    expect([...dueDates].sort()).toEqual(dueDates)
    // Today's slice is the front of that same order, not a different selection.
    expect(reviewToday).toEqual(reviewBacklog.slice(0, REVIEW_DAILY_CAP))
  })

  it('leaves a backlog under the cap alone, so nothing is held back needlessly', () => {
    const progress = Object.fromEntries(questionsUpTo(4).map((q) => [q.id, solvedOn('2026-01-01')]))
    const { reviewToday, reviewBacklog } = listsFor(progress, 4)

    expect(reviewBacklog).toHaveLength(4)
    expect(reviewToday).toHaveLength(4)
  })

  it('is empty on both counts when nothing is due', () => {
    // Solved today, so the first review is a week out.
    const progress = { 1: solvedOn(TODAY) }
    const { reviewToday, reviewBacklog } = listsFor(progress, 5)

    expect(reviewBacklog).toEqual([])
    expect(reviewToday).toEqual([])
  })

  it('never shows more today than exists in the backlog', () => {
    // The invariant the whole cap rests on: today is always a prefix of the
    // backlog, so the two can never disagree about what is due.
    for (const count of [0, 1, 14, 15, 16, 60]) {
      const progress = Object.fromEntries(questionsUpTo(count).map((q) => [q.id, solvedOn('2026-01-01')]))
      const { reviewToday, reviewBacklog } = listsFor(progress, Math.max(count, 1))
      expect(reviewToday.length).toBeLessThanOrEqual(reviewBacklog.length)
      expect(reviewToday).toEqual(reviewBacklog.slice(0, reviewToday.length))
    }
  })
})
