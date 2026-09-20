// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, TOMBSTONES_KEY } from '../storage.js'
import { useProgress, WRITE_DELAY_MS } from './useProgress.js'

const IDS = new Set(['1', '2', '3'])
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
const savedTombstones = () => JSON.parse(localStorage.getItem(TOMBSTONES_KEY) ?? 'null')
// The stamp every change made at the frozen clock carries. Derived from the
// same local time the tests set, so it holds in any timezone.
const STAMP = new Date(2026, 8, 20, 10, 0).toISOString()
// The same clock a given number of milliseconds later, for the tests that let
// time pass between changes.
const stampAfter = (ms) => new Date(2026, 8, 20, 10, 0, 0, ms).toISOString()

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('dsa-data-version', '3')
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 8, 20, 10, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useProgress writes', () => {
  it('waits out the debounce before touching localStorage', () => {
    const { result } = renderHook(() => useProgress(IDS))

    act(() => result.current.toggleSolved(1))
    expect(result.current.progress[1]).toEqual({ solved: true, solvedAt: '2026-09-20', updatedAt: STAMP })
    // The change is in state but not yet on disk.
    expect(saved()).toBeNull()

    act(() => vi.advanceTimersByTime(WRITE_DELAY_MS))
    expect(saved()).toEqual({ 1: { solved: true, solvedAt: '2026-09-20', updatedAt: STAMP } })
  })

  it('collapses a burst of changes into a single write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useProgress(IDS))
    setItem.mockClear()

    act(() => {
      result.current.toggleSolved(1)
    })
    act(() => vi.advanceTimersByTime(100))
    act(() => {
      result.current.toggleBookmark(2)
    })
    act(() => vi.advanceTimersByTime(100))
    act(() => {
      result.current.toggleBookmark(3)
    })
    expect(setItem).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(WRITE_DELAY_MS))
    const writes = setItem.mock.calls.filter(([key]) => key === STORAGE_KEY)
    expect(writes).toHaveLength(1)
    // Each change carries the moment it was made, not the moment they were
    // written: the burst is collapsed into one write, not into one timestamp.
    expect(saved()).toEqual({
      1: { solved: true, solvedAt: '2026-09-20', updatedAt: STAMP },
      2: { bookmarked: true, updatedAt: stampAfter(100) },
      3: { bookmarked: true, updatedAt: stampAfter(200) },
    })
    setItem.mockRestore()
  })
})

describe('useProgress flush', () => {
  it('writes immediately when the tab is hidden, beating the timer', () => {
    const { result } = renderHook(() => useProgress(IDS))

    act(() => result.current.toggleSolved(1))
    expect(saved()).toBeNull()

    act(() => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(saved()).toEqual({ 1: { solved: true, solvedAt: '2026-09-20', updatedAt: STAMP } })
  })

  it('writes immediately on pagehide', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleBookmark(2))
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(saved()).toEqual({ 2: { bookmarked: true, updatedAt: STAMP } })
  })

  it('writes a pending change when the app unmounts', () => {
    const { result, unmount } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleBookmark(3))
    expect(saved()).toBeNull()
    act(() => unmount())
    expect(saved()).toEqual({ 3: { bookmarked: true, updatedAt: STAMP } })
  })

  it('does not write again when there is nothing pending', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleSolved(1))
    act(() => vi.advanceTimersByTime(WRITE_DELAY_MS))

    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(setItem.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(0)
    setItem.mockRestore()
  })
})

describe('useProgress mutations', () => {
  it('keeps callbacks stable across renders, so memoised rows do not re-render', () => {
    const { result, rerender } = renderHook(() => useProgress(IDS))
    const first = result.current
    act(() => result.current.toggleSolved(1))
    rerender()
    expect(result.current.toggleSolved).toBe(first.toggleSolved)
    expect(result.current.toggleBookmark).toBe(first.toggleBookmark)
    expect(result.current.reviewProblem).toBe(first.reviewProblem)
  })

  it('clears the review trail when a solve is undone', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleSolved(1))
    act(() => result.current.reviewProblem(1, 'struggled'))
    expect(result.current.progress[1].history).toHaveLength(1)

    act(() => result.current.toggleSolved(1))
    expect(result.current.progress[1]).toEqual({ bookmarked: true, updatedAt: STAMP })
  })

  it('restores an entry exactly, including removing one that did not exist', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleSolved(1))
    act(() => result.current.restoreEntry(1, undefined))
    expect(result.current.progress[1]).toBeUndefined()

    act(() => result.current.restoreEntry(2, { solved: true, solvedAt: '2026-01-01' }))
    // Restored with a fresh stamp, not the one the entry had: undoing is a
    // change, and has to look like one to the other devices.
    expect(result.current.progress[2]).toEqual({ solved: true, solvedAt: '2026-01-01', updatedAt: STAMP })
  })
})

describe('useProgress tombstones', () => {
  it('records an entry that has been cleared, so the deletion can be pushed', () => {
    const { result } = renderHook(() => useProgress(IDS))

    act(() => result.current.toggleSolved(1))
    expect(result.current.tombstones).toEqual({})

    // Unticking the only thing the entry held clears the entry itself.
    act(() => result.current.toggleSolved(1))
    expect(result.current.progress[1]).toBeUndefined()
    expect(result.current.tombstones).toEqual({ 1: STAMP })
    expect(savedTombstones()).toEqual({ 1: STAMP })
  })

  it('records a deletion however it happened, including an undone create', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleBookmark(2))
    act(() => result.current.restoreEntry(2, undefined))
    expect(result.current.tombstones).toEqual({ 2: STAMP })
  })

  it('does not re-record deletions that arrived from a sync', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleBookmark(1))
    act(() => result.current.toggleBookmark(2))

    // A merge that dropped entry 1, because another device deleted it. That is
    // already a tombstone in the merged set, and must not be re-stamped here:
    // a fresh stamp would outrank a later restore from that same device.
    const merged = { progress: { 2: { bookmarked: true, updatedAt: STAMP } }, tombstones: { 1: '2026-09-19T00:00:00.000Z' } }
    act(() => result.current.applySynced(merged))

    expect(result.current.progress).toEqual(merged.progress)
    expect(result.current.tombstones).toEqual({ 1: '2026-09-19T00:00:00.000Z' })
  })

  it('stamps every entry of an imported backup so the import wins', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.replaceProgress({ 1: { solved: true, solvedAt: '2026-01-01' }, 3: { bookmarked: true } }))
    expect(result.current.progress).toEqual({
      1: { solved: true, solvedAt: '2026-01-01', updatedAt: STAMP },
      3: { bookmarked: true, updatedAt: STAMP },
    })
  })
})
