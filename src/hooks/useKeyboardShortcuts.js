import { useEffect, useRef } from 'react'
import { isTypingTarget, reviewOutcomeFor } from '../keyboard.js'
import { localDate } from '../progress.js'

const ROW_SHORTCUT_KEYS = new Set(['j', 'k', 'x', 'b', 'g', 's'])

// "/" searches from anywhere. On the problems page, j/k move between rows,
// x ticks and b bookmarks the focused row, Enter opens it (the row is a button,
// so the browser handles that), and g/s record a review outcome on a row that
// is due.
export function useKeyboardShortcuts({ view, drawerOpen, progress, navigate, onReview, searchInputRef }) {
  // g/s act on the focused row's saved entry, which changes constantly. Reading
  // it from a ref keeps the listener itself stable.
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      if (event.key === '/') {
        event.preventDefault()
        navigate({ view: 'problems', problem: null })
        requestAnimationFrame(() => searchInputRef.current?.focus())
        return
      }
      if (view !== 'problems' || drawerOpen || !ROW_SHORTCUT_KEYS.has(event.key)) return
      const rows = [...document.querySelectorAll('[data-problem-row]')]
      if (rows.length === 0) return
      const current = rows.findIndex((row) => row.contains(document.activeElement))
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        const step = event.key === 'j' ? 1 : -1
        const next = current === -1 ? 0 : Math.min(Math.max(current + step, 0), rows.length - 1)
        const target = rows[next].querySelector('[data-row-open]')
        target?.focus()
        target?.scrollIntoView({ block: 'nearest' })
        return
      }
      if (current === -1) return
      if (event.key === 'x' || event.key === 'b') {
        event.preventDefault()
        rows[current].querySelector(event.key === 'x' ? '[role="checkbox"]' : '[data-row-bookmark]')?.click()
        return
      }
      // Reviewing only makes sense for a problem that is actually due, so g/s
      // stay inert elsewhere rather than silently rescheduling something.
      const id = Number(rows[current].dataset.questionId)
      const outcome = reviewOutcomeFor(event.key, progressRef.current[id], localDate())
      if (outcome) {
        event.preventDefault()
        onReview(id, outcome)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, drawerOpen, navigate, onReview, searchInputRef])
}
