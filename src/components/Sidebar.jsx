import { useEffect, useState } from 'react'
import { topicName } from '../constants.js'
import { PhaseBadge } from './QuestionControls.jsx'
import { CheckIcon, ChevronIcon } from './icons.jsx'

export const ALL_TOPICS = 'All topics'

function TopicItem({ label, solved, total, isSelected, onClick }) {
  const complete = total > 0 && solved === total

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'page' : undefined}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
        isSelected ? 'bg-brand-soft font-semibold text-brand-strong' : 'text-ink-2 hover:bg-subtle hover:text-ink'
      }`}
    >
      <span className="truncate">{label}</span>
      {complete ? (
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-brand" />
      ) : (
        <span className={`shrink-0 text-[11px] tabular-nums ${isSelected ? 'text-brand-strong/80' : 'text-ink-3'}`}>
          {solved}/{total}
        </span>
      )}
    </button>
  )
}

// Topics sit under the sheet's six study phases. Only the phase you're working
// in starts open, so the list reads as a plan rather than 23 empty bars.
export default function Sidebar({ phaseStats, overall, selectedTopic, onSelectTopic, currentPhase, isNarrow }) {
  const selectedPhase = phaseStats.find((phase) => phase.topics.some((topic) => topic.topic === selectedTopic))?.phase
  const [expanded, setExpanded] = useState(() => new Set([selectedPhase ?? currentPhase]))

  // Choosing a topic from elsewhere (e.g. the Home page) opens its phase.
  useEffect(() => {
    if (selectedPhase) setExpanded((previous) => (previous.has(selectedPhase) ? previous : new Set(previous).add(selectedPhase)))
  }, [selectedPhase])

  function togglePhase(phase) {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  // Narrow screens: the topic list collapses into a dropdown.
  if (isNarrow) {
    return (
      <div className="border-b border-line bg-surface px-5 pb-3 pt-4">
        <label htmlFor="topic-select" className="block text-xs font-medium text-ink-3">
          Topic
        </label>
        <select
          id="topic-select"
          value={selectedTopic}
          onChange={(event) => onSelectTopic(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value={ALL_TOPICS}>
            All problems ({overall.solved}/{overall.total})
          </option>
          {phaseStats.map((phase) => (
            <optgroup key={phase.phase} label={`Phase ${phase.phase} · ${phase.name}`}>
              {phase.topics.map((topic) => (
                <option key={topic.topic} value={topic.topic}>
                  {topicName(topic.topic)} ({topic.solved}/{topic.total})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    )
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-canvas lg:w-72">
      <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Topics">
        <TopicItem
          label="All problems"
          solved={overall.solved}
          total={overall.total}
          isSelected={selectedTopic === ALL_TOPICS}
          onClick={() => onSelectTopic(ALL_TOPICS)}
        />

        <p className="mb-1 mt-5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Study plan</p>
        <ul className="space-y-0.5">
          {phaseStats.map((phase) => {
            const open = expanded.has(phase.phase)
            return (
              <li key={phase.phase}>
                <button
                  type="button"
                  onClick={() => togglePhase(phase.phase)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-subtle"
                >
                  <PhaseBadge number={phase.phase} complete={phase.solved === phase.total} current={phase.phase === currentPhase} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{phase.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
                    {phase.solved}/{phase.total}
                  </span>
                  <ChevronIcon className={`h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                </button>
                {open && (
                  <ul className="mb-2 ml-5 space-y-0.5 border-l border-line pl-2">
                    {phase.topics.map((topic) => (
                      <li key={topic.topic}>
                        <TopicItem
                          label={topicName(topic.topic)}
                          solved={topic.solved}
                          total={topic.total}
                          isSelected={selectedTopic === topic.topic}
                          onClick={() => onSelectTopic(topic.topic)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
