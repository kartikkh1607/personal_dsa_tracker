import { CONFIDENCE_LEVELS, DIFFICULTY_STYLES, STATUS_STYLES, STATUSES } from '../constants.js'

export function DifficultyLabel({ difficulty }) {
  const style = DIFFICULTY_STYLES[difficulty]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {difficulty}
    </span>
  )
}

export function LinkButton({ link, problem }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener"
      title={`Open ${problem} in a new tab`}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
    >
      Open
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4.5 2h5.5v5.5M10 2 4 8M8 10H2V4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

export function StatusSelect({ id, problem, status, onChange }) {
  return (
    <span
      className={`relative inline-flex items-center rounded-full border font-medium transition-colors ${STATUS_STYLES[status]}`}
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
      >
        <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// Same values as before (1-5, blank by default) - just quicker to set than a
// dropdown. Clicking the active dot clears the rating back to blank.
export function ConfidenceDots({ id, problem, confidence, onChange }) {
  const value = Number(confidence) || 0

  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={`Confidence for ${problem}`}>
      {CONFIDENCE_LEVELS.map((level) => {
        const filled = Number(level) <= value
        return (
          <button
            key={level}
            type="button"
            aria-label={`Confidence ${level} of 5`}
            aria-pressed={filled}
            title={value === Number(level) ? 'Click to clear' : `Confidence ${level}`}
            onClick={() => onChange(id, 'confidence', value === Number(level) ? '' : level)}
            className={`h-3.5 w-3.5 rounded-full border transition-colors ${
              filled
                ? 'border-indigo-500 bg-indigo-500'
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-100'
            }`}
          />
        )
      })}
    </span>
  )
}
