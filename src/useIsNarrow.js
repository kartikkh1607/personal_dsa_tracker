import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

// Tells the app which layout to render. Rendering only the table or only the
// cards - rather than rendering both and hiding one with CSS - halves the DOM.
export function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const handleChange = (event) => setIsNarrow(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return isNarrow
}
