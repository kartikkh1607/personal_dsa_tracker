import { memo } from 'react'
import { daysBetween, formatDate, hasNote } from '../progress.js'
import { isDue, isWeak, nextReviewDate, struggleCount } from '../review.js'
import { BookmarkButton, Difficulty, NoteMark, ProblemLink, SolvedCheck } from './QuestionControls.jsx'

// Anchor id for a group, so the Patterns page can scroll straight to one.
export function groupId(key) {
  return `group-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

// One column that says where a problem stands: not started, due, how often it
// has been struggled with, or when it next comes back.
function problemStatus(entry, today) {
  if (!entry?.solved) return { text: '—', title: 'Not solved yet' }
  if (isDue(entry, today)) return { text: 'due today', title: 'Due for review today', due: true }
  const next = nextReviewDate(entry)
  const when = next ? `Next review ${formatDate(next)}` : 'All reviews done'
  if (isWeak(entry)) return { text: `struggled ${struggleCount(entry)}×`, title: when }
  if (next) return { text: `review in ${daysBetween(today, next)}d`, title: when }
  return { text: 'solved', title: when }
}

// One row per problem. Memoised on primitives, so ticking a problem re-renders
// that row only rather than all 917. The data-* hooks are what the j/k/x/b
// keyboard shortcuts look for.
const ProblemRow = memo(function ProblemRow({ question, solved, bookmarked, status, statusTitle, statusDue, noted, link, meta, onToggleSolved, onToggleBookmark, onOpen }) {
  return (
    // The whole row opens the drawer. The name stays a real button - it is
    // the row's keyboard handle, where j/k land and Enter opens - and its
    // click simply bubbles up to here.
    <tr data-problem-row data-question-id={question.id} onClick={() => onOpen(question.id)} className="row-open scroll-mt-20">
      <td>
        <SolvedCheck solved={solved} problem={question.problem} onToggle={() => onToggleSolved(question.id)} />
      </td>
      <td className="cell-name cell-name--after-tick w-full max-w-0">
        <button type="button" data-row-open className="block max-w-full rounded text-left">
          <span className="flex items-center gap-1.5">
            <span className="pname min-w-0 truncate">{question.problem}</span>
            {noted && <NoteMark />}
          </span>
          <span className="psub">
            {question.pattern}
            {meta && ` · ${meta}`}
          </span>
        </button>
      </td>
      <td>
        <Difficulty difficulty={question.difficulty} />
      </td>
      <td>
        <span className={`step ${statusDue ? 'step--due' : ''}`} title={statusTitle}>
          {status}
        </span>
      </td>
      <td>
        <span className="inline-flex items-center gap-1">
          <ProblemLink href={link} verified={question.linkVerified || link !== question.link} platform={question.platform} problem={question.problem} />
          <BookmarkButton data-row-bookmark bookmarked={bookmarked} problem={question.problem} onToggle={() => onToggleBookmark(question.id)} />
        </span>
      </td>
    </tr>
  )
})

// The optional Depth and Stretch tiers, marked after the pattern.
function problemMeta(question) {
  return question.tier !== 'Core' ? question.tier : ''
}

export default function ProblemList({ groups, progress, today, onToggleSolved, onToggleBookmark, onOpen }) {
  return (
    <table className="board board--cards board--roomy board--ticked">
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Solved</span>
          </th>
          <th scope="col">Problem</th>
          <th scope="col">Difficulty</th>
          <th scope="col">Status</th>
          <th scope="col">Source</th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.key} id={groupId(group.key)} aria-label={group.label} className="scroll-mt-4">
          <tr className="group-row">
            <th colSpan={5} scope="colgroup" className="sticky top-0 z-10 !bg-canvas !pb-1.5 !pt-4 text-left">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate">{group.label}</span>
                <span className="shrink-0 tracking-normal">
                  {group.solved}/{group.items.length}
                </span>
              </span>
            </th>
          </tr>
          {group.items.map((question) => {
            const entry = progress[question.id]
            const status = problemStatus(entry, today)
            return (
              <ProblemRow
                key={question.id}
                question={question}
                solved={entry?.solved === true}
                bookmarked={entry?.bookmarked === true}
                status={status.text}
                statusTitle={status.title}
                statusDue={status.due === true}
                noted={hasNote(entry)}
                link={entry?.link ?? question.link}
                meta={problemMeta(question)}
                onToggleSolved={onToggleSolved}
                onToggleBookmark={onToggleBookmark}
                onOpen={onOpen}
              />
            )
          })}
        </tbody>
      ))}
    </table>
  )
}
