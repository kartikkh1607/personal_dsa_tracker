import { MAX_NOTE_IMAGES } from '../images.js'
import { MAX_HISTORY } from '../review.js'

// Merging one device's progress with the cloud copy.
//
// Two clocks are in play and they do different jobs:
//
//   data.updatedAt   the device's own clock, stamped when the entry changed.
//                    Only ever used to decide which of two versions is newer.
//   updated_at       the server's clock, set by a trigger on every write.
//                    Only ever used as the pull cursor. A device with a wrong
//                    clock can therefore misorder its own edits, but it can
//                    never hide its rows from another device's next pull.
//
// Entries written before sync existed have no updatedAt at all, so there is
// nothing to order them by. Rather than picking a winner and quietly dropping
// the other side, those are unioned field by field: the result keeps whatever
// work either device had. Once both sides carry an updatedAt - which happens
// the moment an entry is touched - ordering is plain last-write-wins, so
// un-ticking and clearing propagate properly.

// Later of two ISO timestamps, either of which may be missing.
function newer(a, b) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function isoOf(value) {
  return typeof value === 'string' && value !== '' ? value : null
}

// The date part of an ISO timestamp or a plain YYYY-MM-DD, for comparing the
// day-granularity fields the app stores.
function earlierDate(a, b) {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

function laterDate(a, b) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function mergeHistory(a = [], b = []) {
  const seen = new Map()
  for (const item of [...a, ...b]) {
    if (!item || typeof item !== 'object') continue
    seen.set(`${item.date}|${item.result}`, item)
  }
  return [...seen.values()].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0)).slice(-MAX_HISTORY)
}

// The review count as the history implies it, replaying the rules recordReview
// applies live: a struggle drops the count to zero, and the 'got' that clears
// the resulting lapse re-earns the 7-day rung rather than climbing one.
function reviewsFrom(history) {
  let reviews = 0
  let lapsed = false
  for (const item of history) {
    if (item.result === 'struggled') {
      reviews = 0
      lapsed = true
      continue
    }
    if (!lapsed) reviews++
    lapsed = false
  }
  return reviews
}

// Keeps whatever either side had. Used only when at least one side predates
// sync, so there is no honest way to say which is newer.
//
// `now` is this device's clock, and stamps the result when neither side had a
// stamp to inherit. The union is a new version - this device made it, just now
// - and saying so is what settles the entry: without a stamp the same two
// sides would be unioned and pushed again on every round, for ever.
export function unionEntries(a = {}, b = {}, now = null) {
  const entry = {}

  if (a.solved === true || b.solved === true) entry.solved = true
  if (entry.solved) {
    // The earliest solve is when the work actually happened.
    const solvedAt = earlierDate(a.solvedAt, b.solvedAt)
    if (solvedAt) entry.solvedAt = solvedAt

    const history = mergeHistory(a.history, b.history)
    if (history.length > 0) {
      entry.history = history
      // reviews and reviewedAt are a running total of the history, so they are
      // replayed from the merged list rather than taken as the larger of the
      // two. Taking the larger resurrects a count a lapse had cleared: a device
      // that struggled, putting the count back to zero, merged with one that
      // had climbed to three would keep three - and the problem would then sit
      // past the last of REVIEW_INTERVALS and never come up for review again.
      // Replaying can only err towards reviewing something an extra time,
      // which is the side of the trade worth landing on.
      const reviews = reviewsFrom(history)
      if (reviews > 0) entry.reviews = reviews
      entry.reviewedAt = history[history.length - 1].date
    } else {
      // Nothing to replay. An entry from before reviews kept a history carries
      // only the totals, so those are all there is to go on.
      const reviewedAt = laterDate(a.reviewedAt, b.reviewedAt)
      if (reviewedAt) entry.reviewedAt = reviewedAt
      const reviews = Math.max(a.reviews ?? 0, b.reviews ?? 0)
      if (reviews > 0) entry.reviews = reviews
    }
  }

  if (a.bookmarked === true || b.bookmarked === true) entry.bookmarked = true

  // The longer note is the one with more work in it. Ties keep the local side,
  // which is the one the user is looking at.
  const notes = (b.notes ?? '').length > (a.notes ?? '').length ? b.notes : a.notes
  if (notes) entry.notes = notes

  const link = a.link ?? b.link
  if (link) entry.link = link

  const images = [...new Set([...(a.images ?? []), ...(b.images ?? [])])].slice(0, MAX_NOTE_IMAGES)
  if (images.length > 0) entry.images = images

  const updatedAt = newer(isoOf(a.updatedAt), isoOf(b.updatedAt)) ?? now
  if (updatedAt) entry.updatedAt = updatedAt

  return entry
}

// Which version of one entry to keep, and where it came from.
// Returns { entry, source } where source is 'local', 'cloud' or 'merged'.
function pickEntry(localEntry, remoteEntry, now) {
  if (!localEntry) return { entry: remoteEntry, source: 'cloud' }
  if (!remoteEntry) return { entry: localEntry, source: 'local' }

  const localAt = isoOf(localEntry.updatedAt)
  const remoteAt = isoOf(remoteEntry.updatedAt)

  // Steady state: both sides know when they changed, so the later one wins.
  // An exact tie keeps the cloud copy, which makes every device converge on
  // the same value rather than each keeping its own.
  if (localAt && remoteAt) {
    if (localAt > remoteAt) return { entry: localEntry, source: 'local' }
    return { entry: remoteEntry, source: 'cloud' }
  }

  return { entry: unionEntries(localEntry, remoteEntry, now), source: 'merged' }
}

// A remote row as the app sees it. Rows that are malformed, or belong to a
// question this build doesn't have, are ignored rather than trusted.
export function entryFromRow(row, questionIds) {
  const id = String(row?.question_id ?? '')
  if (id === '' || (questionIds && !questionIds.has(id))) return null
  if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) return null
  return {
    id,
    entry: row.data,
    deletedAt: isoOf(row.deleted_at),
    // The server's clock, carried through only so the caller can advance its
    // pull cursor. It never takes part in choosing a winner.
    serverAt: isoOf(row.updated_at),
  }
}

export function rowFromEntry(id, entry, deletedAt = null) {
  return { question_id: Number(id), data: entry ?? {}, deleted_at: deletedAt }
}

// The tombstone's own clock, i.e. when the delete happened on some device.
function tombstoneTime(entry, deletedAt) {
  return isoOf(entry?.updatedAt) ?? deletedAt
}

/**
 * Merges local progress with rows pulled from the cloud.
 *
 * local      { [id]: entry }      progress as stored in this browser
 * tombstones { [id]: isoString }  entries deleted here, not yet confirmed
 * remote     [row]                rows from the progress table
 * questionIds Set<string>         ids this build knows about (optional)
 * now        isoString            this device's clock, to stamp a union with
 *
 * Returns the merged progress, the merged tombstones, the rows this device
 * should push, the new pull cursor, and a summary for the UI.
 */
export function mergeProgress({ local = {}, tombstones = {}, remote = [], questionIds = null, now = null } = {}) {
  const rows = new Map()
  let cursor = null
  for (const raw of remote) {
    const row = entryFromRow(raw, questionIds)
    if (!row) continue
    cursor = newer(cursor, row.serverAt)
    rows.set(row.id, row)
  }

  const ids = new Set([...Object.keys(local), ...Object.keys(tombstones), ...rows.keys()])

  const progress = {}
  const nextTombstones = {}
  const push = []
  const stats = { fromLocal: 0, fromCloud: 0, merged: 0, deleted: 0 }

  for (const id of ids) {
    const localEntry = local[id] ?? null
    const localTomb = isoOf(tombstones[id])
    const row = rows.get(id) ?? null
    const remoteEntry = row && !row.deletedAt ? row.entry : null
    const remoteTomb = row?.deletedAt ? tombstoneTime(row.entry, row.deletedAt) : null

    // Deletions are just another version of the entry, competing on the same
    // clock. A tombstone only wins against a change older than itself.
    const liveAt = isoOf(localEntry?.updatedAt) ?? isoOf(remoteEntry?.updatedAt)
    const tombAt = newer(localTomb, remoteTomb)

    if (tombAt && (!liveAt || tombAt >= liveAt)) {
      nextTombstones[id] = tombAt
      stats.deleted++
      // Tell the cloud about a deletion it hasn't got, or one it has older.
      if (!row?.deletedAt || (localTomb && remoteTomb && localTomb > remoteTomb)) {
        push.push(rowFromEntry(id, { updatedAt: tombAt }, tombAt))
      }
      continue
    }

    const { entry, source } = pickEntry(localEntry, remoteEntry, now)
    if (!entry || Object.keys(entry).length === 0) continue

    progress[id] = entry
    if (source === 'local') stats.fromLocal++
    else if (source === 'cloud') stats.fromCloud++
    else stats.merged++

    // Push anything the cloud doesn't already have in this exact form.
    if (source !== 'cloud') push.push(rowFromEntry(id, entry))
  }

  return { progress, tombstones: nextTombstones, push, cursor, stats }
}

// "Merged 84 local + 12 cloud entries", for the toast after a first sign-in.
export function mergeSummary(stats) {
  const parts = []
  if (stats.fromLocal > 0) parts.push(`${stats.fromLocal} local`)
  if (stats.fromCloud > 0) parts.push(`${stats.fromCloud} cloud`)
  if (stats.merged > 0) parts.push(`${stats.merged} combined`)
  if (parts.length === 0) return 'Nothing to merge'
  return `Merged ${parts.join(' + ')} ${stats.fromLocal + stats.fromCloud + stats.merged === 1 ? 'entry' : 'entries'}`
}
