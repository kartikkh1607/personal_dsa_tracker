import { describe, expect, it } from 'vitest'
import { DEFAULT_ROUTE, buildHash, parseHash } from './route.js'

describe('route hashes', () => {
  it('round-trips a fully filtered problems page', () => {
    const route = { ...DEFAULT_ROUTE, view: 'problems', topic: '06', show: 'todo', difficulty: 'Hard', core: true, q: 'two sum', pattern: 'Two pointers', problem: 16 }
    expect(parseHash(buildHash(route))).toEqual(route)
  })

  it('leaves defaults out of the URL', () => {
    expect(buildHash(DEFAULT_ROUTE)).toBe('#/home')
    expect(buildHash({ ...DEFAULT_ROUTE, view: 'problems', topic: '02' })).toBe('#/problems?topic=02')
  })

  it('only keeps list filters on the problems page', () => {
    expect(buildHash({ ...DEFAULT_ROUTE, view: 'home', show: 'todo', q: 'dp', problem: 5 })).toBe('#/home?problem=5')
  })

  it('falls back to defaults for unknown or malformed values', () => {
    expect(parseHash('#/nowhere?show=weird&topic=abc&problem=-3&difficulty=Insane&core=yes')).toEqual(DEFAULT_ROUTE)
    expect(parseHash('')).toEqual(DEFAULT_ROUTE)
  })
})
