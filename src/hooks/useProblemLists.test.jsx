// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ALL } from '../components/Filters.jsx'
import { ALL_TOPICS } from '../components/Sidebar.jsx'
import { REVIEW_DAILY_CAP, useFilteredProblems, useHomeLists } from './useProblemLists.js'

const TODAY = '2026-09-21'

// Only the fields the home lists actually read.
const questionsUpTo = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, topic: '1. Basics', pattern: 'Basics', phase: 1 }))

// Solved on the given day and never reviewed, so the first review fell due a
// week later. The earlier the solve, the more overdue it is now.
const solvedOn = (date) => ({ solved: true, solvedAt: date, updatedAt: `${date}T10:00:00.000Z` })

function listsFor(progress, count = 40, extraReviews = 0) {
  const questions = questionsUpTo(count)
  const { result } = renderHook(() => useHomeLists({ questions, progress, today: TODAY, extraReviews }))
  return result.current
}

// A problem already reviewed today, which spends one of the day's budget and
// leaves the backlog at the same time.
const reviewedToday = () => ({
  solved: true,
  solvedAt: '2026-01-01',
  reviews: 1,
  reviewedAt: TODAY,
  history: [{ date: TODAY, result: 'got' }],
  updatedAt: `${TODAY}T10:00:00.000Z`,
})

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

// The cap is a budget for the day, spent by reviews actually done - not a
// window onto the first 15 of the backlog. The two only diverge once reviews
// start clearing: a window would refill itself and never bind.
describe('the cap as a daily budget', () => {
  it('spends the budget on reviews already done today', () => {
    const progress = Object.fromEntries(questionsUpTo(40).map((q) => [q.id, solvedOn('2026-01-01')]))
    // Six of them were reviewed earlier today, so they have left the backlog
    // and taken six of the day's fifteen with them.
    for (let id = 1; id <= 6; id++) progress[id] = reviewedToday()
    const { reviewToday, reviewBacklog } = listsFor(progress)

    expect(reviewBacklog).toHaveLength(34)
    // Not 15: the six already done are not offered again as fresh capacity.
    expect(reviewToday).toHaveLength(9)
  })

  it('stops offering reviews once the whole budget is spent', () => {
    const progress = Object.fromEntries(questionsUpTo(40).map((q) => [q.id, solvedOn('2026-01-01')]))
    for (let id = 1; id <= REVIEW_DAILY_CAP; id++) progress[id] = reviewedToday()
    const { reviewToday, reviewBacklog, reviewedToday: count } = listsFor(progress)

    expect(count).toBe(REVIEW_DAILY_CAP)
    expect(reviewBacklog).toHaveLength(25)
    // Still 25 due, but none of them today.
    expect(reviewToday).toEqual([])
  })

  it('never goes negative when the budget has been overspent', () => {
    // "Review more" then a reload: more reviewed today than the plain cap.
    const progress = Object.fromEntries(questionsUpTo(40).map((q) => [q.id, solvedOn('2026-01-01')]))
    for (let id = 1; id <= 22; id++) progress[id] = reviewedToday()
    const { reviewToday } = listsFor(progress)

    expect(reviewToday).toEqual([])
  })

  it('reopens exactly one more batch when asked', () => {
    const progress = Object.fromEntries(questionsUpTo(40).map((q) => [q.id, solvedOn('2026-01-01')]))
    for (let id = 1; id <= REVIEW_DAILY_CAP; id++) progress[id] = reviewedToday()

    // What "Review more" does: raise the day's budget, deliberately.
    const { reviewToday } = listsFor(progress, 40, REVIEW_DAILY_CAP)
    expect(reviewToday).toHaveLength(REVIEW_DAILY_CAP)
  })

  it('counts reviews done today even on problems no longer due', () => {
    // The point of counting history rather than the backlog: these entries are
    // not in the backlog at all any more, and they still cost the budget.
    const progress = Object.fromEntries(questionsUpTo(20).map((q) => [q.id, reviewedToday()]))
    const { reviewBacklog, reviewedToday: count } = listsFor(progress, 20)

    expect(reviewBacklog).toEqual([])
    expect(count).toBe(20)
  })
})

// Two topics, each with a problem whose name matches "sum", so a search that
// stays inside one topic and one that covers the sheet give different answers.
const SHEET = [
  { id: 1, topic: '01. Arrays', pattern: 'Two pointers', problem: 'Two Sum II', difficulty: 'Medium', tier: 'Core' },
  { id: 2, topic: '01. Arrays', pattern: 'Two pointers', problem: 'Container With Most Water', difficulty: 'Medium', tier: 'Core' },
  { id: 3, topic: '02. Prefix Sum', pattern: 'Prefix basics', problem: 'Range Sum Query', difficulty: 'Easy', tier: 'Core' },
  { id: 4, topic: '02. Prefix Sum', pattern: 'Kadane', problem: 'Maximum Subarray', difficulty: 'Hard', tier: 'Depth' },
]

function filtered({ selectedTopic = '01. Arrays', search = '', difficulty = ALL, progress = {} } = {}) {
  const { result } = renderHook(() =>
    useFilteredProblems({ questions: SHEET, progress, today: TODAY, selectedTopic, difficulty, coreOnly: false, notesOnly: false, show: 'all', search }),
  )
  return result.current
}

const ids = (visible) => visible.map((question) => question.id)

describe('searching past the selected topic', () => {
  it('searches the whole sheet while a topic is selected, and groups by topic', () => {
    const { visible, groupByPattern, searching } = filtered({ search: 'sum' })

    // Range Sum Query lives in the other topic and is found anyway.
    expect(ids(visible)).toEqual([1, 3])
    expect(searching).toBe(true)
    expect(groupByPattern).toBe(false)
  })

  it('still applies the filters that were chosen on purpose', () => {
    // Difficulty is a deliberate filter, so it narrows a sheet-wide search.
    expect(ids(filtered({ search: 'sum', difficulty: 'Easy' }).visible)).toEqual([3])
  })

  it('treats a blank search as no search at all', () => {
    const { visible, searching } = filtered({ search: '   ' })

    expect(ids(visible)).toEqual([1, 2])
    expect(searching).toBe(false)
  })

  it('restores the topic filter exactly once the search is emptied', () => {
    // One hook, rerendered through the whole round trip, the way typing and
    // then clearing the search box drives it.
    const { result, rerender } = renderHook((search) =>
      useFilteredProblems({ questions: SHEET, progress: {}, today: TODAY, selectedTopic: '01. Arrays', difficulty: ALL, coreOnly: false, notesOnly: false, show: 'all', search }),
      { initialProps: '' },
    )
    const before = { ids: ids(result.current.visible), groupByPattern: result.current.groupByPattern }

    rerender('sum')
    expect(ids(result.current.visible)).toEqual([1, 3])

    rerender('')
    // The same problems in the same order, grouped the same way, as if the
    // search never happened.
    expect(ids(result.current.visible)).toEqual(before.ids)
    expect(before.ids).toEqual([1, 2])
    expect(result.current.groupByPattern).toBe(before.groupByPattern)
    expect(result.current.groupByPattern).toBe(true)
    expect(result.current.searching).toBe(false)
  })

  it('behaves the same with no topic selected', () => {
    expect(ids(filtered({ selectedTopic: ALL_TOPICS, search: 'sum' }).visible)).toEqual([1, 3])
  })
})
