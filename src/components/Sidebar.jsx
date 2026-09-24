import { useEffect, useState } from 'react'
import { topicName } from '../constants.js'
import { ProgressBar } from './QuestionControls.jsx'
import { CheckIcon } from './icons.jsx'

export const ALL_TOPICS = 'All topics'

function Count({ solved, total }) {
  if (total > 0 && solved === total) return <CheckIcon className="h-3 w-3 shrink-0 text-accent" strokeWidth={2.4} />
  return (
    <span className="mono shrink-0 text-[11px]">
      {solved}/{total}
    </span>
  )
}

// A 2px bar under a row's text: the same solved/total as the count beside
// it, which it supplements rather than replaces. An empty track still shows,
// so 0% reads as a place to start rather than a missing bar. A selected row
// is already --tint, so there the empty track steps to --line to stay visible.
function RowBar({ solved, total, onTint = false }) {
  return <ProgressBar value={solved} total={total} className={`mt-1 !h-[2px] ${onTint ? '!bg-line' : ''}`} />
}

function TopicItem({ label, solved, total, isSelected, overridden = false, onClick, indent = false, bar = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'page' : undefined}
      className={`block w-full rounded-md py-1.5 pr-2 text-left ${indent ? 'pl-5 text-[12.5px]' : 'pl-2 text-[13px]'} ${
        isSelected ? 'bg-tint text-ink' : 'text-muted hover:bg-low hover:text-ink'
      } ${isSelected && overridden ? 'opacity-50' : ''}`}
      title={isSelected && overridden ? 'Set aside while searching - clear the search to come back here' : undefined}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        <Count solved={solved} total={total} />
      </span>
      {bar && <RowBar solved={solved} total={total} onTint={isSelected} />}
    </button>
  )
}

// The study plan as a tree: the six phases, each with its topics.
// Only the phase you're working in starts open, so the list reads as a plan
// rather than 23 empty bars.
export default function Sidebar({ phaseStats, overall, selectedTopic, onSelectTopic, currentPhase, isNarrow, searching }) {
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

  // Narrow screens: the tree collapses into a dropdown.
  if (isNarrow) {
    return (
      <div>
        <label htmlFor="topic-select" className="lbl block">
          Topic
        </label>
        <select
          id="topic-select"
          value={selectedTopic}
          onChange={(event) => onSelectTopic(event.target.value)}
          className={`mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink ${searching ? 'opacity-50' : ''}`}
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
    <aside className="self-start min-[1001px]:sticky min-[1001px]:top-5">
      <h2 className="lbl mb-2">Study plan</h2>
      <nav aria-label="Topics" className="max-h-80 overflow-y-auto min-[1001px]:max-h-[calc(100dvh-190px)]">
        <TopicItem
          label="All problems"
          solved={overall.solved}
          total={overall.total}
          isSelected={selectedTopic === ALL_TOPICS}
          overridden={searching}
          onClick={() => onSelectTopic(ALL_TOPICS)}
        />
        <ul className="mt-1">
          {phaseStats.map((phase) => {
            const open = expanded.has(phase.phase)
            const current = phase.phase === currentPhase
            return (
              <li key={phase.phase}>
                <button
                  type="button"
                  onClick={() => togglePhase(phase.phase)}
                  aria-expanded={open}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] text-muted hover:bg-low hover:text-ink"
                >
                  <span className="flex items-center gap-2">
                    <span className={`mono shrink-0 text-[11px] ${current ? 'text-accent' : ''}`}>{String(phase.phase).padStart(2, '0')}</span>
                    <span className={`min-w-0 flex-1 truncate font-medium ${open ? 'text-ink' : ''}`}>{phase.name}</span>
                    <Count solved={phase.solved} total={phase.total} />
                  </span>
                  <RowBar solved={phase.solved} total={phase.total} />
                </button>
                {open && (
                  <ul className="mb-1">
                    {phase.topics.map((topic) => (
                      <li key={topic.topic}>
                        <TopicItem
                          indent
                          bar
                          label={topicName(topic.topic)}
                          solved={topic.solved}
                          total={topic.total}
                          isSelected={selectedTopic === topic.topic}
                          overridden={searching}
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
