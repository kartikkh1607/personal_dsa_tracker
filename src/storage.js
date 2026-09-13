import { daysBetween } from './progress.js'

// All saved progress lives under this one localStorage key.
// Shape: { [questionId]: { solved?, solvedAt?, reviewedAt?, reviews?, bookmarked?, notes?, link? } }
export const STORAGE_KEY = 'dsa-tracker-progress'
export const BACKUP_KEY = 'dsa-last-backup'
export const BACKUP_SNOOZE_KEY = 'dsa-backup-snoozed-until'
export const BACKUP_REMIND_AFTER_DAYS = 14
const BACKUP_REMIND_MIN_ENTRIES = 5

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
// Only http(s) links are kept, so an imported file can't smuggle in a
// javascript: URL that would run when the link is clicked.
const URL_PATTERN = /^https?:\/\/\S+$/i
const MAX_NOTES_LENGTH = 5000
const MAX_REVIEWS = 10
const KNOWN_KEYS = ['solved', 'solvedAt', 'reviewedAt', 'reviews', 'bookmarked', 'notes', 'link', 'status', 'confidence']

export function isValidUrl(value) {
  return URL_PATTERN.test(value)
}

function isDate(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value)
}

// Accepts the current entry shape and the older { status, confidence } shape.
// Old entries migrate so nothing is lost: Solved or Mastered become solved, and
// Revisit or a shaky (1-3) confidence on a solve become a revision bookmark.
function sanitizeEntry(item) {
  const entry = {}
  const legacyDone = item.status === 'Solved' || item.status === 'Mastered'
  const legacyConfidence = Number(item.confidence) || 0

  if (item.solved === true || legacyDone) entry.solved = true
  if (entry.solved) {
    if (isDate(item.solvedAt)) entry.solvedAt = item.solvedAt
    if (isDate(item.reviewedAt)) entry.reviewedAt = item.reviewedAt
    if (Number.isInteger(item.reviews) && item.reviews > 0 && item.reviews <= MAX_REVIEWS) entry.reviews = item.reviews
  }
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

export function readLocal(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked - the value just won't persist.
  }
}

// Remind once there's progress worth losing and no recent backup, unless the
// user asked to be reminded later.
export function needsBackupReminder({ progressCount, lastBackup, snoozedUntil, today }) {
  if (progressCount < BACKUP_REMIND_MIN_ENTRIES) return false
  if (snoozedUntil && snoozedUntil > today) return false
  if (!lastBackup) return true
  return daysBetween(lastBackup, today) >= BACKUP_REMIND_AFTER_DAYS
}
