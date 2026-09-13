import { useEffect } from 'react'

const DISMISS_AFTER_MS = 3500

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex animate-fade-up items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
          toast.tone === 'error' ? 'bg-rose-600' : 'bg-slate-900'
        }`}
      >
        {toast.message}
        <button type="button" onClick={onDismiss} className="text-white/60 transition-colors hover:text-white" aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  )
}
