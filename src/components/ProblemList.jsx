import { memo } from 'react'
import { hasNote } from '../progress.js'
import { isDue } from '../review.js'
import { BookmarkButton, Difficulty, NoteMark, ProblemLink, SolvedCheck } from './QuestionControls.jsx'

// Anchor id for a group, so the Patterns page can scroll straight to one.
export function groupId(key) {
  return `group-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

// One row layout for every screen size. Memoised on primitives, so ticking a
// problem re-renders that row only rather than all 922. The data-* hooks are
// what the j/k/x/b keyboard shortcuts look for.
export const ProblemRow = memo(function ProblemRow({ question, solved, bookmarked, due, noted, link, meta, onToggleSolved, onToggleBookmark, onOpen }) {
  return (
    <li
      data-problem-row
      data-question-id={question.id}
      className={`group flex scroll-mt-10 items-center gap-3 px-5 py-3 transition-colors focus-within:bg-low hover:bg-low sm:gap-4 sm:px-6 `}
    >
      <SolvedCheck solved={solved} problem={question.problem} onToggle={() => onToggleSolved(question.id)} />
      <button type="button" data-row-open onClick={() => onOpen(question.id)} className="min-w-0 flex-1 rounded text-left">
        <span className="flex items-center gap-1.5">
          <span
            className={`line-clamp-2 min-w-0 text-sm font-medium leading-5 transition-colors sm:line-clamp-1 ${
              solved ? 'text-muted' : 'text-ink group-hover:text-accent'
            }`}
          >
            {question.problem}
          </span>
          {noted && <NoteMark />}
        </span>
        {(due || meta) && (
          <span className="mt-0.5 block truncate text-xs text-muted">
            {due && (
              <span className="font-medium text-accent">
                Review due{meta ? ' · ' : ''}
              </span>
            )}
            {meta}
          </span>
        )}
      </button>
      <Difficulty difficulty={question.difficulty} />
      <div className="-mr-2 flex shrink-0 items-center">
        <BookmarkButton data-row-bookmark bookmarked={bookmarked} problem={question.problem} onToggle={() => onToggleBookmark(question.id)} />
        <ProblemLink href={link} verified={question.linkVerified || link !== question.link} platform={question.platform} problem={question.problem} />
      </div>
    </li>
  )
})

// Meta line under a problem name: its pattern (unless the group header already
// says it) and a note for the optional Depth and Stretch tiers.
export function problemMeta(question, showPattern) {
  return [showPattern && question.pattern, question.tier !== 'Core' && question.tier].filter(Boolean).join(' · ')
}

export default function ProblemList({ groups, progress, today, showPattern, onToggleSolved, onToggleBookmark, onOpen }) {
  return (
    <div className="pb-12">
      {groups.map((group) => (
        <section key={group.key} id={groupId(group.key)} aria-label={group.label}>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-canvas/90 px-5 py-2 backdrop-blur sm:px-6">
            <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{group.label}</h2>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {group.solved}/{group.items.length}
            </span>
          </div>
          <ul className="divide-y divide-line/70">
            {group.items.map((question) => {
              const entry = progress[question.id]
              return (
                <ProblemRow
                  key={question.id}
                  question={question}
                  solved={entry?.solved === true}
                  bookmarked={entry?.bookmarked === true}
                  due={isDue(entry, today)}
                  noted={hasNote(entry)}
                  link={entry?.link ?? question.link}
                  meta={problemMeta(question, showPattern)}
                  onToggleSolved={onToggleSolved}
                  onToggleBookmark={onToggleBookmark}
                  onOpen={onOpen}
                />
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
