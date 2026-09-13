import { useEffect, useRef, useState } from 'react'
import { topicName } from '../constants.js'
import { formatDate } from '../progress.js'
import { isDue, nextReviewDate } from '../review.js'
import { isValidUrl } from '../storage.js'
import { DifficultyPill, ProblemLink, SolvedCheck } from './QuestionControls.jsx'
import { BookmarkIcon, CheckIcon } from './icons.jsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const SWIPE_CLOSE_PX = 90

// For search-link problems: lets the user paste the real URL once found, which
// is what the Excel sheet asks for too.
function LinkFixer({ platform, customLink, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(customLink ?? '')
  const valid = isValidUrl(draft.trim())

  if (editing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid) return
          onSave(draft.trim())
          setEditing(false)
        }}
        className="mt-3 flex gap-2"
      >
        <input
          type="url"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://…"
          aria-label="Problem URL"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button type="submit" disabled={!valid} className="h-9 rounded-lg bg-ink px-3 text-sm font-medium text-canvas transition-opacity disabled:opacity-40">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-lg px-2 text-sm text-ink-3 hover:text-ink">
          Cancel
        </button>
      </form>
    )
  }

  if (customLink) {
    return (
      <p className="mt-3 text-xs text-ink-3">
        Using the link you saved.{' '}
        <button type="button" onClick={() => setEditing(true)} className="font-medium text-brand-strong hover:underline">
          Change
        </button>{' '}
        ·{' '}
        <button type="button" onClick={() => onSave('')} className="font-medium text-brand-strong hover:underline">
          Reset
        </button>
      </p>
    )
  }

  return (
    <p className="mt-3 text-xs leading-5 text-ink-3">
      {platform} URLs change over time, so this opens a search.{' '}
      <button type="button" onClick={() => setEditing(true)} className="font-medium text-brand-strong hover:underline">
        Paste the real link
      </button>
    </p>
  )
}

function reviewStatus(entry, due) {
  if (due) return <span className="font-semibold text-brand-strong">Due for review</span>
  const next = nextReviewDate(entry)
  if (next) return `Next review ${formatDate(next)}`
  return entry.solvedAt ? 'All reviews done' : null
}

export default function ProblemDetailDrawer({
  question,
  progress,
  today,
  relatedQuestions,
  onToggleSolved,
  onToggleBookmark,
  onMarkReviewed,
  onNotesChange,
  onLinkChange,
  onSelectRelated,
  onClose,
}) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const dragStartRef = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)

  const entry = progress[question.id] ?? {}
  const solved = entry.solved === true
  const bookmarked = entry.bookmarked === true
  const link = entry.link ?? question.link
  const due = isDue(entry, today)
  const review = solved ? reviewStatus(entry, due) : null

  // Return focus to whatever opened the drawer once it closes.
  useEffect(() => {
    const previous = document.activeElement
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [question.id])

  // Escape closes; Tab and Shift+Tab cycle within the panel instead of
  // wandering into the page hidden behind it.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const inside = dialogRef.current.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // On phones the panel is a bottom sheet: drag its top bar down to dismiss.
  function handleTouchStart(event) {
    if (!window.matchMedia('(max-width: 639px)').matches) return
    dragStartRef.current = event.touches[0].clientY
  }
  function handleTouchMove(event) {
    if (dragStartRef.current === null) return
    setDragOffset(Math.max(0, event.touches[0].clientY - dragStartRef.current))
  }
  function handleTouchEnd() {
    if (dragStartRef.current === null) return
    dragStartRef.current = null
    if (dragOffset > SWIPE_CLOSE_PX) onClose()
    else setDragOffset(0)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end bg-black/40 sm:items-stretch sm:justify-end"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-detail-title"
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
        className="flex max-h-[90dvh] w-full animate-sheet-up flex-col rounded-t-2xl border-line bg-surface shadow-2xl transition-transform duration-200 sm:max-h-none sm:w-[28rem] sm:animate-slide-in sm:rounded-none sm:border-l"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 touch-none sm:touch-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
            <p className="truncate text-sm text-ink-3">
              Phase {question.phase} · {topicName(question.topic)}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
              aria-label="Close problem details"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <DifficultyPill difficulty={question.difficulty} />
            <span>{question.pattern}</span>
            <span aria-hidden="true">·</span>
            <span>{question.tier} track</span>
          </div>
          <h2 id="problem-detail-title" className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            {question.problem}
          </h2>

          <ProblemLink
            href={link}
            verified={question.linkVerified || Boolean(entry.link)}
            platform={question.platform}
            problem={question.problem}
            variant="primary"
            className="mt-6 w-full"
          />
          {!question.linkVerified && (
            <LinkFixer key={question.id} platform={question.platform} customLink={entry.link} onSave={(url) => onLinkChange(question.id, url)} />
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleSolved(question.id)}
              aria-pressed={solved}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                solved ? 'border-brand/40 bg-brand-soft text-brand-strong' : 'border-line text-ink hover:bg-subtle'
              }`}
            >
              <CheckIcon className="h-4 w-4" />
              {solved ? 'Solved' : 'Mark solved'}
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark(question.id)}
              aria-pressed={bookmarked}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                bookmarked ? 'border-mark/40 bg-mark/10 text-mark' : 'border-line text-ink hover:bg-subtle'
              }`}
            >
              <BookmarkIcon filled={bookmarked} />
              {bookmarked ? 'Saved' : 'Save'}
            </button>
          </div>

          {solved && (entry.solvedAt || review) && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-subtle/70 px-3.5 py-2.5 text-xs text-ink-2">
              <span>
                {entry.solvedAt ? `Solved ${formatDate(entry.solvedAt)}` : 'Solved'}
                {review && <> · {review}</>}
              </span>
              {due && (
                <button
                  type="button"
                  onClick={() => onMarkReviewed(question.id)}
                  className="h-7 shrink-0 rounded-md bg-brand px-2.5 font-semibold text-brand-contrast transition-colors hover:bg-brand-strong"
                >
                  Mark revised
                </button>
              )}
            </div>
          )}

          <label htmlFor="problem-notes" className="mt-8 block text-sm font-semibold text-ink">
            Notes
          </label>
          <textarea
            id="problem-notes"
            value={entry.notes ?? ''}
            onChange={(event) => onNotesChange(question.id, event.target.value)}
            rows={4}
            placeholder="Approach, complexity, edge cases…"
            className="mt-2 w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm leading-6 text-ink placeholder:text-ink-3 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="mt-1 text-xs text-ink-3">Saved automatically in this browser.</p>

          {relatedQuestions.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-semibold text-ink">More in {topicName(question.topic)}</h3>
              <ul className="-mx-5 mt-2 divide-y divide-line/70 border-y border-line sm:-mx-6">
                {relatedQuestions.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
                    <SolvedCheck solved={progress[item.id]?.solved === true} problem={item.problem} onToggle={() => onToggleSolved(item.id)} />
                    <button type="button" onClick={() => onSelectRelated(item.id)} className="group min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-medium text-ink group-hover:text-brand-strong">{item.problem}</span>
                      <span className="block truncate text-xs text-ink-3">{item.pattern}</span>
                    </button>
                    <DifficultyPill difficulty={item.difficulty} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>
  )
}
