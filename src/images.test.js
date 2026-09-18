import { describe, expect, it } from 'vitest'
import { findOrphans, ORPHAN_MIN_AGE_MS } from './images.js'

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
