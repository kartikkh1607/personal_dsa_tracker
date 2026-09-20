import { useEffect, useRef, useState } from 'react'
import { splitTopic } from './constants.js'
import { cleanupOrphanImages, requestPersistentStorage } from './images.js'
import { localDate } from './progress.js'
import { loadQuestions } from './questions.js'
import { useTheme } from './theme.js'
import { useIsNarrow } from './useIsNarrow.js'
import { useBackup } from './hooks/useBackup.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
import { useFilteredProblems, useHomeLists, useRelatedQuestions, useStats } from './hooks/useProblemLists.js'
import { useProgress } from './hooks/useProgress.js'
import { useRoute } from './hooks/useRoute.js'
import { useToast } from './hooks/useToast.js'
import { ALL } from './components/Filters.jsx'
import { ALL_TOPICS } from './components/Sidebar.jsx'
import AppSkeleton from './components/AppSkeleton.jsx'
import LoadFailed from './components/LoadFailed.jsx'
import Overview from './components/Overview.jsx'
import PatternsView from './components/PatternsView.jsx'
import ProblemDetailDrawer from './components/ProblemDetailDrawer.jsx'
import ProblemsPage from './components/ProblemsPage.jsx'
import Toast from './components/Toast.jsx'
import TopBar from './components/TopBar.jsx'

const WEAK_PREVIEW_COUNT = 5

function Tracker({ data }) {
  const { questions, topics, topicByNumber, questionIds, questionsById, topicPhase, phases } = data

  const [theme, setTheme] = useTheme()
  const isNarrow = useIsNarrow()
  const searchInputRef = useRef(null)
  const today = localDate()

  const { route, navigate, openQuestion, closeQuestion } = useRoute()
  const { progress, setProgress, restoreEntry, toggleSolved, toggleBookmark, reviewProblem, ...notes } = useProgress(questionIds)
  const { toast, showToast, dismissToast } = useToast()

  const { view } = route
  const selectedTopic = (route.topic && topicByNumber.get(route.topic)) || ALL_TOPICS
  const difficulty = route.difficulty ?? ALL
  const drawerQuestion = (route.problem != null && questionsById.get(route.problem)) || null

  const stats = useStats({ questions, topics, phases, topicPhase, progress, today })
  const { upNext, reviewDue, savedPreview, weakProblems } = useHomeLists({ questions, progress, today })
  const { visible, groupByPattern } = useFilteredProblems({
    questions,
    progress,
    today,
    selectedTopic,
    difficulty,
    coreOnly: route.core,
    notesOnly: route.notes,
    show: route.show,
    search: route.q,
  })
  const relatedQuestions = useRelatedQuestions(questions, drawerQuestion)
  const currentPhase = upNext.length > 0 ? stats.phaseStats.find((phase) => phase.phase === upNext[0].phase) : null

  const backup = useBackup({ progress, setProgress, questions, questionIds, today, showToast })

  useKeyboardShortcuts({
    view,
    drawerOpen: drawerQuestion !== null,
    progress,
    navigate,
    onReview: reviewProblem,
    searchInputRef,
  })

  // Once per start-up: ask the browser to keep stored images, and remove
  // images no saved note refers to (only old ones - see cleanupOrphanImages).
  const startupProgress = useRef(progress)
  useEffect(() => {
    requestPersistentStorage()
    cleanupOrphanImages(startupProgress.current)
  }, [])

  // Actions that make a problem disappear from a Home list offer an undo.
  function withUndo(id, message, change) {
    const previous = progress[id]
    change(id)
    showToast(message, { action: { label: 'Undo', onClick: () => restoreEntry(id, previous) } })
  }

  function goToProblems({ topic = null, show = 'all', pattern = null } = {}) {
    navigate({ view: 'problems', topic: topic ? splitTopic(topic).number : null, show, difficulty: null, core: false, notes: false, q: '', pattern, problem: null })
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

  const named = (id) => questionsById.get(id).problem

  let content
  if (view === 'problems') {
    content = (
      <ProblemsPage
        route={route}
        navigate={navigate}
        stats={stats}
        topicCount={topics.length}
        progress={progress}
        today={today}
        visible={visible}
        groupByPattern={groupByPattern}
        selectedTopic={selectedTopic}
        difficulty={difficulty}
        reviewCount={reviewDue.length}
        currentPhase={currentPhase}
        isNarrow={isNarrow}
        searchInputRef={searchInputRef}
        onToggleSolved={toggleSolved}
        onToggleBookmark={toggleBookmark}
        onOpenQuestion={openQuestion}
        onPickRandom={pickRandom}
      />
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
          showBackupReminder={backup.showBackupReminder}
          lastBackup={backup.lastBackup}
          onBackupNow={backup.handleExport}
          onSnoozeBackup={backup.snoozeBackup}
          weakProblems={weakProblems.slice(0, WEAK_PREVIEW_COUNT)}
          weakCount={weakProblems.length}
          onSolve={(id) => withUndo(id, `Solved “${named(id)}”`, toggleSolved)}
          onReview={(id, result) =>
            withUndo(id, result === 'got' ? `Reviewed “${named(id)}”` : `Back in 3 days: “${named(id)}”`, () => reviewProblem(id, result))
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
        lastBackup={backup.lastBackup}
        onExport={backup.handleExport}
        onExportCsv={backup.handleExportCsv}
        onImport={backup.handleImport}
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
          onNotesChange={notes.changeNotes}
          onAddImages={notes.addNoteImages}
          onRemoveImage={notes.removeNoteImage}
          onClearNote={notes.clearNote}
          onLinkChange={notes.changeLink}
          onSelectRelated={openQuestion}
          onClose={closeQuestion}
        />
      )}

      {toast && <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />}
    </div>
  )
}

// The question list is fetched rather than bundled, so the app has a brief
// loading state. Progress is read only once the ids are known, because
// sanitising it needs them.
export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadQuestions().then(
      (loaded) => !cancelled && setData(loaded),
      (loadError) => !cancelled && setError(loadError),
    )
    return () => {
      cancelled = true
    }
  }, [error])

  if (error) return <LoadFailed onRetry={() => setError(null)} />
  if (!data) return <AppSkeleton />
  return <Tracker data={data} />
}
