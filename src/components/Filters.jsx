import { DIFFICULTIES } from '../constants.js'
import { ProgressBar } from './QuestionControls.jsx'
import { SearchIcon, ShuffleIcon } from './icons.jsx'

export const ALL = 'All'

export const SHOW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'solved', label: 'Solved' },
  { value: 'review', label: 'Review' },
  { value: 'saved', label: 'Saved' },
]

function Kbd({ children }) {
  return <kbd className="rounded border border-line bg-canvas px-1.5 py-px font-sans text-[11px] text-ink-2">{children}</kbd>
}

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
  reviewCount,
  difficulty,
  onDifficultyChange,
  coreOnly,
  onCoreOnlyChange,
  isFiltered,
  onClearFilters,
  onRandom,
  canPickRandom,
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

        <div role="group" aria-label="Show" className="grid h-9 w-full grid-cols-5 items-center rounded-lg bg-subtle p-1 sm:inline-grid sm:w-auto">
          {SHOW_OPTIONS.map((option) => {
            const active = show === option.value
            const count = option.value === 'review' && reviewCount > 0 ? reviewCount : null
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onShowChange(option.value)}
                aria-pressed={active}
                className={`inline-flex h-7 items-center justify-center gap-1 rounded-md px-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  active ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {option.label}
                {count !== null && (
                  <span className="rounded bg-brand px-1 text-[10px] font-semibold leading-4 tabular-nums text-brand-contrast" aria-label={`${count} due`}>
                    {count}
                  </span>
                )}
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
          className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
            coreOnly ? 'border-brand/40 bg-brand-soft font-medium text-brand-strong' : 'border-line bg-surface text-ink-2 hover:border-ink-3/40 hover:text-ink'
          }`}
        >
          {/* 36px track with a 1px border leaves 34px inside: the 14px knob sits 2px from either edge. */}
          <span
            className={`flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${coreOnly ? 'border-brand bg-brand' : 'border-ink-3/40 bg-subtle'}`}
            aria-hidden="true"
          >
            <span
              className={`h-3.5 w-3.5 rounded-full shadow-sm transition-[transform,background-color] duration-200 ${
                coreOnly ? 'translate-x-[18px] bg-brand-contrast' : 'translate-x-[2px] bg-ink-3'
              }`}
            />
          </span>
          Core only
        </button>

        <button
          type="button"
          onClick={onRandom}
          disabled={!canPickRandom}
          title="Open a random unsolved problem from this list"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-2 transition-colors hover:border-ink-3/40 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ShuffleIcon className="h-3.5 w-3.5" />
          Random
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

      <p className="mt-3 hidden items-center gap-1.5 text-xs text-ink-3 lg:flex">
        <Kbd>j</Kbd>
        <Kbd>k</Kbd> move
        <span aria-hidden="true">·</span>
        <Kbd>x</Kbd> tick
        <span aria-hidden="true">·</span>
        <Kbd>b</Kbd> save
        <span aria-hidden="true">·</span>
        <Kbd>Enter</Kbd> open
        <span aria-hidden="true">·</span>
        <Kbd>/</Kbd> search
      </p>
    </div>
  )
}
