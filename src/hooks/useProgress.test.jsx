// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../storage.js'
import { useProgress, WRITE_DELAY_MS } from './useProgress.js'

const IDS = new Set(['1', '2', '3'])
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

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
    expect(result.current.progress[1]).toEqual({ solved: true, solvedAt: '2026-09-20' })
    // The change is in state but not yet on disk.
    expect(saved()).toBeNull()

    act(() => vi.advanceTimersByTime(WRITE_DELAY_MS))
    expect(saved()).toEqual({ 1: { solved: true, solvedAt: '2026-09-20' } })
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
    expect(saved()).toEqual({
      1: { solved: true, solvedAt: '2026-09-20' },
      2: { bookmarked: true },
      3: { bookmarked: true },
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
    expect(saved()).toEqual({ 1: { solved: true, solvedAt: '2026-09-20' } })
  })

  it('writes immediately on pagehide', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleBookmark(2))
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(saved()).toEqual({ 2: { bookmarked: true } })
  })

  it('writes a pending change when the app unmounts', () => {
    const { result, unmount } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleBookmark(3))
    expect(saved()).toBeNull()
    act(() => unmount())
    expect(saved()).toEqual({ 3: { bookmarked: true } })
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
    expect(result.current.progress[1]).toEqual({ bookmarked: true })
  })

  it('restores an entry exactly, including removing one that did not exist', () => {
    const { result } = renderHook(() => useProgress(IDS))
    act(() => result.current.toggleSolved(1))
    act(() => result.current.restoreEntry(1, undefined))
    expect(result.current.progress[1]).toBeUndefined()

    act(() => result.current.restoreEntry(2, { solved: true, solvedAt: '2026-01-01' }))
    expect(result.current.progress[2]).toEqual({ solved: true, solvedAt: '2026-01-01' })
  })
})
