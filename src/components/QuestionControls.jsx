import { DIFFICULTY_PILL } from '../constants.js'
import { problemUrl } from '../links.js'
import { BookmarkIcon, CheckIcon, ExternalIcon, NoteIcon, SearchIcon } from './icons.jsx'

// Marks a problem that has a note: a faint green bar on the row's left edge
// (NOTE_ACCENT) and a small icon after the name (NoteMark).
export const NOTE_ACCENT = 'shadow-[inset_2px_0_0_rgb(var(--brand)/0.55)]'

export function NoteMark() {
  return (
    <span title="Has notes" className="inline-flex shrink-0 text-brand">
      <NoteIcon className="h-3.5 w-3.5" />
      <span className="sr-only">(has notes)</span>
    </span>
  )
}

// The one way to record progress: a round tick. The button is larger than the
// circle (negative margin keeps layout tight) so it's easy to hit on touch.
export function SolvedCheck({ solved, problem, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={solved}
      aria-label={`Solved: ${problem}`}
      title={solved ? 'Solved. Click to undo' : 'Mark as solved'}
      onClick={onToggle}
      className="group/check -m-2 grid h-10 w-10 shrink-0 place-items-center rounded-full"
    >
      <span
        className={`grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] transition-[background-color,border-color,color,transform] duration-200 group-active/check:scale-90 ${
          solved
            ? 'border-brand bg-brand text-brand-contrast'
            : 'border-ink-3/50 bg-surface text-transparent group-hover/check:border-brand group-hover/check:text-brand/50'
        }`}
      >
        <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
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
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-subtle ${
        bookmarked ? 'text-mark' : 'text-ink-3/60 hover:text-ink'
      }`}
    >
      <BookmarkIcon filled={bookmarked} />
    </button>
  )
}

export function DifficultyPill({ difficulty }) {
  return (
    <span className={`inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-semibold ${DIFFICULTY_PILL[difficulty]}`}>
      {difficulty}
    </span>
  )
}

// Working links open the problem page; unconfirmed ones search Google for the
// problem instead, and say so.
export function ProblemLink({ href, verified, platform, problem, variant = 'row', className = '' }) {
  const url = problemUrl({ link: href, verified, problem, platform })
  const action = verified ? `Open on ${platform}` : 'Search on Google'
  const icon = verified ? <ExternalIcon /> : <SearchIcon />

  if (variant === 'primary') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-contrast shadow-sm transition-colors hover:bg-brand-strong ${className}`}
      >
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
      className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
    >
      <span className="hidden lg:inline">{verified ? platform : 'Google'}</span>
      {icon}
    </a>
  )
}

export function ProgressBar({ value, total, label, className = 'h-1.5', barClassName = 'bg-brand' }) {
  const percent = total ? (value / total) * 100 : 0
  const a11y = label
    ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': value }
    : { 'aria-hidden': true }

  return (
    <div className={`overflow-hidden rounded-full bg-subtle ${className}`} {...a11y}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${barClassName}`} style={{ width: `${percent}%` }} />
    </div>
  )
}

export function PhaseBadge({ number, complete, current }) {
  return (
    <span
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums ${
        complete
          ? 'bg-brand text-brand-contrast'
          : current
            ? 'bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/40'
            : 'bg-subtle text-ink-3'
      }`}
    >
      {complete ? <CheckIcon className="h-3 w-3" strokeWidth={2.6} /> : number}
    </span>
  )
}
