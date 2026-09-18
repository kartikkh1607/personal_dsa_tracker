// Saved progress is a plain { [id]: entry } map, where an entry holds only what
// the user has set: { solved, solvedAt, reviewedAt, reviews, bookmarked, notes,
// images, link }. Problems with no progress have no entry.

// Merges a patch into one problem's entry. Empty fields (false, '' or
// undefined) are dropped, and an entry with nothing left is removed.
export function applyPatch(progress, id, patch) {
  const entry = { ...progress[id], ...patch }
  for (const key of Object.keys(entry)) {
    if (entry[key] === undefined || entry[key] === false || entry[key] === '') delete entry[key]
  }
  const next = { ...progress }
  if (Object.keys(entry).length === 0) delete next[id]
  else next[id] = entry
  return next
}

// A note counts once it has real text or at least one image.
export function hasNote(entry) {
  return Boolean(entry?.notes?.trim()) || (entry?.images?.length ?? 0) > 0
}

// Dates are local calendar days stored as YYYY-MM-DD strings, which also sort
// and compare correctly as plain strings.
export function isoFromDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function dateFromIso(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Today's local date, offset by whole days (-1 = yesterday).
export function localDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return isoFromDate(date)
}

export function addDays(isoDate, days) {
  const date = dateFromIso(isoDate)
  date.setDate(date.getDate() + days)
  return isoFromDate(date)
}

// Rounded, so a daylight-saving change (a 23 or 25 hour day) still counts as one.
export function daysBetween(fromIsoDate, toIsoDate) {
  return Math.round((dateFromIso(toIsoDate) - dateFromIso(fromIsoDate)) / 86_400_000)
}

export function formatDate(isoDate) {
  return dateFromIso(isoDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Consecutive days with at least one solve, ending today. A streak that ended
// yesterday still counts, so it doesn't reset before you've had a chance today.
export function streakFrom(solvedDates) {
  let offset = solvedDates.has(localDate(0)) ? 0 : -1
  let streak = 0
  while (solvedDates.has(localDate(offset))) {
    streak++
    offset--
  }
  return streak
}
