import { useEffect, useRef, useState } from 'react'
import { topicName } from '../constants.js'
import { isImageFile, MAX_NOTE_IMAGES, storeImages } from '../images.js'
import { daysBetween, formatDate, hasNote } from '../progress.js'
import { isDue, isLapsed, LAPSE_INTERVAL, nextReviewDate, recordReview, struggleCount } from '../review.js'
import { isTypingTarget, reviewOutcomeFor } from '../keyboard.js'
import { isValidUrl } from '../storage.js'
import NoteImages from './NoteImages.jsx'
import { Difficulty, NoteMark, ProblemLink, SolvedCheck } from './QuestionControls.jsx'
import { BookmarkIcon, CheckIcon, ImageIcon } from './icons.jsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const SWIPE_CLOSE_PX = 90

// For problems without a working link: lets the user paste the real URL once
// found, which is what the Excel sheet asks for too.
function LinkFixer({ customLink, onSave }) {
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
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button type="submit" disabled={!valid} className="h-9 rounded-lg bg-ink px-3 text-sm font-medium text-canvas transition-opacity disabled:opacity-40">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-lg px-2 text-sm text-muted hover:text-ink">
          Cancel
        </button>
      </form>
    )
  }

  if (customLink) {
    return (
      <p className="mt-3 text-xs text-muted">
        Using the link you saved.{' '}
        <button type="button" onClick={() => setEditing(true)} className="font-medium text-accent hover:underline">
          Change
        </button>{' '}
        ·{' '}
        <button type="button" onClick={() => onSave('')} className="font-medium text-accent hover:underline">
          Reset
        </button>
      </p>
    )
  }

  return (
    <p className="mt-3 text-xs leading-5 text-muted">
      The direct link couldn’t be confirmed, so this searches Google.{' '}
      <button type="button" onClick={() => setEditing(true)} className="font-medium text-accent hover:underline">
        Paste the real link
      </button>
    </p>
  )
}

// Image files from a paste. Anything with real plain text stays a text paste,
// even if an image comes along (copying cells from Excel does that). HTML is
// ignored: "Copy image" in a browser often includes some alongside the image.
function pastedImages(clipboard) {
  if (!clipboard || clipboard.getData('text/plain').trim() !== '') return []
  const files = [...clipboard.files].filter(isImageFile)
  if (files.length > 0) return files
  return [...clipboard.items]
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(isImageFile)
}

function shortDate(isoDate) {
  return formatDate(isoDate).replace(/,? \d{4}$/, '')
}

function inDays(days) {
  return days === 1 ? 'in 1 day' : `in ${days} days`
}

// What each answer would do to the schedule, worked out with the same
// functions that record it - nothing is written until a button is pressed.
function consequences(entry, today) {
  const next = nextReviewDate({ ...entry, ...recordReview(entry, 'got', today) })
  return {
    got: next ? `next review ${inDays(daysBetween(today, next))}` : 'no more reviews after this',
    struggled: `back ${inDays(LAPSE_INTERVAL)}, and saved`,
  }
}

// The schedule as one quiet line: when it was solved, and when it next comes
// back - or that it is due now, relearning, or finished with.
function scheduleLine(entry, due) {
  const solvedPart = entry.solvedAt ? `Solved ${formatDate(entry.solvedAt)}` : 'Solved'
  if (due) return `${solvedPart} · Due for review now`
  const next = nextReviewDate(entry)
  if (!next) return entry.solvedAt ? `${solvedPart} · All reviews done` : solvedPart
  return `${solvedPart} · Next review ${formatDate(next)}${isLapsed(entry) ? ' · relearning' : ''}`
}

// Every re-solve, newest first: an outcome mark, the outcome, the date.
function History({ history }) {
  return (
    <ol>
      {[...history].reverse().map((item, index) => {
        const got = item.result === 'got'
        return (
          <li key={`${item.date}-${index}`} className="flex items-center gap-2.5 border-b border-line py-1.5 text-[12.5px] last:border-b-0">
            <span
              aria-hidden="true"
              className={`mono grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-[10px] ${got ? 'bg-fill text-onfill' : 'bg-warn text-onwarn'}`}
            >
              {got ? '✓' : '✕'}
            </span>
            <span className="font-medium">{got ? 'Got it' : 'Struggled'}</span>
            <span className="mono ml-auto text-[11.5px] text-muted">{shortDate(item.date)}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function ProblemDetailDrawer({
  question,
  progress,
  today,
  relatedQuestions,
  onToggleSolved,
  onToggleBookmark,
  onReview,
  onNotesChange,
  onAddImages,
  onRemoveImage,
  onClearNote,
  onLinkChange,
  onSelectRelated,
  onClose,
}) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const dragStartRef = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)
  const fileInputRef = useRef(null)
  // Per problem, as the panel can switch problems while images still process.
  const [attaching, setAttaching] = useState({})
  const [imageError, setImageError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const entry = progress[question.id] ?? {}
  const solved = entry.solved === true
  const bookmarked = entry.bookmarked === true
  const link = entry.link ?? question.link
  const due = isDue(entry, today)
  const imageIds = entry.images ?? []
  const noted = hasNote(entry)
  const attachingCount = attaching[question.id] ?? 0
  const history = entry.history ?? []

  // The key handler reads the entry through a ref: it changes on every
  // keystroke in the notes field, and re-registering a window listener that
  // often would be wasteful.
  const reviewStateRef = useRef({ entry, today })
  reviewStateRef.current = { entry, today }

  async function attachImages(files) {
    const questionId = question.id
    const room = MAX_NOTE_IMAGES - imageIds.length - attachingCount
    const picked = files.filter(isImageFile).slice(0, Math.max(room, 0))
    if (picked.length < files.length) {
      const message = room <= 0 ? `A note can hold up to ${MAX_NOTE_IMAGES} images.` : 'Some files weren’t images or didn’t fit, so they were skipped.'
      setImageError({ questionId, message })
    } else {
      setImageError(null)
    }
    if (picked.length === 0) return

    const track = (change) => setAttaching((prev) => ({ ...prev, [questionId]: (prev[questionId] ?? 0) + change }))
    track(picked.length)
    try {
      const ids = await storeImages(picked)
      if (ids.length > 0) onAddImages(questionId, ids)
      if (ids.length < picked.length) setImageError({ questionId, message: 'Some images couldn’t be saved. Storage may be full or blocked.' })
    } finally {
      track(-picked.length)
    }
  }

  function handlePaste(event) {
    const files = pastedImages(event.clipboardData)
    if (files.length === 0) return
    event.preventDefault()
    attachImages(files)
  }

  // Both of these used to stop and ask. They don't any more: the action is
  // reversible now, and an Undo you can ignore beats a prompt you have to
  // answer before every single deletion.
  function handleDeleteImage(imageId) {
    onRemoveImage(question.id, imageId)
  }

  function handleClearNote() {
    onClearNote(question.id, imageIds)
  }

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
      // g/s record the review without leaving the panel, but only on a problem
      // that is due and only when the user isn't writing a note.
      if (!isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const { entry: current, today: now } = reviewStateRef.current
        const outcome = reviewOutcomeFor(event.key, current, now)
        if (outcome) {
          event.preventDefault()
          onReview(question.id, outcome)
          return
        }
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
  }, [onClose, onReview, question.id])

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

  const outcomes = due ? consequences(entry, today) : null
  const struggles = struggleCount(entry)
  const strip = solved ? scheduleLine(entry, due) : null

  // Files dropped anywhere on the note go the same way as picked or pasted
  // ones. Only a drag carrying files is taken, so dragging text into the
  // note still just moves text.
  const carriesFiles = (event) => [...event.dataTransfer.types].includes('Files')
  const canAdd = imageIds.length + attachingCount < MAX_NOTE_IMAGES
  const noteDrop = {
    onDragOver: (event) => {
      if (!canAdd || !carriesFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setDragging(true)
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
    },
    onDrop: (event) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      setDragging(false)
      attachImages([...event.dataTransfer.files])
    },
  }

  return (
    <div className="fixed inset-0 z-50 flex motion-safe:animate-fade-in items-end bg-canvas/60 sm:items-stretch sm:justify-end" role="presentation" onMouseDown={onClose}>
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-detail-title"
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
        className="flex max-h-[90dvh] w-full motion-safe:animate-sheet-up flex-col rounded-t-2xl border-t border-rule bg-low transition-transform duration-200 sm:max-h-none sm:w-[min(496px,92%)] motion-safe:sm:animate-slide-in sm:rounded-none sm:border-l sm:border-t-0"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 touch-none sm:touch-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <p className="truncate text-[13px] text-muted">
              Phase {question.phase} · {topicName(question.topic)}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base leading-none text-muted hover:bg-tint hover:text-ink"
              aria-label="Close problem details"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Difficulty difficulty={question.difficulty} />
            <span>{question.pattern}</span>
            <span aria-hidden="true">·</span>
            <span>{question.tier} track</span>
          </div>
          <h2 id="problem-detail-title" className="mt-3 text-2xl font-[650] leading-tight tracking-[-0.02em]">
            {question.problem}
          </h2>

          <ProblemLink
            href={link}
            verified={question.linkVerified || Boolean(entry.link)}
            platform={question.platform}
            problem={question.problem}
            variant="primary"
            className="mt-5"
          />
          {!question.linkVerified && <LinkFixer key={question.id} customLink={entry.link} onSave={(url) => onLinkChange(question.id, url)} />}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleSolved(question.id)}
              aria-pressed={solved}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold ${
                solved ? 'border-transparent bg-fill text-onfill' : 'border-rule text-ink hover:border-accent hover:text-accent'
              }`}
            >
              <CheckIcon className="h-4 w-4" strokeWidth={2.4} />
              {solved ? 'Solved' : 'Mark solved'}
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark(question.id)}
              aria-pressed={bookmarked}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold ${
                bookmarked ? 'border-accent text-accent' : 'border-rule text-ink hover:border-accent hover:text-accent'
              }`}
            >
              <BookmarkIcon filled={bookmarked} />
              {bookmarked ? 'Saved' : 'Save'}
            </button>
          </div>

          {strip && <p className="mt-3 rounded-lg bg-tint px-3.5 py-2.5 text-xs text-muted">{strip}</p>}

          {/* Only when due, so a review can never be recorded early. Each
              option says what it will do before it is pressed. */}
          {due && (
            <div className="mt-3 rounded-xl border border-rule bg-canvas p-3.5">
              <p className="text-[13px] text-muted">
                Re-solve it from scratch, then say how it went. <strong className="font-semibold text-ink">Your answer sets the next date.</strong>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onReview(question.id, 'got')}
                  aria-label={`Got it. ${outcomes.got[0].toUpperCase()}${outcomes.got.slice(1)}.`}
                  className="group rounded-lg border border-rule px-3 py-[11px] text-left hover:border-transparent hover:bg-fill hover:text-onfill"
                >
                  <b className="flex items-center gap-1.5 text-[13.5px] font-[650]">
                    Got it
                    <kbd className="kbd text-[10px] group-hover:border-current group-hover:text-current">g</kbd>
                  </b>
                  <span className="mono mt-[3px] block text-[11px] text-muted group-hover:text-current">{outcomes.got}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReview(question.id, 'struggled')}
                  aria-label={`Struggled. Back ${inDays(LAPSE_INTERVAL)}, and saved for revision.`}
                  className="group rounded-lg border border-rule px-3 py-[11px] text-left hover:border-transparent hover:bg-warn hover:text-onwarn"
                >
                  <b className="flex items-center gap-1.5 text-[13.5px] font-[650]">
                    Struggled
                    <kbd className="kbd text-[10px] group-hover:border-current group-hover:text-current">s</kbd>
                  </b>
                  <span className="mono mt-[3px] block text-[11px] text-muted group-hover:text-current">{outcomes.struggled}</span>
                </button>
              </div>
            </div>
          )}

          <label htmlFor="problem-notes" className="mt-7 block text-sm font-semibold text-ink">
            Notes
          </label>
          <div {...noteDrop} className={`mt-2 rounded-xl ${dragging ? 'outline-dashed outline-2 outline-offset-2 outline-accent' : ''}`}>
            <textarea
              id="problem-notes"
              value={entry.notes ?? ''}
              onChange={(event) => onNotesChange(question.id, event.target.value)}
              onPaste={handlePaste}
              rows={4}
              placeholder="Approach, complexity, edge cases… Paste or drop a screenshot to attach it."
              className="block w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-[13px] leading-6 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <NoteImages ids={imageIds} onDelete={handleDeleteImage} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
            <p aria-live="polite">{dragging ? 'Drop to add the image' : attachingCount > 0 ? 'Adding image…' : 'Saved automatically in this browser.'}</p>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  attachImages([...event.target.files])
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canAdd}
                className="inline-flex h-7 items-center gap-1.5 rounded font-medium text-accent hover:underline disabled:opacity-40"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Add image
              </button>
              {noted && (
                <button type="button" onClick={handleClearNote} className="h-7 rounded font-medium text-muted hover:text-accent hover:underline">
                  Clear note
                </button>
              )}
            </div>
          </div>
          {imageError?.questionId === question.id && (
            <p role="alert" className="mt-1 text-xs text-accent">
              {imageError.message}
            </p>
          )}

          {relatedQuestions.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-semibold text-ink">More in {topicName(question.topic)}</h3>
              <ul className="mt-2 border-t border-line">
                {relatedQuestions.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border-b border-line py-3.5">
                    <SolvedCheck solved={progress[item.id]?.solved === true} problem={item.problem} onToggle={() => onToggleSolved(item.id)} />
                    <button type="button" onClick={() => onSelectRelated(item.id)} className="block min-w-0 flex-1 rounded text-left hover:text-accent">
                      <span className="flex items-center gap-1.5">
                        <span className="pname min-w-0 truncate text-[13.5px]">{item.problem}</span>
                        {hasNote(progress[item.id]) && <NoteMark />}
                      </span>
                      <span className="psub">{item.pattern}</span>
                    </button>
                    <Difficulty difficulty={item.difficulty} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Every re-solve, kept but folded away: useful when looking back,
              not something to read on every visit. */}
          {history.length > 0 && (
            <details className="group mt-8">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="text-xs text-muted transition-transform group-open:rotate-90">
                  ›
                </span>
                History
                <span className="mono ml-auto text-[11px] font-normal text-muted">
                  {struggles} of {history.length} struggled
                </span>
              </summary>
              <div className="mt-2">
                <History history={history} />
              </div>
            </details>
          )}
        </div>
      </aside>
    </div>
  )
}
