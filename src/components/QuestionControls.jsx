import { CONFIDENCE_LEVELS, DIFFICULTY_STYLES, STATUS_STYLES, STATUSES, TIER_STYLES } from '../constants.js'

export function DifficultyLabel({ difficulty }) {
  const style = DIFFICULTY_STYLES[difficulty]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {difficulty}
    </span>
  )
}

export function TierBadge({ tier }) {
  return (
    <span
      title={`${tier} tier`}
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-px text-[11px] font-medium ring-1 ring-inset ${TIER_STYLES[tier]}`}
    >
      {tier}
    </span>
  )
}

// Unverified entries (GeeksforGeeks IDs change over time) link to a web search
// instead of the problem page, so the button says so.
export function LinkButton({ link, problem, label, verified = true, prominent = false }) {
  const text = label ?? (prominent ? (verified ? 'Open problem' : 'Find problem') : 'Open')

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={verified ? `Open ${problem} in a new tab` : `Search the web for ${problem}`}
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border font-medium transition-colors ${
        prominent
          ? 'border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-indigo-700'
          : 'border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
      }`}
    >
      {text}
      {verified ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4.5 2h5.5v5.5M10 2 4 8M8 10H2V4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="6" cy="6" r="4" />
          <path d="M9 9l3.5 3.5" strokeLinecap="round" />
        </svg>
      )}
    </a>
  )
}

export function StatusSelect({ id, problem, status, onChange }) {
  return (
    <span
      onClick={(event) => event.stopPropagation()}
      className={`relative inline-flex shrink-0 items-center rounded-full border font-medium transition-colors focus-within:ring-2 focus-within:ring-indigo-500/40 ${STATUS_STYLES[status]}`}
    >
      <select
        value={status}
        onChange={(event) => onChange(id, 'status', event.target.value)}
        aria-label={`Status for ${problem}`}
        className="cursor-pointer appearance-none bg-transparent py-1 pl-3 pr-7 text-xs font-medium focus:outline-none"
      >
        {STATUSES.map((option) => (
          <option key={option} value={option} className="bg-white text-slate-900">
            {option}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2.5 h-2.5 w-2.5 opacity-70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// A 1-5 rating, blank by default. Clicking the active dot clears it. Each dot
// sits in a larger button so it is still easy to hit on touch screens.
export function ConfidenceDots({ id, problem, confidence, onChange }) {
  const value = Number(confidence) || 0

  return (
    <span className="inline-flex shrink-0 items-center" role="group" aria-label={`Confidence for ${problem}`} onClick={(event) => event.stopPropagation()}>
      {CONFIDENCE_LEVELS.map((level) => {
        const filled = Number(level) <= value
        const isActive = value === Number(level)
        return (
          <button
            key={level}
            type="button"
            aria-label={`Confidence ${level} of 5`}
            aria-pressed={isActive}
            title={isActive ? 'Click to clear' : `Confidence ${level} of 5`}
            onClick={() => onChange(id, 'confidence', isActive ? '' : level)}
            className="group/dot grid h-6 w-5 place-items-center rounded-full"
          >
            <span
              className={`h-3 w-3 rounded-full border transition-[transform,border-color,background-color] duration-150 group-active/dot:scale-90 ${
                filled
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-slate-300 bg-white group-hover/dot:border-indigo-400 group-hover/dot:bg-indigo-100'
              }`}
            />
          </button>
        )
      })}
    </span>
  )
}
