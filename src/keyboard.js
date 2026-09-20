import { isDue } from './review.js'

// Shortcuts must never fire while the user is writing a note, pasting a link
// or typing in the search box, so every global key handler checks this first.
export function isTypingTarget(element) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    Boolean(element?.isContentEditable)
  )
}

// The two review outcomes, by key: g for "Got it", s for "Struggled".
export const REVIEW_KEYS = { g: 'got', s: 'struggled' }

// What pressing a key should record for a problem, or null for nothing.
// Reviewing early would let you race ahead of the schedule, which is the whole
// point of the schedule, so a review only counts on a problem that is due. Both
// the problem list and the detail panel gate on this one function.
export function reviewOutcomeFor(key, entry, today) {
  const outcome = REVIEW_KEYS[key]
  if (!outcome || !isDue(entry, today)) return null
  return outcome
}
