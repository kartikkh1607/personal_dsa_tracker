import { useEffect, useRef } from 'react'

// Replays an entrance animation on the element in `ref` whenever `deps`
// change, so new content arrives rather than simply being there. Not on the
// first render. The class is removed and re-added, with a reflow between, to
// restart it; under reduced motion the class does nothing (index.css).
export function useEntrance(ref, className, deps) {
  const shown = useRef(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!shown.current) {
      shown.current = true
      return
    }
    element.classList.remove(className)
    void element.offsetWidth
    element.classList.add(className)
    // The caller lists what should replay it, as with any effect's deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
