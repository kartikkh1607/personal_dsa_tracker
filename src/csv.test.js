import { describe, expect, it } from 'vitest'
import { progressToCsv, sheetStatus } from './csv.js'

const STAGE = '1. Foundations - Core'
const QUESTIONS = [
  { id: 1, step: 1, stage: STAGE, topic: '01. Basics', pattern: 'Warm-up', problem: 'Sum, of "digits"', difficulty: 'Easy', tier: 'Core', platform: 'LeetCode', link: 'https://example.com/1' },
  { id: 2, step: 2, stage: STAGE, topic: '01. Basics', pattern: 'Warm-up', problem: 'Reverse', difficulty: 'Medium', tier: 'Depth', platform: 'GeeksforGeeks', link: 'https://example.com/2' },
]

describe('progressToCsv', () => {
  it('uses the Master tab columns and escapes commas, quotes and newlines', () => {
    const lines = progressToCsv(QUESTIONS, { 1: { solved: true, solvedAt: '2026-09-01', notes: 'line one\nline two' } }).split('\r\n')
    expect(lines[0]).toBe('Step,Stage,Topic,Pattern,Problem,Difficulty,Tier,Platform,Link,Status,Confidence,Attempts,Last Revised,Next Revision,Due?,Notes')
    expect(lines[1]).toBe(`1,${STAGE},01. Basics,Warm-up,"Sum, of ""digits""",Easy,Core,LeetCode,https://example.com/1,Solved,,,2026-09-01,,,"line one\nline two"`)
    expect(lines[2]).toBe(`2,${STAGE},01. Basics,Warm-up,Reverse,Medium,Depth,GeeksforGeeks,https://example.com/2,Not Started,,,,,,`)
  })

  it('prefers a saved link and the latest review date', () => {
    const csv = progressToCsv([QUESTIONS[1]], { 2: { solved: true, solvedAt: '2026-09-01', reviewedAt: '2026-09-08', link: 'https://real.example/2' } })
    expect(csv.split('\r\n')[1]).toContain('https://real.example/2,Solved,,,2026-09-08')
  })

  it('neutralises notes that a spreadsheet would run as a formula', () => {
    const csv = progressToCsv([QUESTIONS[1]], { 2: { notes: '=HYPERLINK("http://evil.example")' } })
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"")"`)
  })
})

describe('sheetStatus', () => {
  it('maps progress to the sheet status words', () => {
    expect(sheetStatus(undefined)).toBe('Not Started')
    expect(sheetStatus({ bookmarked: true })).toBe('Not Started')
    expect(sheetStatus({ solved: true })).toBe('Solved')
    expect(sheetStatus({ solved: true, bookmarked: true })).toBe('Revisit')
  })
})
