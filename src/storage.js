import legacyIds from './data/legacyIds.json'
import { daysBetween } from './progress.js'
import { IMAGE_ID_PATTERN, MAX_NOTE_IMAGES } from './images.js'
import { MAX_HISTORY, REVIEW_RESULTS } from './review.js'

// All saved progress lives under this one localStorage key.
// Shape: { [questionId]: { solved?, solvedAt?, reviewedAt?, reviews?, bookmarked?, notes?, images?, link?, history? } }
// images holds ids of note images; the images themselves are in IndexedDB (see images.js).
// history holds recent review outcomes as [{ date, result }], oldest first.
export const STORAGE_KEY = 'dsa-tracker-progress'
// Question ids were renumbered when the sheet grew from 570 problems to 922 in
// study-path order. Progress saved without this version uses the old ids.
export const DATA_VERSION_KEY = 'dsa-data-version'
export const DATA_VERSION = 3
const PRE_MIGRATION_KEY = 'dsa-tracker-progress-before-v3'
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
const KNOWN_KEYS = ['solved', 'solvedAt', 'reviewedAt', 'reviews', 'bookmarked', 'notes', 'images', 'link', 'history', 'status', 'confidence']
const RESULTS = new Set(REVIEW_RESULTS)

export function isValidUrl(value) {
  return URL_PATTERN.test(value)
}

function isDate(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value)
}

// Review history is user-supplied like everything else here: keep only well
// formed { date, result } items, drop the rest rather than the whole list, and
// hold on to the most recent MAX_HISTORY of them.
function sanitizeHistory(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object' && isDate(item.date) && RESULTS.has(item.result))
    .map((item) => ({ date: item.date, result: item.result }))
    .slice(-MAX_HISTORY)
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
    const history = sanitizeHistory(item.history)
    if (history.length > 0) entry.history = history
  }
  if (item.bookmarked === true || item.status === 'Revisit' || (legacyDone && legacyConfidence >= 1 && legacyConfidence <= 3)) {
    entry.bookmarked = true
  }
  if (typeof item.notes === 'string' && item.notes.trim() !== '') entry.notes = item.notes.slice(0, MAX_NOTES_LENGTH)
  if (Array.isArray(item.images)) {
    const images = [...new Set(item.images.filter((id) => typeof id === 'string' && IMAGE_ID_PATTERN.test(id)))].slice(0, MAX_NOTE_IMAGES)
    if (images.length > 0) entry.images = images
  }
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

// Moves entries saved under the old 570-problem ids onto the matching new ids.
export function remapLegacyIds(value, idMap = legacyIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const remapped = {}
  for (const [id, item] of Object.entries(value)) {
    if (Object.hasOwn(idMap, id)) remapped[idMap[id]] = item
  }
  return remapped
}

// Backups are { version, progress } from v3 on; anything else is an older bare
// progress object that still uses the old ids.
export function progressFromBackup(value) {
  if (value?.version === DATA_VERSION) return value.progress
  return remapLegacyIds(value)
}

export function loadProgress(questionIds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const isCurrent = localStorage.getItem(DATA_VERSION_KEY) === String(DATA_VERSION)
    if (raw && isCurrent) return sanitizeProgress(JSON.parse(raw), questionIds) ?? {}

    // First load since the renumbering: migrate once, keeping the original
    // untouched under its own key, and save straight away so a quick close
    // can't leave old-id progress marked as current.
    let progress = {}
    if (raw) {
      localStorage.setItem(PRE_MIGRATION_KEY, raw)
      progress = sanitizeProgress(remapLegacyIds(JSON.parse(raw)), questionIds) ?? {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    }
    localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION))
    return progress
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
