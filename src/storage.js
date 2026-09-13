import { CONFIDENCE_LEVELS, DEFAULT_STATUS, STATUSES } from './constants.js'

// All saved progress lives under this one localStorage key.
// Shape: { [questionId]: { status: string, confidence: string } }
export const STORAGE_KEY = 'dsa-tracker-progress'

const VALID_STATUSES = new Set(STATUSES)
const VALID_CONFIDENCE = new Set(CONFIDENCE_LEVELS)

// Progress files are user supplied, so retain only known question IDs and valid
// values. This also makes a stale or hand-edited backup safe to import.
export function sanitizeProgress(value, questionIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const entries = Object.entries(value)
  if (entries.length === 0) return {}

  const clean = {}
  let validEntries = 0

  for (const [id, item] of entries) {
    if (!questionIds.has(String(id)) || !item || typeof item !== 'object' || Array.isArray(item)) continue

    const status = item.status ?? DEFAULT_STATUS
    const confidence = item.confidence ?? ''
    if (!VALID_STATUSES.has(status) || (!VALID_CONFIDENCE.has(String(confidence)) && confidence !== '')) continue

    clean[id] = { status, confidence: String(confidence) }
    validEntries++
  }

  return validEntries > 0 ? clean : null
}

export function loadProgress(questionIds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return sanitizeProgress(parsed, questionIds) ?? {}
  } catch {
    return {}
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or blocked (e.g. private mode) - nothing useful to do here.
  }
}
