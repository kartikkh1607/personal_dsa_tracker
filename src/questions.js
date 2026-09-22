import questionsUrl from './data/questions.json?url'
import { phaseName, splitTopic } from './constants.js'

// The question list is 385 KB and never changes at runtime. Importing it
// directly put all of it in the main chunk, so the app couldn't render until
// the whole thing had parsed. `?url` keeps it as a separate, content-hashed
// JSON file that is fetched and parsed on its own, precached by the service
// worker (see the plugin in vite.config.js) and cached across deploys until
// the data actually changes.

export const EXPECTED_QUESTIONS = 920
export const EXPECTED_TOPICS = 23

// Everything the app derives from the raw list, built once. Kept pure and
// separate from the fetch so it can be tested without a network.
export function indexQuestions(questions) {
  // Topics sort by their leading number, which is part of the topic string.
  const topics = [...new Set(questions.map((question) => question.topic))].sort((a, b) => a.localeCompare(b))
  const phases = [...new Set(questions.map((question) => question.phase))]
    .sort((a, b) => a - b)
    .map((phase) => ({ phase, name: phaseName(phase) }))

  return {
    questions,
    topics,
    phases,
    topicByNumber: new Map(topics.map((topic) => [splitTopic(topic).number, topic])),
    questionIds: new Set(questions.map((question) => String(question.id))),
    questionsById: new Map(questions.map((question) => [question.id, question])),
    topicPhase: new Map(questions.map((question) => [question.topic, { phase: question.phase, phaseName: phaseName(question.phase) }])),
  }
}

// One fetch per page load however many callers ask, and a failed load doesn't
// poison the cache, so a retry can actually retry.
let pending = null

export function loadQuestions() {
  pending ??= fetch(questionsUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load the question list (HTTP ${response.status})`)
      return response.json()
    })
    .then((questions) => {
      if (!Array.isArray(questions) || questions.length === 0) throw new Error('The question list is empty or malformed')
      if (questions.length !== EXPECTED_QUESTIONS) {
        console.warn(`Expected ${EXPECTED_QUESTIONS} questions, got ${questions.length}.`)
      }
      return indexQuestions(questions)
    })
    .catch((error) => {
      pending = null
      throw error
    })
  return pending
}
