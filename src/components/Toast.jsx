import { useEffect } from 'react'

const DISMISS_AFTER_MS = 3500
// Toasts with an action (like Undo) stay a little longer so there's time to use it.
const DISMISS_WITH_ACTION_MS = 6000

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    // A persistent toast (the update prompt) waits for the user rather than
    // vanishing: missing it would mean running an old version until next time.
    if (toast.persist) return undefined
    const timer = setTimeout(onDismiss, toast.action ? DISMISS_WITH_ACTION_MS : DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex max-w-full animate-fade-up items-center gap-2 rounded-xl py-2 pl-4 pr-2 text-sm font-medium ${
          toast.tone === 'error' ? 'bg-fill text-onfill' : 'bg-ink text-canvas'
        }`}
      >
        <span className="min-w-0 truncate">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action.onClick()
              onDismiss()
            }}
            className="shrink-0 rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline"
          >
            {toast.action.label}
          </button>
        )}
        <button type="button" onClick={onDismiss} className="grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-60 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  )
}
