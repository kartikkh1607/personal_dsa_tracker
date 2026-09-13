// Saved progress is a plain { [id]: entry } map, where an entry holds only what
// the user has set: { solved, solvedAt, bookmarked, notes, link }. Problems with
// no progress have no entry, so the static question list is never copied.

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

// Local calendar date as YYYY-MM-DD, offset by whole days (-1 = yesterday).
export function localDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
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
