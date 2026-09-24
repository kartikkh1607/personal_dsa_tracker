import { DIFFICULTY_LETTER } from '../constants.js'
import { problemUrl } from '../links.js'
import { BookmarkIcon, CheckIcon, ExternalIcon, NoteIcon, SearchIcon } from './icons.jsx'

// Marks a problem that has a note: a small icon after the name.
export function NoteMark() {
  return (
    <span title="Has notes" className="inline-flex shrink-0 text-muted">
      <NoteIcon className="h-3.5 w-3.5" />
      <span className="sr-only">(has notes)</span>
    </span>
  )
}

// The one way to record progress: a square tick. The button is larger than the
// box (negative margin keeps layout tight) so it's easy to hit on touch.
export function SolvedCheck({ solved, problem, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={solved}
      aria-label={`Solved: ${problem}`}
      title={solved ? 'Solved. Click to undo' : 'Mark as solved'}
      onClick={onToggle}
      className="group/check -m-2.5 grid h-9 w-9 shrink-0 place-items-center rounded-md"
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded border ${
          solved ? 'border-transparent bg-fill text-onfill' : 'border-rule text-transparent group-hover/check:border-accent group-hover/check:text-accent'
        }`}
      >
        <CheckIcon className="h-3 w-3" strokeWidth={2.4} />
      </span>
    </button>
  )
}

export function BookmarkButton({ bookmarked, problem, onToggle, ...rest }) {
  return (
    <button
      {...rest}
      type="button"
      onClick={onToggle}
      aria-pressed={bookmarked}
      aria-label={`Save for revision: ${problem}`}
      title={bookmarked ? 'Saved for revision. Click to remove' : 'Save for revision'}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-tint ${bookmarked ? 'text-accent' : 'text-muted hover:text-ink'}`}
    >
      <BookmarkIcon filled={bookmarked} className="h-3.5 w-3.5" />
    </button>
  )
}

// A 19px square with the difficulty's letter. The letter carries the meaning;
// Hard's fill only reinforces it.
export function Difficulty({ difficulty }) {
  return (
    <span className={`dif ${difficulty === 'Hard' ? 'dif--h' : ''}`} title={difficulty}>
      <span aria-hidden="true">{DIFFICULTY_LETTER[difficulty]}</span>
      <span className="sr-only">{difficulty}</span>
    </span>
  )
}

// Working links open the problem page; unconfirmed ones search Google for the
// problem instead, and say so.
export function ProblemLink({ href, verified, platform, problem, variant = 'row', className = '' }) {
  const url = problemUrl({ link: href, verified, problem, platform })
  const action = verified ? `Open on ${platform}` : 'Search on Google'
  const icon = verified ? <ExternalIcon className="h-3 w-3" /> : <SearchIcon className="h-3 w-3" />

  if (variant === 'primary') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`btn-primary ${className}`}>
        {action}
        {icon}
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${action}: ${problem}`}
      title={action}
      className={`inline-flex shrink-0 items-center gap-1 rounded text-xs text-muted hover:text-accent hover:underline ${className}`}
    >
      <span className={variant === 'compact' ? 'hidden lg:inline' : ''}>{verified ? platform : 'Google'}</span>
      {icon}
    </a>
  )
}

// 3px, flat, accent on --tint. Labelled bars are exposed as a progressbar;
// the rest are decoration beside a count that already says the same thing.
export function ProgressBar({ value, total, label, className = '' }) {
  const percent = total ? (value / total) * 100 : 0
  const a11y = label
    ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': value }
    : { 'aria-hidden': true }

  return (
    <span className={`track ${className}`} {...a11y}>
      <i style={{ width: `${percent}%` }} />
    </span>
  )
}

// A phase's index in Plex Mono: 01, 02... A finished phase shows a tick.
export function PhaseIndex({ number, complete, current }) {
  if (complete) return <CheckIcon className="h-3 w-3 shrink-0 text-accent" strokeWidth={2.4} />
  return <span className={`mono shrink-0 text-[10.5px] ${current ? 'text-accent' : 'text-muted'}`}>{String(number).padStart(2, '0')}</span>
}
