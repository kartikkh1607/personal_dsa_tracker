import { useEffect, useRef, useState } from 'react'
import { topicName } from '../constants.js'
import { isImageFile, MAX_NOTE_IMAGES, storeImages } from '../images.js'
import { daysBetween, formatDate, hasNote } from '../progress.js'
import { isDue, isLapsed, LAPSE_INTERVAL, nextReviewDate, recordReview, REVIEW_INTERVALS, struggleCount } from '../review.js'
import { isTypingTarget, reviewOutcomeFor } from '../keyboard.js'
import { isValidUrl } from '../storage.js'
import NoteImages from './NoteImages.jsx'
import { Difficulty, NoteMark, ProblemLink, SolvedCheck } from './QuestionControls.jsx'
import { BookmarkIcon } from './icons.jsx'

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

// The review step as words for the chip row: "Review 2 of 3", or relearning.
function stepLabel(entry) {
  if (isLapsed(entry)) return 'Relearning'
  const reviews = entry.reviews ?? 0
  if (reviews >= REVIEW_INTERVALS.length) return 'Reviews done'
  return `Review ${reviews + 1} of ${REVIEW_INTERVALS.length}`
}

function nextReviewText(entry, due, today) {
  if (due) return 'today'
  const next = nextReviewDate(entry)
  if (!next) return entry.solvedAt ? 'all reviews done' : '—'
  return `${shortDate(next)} · ${inDays(daysBetween(today, next))}`
}

function Block({ title, aside, children }) {
  return (
    <section>
      <h3 className="lbl mb-2 flex items-center gap-2.5">
        {title}
        {aside && <span className="ml-auto font-mono text-[11px] normal-case tracking-normal">{aside}</span>}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, children, accent = false }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-[7px] text-[12.5px] last:border-b-0">
      <span className="text-muted">{label}</span>
      <b className={`mono text-right font-medium ${accent ? 'text-accent' : ''}`}>{children}</b>
    </div>
  )
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
  const lastOutcome = history.length > 0 ? history[history.length - 1].result : null

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end bg-canvas/60 sm:items-stretch sm:justify-end" role="presentation" onMouseDown={onClose}>
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-detail-title"
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
        className="flex max-h-[90dvh] w-full animate-sheet-up flex-col rounded-t-2xl border-t border-rule bg-low transition-transform duration-200 sm:max-h-none sm:w-[min(496px,92%)] sm:animate-slide-in sm:rounded-none sm:border-l sm:border-t-0"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 touch-none sm:touch-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
          <div className="flex items-center gap-2 border-b border-line px-4 py-[11px]">
            <p className="mono truncate text-[11px] tracking-[0.08em] text-muted">
              Phase {question.phase} · {question.phaseName}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-md text-base leading-none text-muted hover:bg-tint hover:text-ink"
              aria-label="Close problem details"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pb-3.5 pt-4">
            <p className="lbl truncate">
              {topicName(question.topic)} · {question.pattern}
              {question.tier !== 'Core' && ` · ${question.tier}`}
            </p>
            <h2 id="problem-detail-title" className="mt-[7px] text-[21px] font-[650] leading-[1.22] tracking-[-0.025em]">
              {question.problem}
            </h2>
            <ProblemLink
              href={link}
              verified={question.linkVerified || Boolean(entry.link)}
              platform={question.platform}
              problem={question.problem}
              variant="primary"
              className="mt-3.5"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Difficulty difficulty={question.difficulty} />
              <span className="step">{solved ? stepLabel(entry) : 'Not solved'}</span>
              {due && <span className="step step--re">Due today</span>}
              <button
                type="button"
                onClick={() => onToggleBookmark(question.id)}
                aria-pressed={bookmarked}
                className={`inline-flex items-center gap-1.5 rounded-md border px-[9px] py-1 text-[11.5px] font-semibold ${
                  bookmarked ? 'border-accent text-accent' : 'border-line text-muted hover:border-rule hover:text-ink'
                }`}
              >
                <BookmarkIcon filled={bookmarked} className="h-3 w-3" />
                {bookmarked ? 'Saved' : 'Save'}
              </button>
            </div>
            {!question.linkVerified && <LinkFixer key={question.id} customLink={entry.link} onSave={(url) => onLinkChange(question.id, url)} />}
          </div>

          {/* Only when due, so a review can never be recorded early. Each
              option says what it will do before it is pressed. */}
          {due && (
            <div className="mx-5 rounded-xl border border-rule bg-canvas p-3.5">
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

          <div className="flex flex-col gap-5 px-5 pb-6 pt-4">
            {solved && (
              <Block title="Schedule">
                <Row label="First solved">{entry.solvedAt ? formatDate(entry.solvedAt) : '—'}</Row>
                <Row label="Last review">
                  {entry.reviewedAt ? `${shortDate(entry.reviewedAt)}${lastOutcome ? ` — ${lastOutcome === 'got' ? 'got it' : 'struggled'}` : ''}` : '—'}
                </Row>
                <Row label="Next review" accent={due}>
                  {nextReviewText(entry, due, today)}
                </Row>
              </Block>
            )}

            {history.length > 0 && (
              <Block title="History" aside={`${struggles} of ${history.length} struggled`}>
                <History history={history} />
              </Block>
            )}

            <Block title={<label htmlFor="problem-notes">Notes</label>}>
              <div className="overflow-hidden rounded-xl border border-line bg-canvas focus-within:border-accent">
                <textarea
                  id="problem-notes"
                  value={entry.notes ?? ''}
                  onChange={(event) => onNotesChange(question.id, event.target.value)}
                  onPaste={handlePaste}
                  rows={4}
                  placeholder="Approach, complexity, edge cases… Paste a screenshot to attach it."
                  className="block min-h-24 w-full resize-y bg-transparent px-3 py-[11px] text-[13px] leading-[1.55] text-ink placeholder:text-muted focus:outline-none"
                />
                <div className="flex items-center gap-2 border-t border-line px-2.5 py-[7px] text-[11.5px] text-muted">
                  <span>Plain text</span>
                  <span className="ml-auto" aria-live="polite">
                    {attachingCount > 0 ? 'Adding image…' : 'Saved automatically in this browser'}
                  </span>
                </div>
              </div>
            </Block>

            <Block title="Images" aside={imageIds.length > 0 ? String(imageIds.length) : null}>
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
              <NoteImages
                ids={imageIds}
                onDelete={handleDeleteImage}
                onAdd={() => fileInputRef.current?.click()}
                onDropFiles={attachImages}
                canAdd={imageIds.length + attachingCount < MAX_NOTE_IMAGES}
              />
              {imageError?.questionId === question.id && (
                <p role="alert" className="mt-1.5 text-xs text-accent">
                  {imageError.message}
                </p>
              )}
            </Block>

            {relatedQuestions.length > 0 && (
              <Block title={`More in ${topicName(question.topic)}`}>
                <ul>
                  {relatedQuestions.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5 border-b border-line py-1.5 last:border-b-0">
                      <SolvedCheck solved={progress[item.id]?.solved === true} problem={item.problem} onToggle={() => onToggleSolved(item.id)} />
                      <button
                        type="button"
                        onClick={() => onSelectRelated(item.id)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left text-[13px] hover:text-accent"
                      >
                        <span className="truncate">{item.problem}</span>
                        {hasNote(progress[item.id]) && <NoteMark />}
                      </button>
                      <Difficulty difficulty={item.difficulty} />
                    </li>
                  ))}
                </ul>
              </Block>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={() => onToggleSolved(question.id)} aria-pressed={solved} className="act">
            {solved ? 'Mark unsolved' : 'Mark solved'}
          </button>
          {noted && (
            <button type="button" onClick={handleClearNote} className="act">
              Clear note
            </button>
          )}
          <span className="mono ml-auto hidden text-[10.5px] text-muted sm:inline" aria-hidden="true">
            <kbd className="kbd mr-1">Esc</kbd>close
            {due && (
              <>
                <kbd className="kbd ml-2.5 mr-1">g</kbd>
                <kbd className="kbd mr-1">s</kbd>review
              </>
            )}
          </span>
        </div>
      </aside>
    </div>
  )
}
