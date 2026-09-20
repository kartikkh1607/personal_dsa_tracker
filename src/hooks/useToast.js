import { useCallback, useEffect, useState } from 'react'
import { applyUpdate, onUpdateAvailable } from '../serviceWorker.js'

// One toast at a time, plus the persistent "new version ready" prompt, which
// is a toast that waits for the user instead of timing out.
export function useToast() {
  const [toast, setToast] = useState(null)

  const dismissToast = useCallback(() => setToast(null), [])

  const showToast = useCallback((message, options = {}) => {
    setToast({ message, tone: options.tone ?? 'info', action: options.action, persist: options.persist === true, id: Date.now() })
  }, [])

  // A new version is deployed and installed, waiting for this page to let go.
  useEffect(
    () =>
      onUpdateAvailable(() => {
        setToast({
          message: 'A new version is ready',
          tone: 'info',
          persist: true,
          action: { label: 'Reload', onClick: applyUpdate },
          id: 'sw-update',
        })
      }),
    [],
  )

  return { toast, showToast, dismissToast }
}
