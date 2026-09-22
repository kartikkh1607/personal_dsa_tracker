import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { progressToCsv, sheetStatus } from './csv.js'
import questions from './data/questions.json'

const STAGE = '1. Foundations - Core'
const QUESTIONS = [
  { id: 1, topic: '01. Basics', pattern: 'Warm-up', problem: 'Sum, of "digits"', difficulty: 'Easy', tier: 'Core', phase: 1, platform: 'LeetCode', link: 'https://example.com/1' },
  { id: 2, topic: '01. Basics', pattern: 'Warm-up', problem: 'Reverse', difficulty: 'Medium', tier: 'Depth', phase: 1, platform: 'GeeksforGeeks', link: 'https://example.com/2' },
]

describe('progressToCsv', () => {
  it('uses the Master tab columns and escapes commas, quotes and newlines', () => {
    const lines = progressToCsv(QUESTIONS, { 1: { solved: true, solvedAt: '2026-09-01', notes: 'line one\nline two' } }).split('\r\n')
    expect(lines[0]).toBe('Step,Stage,Topic,Pattern,Problem,Difficulty,Tier,Platform,Link,Status,Confidence,Attempts,Last Revised,Next Revision,Due?,Notes')
    expect(lines[1]).toBe(`1,${STAGE},01. Basics,Warm-up,"Sum, of ""digits""",Easy,Core,LeetCode,https://example.com/1,Solved,,,2026-09-01,,,"line one\nline two"`)
    expect(lines[2]).toBe(`2,1. Foundations - Depth,01. Basics,Warm-up,Reverse,Medium,Depth,GeeksforGeeks,https://example.com/2,Not Started,,,,,,`)
  })

  // The export is pasted straight into the workbook's Master tab, so its bytes
  // are the contract - not just its shape. Step and Stage used to be stored on
  // every row and are now derived; this is what says the file did not move by
  // so much as a character when they were. Regenerate the hash below only
  // when the sheet's data itself changes, never to make a refactor pass.
  it('writes the whole sheet exactly as it did before Step and Stage were derived', () => {
    const progress = {
      1: { solved: true, solvedAt: '2026-09-01' },
      2: { solved: true, solvedAt: '2026-09-02', reviewedAt: '2026-09-09', bookmarked: true, notes: 'two, pointers "and" =SUM(A1)' },
      3: { bookmarked: true },
      920: { solved: true, solvedAt: '2026-09-03', link: 'https://example.com/custom' },
    }
    const csv = progressToCsv(questions, progress)

    expect(csv.split('\r\n').length).toBe(questions.length + 1)
    expect(new TextEncoder().encode(csv)).toHaveLength(171941)
    expect(createHash('sha256').update(csv, 'utf8').digest('hex')).toBe('f87e7baebe3a5578b496a8a09521fbfda8c62af8586379d80d2f162f28d87e4c')
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
