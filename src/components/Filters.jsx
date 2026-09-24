import { DIFFICULTIES } from '../constants.js'
import { ShuffleIcon } from './icons.jsx'

export const ALL = 'All'

export const SHOW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'solved', label: 'Solved' },
  { value: 'review', label: 'Review' },
  { value: 'saved', label: 'Saved' },
]

// An on/off filter drawn as a chip. Still a switch to assistive tech, since
// that is what it is.
function ToggleChip({ checked, onChange, title, children }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={title} className="chip">
      {children}
    </button>
  )
}

function Kbd({ children }) {
  return <kbd className="kbd mr-1">{children}</kbd>
}

export default function Filters({
  show,
  onShowChange,
  reviewCount,
  difficulty,
  onDifficultyChange,
  coreOnly,
  onCoreOnlyChange,
  notesOnly,
  onNotesOnlyChange,
  isFiltered,
  onClearFilters,
  onRandom,
  canPickRandom,
}) {
  return (
    <div className="shrink-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <div role="group" aria-label="Show" className="seg">
          {SHOW_OPTIONS.map((option) => {
            const count = option.value === 'review' && reviewCount > 0 ? reviewCount : null
            return (
              <button key={option.value} type="button" onClick={() => onShowChange(option.value)} aria-pressed={show === option.value}>
                {option.label}
                {count !== null && (
                  <span className="mono text-[10.5px] text-accent" aria-label={`${count} due`}>
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
          className={`chip bg-canvas pr-7 ${difficulty !== ALL ? 'is-on' : ''}`}
        >
          <option value={ALL}>Any difficulty</option>
          {DIFFICULTIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ToggleChip checked={coreOnly} onChange={onCoreOnlyChange} title="Core: two problems per pattern, the main track of the sheet">
          Core only
        </ToggleChip>

        <ToggleChip checked={notesOnly} onChange={onNotesOnlyChange} title="Only problems you've written a note on">
          Has notes
        </ToggleChip>

        {isFiltered && (
          <button type="button" onClick={onClearFilters} className="sech-link px-1">
            Clear
          </button>
        )}

        <button
          type="button"
          onClick={onRandom}
          disabled={!canPickRandom}
          title="Open a random unsolved problem from this list"
          className="chip ml-auto"
        >
          Random
          <ShuffleIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Every shortcut the problems page listens for, including the two review
          keys. Shown from the small breakpoint up rather than only on wide
          screens - a keyboard is not a thing only large windows have - and
          allowed to wrap. */}
      <p className="mono hidden flex-wrap items-center gap-x-3 gap-y-1 py-[9px] text-[11px] text-muted sm:flex">
        <span>
          <Kbd>j</Kbd>
          <Kbd>k</Kbd>move
        </span>
        <span>
          <Kbd>x</Kbd>tick
        </span>
        <span>
          <Kbd>b</Kbd>save
        </span>
        <span>
          <Kbd>g</Kbd>got it
        </span>
        <span>
          <Kbd>s</Kbd>struggled
        </span>
        <span>
          <Kbd>Enter</Kbd>open
        </span>
        <span>
          <Kbd>/</Kbd>search
        </span>
      </p>
    </div>
  )
}
