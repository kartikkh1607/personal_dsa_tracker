import { addDays } from './progress.js'

// Spaced revision for solved problems: the first review is due 7 days after
// solving, the next 30 days after that review, the last 90 days after that.
export const REVIEW_INTERVALS = [7, 30, 90]

// The date the next review is due, or null when there is nothing to schedule:
// unsolved, solved before dates were tracked, or every review already done.
export function nextReviewDate(entry) {
  if (!entry?.solved || !entry.solvedAt) return null
  const reviews = entry.reviews ?? 0
  if (reviews >= REVIEW_INTERVALS.length) return null
  return addDays(entry.reviewedAt ?? entry.solvedAt, REVIEW_INTERVALS[reviews])
}

export function isDue(entry, today) {
  const next = nextReviewDate(entry)
  return next !== null && next <= today
}
