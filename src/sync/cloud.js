// The two things this app asks of the progress table: everything that changed
// since last time, and here are my changes.
//
// Neither call filters by user beyond the index hint: row level security does
// that, and a policy the client cannot forget to apply is the point of it.

const TABLE = 'progress'
const COLUMNS = 'question_id, data, updated_at, deleted_at'

// A full sheet is under a thousand rows, so paging is really only insurance
// against a first pull on an account that has been used for a long time.
export const PAGE_SIZE = 500
// Upserts go in batches so one slow request can't carry the whole sheet.
export const CHUNK_SIZE = 200

// Rows changed after `since`, oldest first. A null cursor pulls everything.
export async function pullRows(client, userId, since) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client
      .from(TABLE)
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .order('question_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (since) query = query.gt('updated_at', since)

    const { data, error } = await query
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}

// user_id is stamped here rather than by the caller: it has to match the
// session for the insert policy to accept the row, so there is one right
// answer and no reason to let anything else supply it.
export async function pushRows(client, userId, rows) {
  for (let from = 0; from < rows.length; from += CHUNK_SIZE) {
    const chunk = rows.slice(from, from + CHUNK_SIZE).map((row) => ({ ...row, user_id: userId }))
    const { error } = await client.from(TABLE).upsert(chunk, { onConflict: 'user_id,question_id' })
    if (error) throw error
  }
}
