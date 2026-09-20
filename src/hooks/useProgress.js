import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteImages, MAX_NOTE_IMAGES } from '../images.js'
import { applyPatch, localDate } from '../progress.js'
import { recordReview } from '../review.js'
import { loadProgress, saveProgress } from '../storage.js'

// Writes are batched so a run of quick changes only hits localStorage once.
export const WRITE_DELAY_MS = 400

// Owns saved progress: loading it, every way of changing it, and getting it
// written back. Callers get stable callbacks, which is what keeps the memoised
// problem rows from re-rendering on every keystroke elsewhere.
export function useProgress(questionIds) {
  const [progress, setProgress] = useState(() => loadProgress(questionIds))

  const writeTimer = useRef(null)
  const pendingWrite = useRef(null)

  useEffect(() => {
    clearTimeout(writeTimer.current)
    pendingWrite.current = progress
    writeTimer.current = setTimeout(() => {
      pendingWrite.current = null
      saveProgress(progress)
    }, WRITE_DELAY_MS)
    return () => clearTimeout(writeTimer.current)
  }, [progress])

  // Closing or hiding the tab can beat the timer, so write any pending change
  // straight away rather than losing the last tick.
  useEffect(() => {
    function flush() {
      if (pendingWrite.current === null) return
      clearTimeout(writeTimer.current)
      saveProgress(pendingWrite.current)
      pendingWrite.current = null
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const toggleSolved = useCallback((id) => {
    setProgress((prev) =>
      applyPatch(
        prev,
        id,
        prev[id]?.solved
          ? { solved: false, solvedAt: undefined, reviewedAt: undefined, reviews: undefined, history: undefined }
          : { solved: true, solvedAt: localDate() },
      ),
    )
  }, [])

  const toggleBookmark = useCallback((id) => {
    setProgress((prev) => applyPatch(prev, id, { bookmarked: !prev[id]?.bookmarked }))
  }, [])

  // How the re-solve went: 'got' advances the schedule, 'struggled' sends the
  // problem back to the 3-day relearn step and saves it.
  const reviewProblem = useCallback((id, result) => {
    setProgress((prev) => applyPatch(prev, id, recordReview(prev[id], result, localDate())))
  }, [])

  const changeNotes = useCallback((id, notes) => setProgress((prev) => applyPatch(prev, id, { notes })), [])
  const changeLink = useCallback((id, link) => setProgress((prev) => applyPatch(prev, id, { link })), [])

  // The images are already stored by the time their ids arrive here.
  const addNoteImages = useCallback((id, imageIds) => {
    setProgress((prev) => applyPatch(prev, id, { images: [...(prev[id]?.images ?? []), ...imageIds].slice(0, MAX_NOTE_IMAGES) }))
  }, [])

  const removeNoteImage = useCallback((id, imageId) => {
    setProgress((prev) => {
      const images = (prev[id]?.images ?? []).filter((item) => item !== imageId)
      return applyPatch(prev, id, { images: images.length > 0 ? images : undefined })
    })
    deleteImages([imageId])
  }, [])

  const clearNote = useCallback((id, imageIds) => {
    setProgress((prev) => applyPatch(prev, id, { notes: undefined, images: undefined }))
    deleteImages(imageIds)
  }, [])

  // Puts one problem's entry back exactly as it was, for Undo.
  const restoreEntry = useCallback((id, entry) => {
    setProgress((prev) => {
      const next = { ...prev }
      if (entry) next[id] = entry
      else delete next[id]
      return next
    })
  }, [])

  return {
    progress,
    setProgress,
    toggleSolved,
    toggleBookmark,
    reviewProblem,
    changeNotes,
    changeLink,
    addNoteImages,
    removeNoteImage,
    clearNote,
    restoreEntry,
  }
}
