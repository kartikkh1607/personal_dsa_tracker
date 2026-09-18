import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, applyPatch, daysBetween, hasNote, localDate, streakFrom } from './progress.js'

describe('hasNote', () => {
  it('counts real text or any image, but not blank text', () => {
    expect(hasNote(undefined)).toBe(false)
    expect(hasNote({ solved: true })).toBe(false)
    expect(hasNote({ notes: '  \n\t ' })).toBe(false)
    expect(hasNote({ notes: 'two pointers' })).toBe(true)
    expect(hasNote({ notes: ' ', images: ['img_abc123def'] })).toBe(true)
    expect(hasNote({ images: [] })).toBe(false)
  })
})

describe('applyPatch', () => {
  it('adds fields and drops ones set to empty values', () => {
    expect(applyPatch({}, 1, { solved: true, solvedAt: '2026-09-13' })).toEqual({ 1: { solved: true, solvedAt: '2026-09-13' } })
    expect(applyPatch({ 1: { solved: true, notes: 'x' } }, 1, { solved: false, solvedAt: undefined })).toEqual({ 1: { notes: 'x' } })
  })

  it('removes an entry once nothing is left in it', () => {
    expect(applyPatch({ 1: { bookmarked: true } }, 1, { bookmarked: false })).toEqual({})
  })

  it('never mutates the progress it was given', () => {
    const progress = { 1: { solved: true } }
    applyPatch(progress, 1, { notes: 'two pointers' })
    expect(progress).toEqual({ 1: { solved: true } })
  })
})

describe('dates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 13, 10, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('formats local dates with day offsets', () => {
    expect(localDate()).toBe('2026-09-13')
    expect(localDate(-13)).toBe('2026-08-31')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-09-01', '2026-09-13')).toBe(12)
    expect(daysBetween('2026-09-13', '2026-09-13')).toBe(0)
  })

  it('counts a streak that ends today or yesterday', () => {
    expect(streakFrom(new Set(['2026-09-13', '2026-09-12', '2026-09-10']))).toBe(2)
    expect(streakFrom(new Set(['2026-09-12', '2026-09-11']))).toBe(2)
    expect(streakFrom(new Set(['2026-09-10']))).toBe(0)
    expect(streakFrom(new Set())).toBe(0)
  })
})
