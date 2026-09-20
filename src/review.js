import { addDays } from './progress.js'

// Spaced revision for solved problems: the first review is due 7 days after
// solving, the next 30 days after that review, the last 90 days after that.
export const REVIEW_INTERVALS = [7, 30, 90]

// A review you failed drops the problem onto a short relearn step instead of
// pushing it months away. Clearing that step re-earns the 7-day rung rather
// than skipping it, so the sequence after a lapse reads 3 -> 7 -> 30 -> 90.
export const LAPSE_INTERVAL = 3

// How a re-solve went. 'got' advances the schedule; 'struggled' resets it.
export const REVIEW_RESULTS = ['got', 'struggled']

// Reviews are kept as a short history so the schedule can react to a run of
// failures, not just the last one. Oldest entries fall off the front.
export const MAX_HISTORY = 20

// Two failed re-solves is the point where a problem is worth calling out.
export const WEAK_STRUGGLES = 2

export function lastResult(entry) {
  const history = entry?.history
  return history?.length > 0 ? history[history.length - 1].result : null
}

// True while the most recent re-solve was a failure, i.e. the problem sits on
// the relearn step and hasn't been recovered yet.
export function isLapsed(entry) {
  return lastResult(entry) === 'struggled'
}

export function struggleCount(entry) {
  return entry?.history?.reduce((count, item) => count + (item.result === 'struggled' ? 1 : 0), 0) ?? 0
}

export function isWeak(entry) {
  return struggleCount(entry) >= WEAK_STRUGGLES
}

// The patch recording one review outcome, to be applied with applyPatch.
// A struggle also bookmarks the problem: a re-solve you failed is exactly what
// the saved list is for. `reviews` is left undefined rather than 0 so the entry
// keeps only what's set, matching what sanitizeEntry stores.
export function recordReview(entry, result, today) {
  const history = [...(entry?.history ?? []), { date: today, result }].slice(-MAX_HISTORY)
  if (result === 'struggled') return { reviews: undefined, reviewedAt: today, bookmarked: true, history }

  // Clearing a lapse doesn't count as a rung climbed, so the 7-day step comes
  // back before the 30- and 90-day ones.
  const reviews = isLapsed(entry) ? (entry?.reviews ?? 0) : (entry?.reviews ?? 0) + 1
  return { reviews: reviews > 0 ? reviews : undefined, reviewedAt: today, history }
}

// The date the next review is due, or null when there is nothing to schedule:
// unsolved, solved before dates were tracked, or every review already done.
export function nextReviewDate(entry) {
  if (!entry?.solved || !entry.solvedAt) return null
  const from = entry.reviewedAt ?? entry.solvedAt
  if (isLapsed(entry)) return addDays(from, LAPSE_INTERVAL)
  const reviews = entry.reviews ?? 0
  if (reviews >= REVIEW_INTERVALS.length) return null
  return addDays(from, REVIEW_INTERVALS[reviews])
}

export function isDue(entry, today) {
  const next = nextReviewDate(entry)
  return next !== null && next <= today
}
