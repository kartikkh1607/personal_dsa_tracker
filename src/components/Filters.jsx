import { DIFFICULTIES, STATUSES } from '../constants.js'

export const ALL = 'All'

export const FOCUS_MODES = [
  { value: 'all', label: 'All' },
  { value: 'unsolved', label: 'Unsolved' },
  { value: 'review', label: 'Needs review' },
]

export const SORT_OPTIONS = [
  { value: 'sheet', label: 'Sheet order' },
  { value: 'difficulty', label: 'Easiest first' },
  { value: 'confidence', label: 'Lowest confidence' },
  { value: 'name', label: 'Name (A–Z)' },
]

const SELECT_CLASS =
  'h-9 rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'

export default function Filters({
  title,
  solvedCount,
  topicTotal,
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
  isFiltered,
  onClearFilters,
}) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
          <span className="text-sm tabular-nums text-slate-500" aria-live="polite">
            {visibleCount} {visibleCount === 1 ? 'problem' : 'problems'}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          <span className="font-medium tabular-nums text-slate-900">{solvedCount}</span> of{' '}
          <span className="tabular-nums">{topicTotal}</span> solved
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60 lg:w-72">
          <svg
            viewBox="0 0 14 14"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="4" />
            <path d="M9 9l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search problems or patterns"
            aria-label="Search problems or patterns"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {search === '' && (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 font-sans text-[11px] text-slate-400 sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="inline-flex h-9 items-center rounded-lg bg-slate-100 p-1" role="group" aria-label="Show">
          {FOCUS_MODES.map((mode) => {
            const active = focusMode === mode.value
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => onFocusModeChange(mode.value)}
                aria-pressed={active}
                className={`h-7 rounded-md px-3 text-sm font-medium transition-colors ${
                  active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode.label}
              </button>
            )
          })}
        </div>

        <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)} aria-label="Filter by difficulty" className={SELECT_CLASS}>
          <option value={ALL}>Any difficulty</option>
          {DIFFICULTIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter by status" className={SELECT_CLASS}>
          <option value={ALL}>Any status</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(event) => onSortByChange(event.target.value)} aria-label="Sort problems" className={SELECT_CLASS}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 rounded-lg px-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
