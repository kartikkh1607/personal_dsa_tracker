import { useEffect, useRef, useState } from 'react'
import { topicName } from '../constants.js'
import { formatDate } from '../progress.js'
import { isValidUrl } from '../storage.js'
import { DifficultyPill, ProblemLink, SolvedCheck } from './QuestionControls.jsx'
import { BookmarkIcon, CheckIcon } from './icons.jsx'

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

export default function ProblemDetailDrawer({
  question,
  progress,
  relatedQuestions,
  onToggleSolved,
  onToggleBookmark,
  onNotesChange,
  onLinkChange,
  onSelectRelated,
  onClose,
}) {
  const closeButtonRef = useRef(null)
  const entry = progress[question.id] ?? {}
  const solved = entry.solved === true
  const bookmarked = entry.bookmarked === true
  const link = entry.link ?? question.link

  // Return focus to whatever opened the drawer once it closes.
  useEffect(() => {
    const previous = document.activeElement
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [question.id])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end bg-black/40 sm:items-stretch sm:justify-end"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-detail-title"
        className="flex max-h-[90dvh] w-full animate-sheet-up flex-col rounded-t-2xl border-line bg-surface shadow-2xl sm:max-h-none sm:w-[28rem] sm:animate-slide-in sm:rounded-none sm:border-l"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
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
          {solved && entry.solvedAt && <p className="mt-2 text-center text-xs text-ink-3">Solved on {formatDate(entry.solvedAt)}</p>}

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
