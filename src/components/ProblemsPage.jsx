import { useEffect, useMemo, useRef } from 'react'
import { splitTopic, topicName } from '../constants.js'
import Sidebar, { ALL_TOPICS } from './Sidebar.jsx'
import Filters, { ALL } from './Filters.jsx'
import ProblemList, { groupId } from './ProblemList.jsx'
import Credit from './Credit.jsx'

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
  topicCount,
  progress,
  today,
  visible,
  groupByPattern,
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
  const listScrollRef = useRef(null)

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
    listScrollRef.current?.scrollTo({ top: 0 })
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

  const topicStats = stats.topicStats.find((topic) => topic.topic === selectedTopic)
  const header = topicStats
    ? { eyebrow: `Phase ${topicStats.phase} · ${topicStats.phaseName}`, title: topicName(selectedTopic), solved: topicStats.solved, total: topicStats.total }
    : { eyebrow: `${stats.phaseStats.length} phases · ${topicCount} topics`, title: 'All problems', solved: stats.solved, total: stats.total }

  return (
    // Narrow screens scroll the whole page; wider ones scroll only the list.
    <div ref={pageScrollRef} className="min-h-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
      <Sidebar
        phaseStats={stats.phaseStats}
        overall={stats}
        selectedTopic={selectedTopic}
        onSelectTopic={(topic) => navigate({ topic: topic === ALL_TOPICS ? null : splitTopic(topic).number, pattern: null })}
        currentPhase={currentPhase?.phase}
        isNarrow={isNarrow}
      />

      <main id="main-content" tabIndex={-1} className="bg-surface md:flex md:min-h-0 md:flex-1 md:flex-col">
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
              onToggleSolved={onToggleSolved}
              onToggleBookmark={onToggleBookmark}
              onOpen={onOpenQuestion}
            />
          )}
          <Credit className="pb-8" />
        </div>
      </main>
    </div>
  )
}
