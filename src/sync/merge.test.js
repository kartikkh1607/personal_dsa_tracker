import { describe, expect, it } from 'vitest'
import { isLapsed, nextReviewDate } from '../review.js'
import { entryFromRow, mergeProgress, mergeSummary, mergeWasTwoSided, unionEntries } from './merge.js'

const IDS = new Set(['1', '2', '3', '4', '5'])

// Server timestamps are deliberately unrelated to the client ones, so any test
// that passes by accident because they agree would show up as a failure here.
const row = (id, entry, { deleted = null, serverAt = '2030-01-01T00:00:00.000Z' } = {}) => ({
  question_id: Number(id),
  data: entry,
  deleted_at: deleted,
  updated_at: serverAt,
})

const at = (iso) => `2026-09-${iso}T12:00:00.000Z`

describe('mergeProgress: one side only', () => {
  it('takes cloud entries the device has never seen', () => {
    const result = mergeProgress({ local: {}, remote: [row(1, { solved: true, updatedAt: at('10') })], questionIds: IDS })
    expect(result.progress).toEqual({ 1: { solved: true, updatedAt: at('10') } })
    expect(result.stats).toMatchObject({ fromCloud: 1, fromLocal: 0 })
    expect(result.push).toEqual([])
  })

  it('pushes local entries the cloud has never seen', () => {
    const result = mergeProgress({ local: { 1: { solved: true, updatedAt: at('10') } }, remote: [], questionIds: IDS })
    expect(result.progress).toEqual({ 1: { solved: true, updatedAt: at('10') } })
    expect(result.stats).toMatchObject({ fromLocal: 1, fromCloud: 0 })
    expect(result.push).toEqual([{ question_id: 1, data: { solved: true, updatedAt: at('10') }, deleted_at: null }])
  })
})

describe('mergeProgress: conflicts', () => {
  it('keeps the later edit when local is newer, and pushes it', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, reviews: 2, updatedAt: at('20') } },
      remote: [row(1, { solved: true, reviews: 1, updatedAt: at('10') })],
      questionIds: IDS,
    })
    expect(result.progress[1].reviews).toBe(2)
    expect(result.stats.fromLocal).toBe(1)
    expect(result.push).toHaveLength(1)
  })

  it('keeps the later edit when the cloud is newer, and pushes nothing', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, reviews: 1, updatedAt: at('10') } },
      remote: [row(1, { solved: true, reviews: 3, updatedAt: at('20') })],
      questionIds: IDS,
    })
    expect(result.progress[1].reviews).toBe(3)
    expect(result.stats.fromCloud).toBe(1)
    expect(result.push).toEqual([])
  })

  it('settles an exact tie on the cloud copy, so every device converges', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, notes: 'mine', updatedAt: at('10') } },
      remote: [row(1, { solved: true, notes: 'theirs', updatedAt: at('10') })],
      questionIds: IDS,
    })
    expect(result.progress[1].notes).toBe('theirs')
    expect(result.push).toEqual([])
  })

  it('un-ticking on one device beats an older solve on another', () => {
    // Device A cleared the entry at the 20th; device B's solve is from the 10th.
    const result = mergeProgress({
      local: { 1: { solved: true, updatedAt: at('10') } },
      remote: [row(1, { updatedAt: at('20') }, { deleted: at('20') })],
      questionIds: IDS,
    })
    expect(result.progress[1]).toBeUndefined()
    expect(result.tombstones[1]).toBe(at('20'))
    expect(result.stats.deleted).toBe(1)
  })

  it('a newer re-solve beats an older deletion, and comes back', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, updatedAt: at('25') } },
      remote: [row(1, { updatedAt: at('20') }, { deleted: at('20') })],
      questionIds: IDS,
    })
    expect(result.progress[1]).toEqual({ solved: true, updatedAt: at('25') })
    expect(result.tombstones[1]).toBeUndefined()
    expect(result.push).toHaveLength(1)
  })
})

describe('mergeProgress: tombstones', () => {
  it('pushes a local deletion the cloud has not got', () => {
    const result = mergeProgress({
      local: {},
      tombstones: { 1: at('20') },
      remote: [row(1, { solved: true, updatedAt: at('10') })],
      questionIds: IDS,
    })
    expect(result.progress[1]).toBeUndefined()
    expect(result.push).toEqual([{ question_id: 1, data: { updatedAt: at('20') }, deleted_at: at('20') }])
  })

  it('does not re-push a deletion the cloud already agrees with', () => {
    const result = mergeProgress({
      local: {},
      tombstones: { 1: at('20') },
      remote: [row(1, { updatedAt: at('20') }, { deleted: at('20') })],
      questionIds: IDS,
    })
    expect(result.push).toEqual([])
    expect(result.tombstones[1]).toBe(at('20'))
  })

  it('keeps a deletion that no longer has a row, so it cannot resurrect', () => {
    const result = mergeProgress({ local: {}, tombstones: { 1: at('20') }, remote: [], questionIds: IDS })
    expect(result.tombstones[1]).toBe(at('20'))
    expect(result.push).toHaveLength(1)
  })
})

describe('mergeProgress: first sign-in with pre-sync entries', () => {
  // Entries written before sync existed carry no updatedAt, so there is no
  // honest way to order them. Nothing may be dropped.
  it('unions two undated versions instead of picking one', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, solvedAt: '2026-09-01', notes: 'my longer note about it' } },
      remote: [row(1, { solved: true, solvedAt: '2026-08-01', bookmarked: true, notes: 'short' })],
      questionIds: IDS,
    })
    expect(result.progress[1]).toEqual({
      solved: true,
      solvedAt: '2026-08-01', // the earliest solve is when the work happened
      bookmarked: true, // kept from the cloud
      notes: 'my longer note about it', // the fuller note survives
    })
    expect(result.stats.merged).toBe(1)
    expect(result.push).toHaveLength(1)
  })

  it('unions when only one side predates sync', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, reviews: 1 } },
      remote: [row(1, { solved: true, bookmarked: true, updatedAt: at('10') })],
      questionIds: IDS,
    })
    expect(result.progress[1]).toMatchObject({ solved: true, reviews: 1, bookmarked: true })
    expect(result.stats.merged).toBe(1)
  })

  it('merges review history from both devices without duplicating it', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, solvedAt: '2026-08-01', history: [{ date: '2026-08-08', result: 'got' }, { date: '2026-09-01', result: 'struggled' }] } },
      remote: [row(1, { solved: true, solvedAt: '2026-08-01', history: [{ date: '2026-08-08', result: 'got' }, { date: '2026-09-05', result: 'got' }] })],
      questionIds: IDS,
    })
    expect(result.progress[1].history).toEqual([
      { date: '2026-08-08', result: 'got' },
      { date: '2026-09-01', result: 'struggled' },
      { date: '2026-09-05', result: 'got' },
    ])
  })

  it('handles disjoint ids by keeping everything from both sides', () => {
    const result = mergeProgress({
      local: { 1: { solved: true }, 2: { bookmarked: true } },
      remote: [row(3, { solved: true }), row(4, { notes: 'x' })],
      questionIds: IDS,
    })
    expect(Object.keys(result.progress).sort()).toEqual(['1', '2', '3', '4'])
    expect(result.stats).toMatchObject({ fromLocal: 2, fromCloud: 2, merged: 0 })
  })
})

describe('mergeProgress: the pull cursor', () => {
  it('advances to the latest server timestamp, never a client one', () => {
    const result = mergeProgress({
      local: {},
      remote: [
        row(1, { solved: true, updatedAt: at('28') }, { serverAt: '2026-01-01T00:00:00.000Z' }),
        row(2, { solved: true, updatedAt: at('01') }, { serverAt: '2026-06-01T00:00:00.000Z' }),
      ],
      questionIds: IDS,
    })
    // The newest server time wins even though row 1's client clock is later.
    expect(result.cursor).toBe('2026-06-01T00:00:00.000Z')
  })

  it('a device an hour behind still has its rows pulled by the other one', () => {
    // Device B's clock is an hour slow, so its client updatedAt looks older
    // than an edit device A made before it. The server stamped it later, and
    // that is what the cursor follows, so device A still sees the row.
    const slowClient = '2026-09-20T11:00:00.000Z'
    const result = mergeProgress({
      local: { 1: { solved: true, updatedAt: '2026-09-20T11:30:00.000Z' } },
      remote: [row(1, { solved: true, reviews: 1, updatedAt: slowClient }, { serverAt: '2026-09-20T12:45:00.000Z' })],
      questionIds: IDS,
    })
    // The row was pulled and considered...
    expect(result.cursor).toBe('2026-09-20T12:45:00.000Z')
    // ...and lost on its own clock, which is the intended trade-off: a skewed
    // clock can misorder an edit, but it can never hide a row from a pull.
    expect(result.progress[1].reviews).toBeUndefined()
    expect(result.push).toHaveLength(1)
  })

  it('has no cursor when nothing came back', () => {
    expect(mergeProgress({ local: { 1: { solved: true } }, remote: [], questionIds: IDS }).cursor).toBeNull()
  })
})

describe('mergeProgress: malformed rows', () => {
  it('ignores rows that are not usable', () => {
    const result = mergeProgress({
      local: {},
      remote: [
        { question_id: 1, data: null, updated_at: at('10') },
        { question_id: 2, data: 'nope', updated_at: at('10') },
        { question_id: 3, data: [1, 2], updated_at: at('10') },
        { data: { solved: true }, updated_at: at('10') },
        row(4, { solved: true, updatedAt: at('10') }),
      ],
      questionIds: IDS,
    })
    expect(Object.keys(result.progress)).toEqual(['4'])
  })

  it('ignores rows for questions this build does not have', () => {
    const result = mergeProgress({ local: {}, remote: [row(9999, { solved: true, updatedAt: at('10') })], questionIds: IDS })
    expect(result.progress).toEqual({})
  })

  it('keeps every row when no id list is supplied', () => {
    const result = mergeProgress({ local: {}, remote: [row(9999, { solved: true, updatedAt: at('10') })] })
    expect(result.progress['9999']).toBeDefined()
  })

  it('drops an entry that merges down to nothing', () => {
    const result = mergeProgress({ local: { 1: {} }, remote: [row(1, {})], questionIds: IDS })
    expect(result.progress).toEqual({})
  })
})

describe('entryFromRow', () => {
  it('separates the server clock from the entry', () => {
    const parsed = entryFromRow(row(1, { solved: true, updatedAt: at('10') }, { serverAt: '2027-01-01T00:00:00.000Z' }), IDS)
    expect(parsed).toEqual({
      id: '1',
      entry: { solved: true, updatedAt: at('10') },
      deletedAt: null,
      serverAt: '2027-01-01T00:00:00.000Z',
    })
  })
})

describe('unionEntries', () => {
  it('drops review fields when neither side solved the problem', () => {
    expect(unionEntries({ bookmarked: true, reviews: 3 }, { notes: 'hm' })).toEqual({ bookmarked: true, notes: 'hm' })
  })

  it('takes the highest review count and the latest review date when neither side kept a history', () => {
    const merged = unionEntries(
      { solved: true, solvedAt: '2026-08-01', reviews: 1, reviewedAt: '2026-08-08' },
      { solved: true, solvedAt: '2026-08-01', reviews: 3, reviewedAt: '2026-09-20' },
    )
    expect(merged).toMatchObject({ reviews: 3, reviewedAt: '2026-09-20' })
  })

  it('replays a lapse rather than resurrecting the count the other side still had', () => {
    // This device failed the re-solve, which sends the problem back to the
    // 3-day relearn step and clears the count. The cloud copy predates that
    // failure and still has all three rungs. Keeping the larger count is what
    // hurts: nothing is due past the last interval, so clearing the relearn
    // step would retire the problem from review instead of restarting it.
    const merged = unionEntries(
      { solved: true, solvedAt: '2026-08-01', history: [{ date: '2026-09-18', result: 'struggled' }] },
      {
        solved: true,
        solvedAt: '2026-08-01',
        reviews: 3,
        reviewedAt: '2026-09-10',
        history: [
          { date: '2026-08-08', result: 'got' },
          { date: '2026-09-01', result: 'got' },
          { date: '2026-09-10', result: 'got' },
        ],
      },
    )
    expect(merged.reviews).toBeUndefined()
    expect(merged.reviewedAt).toBe('2026-09-18')
    expect(isLapsed(merged)).toBe(true)
    expect(nextReviewDate(merged)).toBe('2026-09-21')
  })

  it('re-earns the 7-day rung once the relearn step has been cleared', () => {
    // The same lapse, this time already recovered on one side. Clearing a lapse
    // is not a rung climbed, so the sequence resumes at 7 days, not 30.
    const merged = unionEntries(
      {
        solved: true,
        solvedAt: '2026-08-01',
        history: [
          { date: '2026-09-18', result: 'struggled' },
          { date: '2026-09-20', result: 'got' },
        ],
      },
      { solved: true, solvedAt: '2026-08-01', reviews: 2, reviewedAt: '2026-09-10', history: [{ date: '2026-09-10', result: 'got' }] },
    )
    expect(merged.reviews).toBeUndefined()
    expect(merged.reviewedAt).toBe('2026-09-20')
    expect(isLapsed(merged)).toBe(false)
    expect(nextReviewDate(merged)).toBe('2026-09-27')
  })

  it('counts the rungs climbed since the last lapse', () => {
    const merged = unionEntries(
      {
        solved: true,
        solvedAt: '2026-08-01',
        history: [
          { date: '2026-08-08', result: 'got' },
          { date: '2026-08-20', result: 'struggled' },
        ],
      },
      {
        solved: true,
        solvedAt: '2026-08-01',
        history: [
          { date: '2026-08-23', result: 'got' },
          { date: '2026-09-01', result: 'got' },
          { date: '2026-10-01', result: 'got' },
        ],
      },
    )
    // got, struggled, got (clears the lapse), got, got -> two rungs.
    expect(merged.reviews).toBe(2)
    expect(merged.reviewedAt).toBe('2026-10-01')
  })

  it('stamps a union that had no stamp to inherit, and only then', () => {
    const clock = '2026-09-20T10:00:00.000Z'
    // Two entries from before sync existed: the merged version is this
    // device's, made now, and says so.
    expect(unionEntries({ solved: true }, { bookmarked: true }, clock).updatedAt).toBe(clock)
    // A stamp either side already had still wins - the clock is the fallback,
    // not a way to make this device's copy look newest.
    expect(unionEntries({ solved: true, updatedAt: at('10') }, { bookmarked: true }, clock).updatedAt).toBe(at('10'))
  })

  it('keeps the newest updatedAt it can find', () => {
    expect(unionEntries({ solved: true, updatedAt: at('10') }, { solved: true, updatedAt: at('20') }).updatedAt).toBe(at('20'))
  })

  it('unions note images up to the cap', () => {
    const merged = unionEntries({ images: ['img_aaa111bbb'] }, { images: ['img_aaa111bbb', 'img_ccc222ddd'] })
    expect(merged.images).toEqual(['img_aaa111bbb', 'img_ccc222ddd'])
  })
})

describe('mergeSummary', () => {
  const stats = (counts) => ({ fromLocal: 0, fromCloud: 0, merged: 0, deleted: 0, localOnly: 0, cloudOnly: 0, collided: 0, ...counts })

  it('counts what changed, not everything the merge touched', () => {
    // Eight entries after the merge, seven of which both sides already agreed on.
    expect(mergeSummary(stats({ fromLocal: 1, fromCloud: 7, localOnly: 1 }))).toBe('1 change from this device merged in')
    expect(mergeSummary(stats({ localOnly: 3 }))).toBe('3 changes from this device merged in')
    expect(mergeSummary(stats({ cloudOnly: 1 }))).toBe('1 change from your account merged in')
  })

  it('splits the changes by side when both contributed', () => {
    expect(mergeSummary(stats({ localOnly: 1, cloudOnly: 1 }))).toBe('2 changes merged: 1 from this device, 1 from your account')
  })

  it('reports conflicts separately', () => {
    expect(mergeSummary(stats({ collided: 1 }))).toBe('1 conflict resolved by most recent')
    expect(mergeSummary(stats({ localOnly: 1, collided: 2 }))).toBe('1 change from this device merged in · 2 conflicts resolved by most recent')
    // Pre-sync copies with no stamp to compare are combined rather than picked.
    expect(mergeSummary(stats({ collided: 2, merged: 1 }))).toBe('1 conflict resolved by most recent · 1 conflict resolved by keeping both')
  })

  it('has nothing to say when nothing changed', () => {
    expect(mergeSummary(stats({ fromCloud: 7 }))).toBeNull()
  })

  it('reads the counts off a real merge', () => {
    const result = mergeProgress({
      local: { 1: { solved: true, updatedAt: at('10') }, 2: { solved: true, updatedAt: at('11') }, 3: { bookmarked: true, updatedAt: at('10') } },
      remote: [row(2, { solved: true, notes: 'x', updatedAt: at('12') }), row(3, { bookmarked: true, updatedAt: at('10') }), row(4, { solved: true, updatedAt: at('10') })],
      questionIds: IDS,
    })
    expect(result.stats).toMatchObject({ localOnly: 1, cloudOnly: 1, collided: 1 })
    expect(mergeSummary(result.stats)).toBe('2 changes merged: 1 from this device, 1 from your account · 1 conflict resolved by most recent')
  })
})

describe('mergeWasTwoSided', () => {
  it('is false for a plain pull, and for a copy both sides already agree on', () => {
    const pull = mergeProgress({ local: {}, remote: [row(1, { solved: true, updatedAt: at('10') })], questionIds: IDS })
    expect(mergeWasTwoSided(pull.stats)).toBe(false)
    const same = mergeProgress({ local: { 1: { solved: true, updatedAt: at('10') } }, remote: [row(1, { solved: true, updatedAt: at('10') })], questionIds: IDS })
    expect(mergeWasTwoSided(same.stats)).toBe(false)
  })

  it('is true when this device had something new, or both sides had a different version', () => {
    const localOnly = mergeProgress({ local: { 1: { solved: true, updatedAt: at('10') } }, remote: [], questionIds: IDS })
    expect(mergeWasTwoSided(localOnly.stats)).toBe(true)
    const cloudWon = mergeProgress({ local: { 1: { solved: true, updatedAt: at('10') } }, remote: [row(1, { solved: false, updatedAt: at('11') })], questionIds: IDS })
    expect(mergeWasTwoSided(cloudWon.stats)).toBe(true)
    const unstamped = mergeProgress({ local: { 1: { solved: true } }, remote: [row(1, { bookmarked: true })], questionIds: IDS })
    expect(mergeWasTwoSided(unstamped.stats)).toBe(true)
  })
})
