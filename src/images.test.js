import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelImageDeletion, findOrphans, ORPHAN_MIN_AGE_MS, scheduleImageDeletion, UNDO_GRACE_MS } from './images.js'

// What actually reached the store, so a test can ask whether the bytes went.
// idb-keyval is stubbed rather than driven: there is no IndexedDB here, and the
// question these ask is when a delete is issued, not what the database does.
const deleted = []
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  del: (id) => {
    deleted.push([id])
    return Promise.resolve()
  },
  delMany: (ids) => {
    deleted.push([...ids])
    return Promise.resolve()
  },
  entries: () => Promise.resolve([]),
  get: () => Promise.resolve(null),
  set: () => Promise.resolve(),
}))

beforeEach(() => {
  deleted.length = 0
})

const NOW = 1_800_000_000_000
const OLD = NOW - ORPHAN_MIN_AGE_MS - 1
const FRESH = NOW - 60_000

describe('findOrphans', () => {
  it('removes only unreferenced images older than the grace period', () => {
    const records = [
      ['img_oldorphan', { createdAt: OLD }],
      ['img_freshorphan', { createdAt: FRESH }],
      ['img_oldinuse', { createdAt: OLD }],
    ]
    expect(findOrphans(records, new Set(['img_oldinuse']), NOW)).toEqual(['img_oldorphan'])
  })

  it('keeps images whose age is unknown', () => {
    expect(findOrphans([['img_notimestamp', {}], ['img_badrecord', null]], new Set(), NOW)).toEqual([])
  })
})

// Deleting a removed image's bytes straight away would make Undo a lie: the
// entry comes back pointing at ids whose blobs are gone.
describe('deferred image deletion', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('outlives the undo toast before anything is deleted', () => {
    scheduleImageDeletion(['img_aaaaaa'])
    // The toast with an action stays up for 6s, so nothing may go before then.
    vi.advanceTimersByTime(6_000)
    expect(deleted).toEqual([])

    vi.advanceTimersByTime(UNDO_GRACE_MS)
    expect(deleted).toEqual([['img_aaaaaa']])
  })

  it('cancelling keeps the bytes, which is what Undo depends on', () => {
    scheduleImageDeletion(['img_aaaaaa', 'img_bbbbbb'])
    cancelImageDeletion(['img_aaaaaa', 'img_bbbbbb'])

    vi.advanceTimersByTime(UNDO_GRACE_MS * 2)
    expect(deleted).toEqual([])
  })

  it('only spares the images the restored entry still refers to', () => {
    scheduleImageDeletion(['img_aaaaaa', 'img_bbbbbb'])
    // An entry restored with one of its two images.
    cancelImageDeletion(['img_aaaaaa'])

    vi.advanceTimersByTime(UNDO_GRACE_MS * 2)
    expect(deleted).toEqual([['img_bbbbbb']])
  })

  it('shrugs at ids it was never asked to delete', () => {
    expect(() => cancelImageDeletion(['img_zzzzzz'])).not.toThrow()
    expect(() => cancelImageDeletion(undefined)).not.toThrow()
    expect(() => scheduleImageDeletion(undefined)).not.toThrow()
  })

  it('re-scheduling the same id does not delete it twice', () => {
    scheduleImageDeletion(['img_aaaaaa'])
    scheduleImageDeletion(['img_aaaaaa'])

    vi.advanceTimersByTime(UNDO_GRACE_MS * 2)
    expect(deleted).toEqual([['img_aaaaaa']])
  })
})
