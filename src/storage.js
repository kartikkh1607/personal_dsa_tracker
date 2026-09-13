// All saved progress lives under this one localStorage key.
// Shape: { [questionId]: { solved?, solvedAt?, bookmarked?, notes?, link? } }
export const STORAGE_KEY = 'dsa-tracker-progress'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const URL_PATTERN = /^https?:\/\/\S+$/i
const MAX_NOTES_LENGTH = 5000
const KNOWN_KEYS = ['solved', 'solvedAt', 'bookmarked', 'notes', 'link', 'status', 'confidence']

export function isValidUrl(value) {
  return URL_PATTERN.test(value)
}

// Accepts the current entry shape and the older { status, confidence } shape.
// Old entries migrate so nothing is lost: Solved or Mastered become solved, and
// Revisit or a shaky (1-3) confidence on a solve become a revision bookmark.
function sanitizeEntry(item) {
  const entry = {}
  const legacyDone = item.status === 'Solved' || item.status === 'Mastered'
  const legacyConfidence = Number(item.confidence) || 0

  if (item.solved === true || legacyDone) entry.solved = true
  if (entry.solved && typeof item.solvedAt === 'string' && DATE_PATTERN.test(item.solvedAt)) entry.solvedAt = item.solvedAt
  if (item.bookmarked === true || item.status === 'Revisit' || (legacyDone && legacyConfidence >= 1 && legacyConfidence <= 3)) {
    entry.bookmarked = true
  }
  if (typeof item.notes === 'string' && item.notes.trim() !== '') entry.notes = item.notes.slice(0, MAX_NOTES_LENGTH)
  if (typeof item.link === 'string' && isValidUrl(item.link)) entry.link = item.link

  return entry
}

// Progress files are user supplied, so retain only known question IDs and valid
// values. This also makes a stale or hand-edited backup safe to import.
export function sanitizeProgress(value, questionIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const entries = Object.entries(value)
  if (entries.length === 0) return {}

  const clean = {}
  let recognised = 0

  for (const [id, item] of entries) {
    if (!questionIds.has(String(id)) || !item || typeof item !== 'object' || Array.isArray(item)) continue
    if (!KNOWN_KEYS.some((key) => key in item)) continue
    recognised++
    const entry = sanitizeEntry(item)
    if (Object.keys(entry).length > 0) clean[id] = entry
  }

  return recognised > 0 ? clean : null
}

export function loadProgress(questionIds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return sanitizeProgress(JSON.parse(raw), questionIds) ?? {}
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
