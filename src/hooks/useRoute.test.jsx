// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRoute } from './useRoute.js'

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

const hash = () => window.location.hash

describe('useRoute hash sync', () => {
  it('writes the route into the hash', () => {
    const { result } = renderHook(() => useRoute())
    expect(hash()).toBe('#/home')

    act(() => result.current.navigate({ view: 'problems', topic: '06' }))
    expect(hash()).toBe('#/problems?topic=06')
    expect(result.current.route).toMatchObject({ view: 'problems', topic: '06' })
  })

  it('starts from the hash already in the URL', () => {
    window.history.replaceState(null, '', '#/problems?topic=06&show=todo&difficulty=Hard&core=1')
    const { result } = renderHook(() => useRoute())
    expect(result.current.route).toMatchObject({ view: 'problems', topic: '06', show: 'todo', difficulty: 'Hard', core: true })
  })

  it('pushes a new entry by default and replaces when asked', () => {
    const { result } = renderHook(() => useRoute())
    const start = window.history.length

    act(() => result.current.navigate({ view: 'problems' }))
    expect(window.history.length).toBe(start + 1)

    // Filter tweaks replace, so they don't pile up entries to Back through.
    act(() => result.current.navigate({ q: 'two sum' }, { replace: true }))
    expect(window.history.length).toBe(start + 1)
    expect(hash()).toBe('#/problems?q=two+sum')
  })

  it('does not touch history when the hash would not change', () => {
    const { result } = renderHook(() => useRoute())
    act(() => result.current.navigate({ view: 'problems' }))
    const length = window.history.length
    act(() => result.current.navigate({ view: 'problems' }))
    expect(window.history.length).toBe(length)
  })

  it('follows Back by re-reading the hash', () => {
    const { result } = renderHook(() => useRoute())
    act(() => result.current.navigate({ view: 'patterns' }))
    expect(result.current.route.view).toBe('patterns')

    act(() => {
      window.history.replaceState(null, '', '#/problems?topic=02')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.route).toMatchObject({ view: 'problems', topic: '02' })
  })

  it('remembers where you were, without the open problem', () => {
    const { result } = renderHook(() => useRoute())
    act(() => result.current.navigate({ view: 'problems', topic: '06' }))
    act(() => result.current.openQuestion(5))
    expect(hash()).toBe('#/problems?topic=06&problem=5')
    // Coming back later should show the page, not a panel.
    expect(localStorage.getItem('dsa-last-route')).toBe('#/problems?topic=06')
  })
})

describe('useRoute drawer history', () => {
  it('opening a problem adds one entry, and closing steps back over it', () => {
    const { result } = renderHook(() => useRoute())
    act(() => result.current.navigate({ view: 'problems' }))
    const beforeOpen = window.history.length

    act(() => result.current.openQuestion(5))
    expect(window.history.length).toBe(beforeOpen + 1)
    expect(result.current.route.problem).toBe(5)

    act(() => result.current.closeQuestion())
    // jsdom applies history.back() asynchronously; the entry count is the point.
    expect(window.history.length).toBe(beforeOpen + 1)
  })

  it('switching problems replaces, so Back does not walk every one visited', () => {
    const { result } = renderHook(() => useRoute())
    act(() => result.current.openQuestion(5))
    const afterFirst = window.history.length

    act(() => result.current.openQuestion(6))
    act(() => result.current.openQuestion(7))
    expect(window.history.length).toBe(afterFirst)
    expect(result.current.route.problem).toBe(7)
  })

  it('closing without a pushed entry just clears the problem', () => {
    window.history.replaceState(null, '', '#/home?problem=5')
    const { result } = renderHook(() => useRoute())
    expect(result.current.route.problem).toBe(5)

    act(() => result.current.closeQuestion())
    expect(result.current.route.problem).toBeNull()
    expect(hash()).toBe('#/home')
  })
})
