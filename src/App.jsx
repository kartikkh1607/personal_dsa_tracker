import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import rawQuestions from './data/questions.json'
import { DIFFICULTIES, TIER_RANK, topicName } from './constants.js'
import { applyPatch, localDate, streakFrom } from './progress.js'
import { loadProgress, sanitizeProgress, saveProgress } from './storage.js'
import { useIsNarrow } from './useIsNarrow.js'
import { useTheme } from './theme.js'
import TopBar from './components/TopBar.jsx'
import Sidebar, { ALL_TOPICS } from './components/Sidebar.jsx'
import Filters, { ALL } from './components/Filters.jsx'
import Overview from './components/Overview.jsx'
import ProblemList from './components/ProblemList.jsx'
import ProblemDetailDrawer from './components/ProblemDetailDrawer.jsx'
import Toast from './components/Toast.jsx'

// Topics sort by their leading number, which is part of the topic string.
const TOPICS = [...new Set(rawQuestions.map((q) => q.topic))].sort((a, b) => a.localeCompare(b))
const QUESTION_IDS = new Set(rawQuestions.map((question) => String(question.id)))
const QUESTIONS_BY_ID = new Map(rawQuestions.map((question) => [question.id, question]))
const TOPIC_PHASE = new Map(rawQuestions.map((q) => [q.topic, { phase: q.phase, phaseName: q.phaseName }]))
const PHASES = [...new Map(rawQuestions.map((q) => [q.phase, q.phaseName]))]
  .map(([phase, name]) => ({ phase, name }))
  .sort((a, b) => a.phase - b.phase)

if (rawQuestions.length !== 570 || TOPICS.length !== 23) {
  console.warn(`Expected 570 questions across 23 topics, got ${rawQuestions.length} across ${TOPICS.length}.`)
}

const WRITE_DELAY_MS = 400
const UP_NEXT_COUNT = 5
const SAVED_PREVIEW_COUNT = 5
const RELATED_COUNT = 6

const EMPTY_STATES = {
  saved: { title: 'No saved problems here', body: 'Use the bookmark on any problem to save it for revision.' },
  solved: { title: 'Nothing solved here yet', body: 'Tick a problem once you’ve solved it and it shows up here.' },
  unsolved: { title: 'All done here', body: 'Every problem in this list is solved. Nice work.' },
  all: { title: 'No problems match', body: 'Try a different search or clear the filters.' },
}

export default function App() {
  // Saved state only - the static question list is never stored.
  const [progress, setProgress] = useState(() => loadProgress(QUESTION_IDS))
  const [theme, setTheme] = useTheme()

  const [view, setView] = useState('home')
  const [openQuestionId, setOpenQuestionId] = useState(null)
  const [toast, setToast] = useState(null)

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS)
  const [show, setShow] = useState('all')
  const [difficulty, setDifficulty] = useState(ALL)
  const [coreOnly, setCoreOnly] = useState(false)
  const [search, setSearch] = useState('')

  const isNarrow = useIsNarrow()
  const searchInputRef = useRef(null)
  const problemsScrollRef = useRef(null)
  const listScrollRef = useRef(null)

  // Typing stays responsive: the input updates on every keystroke, while
  // re-filtering the long list runs at a lower priority and catches up.
  const deferredSearch = useDeferredValue(search)

  // "/" jumps to search from anywhere, without stealing keystrokes when the
  // user is already typing in a form control.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
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
  }, [])

  // Batch writes so a run of quick changes only hits localStorage once.
  const writeTimer = useRef(null)
  useEffect(() => {
    clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => saveProgress(progress), WRITE_DELAY_MS)
    return () => clearTimeout(writeTimer.current)
  }, [progress])

  const stats = useMemo(() => {
    const topics = new Map(TOPICS.map((topic) => [topic, { topic, ...TOPIC_PHASE.get(topic), total: 0, solved: 0 }]))
    const phases = new Map(PHASES.map((phase) => [phase.phase, { ...phase, total: 0, solved: 0, topics: [] }]))
    for (const topic of topics.values()) phases.get(topic.phase).topics.push(topic)
    const difficulties = Object.fromEntries(DIFFICULTIES.map((level) => [level, { total: 0, solved: 0 }]))

    const solvedDates = new Set()
    const weekStart = localDate(-6)
    let solved = 0
    let saved = 0
    let thisWeek = 0

    for (const question of rawQuestions) {
      const entry = progress[question.id]
      const isSolved = entry?.solved === true
      for (const counts of [topics.get(question.topic), phases.get(question.phase), difficulties[question.difficulty]]) {
        counts.total++
        if (isSolved) counts.solved++
      }
      if (isSolved) {
        solved++
        if (entry.solvedAt) {
          solvedDates.add(entry.solvedAt)
          if (entry.solvedAt >= weekStart) thisWeek++
        }
      }
      if (entry?.bookmarked) saved++
    }

    return {
      total: rawQuestions.length,
      solved,
      saved,
      thisWeek,
      streak: streakFrom(solvedDates),
      difficulties,
      topicStats: [...topics.values()],
      phaseStats: [...phases.values()],
    }
  }, [progress])

  // The sheet's plan: every Core problem in phase order, then Depth, then Stretch.
  const upNext = useMemo(
    () =>
      rawQuestions
        .filter((question) => !progress[question.id]?.solved)
        .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.id - b.id)
        .slice(0, UP_NEXT_COUNT),
    [progress],
  )
  const savedPreview = useMemo(() => rawQuestions.filter((question) => progress[question.id]?.bookmarked).slice(0, SAVED_PREVIEW_COUNT), [progress])
  const currentPhase = upNext.length > 0 ? stats.phaseStats.find((phase) => phase.phase === upNext[0].phase) : null

  // Topic, show, difficulty, Core-only and search all combine.
  const visible = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    return rawQuestions.filter((question) => {
      if (selectedTopic !== ALL_TOPICS && question.topic !== selectedTopic) return false
      if (difficulty !== ALL && question.difficulty !== difficulty) return false
      if (coreOnly && question.tier !== 'Core') return false
      const entry = progress[question.id]
      if (show === 'unsolved' && entry?.solved) return false
      if (show === 'solved' && !entry?.solved) return false
      if (show === 'saved' && !entry?.bookmarked) return false
      if (term && !question.problem.toLowerCase().includes(term) && !question.pattern.toLowerCase().includes(term)) return false
      return true
    })
  }, [progress, selectedTopic, difficulty, coreOnly, show, deferredSearch])

  // A single topic groups by pattern; all problems group by topic.
  const groupByPattern = selectedTopic !== ALL_TOPICS
  const groups = useMemo(() => {
    const byKey = new Map()
    for (const question of visible) {
      const key = groupByPattern ? question.pattern : question.topic
      if (!byKey.has(key)) byKey.set(key, { key, label: groupByPattern ? key : topicName(key), items: [], solved: 0 })
      const group = byKey.get(key)
      group.items.push(question)
      if (progress[question.id]?.solved) group.solved++
    }
    return [...byKey.values()]
  }, [visible, groupByPattern, progress])

  // A new filter starts the list from the top rather than mid-scroll.
  useEffect(() => {
    problemsScrollRef.current?.scrollTo({ top: 0 })
    listScrollRef.current?.scrollTo({ top: 0 })
  }, [selectedTopic, difficulty, coreOnly, show, deferredSearch])

  // Stable identities keep the memoised rows from re-rendering.
  const toggleSolved = useCallback((id) => {
    setProgress((prev) => applyPatch(prev, id, prev[id]?.solved ? { solved: false, solvedAt: undefined } : { solved: true, solvedAt: localDate() }))
  }, [])
  const toggleBookmark = useCallback((id) => {
    setProgress((prev) => applyPatch(prev, id, { bookmarked: !prev[id]?.bookmarked }))
  }, [])
  const changeNotes = useCallback((id, notes) => setProgress((prev) => applyPatch(prev, id, { notes })), [])
  const changeLink = useCallback((id, link) => setProgress((prev) => applyPatch(prev, id, { link })), [])

  const openQuestion = useCallback((id) => setOpenQuestionId(id), [])
  const closeQuestion = useCallback(() => setOpenQuestionId(null), [])
  const dismissToast = useCallback(() => setToast(null), [])

  function showToast(message, options = {}) {
    setToast({ message, tone: options.tone ?? 'info', action: options.action, id: Date.now() })
  }

  // Ticking from Up next removes the problem from that list, so offer an undo.
  function solveFromUpNext(id) {
    const previous = progress[id]
    toggleSolved(id)
    showToast(`Solved “${QUESTIONS_BY_ID.get(id).problem}”`, {
      action: {
        label: 'Undo',
        onClick: () =>
          setProgress((prev) => {
            const next = { ...prev }
            if (previous) next[id] = previous
            else delete next[id]
            return next
          }),
      },
    })
  }

  const drawerQuestion = openQuestionId == null ? null : QUESTIONS_BY_ID.get(openQuestionId)
  const relatedQuestions = useMemo(() => {
    if (!drawerQuestion) return []
    const others = rawQuestions.filter((q) => q.id !== drawerQuestion.id && q.topic === drawerQuestion.topic)
    const samePattern = others.filter((q) => q.pattern === drawerQuestion.pattern)
    const rest = others.filter((q) => q.pattern !== drawerQuestion.pattern)
    return [...samePattern, ...rest].slice(0, RELATED_COUNT)
  }, [drawerQuestion])

  const isFiltered = show !== 'all' || difficulty !== ALL || coreOnly || search !== ''

  function clearFilters() {
    setShow('all')
    setDifficulty(ALL)
    setCoreOnly(false)
    setSearch('')
  }

  function goToProblems({ topic = ALL_TOPICS, nextShow = 'all' } = {}) {
    clearFilters()
    setShow(nextShow)
    setSelectedTopic(topic)
    setView('problems')
  }

  function selectPhase(phaseNumber) {
    const phase = stats.phaseStats.find((item) => item.phase === phaseNumber)
    const topic = phase.topics.find((item) => item.solved < item.total) ?? phase.topics[0]
    goToProblems({ topic: topic.topic })
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dsa-progress-${localDate()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoking straight away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast('Progress exported')
  }

  async function handleImport(file) {
    let safeProgress = null
    try {
      safeProgress = sanitizeProgress(JSON.parse(await file.text()), QUESTION_IDS)
    } catch {
      // Unreadable JSON is reported below, same as an invalid shape.
    }
    if (safeProgress === null) {
      showToast('That file is not a valid progress export', { tone: 'error' })
      return
    }

    const count = Object.keys(safeProgress).length
    const hasProgress = Object.keys(progress).length > 0
    if (hasProgress && !window.confirm(`Replace your current progress with the ${count} entries in "${file.name}"? This can't be undone.`)) return

    setProgress(safeProgress)
    showToast(`Imported progress for ${count} ${count === 1 ? 'problem' : 'problems'}`)
  }

  const topicStats = stats.topicStats.find((topic) => topic.topic === selectedTopic)
  const header = topicStats
    ? { eyebrow: `Phase ${topicStats.phase} · ${topicStats.phaseName}`, title: topicName(selectedTopic), solved: topicStats.solved, total: topicStats.total }
    : { eyebrow: `${stats.phaseStats.length} phases · ${TOPICS.length} topics`, title: 'All problems', solved: stats.solved, total: stats.total }
  const emptyState = EMPTY_STATES[search === '' && difficulty === ALL && !coreOnly ? show : 'all']

  return (
    <div className="flex h-dvh flex-col bg-canvas font-sans text-ink">
      <TopBar
        view={view}
        onViewChange={setView}
        solved={stats.solved}
        total={stats.total}
        theme={theme}
        onThemeChange={setTheme}
        onExport={handleExport}
        onImport={handleImport}
      />

      {view === 'problems' ? (
        // Narrow screens scroll the whole page; wider ones scroll only the list.
        <div ref={problemsScrollRef} className="min-h-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
          <Sidebar
            phaseStats={stats.phaseStats}
            overall={stats}
            selectedTopic={selectedTopic}
            onSelectTopic={setSelectedTopic}
            currentPhase={currentPhase?.phase}
            isNarrow={isNarrow}
          />

          <main className="bg-surface md:flex md:min-h-0 md:flex-1 md:flex-col">
            <Filters
              eyebrow={header.eyebrow}
              title={header.title}
              solvedCount={header.solved}
              total={header.total}
              search={search}
              onSearchChange={setSearch}
              searchInputRef={searchInputRef}
              show={show}
              onShowChange={setShow}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              coreOnly={coreOnly}
              onCoreOnlyChange={setCoreOnly}
              isFiltered={isFiltered}
              onClearFilters={clearFilters}
            />

            <div ref={listScrollRef} className="md:min-h-0 md:flex-1 md:overflow-y-auto">
              {groups.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <p className="font-semibold text-ink">{emptyState.title}</p>
                  <p className="mt-1 text-sm text-ink-3">{emptyState.body}</p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-5 h-9 rounded-lg border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-subtle"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <ProblemList
                  groups={groups}
                  progress={progress}
                  showPattern={!groupByPattern}
                  onToggleSolved={toggleSolved}
                  onToggleBookmark={toggleBookmark}
                  onOpen={openQuestion}
                />
              )}
            </div>
          </main>
        </div>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Overview
            stats={stats}
            upNext={upNext}
            savedPreview={savedPreview}
            currentPhase={currentPhase}
            progress={progress}
            onSolve={solveFromUpNext}
            onToggleBookmark={toggleBookmark}
            onOpenQuestion={openQuestion}
            onContinue={() => goToProblems({ topic: upNext[0].topic, nextShow: 'unsolved' })}
            onSelectPhase={selectPhase}
            onShowSaved={() => goToProblems({ nextShow: 'saved' })}
            onBrowse={() => goToProblems()}
          />
        </main>
      )}

      {drawerQuestion && (
        <ProblemDetailDrawer
          question={drawerQuestion}
          progress={progress}
          relatedQuestions={relatedQuestions}
          onToggleSolved={toggleSolved}
          onToggleBookmark={toggleBookmark}
          onNotesChange={changeNotes}
          onLinkChange={changeLink}
          onSelectRelated={openQuestion}
          onClose={closeQuestion}
        />
      )}

      {toast && <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />}
    </div>
  )
}
