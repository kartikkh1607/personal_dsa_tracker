import { useEffect, useRef } from 'react'

// The choice importing a backup actually presents, which window.confirm could
// not: merge the file with what is here, or replace what is here with it.
//
// Merge leads because it is the safe one - it can only add. Replace is the
// destructive option and says so in the words that matter: while signed in it
// does not just clear this browser, it deletes those entries from the account
// and therefore from every other device.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function plural(count, word) {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

export default function ImportDialog({ fileName, count, currentCount, signedIn, onMerge, onReplace, onCancel }) {
  const dialogRef = useRef(null)
  const mergeButtonRef = useRef(null)

  // Merge is the default, so it is what the dialog opens focused on: Enter
  // takes the safe option.
  useEffect(() => {
    mergeButtonRef.current?.focus()
  }, [])

  // Hand focus back to whatever opened this once it closes.
  useEffect(() => {
    const previous = document.activeElement
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
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
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex motion-safe:animate-fade-in items-center justify-center bg-canvas/70 p-4" role="presentation" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        aria-describedby="import-dialog-summary"
        className="w-full max-w-lg motion-safe:animate-fade-up rounded-2xl border border-line bg-card p-5 sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="import-dialog-title" className="text-base font-semibold text-ink">
          Import this backup
        </h2>
        <p id="import-dialog-summary" className="mt-1 text-sm leading-6 text-muted">
          <span className="font-medium text-ink">{fileName}</span> holds {plural(count, 'problem')}. This browser has{' '}
          {plural(currentCount, 'problem')}.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            ref={mergeButtonRef}
            type="button"
            onClick={onMerge}
            className="rounded-xl border border-accent bg-tint p-4 text-left transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Merge</span>
              <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-semibold text-onfill">Recommended</span>
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              Keeps everything from both. Where the same problem differs, the more recent change wins. Nothing is deleted.
            </span>
          </button>

          <button
            type="button"
            onClick={onReplace}
            className="rounded-xl border border-line p-4 text-left transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <span className="text-sm font-semibold text-ink">Replace</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              Throws away the {plural(currentCount, 'problem')} in this browser and keeps only what the file holds.
            </span>
            {signedIn && (
              <span className="mt-1.5 block text-xs font-medium leading-5 text-accent">
                You are signed in, so this also deletes them from your account — on every device you are signed in to.
              </span>
            )}
            <span className="mt-1.5 block text-xs leading-5 text-muted">You can undo this straight afterwards.</span>
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-tint hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
