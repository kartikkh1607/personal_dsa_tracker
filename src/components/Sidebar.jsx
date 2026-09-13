import { splitTopic } from '../constants.js'

export const ALL_TOPICS = 'All topics'

function TopicButton({ number, label, done, total, isSelected, onClick }) {
  const percent = total === 0 ? 0 : (done / total) * 100
  const complete = total > 0 && done === total

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className={`group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
        isSelected ? 'bg-indigo-50' : 'hover:bg-slate-100'
      }`}
    >
      <span className={`w-5 shrink-0 pt-px text-[11px] leading-5 tabular-nums ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>{number}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-[13px] ${
              isSelected ? 'font-semibold text-indigo-700' : 'font-medium text-slate-600 group-hover:text-slate-900'
            }`}
          >
            {label}
          </span>
          <span className={`shrink-0 text-[11px] tabular-nums ${complete ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>
            {done}/{total}
          </span>
        </span>
        <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-slate-200/70" aria-hidden="true">
          <span
            className={`block h-full rounded-full transition-[width] duration-300 ${complete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${percent}%` }}
          />
        </span>
      </span>
    </button>
  )
}

// Topics are grouped under the sheet's six study phases, in study order.
export default function Sidebar({ phaseStats, overall, selectedTopic, onSelectTopic, isNarrow }) {
  // Narrow screens: the topic list collapses into a dropdown.
  if (isNarrow) {
    return (
      <div className="border-b border-slate-200 bg-white px-4 pb-3 pt-4">
        <label htmlFor="topic-select" className="block text-xs font-medium text-slate-500">
          Topic
        </label>
        <select
          id="topic-select"
          value={selectedTopic}
          onChange={(event) => onSelectTopic(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value={ALL_TOPICS}>
            {ALL_TOPICS} ({overall.done}/{overall.total})
          </option>
          {phaseStats.map((phase) => (
            <optgroup key={phase.phase} label={`Phase ${phase.phase} · ${phase.name}`}>
              {phase.topics.map((topic) => (
                <option key={topic.topic} value={topic.topic}>
                  {topic.topic} ({topic.done}/{topic.total})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    )
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:w-72">
      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 pt-3" aria-label="Topics">
        <TopicButton
          label={ALL_TOPICS}
          done={overall.done}
          total={overall.total}
          isSelected={selectedTopic === ALL_TOPICS}
          onClick={() => onSelectTopic(ALL_TOPICS)}
        />
        {phaseStats.map((phase) => (
          <div key={phase.phase} className="mt-4" role="group" aria-label={`Phase ${phase.phase}: ${phase.name}`}>
            <p className="flex items-baseline justify-between gap-2 px-2.5 pb-1">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Phase {phase.phase} · {phase.name}
              </span>
            </p>
            {phase.topics.map((topic) => {
              const { number, name } = splitTopic(topic.topic)
              return (
                <TopicButton
                  key={topic.topic}
                  number={number}
                  label={name}
                  done={topic.done}
                  total={topic.total}
                  isSelected={selectedTopic === topic.topic}
                  onClick={() => onSelectTopic(topic.topic)}
                />
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
