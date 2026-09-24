import { useRef, useState } from 'react'
import { topicName } from '../../constants.js'
import { hasNote } from '../../progress.js'
import { isLapsed, LAPSE_INTERVAL, REVIEW_INTERVALS } from '../../review.js'
import { Difficulty, NoteMark } from '../QuestionControls.jsx'

// How long a reviewed row stays, faded, before it leaves the board.
const LEAVE_MS = 200

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Where a problem sits in its review schedule: R2/3, or ↺ 3d on the relearn
// step after a struggle. Text as well as colour, so it reads without either.
function ReviewStep({ entry }) {
  if (isLapsed(entry)) {
    return (
      <span className="step step--re" title={`Relearning: back in ${LAPSE_INTERVAL} days if it slips again`}>
        ↺ {LAPSE_INTERVAL}d
      </span>
    )
  }
  return (
    <span className="step" title={`Review ${(entry.reviews ?? 0) + 1} of ${REVIEW_INTERVALS.length}`}>
      R{(entry.reviews ?? 0) + 1}/{REVIEW_INTERVALS.length}
    </span>
  )
}

// Today's reviews as a board: one row each, the two outcomes side by side so
// they read as one question - "how did that go?" - rather than one button and
// an escape hatch. A reviewed row fades before it leaves, so the list doesn't
// jump under the pointer.
export default function DueBoard({ reviewToday, backlogCount, progress, onReview, onOpenQuestion, onShowReview }) {
  const [leaving, setLeaving] = useState(() => new Set())
  // Recorded through a ref so the review lands with the handler of the moment
  // it lands, not the one from the render that started the fade.
  const onReviewRef = useRef(onReview)
  onReviewRef.current = onReview
  const held = backlogCount - reviewToday.length

  function review(id, result) {
    if (leaving.has(id)) return
    if (reducedMotion()) {
      onReview(id, result)
      return
    }
    setLeaving((previous) => new Set(previous).add(id))
    setTimeout(() => {
      onReviewRef.current(id, result)
      setLeaving((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    }, LEAVE_MS)
  }

  return (
    <>
      <div className="sech items-center">
        <h2 id="review-heading" className="lbl">
          Due today — {reviewToday.length}
          {held > 0 && ` of ${backlogCount}`}
        </h2>
        <button type="button" onClick={() => onOpenQuestion(reviewToday[0].id)} className="btn-primary">
          Start reviewing
        </button>
        {backlogCount > reviewToday.length && (
          <button type="button" onClick={onShowReview} className="sech-link ml-auto">
            See all {backlogCount} →
          </button>
        )}
      </div>
      <table className="board board--cards board--roomy" aria-labelledby="review-heading">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Problem</th>
            <th scope="col">Difficulty</th>
            <th scope="col">Step</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {reviewToday.map((question, index) => {
            const entry = progress[question.id]
            const gone = leaving.has(question.id)
            return (
              <tr
                key={question.id}
                onClick={() => onOpenQuestion(question.id)}
                {...(gone ? { className: 'row-open leaving' } : { className: 'row-open', 'data-review-row': true })}
              >
                <td className="cell-wide mono text-[11.5px] text-muted">{String(index + 1).padStart(2, '0')}</td>
                <td className="cell-name w-full max-w-0">
                  <button type="button" className="block max-w-full rounded text-left">
                    <span className="flex items-center gap-1.5">
                      <span className="pname min-w-0 truncate">{question.problem}</span>
                      {hasNote(entry) && <NoteMark />}
                    </span>
                    <span className="psub">
                      {topicName(question.topic)} · {question.pattern}
                      {isLapsed(entry) && ` · struggled last time, back in ${LAPSE_INTERVAL} days if it slips again`}
                    </span>
                  </button>
                </td>
                <td>
                  <Difficulty difficulty={question.difficulty} />
                </td>
                <td>
                  <ReviewStep entry={entry} />
                </td>
                <td>
                  <span className="inline-flex gap-1.5">
                    <button
                      type="button"
                      disabled={gone}
                      onClick={(event) => {
                        event.stopPropagation()
                        review(question.id, 'got')
                      }}
                      aria-label={`Got it: ${question.problem}. Schedules the next review further out.`}
                      className="act act--go"
                    >
                      Got it
                    </button>
                    <button
                      type="button"
                      disabled={gone}
                      onClick={(event) => {
                        event.stopPropagation()
                        review(question.id, 'struggled')
                      }}
                      aria-label={`Struggled with: ${question.problem}. Comes back in ${LAPSE_INTERVAL} days, and is saved for revision.`}
                      className="act"
                    >
                      Struggled
                    </button>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="flex justify-between gap-3 px-0.5 pt-[9px] text-xs text-muted">
        <span>
          Reviews left today: <b className="mono font-medium text-ink">{reviewToday.length}</b>
        </span>
        <span>
          Held for tomorrow: <b className="mono font-medium text-ink">{held}</b>
        </span>
      </p>
    </>
  )
}
