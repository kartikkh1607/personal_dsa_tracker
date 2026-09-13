import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import rawQuestions from './data/questions.json'
import { DEFAULT_STATUS, isDone } from './constants.js'
import { getConfidence, getStatus } from './progress.js'
import { loadProgress, sanitizeProgress, saveProgress } from './storage.js'
import { useIsNarrow } from './useIsNarrow.js'
import TopBar from './components/TopBar.jsx'
import Sidebar, { ALL_TOPICS } from './components/Sidebar.jsx'
import Filters, { ALL } from './components/Filters.jsx'
import Dashboard from './components/Dashboard.jsx'
import QuestionTable from './components/QuestionTable.jsx'
import QuestionCards from './components/QuestionCards.jsx'

// Topics sort by their leading number, which is part of the topic string.
const TOPICS = [...new Set(rawQuestions.map((q) => q.topic))].sort((a, b) => a.localeCompare(b))
const QUESTION_IDS = new Set(rawQuestions.map((question) => String(question.id)))
const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 }

if (rawQuestions.length !== 570 || TOPICS.length !== 23) {
  console.warn(`Expected 570 questions across 23 topics, got ${rawQuestions.length} across ${TOPICS.length}.`)
}

const WRITE_DELAY_MS = 400

export default function App() {
  // Saved state only - the static question list is never stored.
  const [progress, setProgress] = useState(() => loadProgress(QUESTION_IDS))

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS)
  const [difficulty, setDifficulty] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [search, setSearch] = useState('')
  const [focusMode, setFocusMode] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')

  const isNarrow = useIsNarrow()
  const searchInputRef = useRef(null)

  // Typing stays responsive: the input updates on every keystroke, while
  // re-filtering the long list runs at a lower priority and catches up.
  const deferredSearch = useDeferredValue(search)

  // A quick slash shortcut gets you straight back to searching, without
  // stealing keystrokes when the user is already editing a form control.
  useEffect(() => {
    function handleKeyDown(event) {
      const element = event.target
      const isTyping = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Batch writes so a run of quick changes only hits localStorage once.
  const writeTimer = useRef(null)
  useEffect(() => {
    clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => saveProgress(progress), WRITE_DELAY_MS)
    return () => clearTimeout(writeTimer.current)
  }, [progress])

  // Counting reads saved state through getStatus, so questions.json is never
  // copied or mutated and rows keep their original object identity.
  const overall = useMemo(() => {
    let done = 0
    for (const question of rawQuestions) {
      if (isDone(getStatus(progress, question.id))) done++
    }
    return { total: rawQuestions.length, done }
  }, [progress])

  const fraction = overall.total === 0 ? 0 : overall.done / overall.total
  const percent = Math.round(fraction * 100)

  const topicStats = useMemo(() => {
    const counts = new Map(TOPICS.map((topic) => [topic, { topic, total: 0, done: 0 }]))
    for (const question of rawQuestions) {
      const entry = counts.get(question.topic)
      entry.total++
      if (isDone(getStatus(progress, question.id))) entry.done++
    }
    return [...counts.values()]
  }, [progress])

  const practiceMetrics = useMemo(() => {
    let attempted = 0
    let review = 0
    let confidenceTotal = 0
    let rated = 0

    for (const question of rawQuestions) {
      const questionStatus = getStatus(progress, question.id)
      const confidence = Number(getConfidence(progress, question.id)) || 0
      if (questionStatus === 'Attempted') attempted++
      if (questionStatus === 'Revisit' || (isDone(questionStatus) && confidence > 0 && confidence <= 3)) review++
      if (confidence > 0) {
        confidenceTotal += confidence
        rated++
      }
    }

    return {
      ...overall,
      percent,
      attempted,
      review,
      rated,
      averageConfidence: rated ? (confidenceTotal / rated).toFixed(1) : '',
    }
  }, [overall, percent, progress])

  const todayQueue = useMemo(() => {
    const ranked = rawQuestions.map((question) => {
      const questionStatus = getStatus(progress, question.id)
      const confidence = Number(getConfidence(progress, question.id)) || 0
      if (questionStatus === 'Revisit') return { question, priority: 0, label: 'Marked for revision', confidence }
      if (questionStatus === 'Attempted') return { question, priority: 1, label: 'Continue where you left off', confidence }
      if (isDone(questionStatus) && confidence > 0 && confidence <= 3) {
        return { question, priority: 2, label: 'Build confidence', confidence }
      }
      return { question, priority: 3, label: 'Fresh start', confidence }
    })

    return ranked
      .sort((a, b) => a.priority - b.priority || a.confidence - b.confidence || a.question.id - b.question.id)
      .slice(0, 3)
  }, [progress])

  const queueIds = useMemo(() => new Set(todayQueue.map((item) => item.question.id)), [todayQueue])
  const queueIndex = useMemo(() => new Map(todayQueue.map((item, index) => [item.question.id, index])), [todayQueue])
  const queueLabel = todayQueue[0]?.priority < 3 ? 'Picked from your revision and in-progress work.' : 'A gentle place to begin your first session.'

  // Topic, difficulty, status, focus mode and search all combine.
  const visible = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    const filtered = rawQuestions.filter((question) => {
      if (selectedTopic !== ALL_TOPICS && question.topic !== selectedTopic) return false
      if (difficulty !== ALL && question.difficulty !== difficulty) return false
      if (status !== ALL && getStatus(progress, question.id) !== status) return false
      if (term && !question.problem.toLowerCase().includes(term)) return false
      const questionStatus = getStatus(progress, question.id)
      const confidence = Number(getConfidence(progress, question.id)) || 0
      if (focusMode === 'unsolved' && isDone(questionStatus)) return false
      if (focusMode === 'continue' && questionStatus !== 'Attempted') return false
      if (focusMode === 'review' && questionStatus !== 'Revisit' && !(isDone(questionStatus) && confidence > 0 && confidence <= 3)) return false
      if (focusMode === 'recommended' && !queueIds.has(question.id)) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'topic') return a.topic.localeCompare(b.topic) || a.id - b.id
      if (sortBy === 'difficulty') return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.id - b.id
      if (sortBy === 'confidence') {
        const aConfidence = Number(getConfidence(progress, a.id)) || 6
        const bConfidence = Number(getConfidence(progress, b.id)) || 6
        return aConfidence - bConfidence || a.id - b.id
      }
      if (sortBy === 'name') return a.problem.localeCompare(b.problem)
      return (queueIndex.get(a.id) ?? 99_999) - (queueIndex.get(b.id) ?? 99_999) || a.id - b.id
    })
  }, [progress, selectedTopic, difficulty, status, focusMode, sortBy, deferredSearch, queueIds, queueIndex])

  // Stable identity keeps the memoised rows from re-rendering.
  const handleChange = useCallback((id, field, value) => {
    setProgress((prev) => {
      const current = prev[id] ?? { status: DEFAULT_STATUS, confidence: '' }
      return { ...prev, [id]: { ...current, [field]: value } }
    })
  }, [])

  const isFiltered = selectedTopic !== ALL_TOPICS || difficulty !== ALL || status !== ALL || search !== '' || focusMode !== 'all'

  function clearFilters() {
    setSelectedTopic(ALL_TOPICS)
    setDifficulty(ALL)
    setStatus(ALL)
    setSearch('')
    setFocusMode('all')
  }

  function openQueue() {
    setSelectedTopic(ALL_TOPICS)
    setDifficulty(ALL)
    setStatus(ALL)
    setSearch('')
    setFocusMode('recommended')
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dsa-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file) {
    try {
      const parsed = JSON.parse(await file.text())
      const safeProgress = sanitizeProgress(parsed, QUESTION_IDS)
      if (safeProgress === null) throw new Error('invalid progress')
      setProgress(safeProgress)
    } catch {
      alert('That file is not a valid progress export.')
    }
  }

  const listProps = { questions: visible, progress, onChange: handleChange }

  return (
    <div className="flex h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <TopBar
        total={overall.total}
        done={overall.done}
        percent={percent}
        fraction={fraction}
        onExport={handleExport}
        onImport={handleImport}
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar
          topicStats={topicStats}
          overall={overall}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
          isNarrow={isNarrow}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          <Dashboard metrics={practiceMetrics} queue={todayQueue} queueLabel={queueLabel} onOpenQueue={openQueue} />
          <Filters
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            status={status}
            onStatusChange={setStatus}
            search={search}
            onSearchChange={setSearch}
            searchInputRef={searchInputRef}
            focusMode={focusMode}
            onFocusModeChange={setFocusMode}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            visibleCount={visible.length}
            totalCount={overall.total}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {visible.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-600">No questions match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                >
                  Clear filters
                </button>
              </div>
            ) : isNarrow ? (
              <QuestionCards {...listProps} />
            ) : (
              <QuestionTable {...listProps} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
