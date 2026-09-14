import { useMemo, useState } from 'react'
import { topicName } from '../constants.js'
import Credit from './Credit.jsx'
import { ProgressBar } from './QuestionControls.jsx'
import { CheckIcon, ChevronIcon, SearchIcon } from './icons.jsx'

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

function StatusMark({ status }) {
  if (status === 'done') {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-contrast" aria-label="Done">
        <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
      </span>
    )
  }
  if (status === 'started') {
    return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-brand bg-brand-soft" aria-label="In progress" />
  }
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-ink-3/40" aria-label="Untouched" />
}

// Topic percentages can hide gaps; this lists every pattern in the sheet so the
// untouched ones are impossible to miss.
export default function PatternsView({ patternStats, onOpenPattern }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Patterns</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-2 sm:text-base">
          Topic progress can hide gaps: most of Graphs done can still mean you’ve never written Dijkstra. Aim to solve at least one problem in every pattern.
        </p>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Untouched', value: counts.untouched, className: 'text-ink' },
          { label: 'In progress', value: counts.started, className: 'text-ink' },
          { label: 'Done', value: counts.done, className: 'text-brand-strong' },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-line bg-surface px-4 py-3 sm:px-5 sm:py-4">
            <dt className="text-xs font-medium text-ink-3">{tile.label}</dt>
            <dd className={`mt-1 text-2xl font-semibold tabular-nums ${tile.className}`}>{tile.value}</dd>
          </div>
        ))}
      </dl>
      <ProgressBar value={counts.all - counts.untouched} total={counts.all} label="Patterns started" className="mt-4 h-1.5" />
      <p className="mt-2 text-xs text-ink-3">
        {counts.all - counts.untouched} of {counts.all} patterns started
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[12rem] sm:flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patterns"
            aria-label="Search patterns"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div role="group" aria-label="Show patterns" className="grid h-9 w-full grid-cols-4 items-center rounded-lg bg-subtle p-1 sm:inline-grid sm:w-auto">
          {FILTERS.map((option) => {
            const active = filter === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={active}
                className={`h-7 truncate rounded-md px-1.5 text-sm font-medium transition-colors sm:px-3 ${active ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        {groups.length === 0 && <p className="px-6 py-14 text-center text-sm text-ink-3">No patterns match.</p>}
        {groups.map(([topic, patterns]) => (
          <section key={topic} aria-label={topicName(topic)}>
            <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/70 px-5 py-2 sm:px-6">
              <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-ink-3">{topicName(topic)}</h2>
            </div>
            <ul className="divide-y divide-line/70 border-b border-line last:border-b-0">
              {patterns.map((pattern) => (
                <li key={pattern.key}>
                  <button
                    type="button"
                    onClick={() => onOpenPattern(pattern.topic, pattern.pattern)}
                    className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-subtle/50 sm:gap-4 sm:px-6"
                  >
                    <StatusMark status={statusOf(pattern)} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink group-hover:text-brand-strong">{pattern.pattern}</span>
                    <ProgressBar value={pattern.solved} total={pattern.total} className="hidden h-1.5 w-24 sm:block" />
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-3">
                      {pattern.solved}/{pattern.total}
                    </span>
                    <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Credit />
    </div>
  )
}
