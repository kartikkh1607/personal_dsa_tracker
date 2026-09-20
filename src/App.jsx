import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import rawQuestions from './data/questions.json'
import { DIFFICULTIES, splitTopic, topicName } from './constants.js'
import { progressToCsv } from './csv.js'
import { cleanupOrphanImages, deleteImages, MAX_NOTE_IMAGES, requestPersistentStorage } from './images.js'
import { addDays, applyPatch, hasNote, localDate, streakFrom } from './progress.js'
import { isDue, isWeak, nextReviewDate, recordReview, struggleCount } from './review.js'
import { isTypingTarget, REVIEW_KEYS } from './keyboard.js'
import { buildHash, initialRoute, parseHash, rememberRoute } from './route.js'
import {
  BACKUP_KEY,
  BACKUP_SNOOZE_KEY,
  DATA_VERSION,
  loadProgress,
  needsBackupReminder,
  progressFromBackup,
  readLocal,
  sanitizeProgress,
  saveProgress,
  writeLocal,
} from './storage.js'
import { useIsNarrow } from './useIsNarrow.js'
import { useTheme } from './theme.js'
import TopBar from './components/TopBar.jsx'
import Sidebar, { ALL_TOPICS } from './components/Sidebar.jsx'
import Filters, { ALL } from './components/Filters.jsx'
import Overview from './components/Overview.jsx'
import PatternsView from './components/PatternsView.jsx'
import ProblemList, { groupId } from './components/ProblemList.jsx'
import ProblemDetailDrawer from './components/ProblemDetailDrawer.jsx'
import Toast from './components/Toast.jsx'
import Credit from './components/Credit.jsx'

// Topics sort by their leading number, which is part of the topic string.
const TOPICS = [...new Set(rawQuestions.map((q) => q.topic))].sort((a, b) => a.localeCompare(b))
const TOPIC_BY_NUMBER = new Map(TOPICS.map((topic) => [splitTopic(topic).number, topic]))
const QUESTION_IDS = new Set(rawQuestions.map((question) => String(question.id)))
const QUESTIONS_BY_ID = new Map(rawQuestions.map((question) => [question.id, question]))
const TOPIC_PHASE = new Map(rawQuestions.map((q) => [q.topic, { phase: q.phase, phaseName: q.phaseName }]))
const PHASES = [...new Map(rawQuestions.map((q) => [q.phase, q.phaseName]))]
  .map(([phase, name]) => ({ phase, name }))
  .sort((a, b) => a.phase - b.phase)

if (rawQuestions.length !== 922 || TOPICS.length !== 23) {
  console.warn(`Expected 922 questions across 23 topics, got ${rawQuestions.length} across ${TOPICS.length}.`)
}

const WRITE_DELAY_MS = 400
const UP_NEXT_COUNT = 5
const SAVED_PREVIEW_COUNT = 5
const RELATED_COUNT = 6
const BACKUP_SNOOZE_DAYS = 7
const ROW_SHORTCUT_KEYS = new Set(['j', 'k', 'x', 'b', 'g', 's'])
const WEAK_PREVIEW_COUNT = 5

const EMPTY_STATES = {
  all: { title: 'No problems match', body: 'Try a different search or clear the filters.' },
  todo: { title: 'All done here', body: 'Every problem in this list is solved. Nice work.' },
  solved: { title: 'Nothing solved here yet', body: 'Tick a problem once you’ve solved it and it shows up here.' },
  review: { title: 'Nothing due for review', body: 'Solved problems come back for review 7, 30 and 90 days after you solve them.' },
  saved: { title: 'No saved problems here', body: 'Use the bookmark on any problem to save it for revision.' },
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function App() {
  // Saved state only - the static question list is never stored.
  const [progress, setProgress] = useState(() => loadProgress(QUESTION_IDS))
  const [theme, setTheme] = useTheme()
  const [route, setRoute] = useState(initialRoute)
  const [toast, setToast] = useState(null)
  const [lastBackup, setLastBackup] = useState(() => readLocal(BACKUP_KEY))
  const [backupSnoozedUntil, setBackupSnoozedUntil] = useState(() => readLocal(BACKUP_SNOOZE_KEY))

  const isNarrow = useIsNarrow()
  const searchInputRef = useRef(null)
  const problemsScrollRef = useRef(null)
  const listScrollRef = useRef(null)
  const routeRef = useRef(route)
  // True while the open detail panel has its own history entry, so closing it
  // can step back instead of stacking another entry.
  const drawerPushedRef = useRef(false)
  const today = localDate()

  const { view, show, core: coreOnly, notes: notesOnly } = route
  const selectedTopic = (route.topic && TOPIC_BY_NUMBER.get(route.topic)) || ALL_TOPICS
  const difficulty = route.difficulty ?? ALL
  const search = route.q
  const drawerQuestion = (route.problem != null && QUESTIONS_BY_ID.get(route.problem)) || null

  // Typing stays responsive: the input updates on every keystroke, while
  // re-filtering the long list runs at a lower priority and catches up.
  const deferredSearch = useDeferredValue(search)

  // Every navigation goes through here. It updates the address bar, so refresh,
  // Back and bookmarks work, and remembers the page for next time. Filter tweaks
  // replace the current history entry rather than piling up new ones.
  const navigate = useCallback((patch, { replace = false } = {}) => {
    const next = { ...routeRef.current, ...patch }
    routeRef.current = next
    if (patch.problem === null) drawerPushedRef.current = false
    const hash = buildHash(next)
    if (hash !== window.location.hash) window.history[replace ? 'replaceState' : 'pushState'](null, '', hash)
    rememberRoute(next)
    setRoute(next)
  }, [])

  useEffect(() => {
    window.history.replaceState(null, '', buildHash(routeRef.current))
    rememberRoute(routeRef.current)
    function handlePopState() {
      const next = parseHash(window.location.hash)
      routeRef.current = next
      drawerPushedRef.current = false
      rememberRoute(next)
      setRoute(next)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Batch writes so a run of quick changes only hits localStorage once.
  const writeTimer = useRef(null)
  const pendingWrite = useRef(null)
  useEffect(() => {
    clearTimeout(writeTimer.current)
    pendingWrite.current = progress
    writeTimer.current = setTimeout(() => {
      pendingWrite.current = null
      saveProgress(progress)
    }, WRITE_DELAY_MS)
    return () => clearTimeout(writeTimer.current)
  }, [progress])

  // Closing or hiding the tab can beat the timer, so write any pending change
  // straight away rather than losing the last tick.
  useEffect(() => {
    function flush() {
      if (pendingWrite.current === null) return
      clearTimeout(writeTimer.current)
      saveProgress(pendingWrite.current)
      pendingWrite.current = null
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const stats = useMemo(() => {
    const topics = new Map(TOPICS.map((topic) => [topic, { topic, ...TOPIC_PHASE.get(topic), total: 0, solved: 0 }]))
    const phases = new Map(PHASES.map((phase) => [phase.phase, { ...phase, total: 0, solved: 0, topics: [] }]))
    for (const topic of topics.values()) phases.get(topic.phase).topics.push(topic)
    const difficulties = Object.fromEntries(DIFFICULTIES.map((level) => [level, { total: 0, solved: 0 }]))
    const patterns = new Map()
    const activity = new Map()
    const weekStart = addDays(today, -6)
    let solved = 0
    let saved = 0
    let thisWeek = 0

    for (const question of rawQuestions) {
      const entry = progress[question.id]
      const isSolved = entry?.solved === true
      const patternKey = `${question.topic}|${question.pattern}`
      if (!patterns.has(patternKey)) patterns.set(patternKey, { key: patternKey, topic: question.topic, pattern: question.pattern, total: 0, solved: 0 })

      for (const counts of [topics.get(question.topic), phases.get(question.phase), difficulties[question.difficulty], patterns.get(patternKey)]) {
        counts.total++
        if (isSolved) counts.solved++
      }
      if (isSolved) {
        solved++
        if (entry.solvedAt) {
          activity.set(entry.solvedAt, (activity.get(entry.solvedAt) ?? 0) + 1)
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
      streak: streakFrom(new Set(activity.keys())),
      activity,
      difficulties,
      topicStats: [...topics.values()],
      phaseStats: [...phases.values()],
      patternStats: [...patterns.values()],
    }
  }, [progress, today])

  // The sheet's study path: ids are its steps, so each phase's Core, Depth and
  // Stretch problems come before the next phase.
  const upNext = useMemo(
    () =>
      rawQuestions
        .filter((question) => !progress[question.id]?.solved)
        .sort((a, b) => a.id - b.id)
        .slice(0, UP_NEXT_COUNT),
    [progress],
  )
  // Most overdue first.
  const reviewDue = useMemo(
    () =>
      rawQuestions
        .filter((question) => isDue(progress[question.id], today))
        .sort((a, b) => nextReviewDate(progress[a.id]).localeCompare(nextReviewDate(progress[b.id])) || a.id - b.id),
    [progress, today],
  )
  const savedPreview = useMemo(() => rawQuestions.filter((question) => progress[question.id]?.bookmarked).slice(0, SAVED_PREVIEW_COUNT), [progress])
  // Problems you've failed to re-solve at least twice: the ones actually worth
  // more reps. Most-struggled first.
  const weakProblems = useMemo(
    () =>
      rawQuestions
        .filter((question) => isWeak(progress[question.id]))
        .sort((a, b) => struggleCount(progress[b.id]) - struggleCount(progress[a.id]) || a.id - b.id),
    [progress],
  )
  const currentPhase = upNext.length > 0 ? stats.phaseStats.find((phase) => phase.phase === upNext[0].phase) : null

  // Topic, show, difficulty, Core-only and search all combine.
  const visible = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    return rawQuestions.filter((question) => {
      if (selectedTopic !== ALL_TOPICS && question.topic !== selectedTopic) return false
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
  }, [progress, today, selectedTopic, difficulty, coreOnly, notesOnly, show, deferredSearch])

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

  // A new filter starts the list from the top rather than mid-scroll...
  useEffect(() => {
    problemsScrollRef.current?.scrollTo({ top: 0 })
    listScrollRef.current?.scrollTo({ top: 0 })
  }, [selectedTopic, difficulty, coreOnly, notesOnly, show, deferredSearch])

  // ...unless a pattern was picked on the Patterns page: then jump to it.
  useEffect(() => {
    if (view !== 'problems' || !route.pattern) return
    document.getElementById(groupId(route.pattern))?.scrollIntoView({ block: 'start' })
  }, [view, route.pattern, route.topic])

  // Once per start-up: ask the browser to keep stored images, and remove
  // images no saved note refers to (only old ones - see cleanupOrphanImages).
  const startupProgress = useRef(progress)
  useEffect(() => {
    requestPersistentStorage()
    cleanupOrphanImages(startupProgress.current)
  }, [])

  // Stable identities keep the memoised rows from re-rendering.
  const toggleSolved = useCallback((id) => {
    setProgress((prev) =>
      applyPatch(
        prev,
        id,
        prev[id]?.solved
          ? { solved: false, solvedAt: undefined, reviewedAt: undefined, reviews: undefined, history: undefined }
          : { solved: true, solvedAt: localDate() },
      ),
    )
  }, [])
  const toggleBookmark = useCallback((id) => {
    setProgress((prev) => applyPatch(prev, id, { bookmarked: !prev[id]?.bookmarked }))
  }, [])
  // How the re-solve went: 'got' advances the schedule, 'struggled' sends the
  // problem back to the 3-day relearn step and saves it.
  const reviewProblem = useCallback((id, result) => {
    setProgress((prev) => applyPatch(prev, id, recordReview(prev[id], result, localDate())))
  }, [])
  const changeNotes = useCallback((id, notes) => setProgress((prev) => applyPatch(prev, id, { notes })), [])
  const changeLink = useCallback((id, link) => setProgress((prev) => applyPatch(prev, id, { link })), [])
  // The images are already stored by the time their ids arrive here.
  const addNoteImages = useCallback((id, imageIds) => {
    setProgress((prev) => applyPatch(prev, id, { images: [...(prev[id]?.images ?? []), ...imageIds].slice(0, MAX_NOTE_IMAGES) }))
  }, [])
  const removeNoteImage = useCallback((id, imageId) => {
    setProgress((prev) => {
      const images = (prev[id]?.images ?? []).filter((item) => item !== imageId)
      return applyPatch(prev, id, { images: images.length > 0 ? images : undefined })
    })
    deleteImages([imageId])
  }, [])
  const clearNote = useCallback((id, imageIds) => {
    setProgress((prev) => applyPatch(prev, id, { notes: undefined, images: undefined }))
    deleteImages(imageIds)
  }, [])

  const openQuestion = useCallback(
    (id) => {
      const alreadyOpen = routeRef.current.problem != null
      navigate({ problem: id }, { replace: alreadyOpen })
      if (!alreadyOpen) drawerPushedRef.current = true
    },
    [navigate],
  )
  const closeQuestion = useCallback(() => {
    if (drawerPushedRef.current) {
      drawerPushedRef.current = false
      window.history.back()
    } else {
      navigate({ problem: null }, { replace: true })
    }
  }, [navigate])
  const dismissToast = useCallback(() => setToast(null), [])

  function showToast(message, options = {}) {
    setToast({ message, tone: options.tone ?? 'info', action: options.action, id: Date.now() })
  }

  // Actions that make a problem disappear from a Home list offer an undo.
  function withUndo(id, message, change) {
    const previous = progress[id]
    change(id)
    showToast(message, {
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

  const drawerOpen = drawerQuestion !== null

  // g/s act on the focused row's saved entry, which changes constantly. Reading
  // it from a ref keeps the listener itself stable.
  const progressRef = useRef(progress)
  progressRef.current = progress

  // Keyboard: "/" searches from anywhere. On the problems page, j/k move between
  // rows, x ticks and b bookmarks the focused row, Enter opens it, and g/s
  // record a review outcome on a row that is due.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      if (event.key === '/') {
        event.preventDefault()
        navigate({ view: 'problems', problem: null })
        requestAnimationFrame(() => searchInputRef.current?.focus())
        return
      }
      if (view !== 'problems' || drawerOpen || !ROW_SHORTCUT_KEYS.has(event.key)) return
      const rows = [...document.querySelectorAll('[data-problem-row]')]
      if (rows.length === 0) return
      const current = rows.findIndex((row) => row.contains(document.activeElement))
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        const step = event.key === 'j' ? 1 : -1
        const next = current === -1 ? 0 : Math.min(Math.max(current + step, 0), rows.length - 1)
        const target = rows[next].querySelector('[data-row-open]')
        target?.focus()
        target?.scrollIntoView({ block: 'nearest' })
        return
      }
      if (current === -1) return
      if (event.key === 'x' || event.key === 'b') {
        event.preventDefault()
        rows[current].querySelector(event.key === 'x' ? '[role="checkbox"]' : '[data-row-bookmark]')?.click()
        return
      }
      // Reviewing only makes sense for a problem that is actually due, so g/s
      // stay inert elsewhere rather than silently rescheduling something.
      const id = Number(rows[current].dataset.questionId)
      if (isDue(progressRef.current[id], localDate())) {
        event.preventDefault()
        reviewProblem(id, REVIEW_KEYS[event.key])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, drawerOpen, navigate, reviewProblem])

  const relatedQuestions = useMemo(() => {
    if (!drawerQuestion) return []
    const others = rawQuestions.filter((q) => q.id !== drawerQuestion.id && q.topic === drawerQuestion.topic)
    const samePattern = others.filter((q) => q.pattern === drawerQuestion.pattern)
    const rest = others.filter((q) => q.pattern !== drawerQuestion.pattern)
    return [...samePattern, ...rest].slice(0, RELATED_COUNT)
  }, [drawerQuestion])

  const isFiltered = show !== 'all' || difficulty !== ALL || coreOnly || notesOnly || search !== ''

  function clearFilters() {
    navigate({ show: 'all', difficulty: null, core: false, notes: false, q: '' }, { replace: true })
  }

  function goToProblems({ topic = null, show: nextShow = 'all', pattern = null } = {}) {
    navigate({
      view: 'problems',
      topic: topic ? splitTopic(topic).number : null,
      show: nextShow,
      difficulty: null,
      core: false,
      notes: false,
      q: '',
      pattern,
      problem: null,
    })
  }

  function selectPhase(phaseNumber) {
    const phase = stats.phaseStats.find((item) => item.phase === phaseNumber)
    const topic = phase.topics.find((item) => item.solved < item.total) ?? phase.topics[0]
    goToProblems({ topic: topic.topic })
  }

  // Prefers an unsolved problem, so "Random" is always something to practise.
  function pickRandom() {
    const unsolved = visible.filter((question) => !progress[question.id]?.solved)
    const pool = unsolved.length > 0 ? unsolved : visible
    if (pool.length === 0) return
    openQuestion(pool[Math.floor(Math.random() * pool.length)].id)
  }

  function handleExport() {
    downloadFile(`dsa-progress-${today}.json`, JSON.stringify({ version: DATA_VERSION, progress }, null, 2), 'application/json')
    writeLocal(BACKUP_KEY, today)
    setLastBackup(today)
    showToast('Backup exported')
  }

  function handleExportCsv() {
    // The byte-order mark tells Excel the file is UTF-8, so symbols survive.
    downloadFile(`dsa-progress-${today}.csv`, `\uFEFF${progressToCsv(rawQuestions, progress)}`, 'text/csv;charset=utf-8')
    showToast('Exported for Excel')
  }

  function snoozeBackup() {
    const until = addDays(today, BACKUP_SNOOZE_DAYS)
    writeLocal(BACKUP_SNOOZE_KEY, until)
    setBackupSnoozedUntil(until)
  }

  async function handleImport(file) {
    let safeProgress = null
    try {
      safeProgress = sanitizeProgress(progressFromBackup(JSON.parse(await file.text())), QUESTION_IDS)
    } catch {
      // Unreadable JSON is reported below, same as an invalid shape.
    }
    if (safeProgress === null) {
      showToast('That file is not a valid progress backup', { tone: 'error' })
      return
    }

    const count = Object.keys(safeProgress).length
    const hasProgress = Object.keys(progress).length > 0
    if (hasProgress && !window.confirm(`Replace your current progress with the ${count} entries in "${file.name}"? This can't be undone.`)) return

    setProgress(safeProgress)
    showToast(`Imported progress for ${count} ${count === 1 ? 'problem' : 'problems'}`)
  }

  const showBackupReminder = needsBackupReminder({
    progressCount: Object.keys(progress).length,
    lastBackup,
    snoozedUntil: backupSnoozedUntil,
    today,
  })

  const topicStats = stats.topicStats.find((topic) => topic.topic === selectedTopic)
  const header = topicStats
    ? { eyebrow: `Phase ${topicStats.phase} · ${topicStats.phaseName}`, title: topicName(selectedTopic), solved: topicStats.solved, total: topicStats.total }
    : { eyebrow: `${stats.phaseStats.length} phases · ${TOPICS.length} topics`, title: 'All problems', solved: stats.solved, total: stats.total }
  const emptyState = EMPTY_STATES[search === '' && difficulty === ALL && !coreOnly && !notesOnly ? show : 'all']

  let content
  if (view === 'problems') {
    content = (
      // Narrow screens scroll the whole page; wider ones scroll only the list.
      <div ref={problemsScrollRef} className="min-h-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
        <Sidebar
          phaseStats={stats.phaseStats}
          overall={stats}
          selectedTopic={selectedTopic}
          onSelectTopic={(topic) => navigate({ topic: topic === ALL_TOPICS ? null : splitTopic(topic).number, pattern: null })}
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
            onSearchChange={(value) => navigate({ q: value }, { replace: true })}
            searchInputRef={searchInputRef}
            show={show}
            onShowChange={(value) => navigate({ show: value }, { replace: true })}
            reviewCount={reviewDue.length}
            difficulty={difficulty}
            onDifficultyChange={(value) => navigate({ difficulty: value === ALL ? null : value }, { replace: true })}
            coreOnly={coreOnly}
            onCoreOnlyChange={(value) => navigate({ core: value }, { replace: true })}
            notesOnly={notesOnly}
            onNotesOnlyChange={(value) => navigate({ notes: value }, { replace: true })}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
            onRandom={pickRandom}
            canPickRandom={visible.length > 0}
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
                today={today}
                showPattern={!groupByPattern}
                onToggleSolved={toggleSolved}
                onToggleBookmark={toggleBookmark}
                onOpen={openQuestion}
              />
            )}
            <Credit className="pb-8" />
          </div>
        </main>
      </div>
    )
  } else if (view === 'patterns') {
    content = (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <PatternsView patternStats={stats.patternStats} onOpenPattern={(topic, pattern) => goToProblems({ topic, pattern })} />
      </main>
    )
  } else {
    content = (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Overview
          stats={stats}
          upNext={upNext}
          reviewDue={reviewDue}
          savedPreview={savedPreview}
          currentPhase={currentPhase}
          progress={progress}
          today={today}
          showBackupReminder={showBackupReminder}
          lastBackup={lastBackup}
          onBackupNow={handleExport}
          onSnoozeBackup={snoozeBackup}
          weakProblems={weakProblems.slice(0, WEAK_PREVIEW_COUNT)}
          weakCount={weakProblems.length}
          onSolve={(id) => withUndo(id, `Solved “${QUESTIONS_BY_ID.get(id).problem}”`, toggleSolved)}
          onReview={(id, result) =>
            withUndo(id, result === 'got' ? `Reviewed “${QUESTIONS_BY_ID.get(id).problem}”` : `Back in 3 days: “${QUESTIONS_BY_ID.get(id).problem}”`, () =>
              reviewProblem(id, result),
            )
          }
          onToggleBookmark={toggleBookmark}
          onOpenQuestion={openQuestion}
          onContinue={() => goToProblems({ topic: upNext[0].topic, show: 'todo' })}
          onSelectPhase={selectPhase}
          onShowSaved={() => goToProblems({ show: 'saved' })}
          onShowReview={() => goToProblems({ show: 'review' })}
          onShowPatterns={() => navigate({ view: 'patterns', problem: null })}
          onBrowse={() => goToProblems()}
        />
      </main>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-canvas font-sans text-ink">
      <TopBar
        view={view}
        onViewChange={(nextView) => navigate({ view: nextView, problem: null })}
        solved={stats.solved}
        total={stats.total}
        theme={theme}
        onThemeChange={setTheme}
        lastBackup={lastBackup}
        onExport={handleExport}
        onExportCsv={handleExportCsv}
        onImport={handleImport}
      />

      {content}

      {drawerQuestion && (
        <ProblemDetailDrawer
          question={drawerQuestion}
          progress={progress}
          today={today}
          relatedQuestions={relatedQuestions}
          onToggleSolved={toggleSolved}
          onToggleBookmark={toggleBookmark}
          onReview={reviewProblem}
          onNotesChange={changeNotes}
          onAddImages={addNoteImages}
          onRemoveImage={removeNoteImage}
          onClearNote={clearNote}
          onLinkChange={changeLink}
          onSelectRelated={openQuestion}
          onClose={closeQuestion}
        />
      )}

      {toast && <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />}
    </div>
  )
}
