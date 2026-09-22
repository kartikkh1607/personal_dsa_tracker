import { describe, expect, it } from 'vitest'
import { PHASE_NAMES, stageOf } from './constants.js'
import questions from './data/questions.json'
import { EXPECTED_QUESTIONS, EXPECTED_TOPICS, indexQuestions } from './questions.js'

const index = indexQuestions(questions)

describe('indexQuestions', () => {
  it('indexes the whole sheet', () => {
    expect(index.questions).toHaveLength(EXPECTED_QUESTIONS)
    expect(index.topics).toHaveLength(EXPECTED_TOPICS)
    expect(index.questionIds.size).toBe(EXPECTED_QUESTIONS)
    expect(index.questionsById.size).toBe(EXPECTED_QUESTIONS)
  })

  it('sorts topics by their leading sheet number', () => {
    expect(index.topics).toEqual([...index.topics].sort((a, b) => a.localeCompare(b)))
    expect(index.topics[0]).toMatch(/^01\./)
  })

  it('sorts phases in study order', () => {
    expect(index.phases.map((phase) => phase.phase)).toEqual([1, 2, 3, 4, 5, 6])
    expect(index.phases.every((phase) => typeof phase.name === 'string' && phase.name !== '')).toBe(true)
  })

  it('maps two-digit topic numbers back to their topic, as the URL uses them', () => {
    expect(index.topicByNumber.get('01')).toBe(index.topics[0])
    expect(index.topicByNumber.size).toBe(EXPECTED_TOPICS)
  })

  it('keys ids as strings for sanitising and as numbers for lookup', () => {
    // sanitizeProgress compares against string keys from localStorage...
    expect(index.questionIds.has('1')).toBe(true)
    expect(index.questionIds.has(1)).toBe(false)
    // ...while the route carries a number.
    expect(index.questionsById.get(1)?.id).toBe(1)
  })

  it('gives every topic a phase', () => {
    for (const topic of index.topics) {
      expect(index.topicPhase.get(topic)).toMatchObject({ phase: expect.any(Number), phaseName: expect.any(String) })
    }
  })

  it('names every phase the sheet actually uses', () => {
    for (const phase of new Set(questions.map((question) => question.phase))) {
      expect(PHASE_NAMES[phase], `phase ${phase} has no name`).toBeTruthy()
    }
    expect(Object.keys(PHASE_NAMES)).toHaveLength(index.phases.length)
  })

  // Step, Stage and phaseName were on all 920 rows and are all derivable, so
  // they are derived. Storing them again would let two rows disagree.
  it('stores nothing a row can work out for itself', () => {
    for (const question of questions) {
      expect(question).not.toHaveProperty('step')
      expect(question).not.toHaveProperty('stage')
      expect(question).not.toHaveProperty('phaseName')
    }
    expect(stageOf(questions[0])).toBe('1. Foundations - Core')
  })

  it('works on an arbitrary subset, not just the real sheet', () => {
    const small = indexQuestions([
      { id: 7, topic: '03. Arrays', phase: 2 },
      { id: 9, topic: '01. Basics', phase: 1 },
    ])
    expect(small.topics).toEqual(['01. Basics', '03. Arrays'])
    expect(small.phases).toEqual([
      { phase: 1, name: 'Foundations' },
      { phase: 2, name: 'Search & Strings' },
    ])
    expect(small.topicByNumber.get('03')).toBe('03. Arrays')
    expect([...small.questionIds]).toEqual(['7', '9'])
  })
})

// The sheet lists a handful of problems twice on purpose: the same problem is
// worth solving again with a different technique. `sameAs` is what says so,
// and separates those from the duplicates that were simply mistakes.
describe('problems listed twice on purpose', () => {
  const byId = new Map(questions.map((question) => [question.id, question]))

  it('pairs every sameAs with the problem that points back at it', () => {
    const paired = questions.filter((question) => question.sameAs !== undefined)
    expect(paired.length).toBeGreaterThan(0)
    for (const question of paired) {
      const other = byId.get(question.sameAs)
      expect(other, `#${question.id} points at a problem that is not in the sheet`).toBeDefined()
      expect(other.sameAs).toBe(question.id)
      expect(other.id).not.toBe(question.id)
    }
  })

  it('puts each half of a pair under a different technique', () => {
    for (const question of questions.filter((q) => q.sameAs !== undefined)) {
      expect(byId.get(question.sameAs).pattern).not.toBe(question.pattern)
    }
  })

  it('has no link left in the sheet twice that is not a declared pair', () => {
    const byLink = new Map()
    for (const question of questions) {
      if (!byLink.has(question.link)) byLink.set(question.link, [])
      byLink.get(question.link).push(question)
    }
    const shared = [...byLink.values()].filter((group) => group.length > 1)
    for (const group of shared) {
      expect(group, `${group[0].link} is on ${group.length} problems`).toHaveLength(2)
      expect(group[0].sameAs).toBe(group[1].id)
    }
  })
})
