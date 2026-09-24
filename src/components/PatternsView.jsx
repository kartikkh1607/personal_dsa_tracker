import { useMemo, useRef, useState } from 'react'
import { topicName } from '../constants.js'
import Credit from './Credit.jsx'
import { ProgressBar } from './QuestionControls.jsx'
import { SearchIcon } from './icons.jsx'
import SegmentedSwitch from './SegmentedSwitch.jsx'
import { useEntrance } from '../hooks/useEntrance.js'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'untouched', label: 'Untouched' },
  { value: 'started', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

function statusOf(pattern) {
  if (pattern.solved === 0) return 'untouched'
  return pattern.solved === pattern.total ? 'done' : 'started'
}

const STATUS_TEXT = { untouched: 'not started', started: 'in progress', done: 'done' }

// Topic percentages can hide gaps; this lists every pattern in the sheet so the
// untouched ones are impossible to miss.
export default function PatternsView({ patternStats, onOpenPattern }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  // A new filter brings its list in; typing in the search box doesn't.
  const listRef = useRef(null)
  useEntrance(listRef, 'list-in', [filter])

  const counts = useMemo(() => {
    const tally = { all: patternStats.length, untouched: 0, started: 0, done: 0 }
    for (const pattern of patternStats) tally[statusOf(pattern)]++
    return tally
  }, [patternStats])

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase()
    const byTopic = new Map()
    for (const pattern of patternStats) {
      if (filter !== 'all' && statusOf(pattern) !== filter) continue
      if (term && !pattern.pattern.toLowerCase().includes(term) && !pattern.topic.toLowerCase().includes(term)) continue
      if (!byTopic.has(pattern.topic)) byTopic.set(pattern.topic, [])
      byTopic.get(pattern.topic).push(pattern)
    }
    return [...byTopic.entries()]
  }, [patternStats, filter, search])

  const started = counts.all - counts.untouched

  return (
    <div className="shell">
      <header className="grid grid-cols-1 items-end gap-5 pb-2.5 pt-[30px] min-[760px]:grid-cols-[minmax(0,1fr)_auto] min-[760px]:gap-8">
        <div className="min-w-0">
          <p className="lbl">Coverage</p>
          <h1 className="headline mt-2">
            {started} of {counts.all} patterns started
          </h1>
          <p className="mt-[11px] max-w-[60ch] text-[13.5px] text-muted">
            Topic progress hides gaps: most of Graphs done can still mean you’ve never written Dijkstra. Aim for one problem in every pattern.
          </p>
        </div>
        <dl className="flex gap-[30px]">
          {[
            { label: 'Untouched', value: counts.untouched },
            { label: 'In progress', value: counts.started },
            { label: 'Done', value: counts.done },
          ].map((figure) => (
            <div key={figure.label} className="min-w-[76px]">
              <dd className="fig !text-[30px]">{String(figure.value).padStart(2, '0')}</dd>
              <dt className="lbl mt-[5px]">{figure.label}</dt>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-[7px] focus-within:border-accent sm:w-64">
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patterns"
            aria-label="Search patterns"
            className="w-full min-w-0 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <SegmentedSwitch label="Show patterns" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <div ref={listRef}>
        {groups.length === 0 && <p className="sec text-[13px] text-muted">No patterns match.</p>}
        {groups.map(([topic, patterns]) => {
          const all = patternStats.filter((pattern) => pattern.topic === topic)
          const topicStarted = all.filter((pattern) => pattern.solved > 0).length
          return (
            <section key={topic} className="sec" aria-label={topicName(topic)}>
              <div className="sech">
                <h2 className="lbl">{topicName(topic)}</h2>
                <p className="lbl ml-auto">
                  {topicStarted} of {all.length} started
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-x-9 min-[760px]:grid-cols-2">
                {patterns.map((pattern) => (
                  <li key={pattern.key}>
                    <button
                      type="button"
                      onClick={() => onOpenPattern(pattern.topic, pattern.pattern)}
                      className="group flex w-full items-center gap-3 border-b border-line py-[9px] text-left text-[13px] hover:bg-low"
                    >
                      <span className="min-w-0 flex-1 truncate group-hover:text-accent">{pattern.pattern}</span>
                      <span className="sr-only">, {STATUS_TEXT[statusOf(pattern)]},</span>
                      <ProgressBar value={pattern.solved} total={pattern.total} className="w-[84px] shrink-0" />
                      <span className="mono min-w-[42px] shrink-0 text-right text-[11.5px] text-muted">
                        {pattern.solved}/{pattern.total}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <Credit />
    </div>
  )
}
