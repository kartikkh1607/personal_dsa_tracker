import { describe, expect, it } from 'vitest'
import { CHUNK_SIZE, PAGE_SIZE } from './cloud.js'
import { syncOnce } from './sync.js'

const IDS = new Set(['1', '2', '3', '4', '5'])
const USER = '00000000-0000-4000-8000-000000000001'

const at = (day) => `2026-09-${day}T12:00:00.000Z`
const serverAt = (day) => `2030-01-${day}T00:00:00.000Z`

const row = (id, entry, { deleted = null, server = serverAt('01') } = {}) => ({
  question_id: Number(id),
  data: entry,
  deleted_at: deleted,
  updated_at: server,
})

// Enough of the Supabase query builder for cloud.js: a chain that collects
// what was asked for and resolves to the rows that match it. Everything the
// real client does beyond that - auth, RLS, the network - is either the
// server's job or tested by the fact that the wrong request returns nothing.
function fakeClient({ rows = [], pullError = null, pushError = null } = {}) {
  const calls = { pulls: [], pushes: [] }

  function query(state = {}) {
    const next = (extra) => query({ ...state, ...extra })
    return {
      select: () => next({}),
      eq: (column, value) => next({ [column]: value }),
      gt: (column, value) => next({ since: value }),
      order: () => next({}),
      range: (from, to) => next({ from, to }),
      // Awaiting the chain is what runs it.
      then(resolve, reject) {
        calls.pulls.push(state)
        if (pullError) return Promise.resolve({ data: null, error: pullError }).then(resolve, reject)
        const matching = rows
          .filter((item) => !state.since || item.updated_at > state.since)
          .sort((a, b) => (a.updated_at === b.updated_at ? a.question_id - b.question_id : a.updated_at < b.updated_at ? -1 : 1))
          .slice(state.from, state.to + 1)
        return Promise.resolve({ data: matching, error: null }).then(resolve, reject)
      },
    }
  }

  return {
    calls,
    from: () => ({
      select: () => query(),
      upsert: async (batch, options) => {
        calls.pushes.push({ batch, options })
        return { error: pushError }
      },
    }),
  }
}

const run = (client, overrides = {}) =>
  syncOnce({ client, userId: USER, progress: {}, tombstones: {}, cursor: null, questionIds: IDS, ...overrides })

describe('syncOnce', () => {
  it('takes what only the cloud has and pushes what only this device has', async () => {
    const client = fakeClient({ rows: [row(2, { solved: true, updatedAt: at('10') })] })

    const result = await run(client, { progress: { 1: { bookmarked: true, updatedAt: at('11') } } })

    expect(result.progress).toEqual({
      1: { bookmarked: true, updatedAt: at('11') },
      2: { solved: true, updatedAt: at('10') },
    })
    // Only the entry the cloud was missing, and stamped with the user it
    // belongs to, which is what the insert policy checks.
    expect(client.calls.pushes).toHaveLength(1)
    expect(client.calls.pushes[0].batch).toEqual([
      { question_id: 1, data: { bookmarked: true, updatedAt: at('11') }, deleted_at: null, user_id: USER },
    ])
  })

  it('asks only for rows newer than the cursor, and moves it on', async () => {
    const client = fakeClient({
      rows: [row(1, { solved: true, updatedAt: at('01') }, { server: serverAt('02') }), row(2, { solved: true, updatedAt: at('02') }, { server: serverAt('05') })],
    })

    const result = await run(client, { cursor: serverAt('01') })

    expect(client.calls.pulls[0].since).toBe(serverAt('01'))
    expect(result.cursor).toBe(serverAt('05'))
  })

  it('keeps the cursor where it was when nothing has changed', async () => {
    const result = await run(fakeClient({ rows: [] }), { cursor: serverAt('03') })
    expect(result.cursor).toBe(serverAt('03'))
    expect(result.progress).toEqual({})
  })

  it('holds a row to the same standard as an imported file', async () => {
    // A row is only ever written by this user, but it has been outside this
    // browser. A javascript: link is the case that matters: it would run when
    // the link is clicked.
    const client = fakeClient({
      rows: [
        row(1, {
          solved: true,
          solvedAt: '2026-09-01',
          link: 'javascript:alert(1)',
          notes: 42,
          reviews: 'lots',
          updatedAt: at('10'),
        }),
      ],
    })

    const result = await run(client)

    expect(result.progress[1]).toEqual({ solved: true, solvedAt: '2026-09-01', updatedAt: at('10') })
  })

  it('pages through a first pull bigger than one page', async () => {
    const rows = Array.from({ length: PAGE_SIZE + 3 }, (_, index) =>
      row(index + 1, { solved: true, updatedAt: at('10') }, { server: serverAt('01') }),
    )
    const client = fakeClient({ rows })

    // No id list, so every row counts: this is about paging, not filtering.
    const result = await run(client, { questionIds: null })

    expect(Object.keys(result.progress)).toHaveLength(PAGE_SIZE + 3)
    expect(client.calls.pulls).toHaveLength(2)
    expect(client.calls.pulls[0]).toMatchObject({ from: 0, to: PAGE_SIZE - 1 })
    expect(client.calls.pulls[1]).toMatchObject({ from: PAGE_SIZE, to: PAGE_SIZE * 2 - 1 })
  })

  it('pushes a large first sync in batches rather than one request', async () => {
    const progress = Object.fromEntries(
      Array.from({ length: CHUNK_SIZE + 5 }, (_, index) => [String(index + 1), { solved: true, updatedAt: at('10') }]),
    )
    const client = fakeClient({ rows: [] })

    await run(client, { progress, questionIds: null })

    expect(client.calls.pushes).toHaveLength(2)
    expect(client.calls.pushes[0].batch).toHaveLength(CHUNK_SIZE)
    expect(client.calls.pushes[1].batch).toHaveLength(5)
  })

  it('settles an entry that predates sync rather than merging it every round', async () => {
    // Neither side has a stamp, so the two are unioned rather than one being
    // picked. The merged version is stamped as this device commits to it,
    // which is what stops the next round doing the same union and pushing all
    // over again - for every old entry, on every sync, for ever.
    const client = fakeClient({ rows: [row(1, { solved: true, solvedAt: '2026-08-01' })] })

    const first = await run(client, { progress: { 1: { bookmarked: true } } })

    expect(first.progress[1]).toMatchObject({ solved: true, solvedAt: '2026-08-01', bookmarked: true })
    expect(first.progress[1].updatedAt).toEqual(expect.any(String))
    expect(client.calls.pushes).toHaveLength(1)

    // The round after, starting from what that one produced, against a cloud
    // that now holds the same thing: nothing left to do.
    const settled = fakeClient({ rows: [row(1, first.progress[1])] })
    const second = await run(settled, { progress: first.progress })

    expect(second.progress[1]).toEqual(first.progress[1])
    expect(settled.calls.pushes).toHaveLength(0)
  })

  it('tells the cloud about an entry cleared here', async () => {
    const client = fakeClient({ rows: [row(1, { solved: true, updatedAt: at('10') })] })

    const result = await run(client, { tombstones: { 1: at('11') } })

    expect(result.progress[1]).toBeUndefined()
    expect(result.tombstones).toEqual({ 1: at('11') })
    expect(client.calls.pushes[0].batch).toEqual([
      { question_id: 1, data: { updatedAt: at('11') }, deleted_at: at('11'), user_id: USER },
    ])
  })

  it('leaves the deletion behind when the entry was edited after it', async () => {
    // The other device's edit is newer than this device's delete, so the entry
    // comes back rather than the tombstone winning.
    const client = fakeClient({ rows: [row(1, { solved: true, updatedAt: at('20') })] })

    const result = await run(client, { tombstones: { 1: at('11') } })

    expect(result.progress[1]).toEqual({ solved: true, updatedAt: at('20') })
    expect(result.tombstones).toEqual({})
  })

  it('reports a failed pull instead of merging against nothing', async () => {
    // Treating a failed pull as "the cloud is empty" would push this device's
    // progress over everything and call it a merge.
    const client = fakeClient({ rows: [], pullError: new Error('network down') })

    await expect(run(client, { progress: { 1: { solved: true, updatedAt: at('10') } } })).rejects.toThrow('network down')
    expect(client.calls.pushes).toHaveLength(0)
  })

  it('reports a failed push', async () => {
    const client = fakeClient({ rows: [], pushError: new Error('rejected') })
    await expect(run(client, { progress: { 1: { solved: true, updatedAt: at('10') } } })).rejects.toThrow('rejected')
  })
})
