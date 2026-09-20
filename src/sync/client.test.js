import { describe, expect, it } from 'vitest'
import { getClient, SYNC_CONFIGURED } from './client.js'

describe('the sync client', () => {
  it('stays off, and builds nothing, when no project is configured', () => {
    // Sync is an extra, not a dependency: with no project configured the app is
    // the local-only one it has always been. This is also what pins the test
    // suite to that build rather than to whoever's .env.local is lying around.
    expect(SYNC_CONFIGURED).toBe(false)
    expect(getClient()).toBeNull()
  })
})
