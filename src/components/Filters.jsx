import { DIFFICULTIES } from '../constants.js'
import { ProgressBar } from './QuestionControls.jsx'
import { SearchIcon } from './icons.jsx'

export const ALL = 'All'

export const SHOW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unsolved', label: 'To do' },
  { value: 'solved', label: 'Solved' },
  { value: 'saved', label: 'Saved' },
]

export default function Filters({
  eyebrow,
  title,
  solvedCount,
  total,
  search,
  onSearchChange,
  searchInputRef,
  show,
  onShowChange,
  difficulty,
  onDifficultyChange,
  coreOnly,
  onCoreOnlyChange,
  isFiltered,
  onClearFilters,
}) {
  return (
    <div className="shrink-0 border-b border-line bg-surface px-5 pb-4 pt-5 sm:px-6">
      <p className="text-xs font-medium text-ink-3">{eyebrow}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="text-sm text-ink-3">
          <span className="font-semibold tabular-nums text-ink">{solvedCount}</span>
          <span className="tabular-nums"> / {total}</span> solved
        </p>
      </div>
      <ProgressBar value={solvedCount} total={total} label={`${title} progress`} className="mt-3 h-1.5" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[11rem] sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search problems"
            aria-label="Search problems or patterns"
            className="h-9 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3/40 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {search === '' && (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 font-sans text-[11px] text-ink-3 sm:block">
              /
            </kbd>
          )}
        </div>

        <div role="group" aria-label="Show" className="grid h-9 w-full grid-cols-4 items-center rounded-lg bg-subtle p-1 sm:inline-grid sm:w-auto">
          {SHOW_OPTIONS.map((option) => {
            const active = show === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onShowChange(option.value)}
                aria-pressed={active}
                className={`h-7 rounded-md px-3 text-sm font-medium transition-colors ${
                  active ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <select
          value={difficulty}
          onChange={(event) => onDifficultyChange(event.target.value)}
          aria-label="Filter by difficulty"
          className="h-9 rounded-lg border border-line bg-surface pl-3 pr-8 text-sm text-ink-2 transition-colors hover:border-ink-3/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value={ALL}>Any difficulty</option>
          {DIFFICULTIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          role="switch"
          aria-checked={coreOnly}
          onClick={() => onCoreOnlyChange(!coreOnly)}
          title="Core: two problems per pattern, the main track of the sheet"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-2 transition-colors hover:border-ink-3/40 hover:text-ink"
        >
          <span className={`relative h-4 w-7 rounded-full transition-colors ${coreOnly ? 'bg-brand' : 'bg-ink-3/30'}`} aria-hidden="true">
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${coreOnly ? 'translate-x-3.5' : 'translate-x-0.5'}`}
            />
          </span>
          Core only
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 rounded-lg px-2.5 text-sm font-medium text-brand-strong transition-colors hover:bg-brand-soft"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
