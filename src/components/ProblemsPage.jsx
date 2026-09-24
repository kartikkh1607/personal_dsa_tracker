import { useEffect, useMemo, useRef } from 'react'
import { splitTopic, topicName } from '../constants.js'
import Sidebar, { ALL_TOPICS } from './Sidebar.jsx'
import Filters, { ALL } from './Filters.jsx'
import ProblemList, { groupId } from './ProblemList.jsx'
import Credit from './Credit.jsx'
import { ProgressBar } from './QuestionControls.jsx'

const EMPTY_STATES = {
  all: { title: 'No problems match', body: 'Try a different search or clear the filters.' },
  todo: { title: 'All done here', body: 'Every problem in this list is solved. Nice work.' },
  solved: { title: 'Nothing solved here yet', body: 'Tick a problem once you’ve solved it and it shows up here.' },
  review: { title: 'Nothing due for review', body: 'Solved problems come back for review 7, 30 and 90 days after you solve them.' },
  saved: { title: 'No saved problems here', body: 'Use the bookmark on any problem to save it for revision.' },
}

export default function ProblemsPage({
  route,
  navigate,
  stats,
  progress,
  today,
  visible,
  groupByPattern,
  searching,
  selectedTopic,
  difficulty,
  reviewCount,
  currentPhase,
  isNarrow,
  searchInputRef,
  onToggleSolved,
  onToggleBookmark,
  onOpenQuestion,
  onPickRandom,
}) {
  const { show, core: coreOnly, notes: notesOnly, q: search } = route
  const pageScrollRef = useRef(null)

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
    pageScrollRef.current?.scrollTo({ top: 0 })
  }, [selectedTopic, difficulty, coreOnly, notesOnly, show, search])

  // ...unless a pattern was picked on the Patterns page: then jump to it.
  useEffect(() => {
    if (!route.pattern) return
    document.getElementById(groupId(route.pattern))?.scrollIntoView({ block: 'start' })
  }, [route.pattern, route.topic])

  const isFiltered = show !== 'all' || difficulty !== ALL || coreOnly || notesOnly || search !== ''
  const emptyState = EMPTY_STATES[search === '' && difficulty === ALL && !coreOnly && !notesOnly ? show : 'all']

  function clearFilters() {
    navigate({ show: 'all', difficulty: null, core: false, notes: false, q: '' }, { replace: true })
  }

  // A search covers the whole sheet whatever topic is selected, so while one
  // is running the page speaks for all of it.
  const topicStats = searching ? null : stats.topicStats.find((topic) => topic.topic === selectedTopic)
  const scope = topicStats
    ? { title: topicName(selectedTopic), solved: topicStats.solved, total: topicStats.total }
    : { title: searching ? `Searching all ${stats.total} problems` : 'All problems', solved: stats.solved, total: stats.total }

  return (
    <div ref={pageScrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="shell grid grid-cols-1 gap-7 pt-5 min-[1001px]:grid-cols-[232px_minmax(0,1fr)]">
        <Sidebar
          phaseStats={stats.phaseStats}
          overall={stats}
          selectedTopic={selectedTopic}
          // Picking a topic is asking for that topic, so it ends any search -
          // otherwise the search would keep overriding it and the click would
          // look like it did nothing.
          onSelectTopic={(topic) => navigate({ topic: topic === ALL_TOPICS ? null : splitTopic(topic).number, pattern: null, q: '' })}
          currentPhase={currentPhase?.phase}
          isNarrow={isNarrow}
          searching={searching}
        />

        <main id="main-content" tabIndex={-1} className="min-w-0">
          {/* Where you are and how far through it: the topic (or the whole
              sheet) and its solved fraction, above the list it describes. */}
          <div className="mb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h1 className="text-xl font-semibold tracking-tight">{scope.title}</h1>
              <p className="text-[13px] text-muted">
                <span className="mono font-semibold text-ink">{scope.solved}</span>
                <span className="mono"> / {scope.total}</span> solved
              </p>
            </div>
            <ProgressBar value={scope.solved} total={scope.total} label={`${scope.title}: ${scope.solved} of ${scope.total} solved`} className="mt-2.5" />
          </div>
          <Filters
            search={search}
            onSearchChange={(value) => navigate({ q: value }, { replace: true })}
            searchInputRef={searchInputRef}
            total={stats.total}
            searching={searching}
            show={show}
            onShowChange={(value) => navigate({ show: value }, { replace: true })}
            reviewCount={reviewCount}
            difficulty={difficulty}
            onDifficultyChange={(value) => navigate({ difficulty: value === ALL ? null : value }, { replace: true })}
            coreOnly={coreOnly}
            onCoreOnlyChange={(value) => navigate({ core: value }, { replace: true })}
            notesOnly={notesOnly}
            onNotesOnlyChange={(value) => navigate({ notes: value }, { replace: true })}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
            onRandom={onPickRandom}
            canPickRandom={visible.length > 0}
          />

          {groups.length === 0 ? (
            <div className="border-b border-line px-6 py-16 text-center">
              <p className="font-semibold text-ink">{emptyState.title}</p>
              <p className="mt-1 text-[13px] text-muted">{emptyState.body}</p>
              {isFiltered && (
                <button type="button" onClick={clearFilters} className="btn-line mt-5">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <ProblemList
              groups={groups}
              progress={progress}
              today={today}
              onToggleSolved={onToggleSolved}
              onToggleBookmark={onToggleBookmark}
              onOpen={onOpenQuestion}
            />
          )}

          <p className="flex flex-wrap justify-between gap-3 px-0.5 pt-[9px] text-xs text-muted">
            <span>
              Showing <b className="mono font-medium text-ink">{visible.length}</b> of <b className="mono font-medium text-ink">{scope.total}</b>
              {searching ? ' — searching all problems' : ` in ${topicStats ? scope.title : 'all topics'}`}
            </span>
            <span>
              Solved <b className="mono font-medium text-ink">{scope.solved}</b> · due <b className="mono font-medium text-ink">{reviewCount}</b>
            </span>
          </p>

          <Credit className="pb-8" />
        </main>
      </div>
    </div>
  )
}
