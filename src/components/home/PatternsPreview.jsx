import { Empty, ListHead } from './ListHead.jsx'

// Untouched patterns listed on Home, as a nudge toward the Patterns page.
const PATTERN_PREVIEW_COUNT = 4

export default function PatternsPreview({ patternStats, onShowPatterns, onOpenPattern }) {
  const started = patternStats.filter((pattern) => pattern.solved > 0).length
  const untouched = patternStats.filter((pattern) => pattern.solved === 0).slice(0, PATTERN_PREVIEW_COUNT)
  return (
    <section aria-labelledby="pattern-heading">
      <ListHead
        id="pattern-heading"
        action={
          <button type="button" onClick={onShowPatterns} className="sech-link ml-auto">
            View →
          </button>
        }
      >
        Patterns · {started}/{patternStats.length}
      </ListHead>
      {untouched.length > 0 ? (
        <ul>
          {untouched.map((pattern) => (
            <li key={pattern.key}>
              <button
                type="button"
                onClick={() => onOpenPattern(pattern.topic, pattern.pattern)}
                className="group flex w-full items-center gap-[11px] border-b border-line px-0.5 py-2 text-left text-[13px] hover:bg-low"
              >
                <span className="min-w-0 flex-1 truncate group-hover:text-accent">{pattern.pattern}</span>
                <span className="step">not started</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Every pattern has at least one solve.</Empty>
      )}
    </section>
  )
}
