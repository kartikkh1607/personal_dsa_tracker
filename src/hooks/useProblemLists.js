import { useMemo } from 'react'
import { DIFFICULTIES } from '../constants.js'
import { activityFrom, addDays, hasNote, streakFrom } from '../progress.js'
import { isDue, isWeak, nextReviewDate, reviewsOn, struggleCount } from '../review.js'
import { ALL_TOPICS } from '../components/Sidebar.jsx'
import { ALL } from '../components/Filters.jsx'

const UP_NEXT_COUNT = 5
const SAVED_PREVIEW_COUNT = 5
const RELATED_COUNT = 6

// How many reviews Home asks of you in a day. The schedule itself is untouched
// - nothing is dropped or rescheduled, this is only how much of it today's
// plan puts in front of you.
export const REVIEW_DAILY_CAP = 15

// Every count on the page, in one pass over the question list.
export function useStats({ questions, topics, phases, topicPhase, progress, today }) {
  return useMemo(() => {
    const topicCounts = new Map(topics.map((topic) => [topic, { topic, ...topicPhase.get(topic), total: 0, solved: 0 }]))
    const phaseCounts = new Map(phases.map((phase) => [phase.phase, { ...phase, total: 0, solved: 0, topics: [] }]))
    for (const topic of topicCounts.values()) phaseCounts.get(topic.phase).topics.push(topic)
    const difficulties = Object.fromEntries(DIFFICULTIES.map((level) => [level, { total: 0, solved: 0 }]))
    const patterns = new Map()
    // Solves and reviews per day, which drives both the streak and the heatmap.
    const activity = activityFrom(progress)
    const weekStart = addDays(today, -6)
    let solved = 0
    let saved = 0
    let thisWeek = 0

    for (const question of questions) {
      const entry = progress[question.id]
      const isSolved = entry?.solved === true
      const patternKey = `${question.topic}|${question.pattern}`
      if (!patterns.has(patternKey)) patterns.set(patternKey, { key: patternKey, topic: question.topic, pattern: question.pattern, total: 0, solved: 0 })

      for (const counts of [topicCounts.get(question.topic), phaseCounts.get(question.phase), difficulties[question.difficulty], patterns.get(patternKey)]) {
        counts.total++
        if (isSolved) counts.solved++
      }
      if (isSolved) {
        solved++
        if (entry.solvedAt && entry.solvedAt >= weekStart) thisWeek++
      }
      if (entry?.bookmarked) saved++
    }

    return {
      total: questions.length,
      solved,
      saved,
      thisWeek,
      streak: streakFrom(new Set(activity.keys())),
      activity,
      difficulties,
      topicStats: [...topicCounts.values()],
      phaseStats: [...phaseCounts.values()],
      patternStats: [...patterns.values()],
    }
  }, [questions, topics, phases, topicPhase, progress, today])
}

// The lists Home shows: what to do next, what's due, what's saved, what's shaky.
//
// `extraReviews` is what "Review more" adds: the day's budget, deliberately
// raised, rather than the cap being quietly ignored.
export function useHomeLists({ questions, progress, today, extraReviews = 0 }) {
  // The sheet's study path, in step order: each phase's Core, Depth and
  // Stretch problems come before the next phase. Ids are stable keys for saved
  // progress and don't follow the path.
  const upNext = useMemo(
    () =>
      questions
        .filter((question) => !progress[question.id]?.solved)
        .sort((a, b) => a.step - b.step)
        .slice(0, UP_NEXT_COUNT),
    [progress, questions],
  )

  // Everything the schedule says is due, most overdue first.
  const reviewBacklog = useMemo(
    () =>
      questions
        .filter((question) => isDue(progress[question.id], today))
        .sort((a, b) => nextReviewDate(progress[a.id]).localeCompare(nextReviewDate(progress[b.id])) || a.id - b.id),
    [progress, today, questions],
  )

  // Come back after three weeks away and the schedule hands back every problem
  // at once; a list of 143 is not a plan, it is a reason to close the tab.
  //
  // So the cap is a budget for the day, spent by reviews actually done, not a
  // window onto the first 15 of the list. Those are different things: reviewing
  // one takes it out of the backlog, so a window would refill itself and the
  // cap would never bind. This counts what has been recorded today instead.
  const reviewedToday = useMemo(() => reviewsOn(progress, today), [progress, today])
  const allowance = Math.max(0, REVIEW_DAILY_CAP + extraReviews - reviewedToday)

  // Taking the most overdue first means the budget delays the least urgent work
  // rather than losing any of it, and the rest stay one click away on the
  // problems page. Sliced here, once, so Home and that page can't drift into
  // disagreeing about what is due.
  const reviewToday = useMemo(() => reviewBacklog.slice(0, allowance), [reviewBacklog, allowance])

  const savedPreview = useMemo(
    () => questions.filter((question) => progress[question.id]?.bookmarked).slice(0, SAVED_PREVIEW_COUNT),
    [progress, questions],
  )

  // Problems you've failed to re-solve at least twice: the ones actually worth
  // more reps. Most-struggled first.
  const weakProblems = useMemo(
    () =>
      questions
        .filter((question) => isWeak(progress[question.id]))
        .sort((a, b) => struggleCount(progress[b.id]) - struggleCount(progress[a.id]) || a.id - b.id),
    [progress, questions],
  )

  return { upNext, reviewToday, reviewBacklog, reviewedToday, savedPreview, weakProblems }
}

// The filtered, grouped problem list. Show, difficulty, Core-only, notes-only
// and search all combine.
//
// The topic is different: it is where you happen to be standing, not a filter
// you chose, so a search looks past it and covers the whole sheet. The topic
// stays in the route and applies again the moment the search is emptied.
export function useFilteredProblems({ questions, progress, today, selectedTopic, difficulty, coreOnly, notesOnly, show, search }) {
  const term = search.trim().toLowerCase()
  const searching = term !== ''

  const visible = useMemo(() => {
    return questions.filter((question) => {
      if (!searching && selectedTopic !== ALL_TOPICS && question.topic !== selectedTopic) return false
      if (difficulty !== ALL && question.difficulty !== difficulty) return false
      if (coreOnly && question.tier !== 'Core') return false
      const entry = progress[question.id]
      if (show === 'todo' && entry?.solved) return false
      if (show === 'solved' && !entry?.solved) return false
      if (show === 'review' && !isDue(entry, today)) return false
      if (show === 'saved' && !entry?.bookmarked) return false
      if (notesOnly && !hasNote(entry)) return false
      if (term && !question.problem.toLowerCase().includes(term) && !question.pattern.toLowerCase().includes(term)) return false
      return true
    })
  }, [progress, today, selectedTopic, difficulty, coreOnly, notesOnly, show, term, searching, questions])

  // A single topic groups by pattern; all problems group by topic. So does a
  // search, so each hit shows which topic it lives in.
  const groupByPattern = selectedTopic !== ALL_TOPICS && !searching

  return { visible, groupByPattern, searching }
}

// Other problems in the same topic, closest first: same pattern, then the rest.
export function useRelatedQuestions(questions, drawerQuestion) {
  return useMemo(() => {
    if (!drawerQuestion) return []
    const others = questions.filter((q) => q.id !== drawerQuestion.id && q.topic === drawerQuestion.topic)
    const samePattern = others.filter((q) => q.pattern === drawerQuestion.pattern)
    const rest = others.filter((q) => q.pattern !== drawerQuestion.pattern)
    return [...samePattern, ...rest].slice(0, RELATED_COUNT)
  }, [drawerQuestion, questions])
}
