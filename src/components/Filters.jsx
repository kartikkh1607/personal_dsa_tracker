import { DIFFICULTIES, STATUSES } from '../constants.js'

export const ALL = 'All'
export const FOCUS_MODES = [
  { value: 'all', label: 'All problems' },
  { value: 'unsolved', label: 'Unsolved' },
  { value: 'continue', label: 'Continue' },
  { value: 'review', label: 'Review' },
  { value: 'recommended', label: 'Next up' },
]

const SELECT_CLASS =
  'rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none'

export default function Filters({
  difficulty,
  onDifficultyChange,
  status,
  onStatusChange,
  search,
  onSearchChange,
  searchInputRef,
  focusMode,
  onFocusModeChange,
  sortBy,
  onSortByChange,
  visibleCount,
  totalCount,
  isFiltered,
  onClearFilters,
}) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2">
      <div className="relative min-w-[11rem] flex-1 sm:max-w-sm">
        <svg
          viewBox="0 0 14 14"
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="6" cy="6" r="4" />
          <path d="M9 9l3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={searchInputRef}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search problems  /"
          aria-label="Search problems"
          className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-[13px] text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="order-3 flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 sm:order-none sm:w-auto">
        {FOCUS_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onFocusModeChange(mode.value)}
            aria-pressed={focusMode === mode.value}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              focusMode === mode.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <select
        value={difficulty}
        onChange={(event) => onDifficultyChange(event.target.value)}
        aria-label="Filter by difficulty"
        className={SELECT_CLASS}
      >
        <option value={ALL}>All difficulties</option>
        {DIFFICULTIES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        aria-label="Filter by status"
        className={SELECT_CLASS}
      >
        <option value={ALL}>All statuses</option>
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value)}
        aria-label="Sort problems"
        className={SELECT_CLASS}
      >
        <option value="recommended">Recommended</option>
        <option value="topic">Topic order</option>
        <option value="difficulty">Difficulty</option>
        <option value="confidence">Lowest confidence</option>
        <option value="name">Problem name</option>
      </select>

      {isFiltered && (
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Clear
        </button>
      )}

      <p className="ml-auto text-[13px] text-slate-500">
        Showing <strong className="font-semibold tabular-nums text-slate-900">{visibleCount}</strong>
        <span className="tabular-nums"> of {totalCount}</span>
      </p>
      </div>
    </div>
  )
}
