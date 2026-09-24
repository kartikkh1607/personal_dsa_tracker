import { useLayoutEffect, useRef, useState } from 'react'
import DifficultyFilter from './DifficultyFilter.jsx'
import { SearchIcon, ShuffleIcon } from './icons.jsx'

export const ALL = 'All'

const SHOW_OPTIONS = [
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

// Search leads the filter row: it covers the whole sheet, so it sits above the
// list rather than in the topic tree. "/" jumps here from anywhere. It keeps
// its width when the row gets tight - the row wraps instead - and takes the
// full width on phones.
function Search({ search, onSearchChange, searchInputRef, total }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-[7px] focus-within:border-accent sm:w-auto sm:min-w-[240px] sm:max-w-[360px] sm:flex-[1_1_240px]">
      <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
      <input
        ref={searchInputRef}
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={`Search ${total} problems`}
        aria-label="Search problems or patterns"
        className="w-full min-w-0 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none"
      />
      {search === '' && (
        <kbd className="kbd hidden shrink-0 sm:inline" aria-hidden="true">
          /
        </kbd>
      )}
    </div>
  )
}

// The status switch. The highlight is one element that slides to whichever
// option is pressed, so changing it reads as a move rather than a swap. It is
// measured from the buttons themselves, and re-measured when they change size
// (the review count coming and going, or the web font landing).
function ShowSwitch({ show, onShowChange, reviewCount }) {
  const groupRef = useRef(null)
  const [thumb, setThumb] = useState(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return undefined
    function measure() {
      const pressed = group.querySelector('[aria-pressed="true"]')
      if (pressed) setThumb((previous) => ({ left: pressed.offsetLeft, width: pressed.offsetWidth, moved: previous !== null }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const button of group.querySelectorAll('button')) observer.observe(button)
    return () => observer.disconnect()
  }, [show, reviewCount])

  return (
    <div ref={groupRef} role="group" aria-label="Show" className="seg">
      {/* No slide on the first measurement: it would sweep in from the left
          edge on load. */}
      {thumb && (
        <span
          className={`seg-thumb ${thumb.moved ? 'is-moving' : ''}`}
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
          aria-hidden="true"
        />
      )}
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
  )
}

function Kbd({ children }) {
  return <kbd className="kbd mr-1">{children}</kbd>
}

export default function Filters({
  search,
  onSearchChange,
  searchInputRef,
  total,
  searching,
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
        <Search search={search} onSearchChange={onSearchChange} searchInputRef={searchInputRef} total={total} />
        <ShowSwitch show={show} onShowChange={onShowChange} reviewCount={reviewCount} />

        <DifficultyFilter value={difficulty} onChange={onDifficultyChange} any={ALL} />

        <ToggleChip checked={coreOnly} onChange={onCoreOnlyChange} title="Core: the main track of the sheet. Advanced patterns are left to Depth and Stretch">
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

      {/* A search covers the whole sheet, so the selected topic is set aside
          while it runs: the sidebar dims it, and this says why. */}
      {searching && (
        <p className="lbl pt-[9px] text-accent" role="status">
          Searching all problems
        </p>
      )}

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
