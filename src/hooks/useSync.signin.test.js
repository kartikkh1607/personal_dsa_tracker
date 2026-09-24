// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pullRows, pushRows } from '../sync/cloud.js'
import { useSync } from './useSync.js'

// The network is the only thing faked: the pull hands back the account's rows
// and the real merge decides what the sign-in has to say about them.
const auth = { listener: null }
const fakeClient = {
  auth: {
    onAuthStateChange: (listener) => {
      auth.listener = listener
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    getSession: async () => ({ data: { session: null } }),
  },
}

vi.mock('../sync/client.js', () => ({
  SYNC_CONFIGURED: true,
  GOOGLE_AUTH_ENABLED: true,
  hasStoredSession: () => true,
  hasAuthCallback: () => false,
  takeAuthCallback: () => null,
  clearAuthCallbackFromUrl: () => {},
  loadClient: async () => fakeClient,
}))

vi.mock('../sync/cloud.js', () => ({ pullRows: vi.fn(), pushRows: vi.fn(async () => {}) }))

const IDS = new Set(['1', '2', '3'])
const at = (day) => `2026-09-${day}T10:00:00.000Z`
const row = (id, data) => ({ question_id: id, data, deleted_at: null, updated_at: data.updatedAt })

async function signIn({ local, cloud }) {
  pullRows.mockResolvedValue(cloud)
  const showToast = vi.fn()
  const applySynced = vi.fn()
  renderHook(() => useSync({ progress: local, tombstones: {}, questionIds: IDS, applySynced, showToast }))
  await waitFor(() => expect(auth.listener).not.toBeNull())
  act(() => auth.listener('SIGNED_IN', { user: { id: 'user-1', email: 'me@example.com' } }))
  await waitFor(() => expect(applySynced).toHaveBeenCalled())
  return showToast
}

describe('the toast after signing in', () => {
  beforeEach(() => {
    auth.listener = null
    localStorage.clear()
    pullRows.mockReset()
    pushRows.mockClear()
  })

  it('says nothing when the sign-in just pulls the account down', async () => {
    const cloud = [row(1, { solved: true, updatedAt: at('10') }), row(2, { bookmarked: true, updatedAt: at('11') })]
    // A fresh browser, and one still holding the same copy from before.
    expect(await signIn({ local: {}, cloud })).not.toHaveBeenCalled()
    auth.listener = null
    const same = { 1: { solved: true, updatedAt: at('10') }, 2: { bookmarked: true, updatedAt: at('11') } }
    expect(await signIn({ local: same, cloud })).not.toHaveBeenCalled()
  })

  it('still reports a merge that combined two sides', async () => {
    const showToast = await signIn({
      // 1 only here, 2 in both with the cloud's newer, 3 only in the cloud.
      local: { 1: { solved: true, updatedAt: at('10') }, 2: { solved: true, updatedAt: at('11') } },
      cloud: [row(2, { solved: true, notes: 'later', updatedAt: at('12') }), row(3, { bookmarked: true, updatedAt: at('12') })],
    })
    expect(showToast).toHaveBeenCalledWith('Merged 1 local + 2 cloud entries')
  })
})
