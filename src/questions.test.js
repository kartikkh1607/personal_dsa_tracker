import { describe, expect, it } from 'vitest'
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

  it('works on an arbitrary subset, not just the real sheet', () => {
    const small = indexQuestions([
      { id: 7, topic: '03. Arrays', phase: 2, phaseName: 'Search & Strings' },
      { id: 9, topic: '01. Basics', phase: 1, phaseName: 'Foundations' },
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
