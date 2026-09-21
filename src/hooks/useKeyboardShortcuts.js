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
      // Nothing focused is the ordinary case: the page has just loaded, or the
      // list has been scrolled with the mouse. j/k already start from the first
      // row there, and these agree rather than doing nothing at all - a
      // shortcut that silently no-ops reads as a broken key.
      const index = current === -1 ? 0 : current
      const row = rows[index]
      // Acting on a row nobody is looking at would be worse than not acting, so
      // when we fall back to the first row we move focus there as well: the
      // change happens where the user can see it, and j/k carry on from there.
      const focusFallback = () => {
        if (current !== -1) return
        const target = row.querySelector('[data-row-open]')
        target?.focus()
        target?.scrollIntoView({ block: 'nearest' })
      }

      if (event.key === 'x' || event.key === 'b') {
        event.preventDefault()
        focusFallback()
        row.querySelector(event.key === 'x' ? '[role="checkbox"]' : '[data-row-bookmark]')?.click()
        return
      }
      // Reviewing only makes sense for a problem that is actually due, so g/s
      // stay inert elsewhere rather than silently rescheduling something.
      const id = Number(row.dataset.questionId)
      const outcome = reviewOutcomeFor(event.key, progressRef.current[id], localDate())
      if (outcome) {
        event.preventDefault()
        focusFallback()
        onReview(id, outcome)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, drawerOpen, navigate, onReview, searchInputRef])
}
