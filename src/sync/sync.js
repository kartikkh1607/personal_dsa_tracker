import { MERGED_IDS, mergeDuplicateEntries, sanitizeSyncedEntry } from '../storage.js'
import { pullRows, pushRows } from './cloud.js'
import { mergeProgress, rowFromEntry } from './merge.js'

// Two rows that turned out to be the same problem, combined. `newer` is the
// row that was pulled later, i.e. the one the server stamped last.
function combineRows(older, newer) {
  const updatedAt = newer.updated_at ?? older.updated_at
  // A deletion is a version of the entry like any other, so it only stands
  // when it is the newer of the two.
  if (older.deleted_at || newer.deleted_at) return { ...newer, updated_at: updatedAt }
  return { ...newer, updated_at: updatedAt, data: mergeDuplicateEntries(newer.data, older.data) }
}

/**
 * Rewrites rows the cloud still holds under an id this build has merged away.
 *
 * Another device on an older build keeps writing the duplicate's id, and a
 * fresh install pulls the account's whole history, so without this the work
 * saved against the removed row would be dropped on arrival and lost.
 *
 * A tombstone under a removed id is dropped rather than followed: it was aimed
 * at a row that no longer exists, and letting it through would delete the row
 * that was kept. Re-deleting is a click; the progress isn't recoverable.
 */
// The kept ids that the fold below wrote something to. Their entries are in
// the cloud under an id the sheet no longer has, so they have to be pushed
// back under the id that was kept - otherwise the cloud never converges and
// every device goes on folding the same rows for ever.
export function movedRowIds(rows, mergedIds = MERGED_IDS) {
  const ids = new Set()
  for (const row of rows) {
    const mergedInto = mergedIds[String(row?.question_id)]
    if (mergedInto !== undefined && !row.deleted_at) ids.add(String(mergedInto))
  }
  return ids
}

export function foldRemovedIdRows(rows, mergedIds = MERGED_IDS) {
  if (!rows.some((row) => Object.hasOwn(mergedIds, String(row?.question_id)))) return rows

  const folded = []
  const indexById = new Map()
  for (const row of rows) {
    const id = String(row?.question_id ?? '')
    const mergedInto = mergedIds[id]
    if (mergedInto !== undefined && row.deleted_at) continue
    const key = mergedInto === undefined ? id : String(mergedInto)
    const moved = mergedInto === undefined ? row : { ...row, question_id: mergedInto }

    const index = indexById.get(key)
    if (index === undefined) {
      indexById.set(key, folded.length)
      folded.push(moved)
    } else {
      folded[index] = combineRows(folded[index], moved)
    }
  }
  return folded
}

// One round of sync: pull what changed, merge it into what this device has,
// push back whatever the cloud is missing.
//
// Kept apart from React so the interesting half can be tested against a fake
// client instead of a real project. The hook above it only decides when to
// call this and what to do with the result.
export async function syncOnce({ client, userId, progress, tombstones, cursor, questionIds }) {
  const rows = await pullRows(client, userId, cursor)

  const merged = mergeProgress({
    local: progress,
    tombstones,
    // Rows have been outside this browser, so they are sanitised on the way in
    // exactly like an imported file. A row that survives nothing is left as an
    // empty entry, which merges to nothing and is dropped.
    remote: foldRemovedIdRows(rows.map((row) => ({ ...row, data: sanitizeSyncedEntry(row.data) }))),
    questionIds,
    // Entries old enough to have no stamp on either side get this one, so the
    // version this round settled on is the version the next round starts from.
    now: new Date().toISOString(),
  })

  const push = [...merged.push]
  const pushed = new Set(push.map((row) => String(row.question_id)))
  for (const id of movedRowIds(rows)) {
    if (!pushed.has(id) && merged.progress[id]) push.push(rowFromEntry(id, merged.progress[id]))
  }

  if (push.length > 0) await pushRows(client, userId, push)

  // Rows this round pushed are stamped by the server after this cursor, so the
  // next pull sees them come back. They merge to what is already here, which
  // costs one request and keeps the cursor honest about what has been read.
  return { ...merged, push, cursor: merged.cursor ?? cursor ?? null }
}
