export const ALL_TOPICS = 'All topics'

function TopicButton({ label, done, total, isSelected, onClick }) {
  const percent = total === 0 ? 0 : (done / total) * 100
  const complete = total > 0 && done === total

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl px-3 py-2 text-left transition-colors ${
        isSelected ? 'bg-indigo-50 shadow-sm ring-1 ring-indigo-100' : 'hover:bg-slate-100'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`truncate text-[13px] ${
            isSelected ? 'font-semibold text-indigo-700' : 'font-medium text-slate-600 group-hover:text-slate-900'
          }`}
        >
          {label}
        </span>
        <span
          className={`shrink-0 text-[11px] tabular-nums ${
            complete ? 'font-semibold text-emerald-600' : 'text-slate-400'
          }`}
        >
          {done}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-1 rounded-full transition-[width] duration-200 ${
            complete ? 'bg-emerald-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </button>
  )
}

export default function Sidebar({ topicStats, overall, selectedTopic, onSelectTopic, isNarrow }) {
  // Narrow screens: the topic list collapses into a dropdown.
  if (isNarrow) {
    return (
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Topic</label>
        <select
          value={selectedTopic}
          onChange={(event) => onSelectTopic(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700"
        >
          <option value={ALL_TOPICS}>
            {ALL_TOPICS} ({overall.done}/{overall.total})
          </option>
          {topicStats.map((topic) => (
            <option key={topic.topic} value={topic.topic}>
              {topic.topic} ({topic.done}/{topic.total})
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <p className="shrink-0 px-5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Topics
      </p>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <TopicButton
          label={ALL_TOPICS}
          done={overall.done}
          total={overall.total}
          isSelected={selectedTopic === ALL_TOPICS}
          onClick={() => onSelectTopic(ALL_TOPICS)}
        />
        <div className="my-1.5 border-t border-slate-100" />
        {topicStats.map((topic) => (
          <TopicButton
            key={topic.topic}
            label={topic.topic}
            done={topic.done}
            total={topic.total}
            isSelected={selectedTopic === topic.topic}
            onClick={() => onSelectTopic(topic.topic)}
          />
        ))}
      </nav>
    </aside>
  )
}
