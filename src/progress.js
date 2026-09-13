import { DEFAULT_STATUS } from './constants.js'

// Saved progress is a plain { [id]: { status, confidence } } map. Reading through
// these helpers keeps the raw question list untouched, so rendering can pass the
// original (stable) question objects straight to memoised rows.
export function getStatus(progress, id) {
  return progress[id]?.status ?? DEFAULT_STATUS
}

export function getConfidence(progress, id) {
  return progress[id]?.confidence ?? ''
}
