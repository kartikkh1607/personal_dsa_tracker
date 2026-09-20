import { sanitizeSyncedEntry } from '../storage.js'
import { pullRows, pushRows } from './cloud.js'
import { mergeProgress } from './merge.js'

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
    remote: rows.map((row) => ({ ...row, data: sanitizeSyncedEntry(row.data) })),
    questionIds,
    // Entries old enough to have no stamp on either side get this one, so the
    // version this round settled on is the version the next round starts from.
    now: new Date().toISOString(),
  })

  if (merged.push.length > 0) await pushRows(client, userId, merged.push)

  // Rows this round pushed are stamped by the server after this cursor, so the
  // next pull sees them come back. They merge to what is already here, which
  // costs one request and keeps the cursor honest about what has been read.
  return { ...merged, cursor: merged.cursor ?? cursor ?? null }
}
