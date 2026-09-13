import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import rawQuestions from './data/questions.json'
import { DEFAULT_STATUS, TIER_RANK, isDone, needsReview } from './constants.js'
import { getConfidence, getStatus } from './progress.js'
import { loadProgress, sanitizeProgress, saveProgress } from './storage.js'
import { useIsNarrow } from './useIsNarrow.js'
import TopBar from './components/TopBar.jsx'
import Sidebar, { ALL_TOPICS } from './components/Sidebar.jsx'
import Filters, { ALL } from './components/Filters.jsx'
import Overview from './components/Overview.jsx'
import PracticeSession from './components/PracticeSession.jsx'
import ProblemDetailDrawer from './components/ProblemDetailDrawer.jsx'
import QuestionTable from './components/QuestionTable.jsx'
import QuestionCards from './components/QuestionCards.jsx'
import Toast from './components/Toast.jsx'

// Topics sort by their leading number, which is part of the topic string.
const TOPICS = [...new Set(rawQuestions.map((q) => q.topic))].sort((a, b) => a.localeCompare(b))
const QUESTION_IDS = new Set(rawQuestions.map((question) => String(question.id)))
const QUESTIONS_BY_ID = new Map(rawQuestions.map((question) => [question.id, question]))
const TOPIC_PHASE = new Map(rawQuestions.map((q) => [q.topic, { phase: q.phase, phaseName: q.phaseName }]))
const PHASES = [...new Map(rawQuestions.map((q) => [q.phase, q.phaseName]))]
  .map(([phase, name]) => ({ phase, name }))
  .sort((a, b) => a.phase - b.phase)
const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 }

if (rawQuestions.length !== 570 || TOPICS.length !== 23) {
  console.warn(`Expected 570 questions across 23 topics, got ${rawQuestions.length} across ${TOPICS.length}.`)
}

const WRITE_DELAY_MS = 400
const SESSION_SIZE = 5
const RELATED_COUNT = 5
const FRESH_LABELS = { Core: 'Core track', Depth: 'Depth practice', Stretch: 'Stretch goal' }

function confidenceOf(progress, id) {
  return Number(getConfidence(progress, id)) || 0
}

function emptyCounts() {
  return { total: 0, done: 0, coreTotal: 0, coreDone: 0 }
}

export default function App() {
  // Saved state only - the static question list is never stored.
  const [progress, setProgress] = useState(() => loadProgress(QUESTION_IDS))

  const [view, setView] = useState('overview')
  const [session, setSession] = useState(null)
  const [openQuestionId, setOpenQuestionId] = useState(null)
  const [toast, setToast] = useState(null)

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS)
  const [tier, setTier] = useState(ALL)
  const [difficulty, setDifficulty] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [search, setSearch] = useState('')
  const [focusMode, setFocusMode] = useState('all')
  const [sortBy, setSortBy] = useState('sheet')

  const isNarrow = useIsNarrow()
  const searchInputRef = useRef(null)
  const problemsScrollRef = useRef(null)
  const listScrollRef = useRef(null)

  // Typing stays responsive: the input updates on every keystroke, while
  // re-filtering the long list runs at a lower priority and catches up.
  const deferredSearch = useDeferredValue(search)

  // "/" jumps to search from anywhere except an active session, without
  // stealing keystrokes when the user is already editing a form control.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || view === 'session') return
      const element = event.target
      const isTyping =
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement ||
        element?.isContentEditable
      if (isTyping) return
      event.preventDefault()
      setView('problems')
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view])

  // Batch writes so a run of quick changes only hits localStorage once.
  const writeTimer = useRef(null)
  useEffect(() => {
    clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => saveProgress(progress), WRITE_DELAY_MS)
    return () => clearTimeout(writeTimer.current)
  }, [progress])

  // Counting reads saved state through getStatus, so questions.json is never
  // copied or mutated and rows keep their original object identity.
  const stats = useMemo(() => {
    const topics = new Map(TOPICS.map((topic) => [topic, { topic, ...TOPIC_PHASE.get(topic), ...emptyCounts() }]))
    const phases = new Map(PHASES.map((phase) => [phase.phase, { ...phase, ...emptyCounts(), topics: [] }]))
    for (const topic of topics.values()) phases.get(topic.phase).topics.push(topic)

    const overall = emptyCounts()
    let attempted = 0
    let review = 0
    let confidenceTotal = 0
    let rated = 0

    for (const question of rawQuestions) {
      const questionStatus = getStatus(progress, question.id)
      const confidence = confidenceOf(progress, question.id)
      const done = isDone(questionStatus)
      const isCore = question.tier === 'Core'

      for (const counts of [overall, topics.get(question.topic), phases.get(question.phase)]) {
        counts.total++
        if (done) counts.done++
        if (isCore) {
          counts.coreTotal++
          if (done) counts.coreDone++
        }
      }
      if (questionStatus === 'Attempted') attempted++
      if (needsReview(questionStatus, confidence)) review++
      if (confidence > 0) {
        confidenceTotal += confidence
        rated++
      }
    }

    return {
      ...overall,
      attempted,
      review,
      rated,
      percent: overall.total === 0 ? 0 : Math.round((overall.done / overall.total) * 100),
      corePercent: overall.coreTotal === 0 ? 0 : Math.round((overall.coreDone / overall.coreTotal) * 100),
      averageConfidence: rated ? (confidenceTotal / rated).toFixed(1) : '',
      topicStats: [...topics.values()],
      phaseStats: [...phases.values()],
    }
  }, [progress])

  // Revision first, then unfinished work, then shaky solves. After that, new
  // problems follow the sheet's plan: all of Core in phase order, then Depth,
  // then Stretch. Confidently solved problems never appear.
  const queue = useMemo(() => {
    const ranked = []
    for (const question of rawQuestions) {
      const questionStatus = getStatus(progress, question.id)
      const confidence = confidenceOf(progress, question.id)
      let entry = null
      if (questionStatus === 'Revisit') entry = { priority: 0, label: 'Marked for revision' }
      else if (questionStatus === 'Attempted') entry = { priority: 1, label: 'Pick up where you left off' }
      else if (needsReview(questionStatus, confidence)) entry = { priority: 2, label: 'Build confidence' }
      else if (!isDone(questionStatus)) entry = { priority: 3 + TIER_RANK[question.tier], label: FRESH_LABELS[question.tier] }
      if (entry) ranked.push({ question, confidence, ...entry })
    }
    return ranked
      .sort((a, b) => a.priority - b.priority || a.confidence - b.confidence || a.question.id - b.question.id)
      .slice(0, SESSION_SIZE)
  }, [progress])

  // Topic, tier, difficulty, status, focus mode and search all combine.
  const visible = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    const filtered = rawQuestions.filter((question) => {
      if (selectedTopic !== ALL_TOPICS && question.topic !== selectedTopic) return false
      if (tier !== ALL && question.tier !== tier) return false
      if (difficulty !== ALL && question.difficulty !== difficulty) return false
      if (term && !question.problem.toLowerCase().includes(term) && !question.pattern.toLowerCase().includes(term)) return false
      const questionStatus = getStatus(progress, question.id)
      if (status !== ALL && questionStatus !== status) return false
      if (focusMode === 'unsolved' && isDone(questionStatus)) return false
      if (focusMode === 'review' && !needsReview(questionStatus, confidenceOf(progress, question.id))) return false
      return true
    })

    // The sheet is already in order; filter() returned a fresh array to sort.
    if (sortBy === 'difficulty') filtered.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.id - b.id)
    if (sortBy === 'name') filtered.sort((a, b) => a.problem.localeCompare(b.problem))
    if (sortBy === 'confidence') {
      // Unrated problems go last.
      filtered.sort((a, b) => (confidenceOf(progress, a.id) || 6) - (confidenceOf(progress, b.id) || 6) || a.id - b.id)
    }
    return filtered
  }, [progress, selectedTopic, tier, difficulty, status, focusMode, sortBy, deferredSearch])

  // A new filter starts the list from the top rather than mid-scroll.
  useEffect(() => {
    problemsScrollRef.current?.scrollTo({ top: 0 })
    listScrollRef.current?.scrollTo({ top: 0 })
  }, [selectedTopic, tier, difficulty, status, focusMode, sortBy, deferredSearch])

  // Stable identity keeps the memoised rows from re-rendering.
  const handleChange = useCallback((id, field, value) => {
    setProgress((prev) => {
      const current = prev[id] ?? { status: DEFAULT_STATUS, confidence: '' }
      return { ...prev, [id]: { ...current, [field]: value } }
    })
  }, [])

  const openQuestion = useCallback((id) => setOpenQuestionId(id), [])
  const closeQuestion = useCallback(() => setOpenQuestionId(null), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const drawerQuestion = openQuestionId == null ? null : QUESTIONS_BY_ID.get(openQuestionId)
  const relatedQuestions = useMemo(() => {
    if (!drawerQuestion) return []
    const others = rawQuestions.filter((q) => q.id !== drawerQuestion.id && q.topic === drawerQuestion.topic)
    const samePattern = others.filter((q) => q.pattern === drawerQuestion.pattern)
    const rest = others.filter((q) => q.pattern !== drawerQuestion.pattern)
    return [...samePattern, ...rest].slice(0, RELATED_COUNT)
  }, [drawerQuestion])

  const isFiltered = tier !== ALL || difficulty !== ALL || status !== ALL || search !== '' || focusMode !== 'all'

  function clearFilters() {
    setTier(ALL)
    setDifficulty(ALL)
    setStatus(ALL)
    setSearch('')
    setFocusMode('all')
  }

  function changeView(nextView) {
    setSession(null)
    setView(nextView)
  }

  function browseAll() {
    setSelectedTopic(ALL_TOPICS)
    changeView('problems')
  }

  // Opens the phase at its first topic with unsolved Core problems.
  function browsePhase(phaseNumber) {
    const phase = stats.phaseStats.find((item) => item.phase === phaseNumber)
    const topic = phase.topics.find((item) => item.coreDone < item.coreTotal) ?? phase.topics[0]
    clearFilters()
    setTier('Core')
    setSelectedTopic(topic.topic)
    changeView('problems')
  }

  function startSession() {
    if (queue.length === 0) return
    // Freeze the list: marking problems reorders the live queue mid-session.
    setSession({ ids: queue.map((item) => item.question.id), index: 0, startedAt: Date.now() })
    setView('session')
  }

  const advanceSession = useCallback((step) => {
    setSession((current) => current && { ...current, index: Math.min(Math.max(current.index + step, 0), current.ids.length - 1) })
  }, [])

  function showToast(message, tone = 'info') {
    setToast({ message, tone, id: Date.now() })
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dsa-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoking straight away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast('Progress exported.')
  }

  async function handleImport(file) {
    let safeProgress = null
    try {
      safeProgress = sanitizeProgress(JSON.parse(await file.text()), QUESTION_IDS)
    } catch {
      // Unreadable JSON is reported below, same as an invalid shape.
    }
    if (safeProgress === null) {
      showToast('That file is not a valid progress export.', 'error')
      return
    }

    const count = Object.keys(safeProgress).length
    const hasProgress = Object.keys(progress).length > 0
    if (hasProgress && !window.confirm(`Replace your current progress with the ${count} entries in "${file.name}"? This can't be undone.`)) return

    setProgress(safeProgress)
    showToast(`Imported progress for ${count} ${count === 1 ? 'problem' : 'problems'}.`)
  }

  const selectedStats = selectedTopic === ALL_TOPICS ? stats : stats.topicStats.find((topic) => topic.topic === selectedTopic)
  const listProps = {
    questions: visible,
    progress,
    showTopic: selectedTopic === ALL_TOPICS,
    onChange: handleChange,
    onOpen: openQuestion,
  }

  let content
  if (view === 'session' && session) {
    content = (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <PracticeSession
          key={session.startedAt}
          questions={session.ids.map((id) => QUESTIONS_BY_ID.get(id))}
          index={session.index}
          progress={progress}
          canRestart={queue.length > 0}
          onAdvance={advanceSession}
          onChange={handleChange}
          onRestart={startSession}
          onExit={() => changeView('overview')}
        />
      </main>
    )
  } else if (view === 'problems') {
    content = (
      // Narrow screens scroll the whole page; wider ones scroll only the list.
      <div ref={problemsScrollRef} className="min-h-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
        <Sidebar
          phaseStats={stats.phaseStats}
          overall={stats}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
          isNarrow={isNarrow}
        />

        <main className="md:flex md:min-h-0 md:flex-1 md:flex-col">
          <Filters
            title={selectedTopic === ALL_TOPICS ? 'All problems' : selectedTopic.replace(/^\d+\.\s*/, '')}
            solvedCount={selectedStats.done}
            topicTotal={selectedStats.total}
            tier={tier}
            onTierChange={setTier}
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
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
          />

          <div ref={listScrollRef} className="md:min-h-0 md:flex-1 md:overflow-auto">
            {visible.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <p className="font-medium text-slate-700">No problems match these filters.</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search or loosen a filter.</p>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : isNarrow ? (
              <QuestionCards {...listProps} />
            ) : (
              <QuestionTable {...listProps} />
            )}
          </div>
        </main>
      </div>
    )
  } else {
    content = (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Overview
          metrics={stats}
          queue={queue}
          onStartSession={startSession}
          onBrowseProblems={browseAll}
          onSelectPhase={browsePhase}
          onOpenQuestion={openQuestion}
        />
      </main>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-50 font-sans text-slate-900">
      <TopBar
        view={view === 'session' ? 'overview' : view}
        onViewChange={changeView}
        done={stats.done}
        total={stats.total}
        percent={stats.percent}
        onExport={handleExport}
        onImport={handleImport}
      />

      {content}

      {drawerQuestion && (
        <ProblemDetailDrawer
          question={drawerQuestion}
          progress={progress}
          relatedQuestions={relatedQuestions}
          onChange={handleChange}
          onSelectRelated={openQuestion}
          onClose={closeQuestion}
        />
      )}

      {toast && <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />}
    </div>
  )
}
