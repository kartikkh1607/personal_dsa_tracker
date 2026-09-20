import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteImages, MAX_NOTE_IMAGES } from '../images.js'
import { applyPatch, localDate } from '../progress.js'
import { recordReview } from '../review.js'
import { loadProgress, loadTombstones, saveProgress, saveTombstones } from '../storage.js'

// Writes are batched so a run of quick changes only hits localStorage once.
export const WRITE_DELAY_MS = 400

// Every local change carries the moment it happened by this device's clock.
// Sync orders two versions of one entry by it. The server's own timestamp
// answers a different question - when the row arrived - and using that to
// order edits would let a device that syncs late overwrite newer work.
function stamped(patch) {
  return { ...patch, updatedAt: new Date().toISOString() }
}

// Owns saved progress: loading it, every way of changing it, and getting it
// written back. Callers get stable callbacks, which is what keeps the memoised
// problem rows from re-rendering on every keystroke elsewhere.
export function useProgress(questionIds) {
  const [progress, setProgress] = useState(() => loadProgress(questionIds))
  // Entries cleared here, waiting to be told to the cloud. Without them a
  // deletion is indistinguishable from an entry this device never had, and the
  // row comes back on the next pull.
  const [tombstones, setTombstones] = useState(() => loadTombstones(questionIds))

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

  useEffect(() => {
    saveTombstones(tombstones)
  }, [tombstones])

  // Ids that disappear from progress are deletions. Diffed here rather than
  // recorded by each action, so every route to an empty entry - unticking a
  // solve, clearing a note, undoing, replacing everything with an import -
  // leaves the same trace without each one having to remember to.
  const seen = useRef(progress)
  useEffect(() => {
    const removed = Object.keys(seen.current).filter((id) => !(id in progress))
    seen.current = progress
    if (removed.length === 0) return
    const at = new Date().toISOString()
    setTombstones((prev) => ({ ...prev, ...Object.fromEntries(removed.map((id) => [id, at])) }))
  }, [progress])

  // The result of one sync round, applied together. seen moves forward with it
  // so the diff above doesn't read the merge's own removals - entries deleted
  // on another device - as fresh local deletions and push them straight back.
  const applySynced = useCallback((merged) => {
    seen.current = merged.progress
    setProgress(merged.progress)
    setTombstones(merged.tombstones)
  }, [])

  // Replacing everything at once, which is what importing a backup does. Each
  // entry is stamped: an import is a deliberate act and should win against
  // whatever the cloud holds, not be quietly undone by the next pull.
  const replaceProgress = useCallback((next) => {
    const at = new Date().toISOString()
    setProgress(Object.fromEntries(Object.entries(next).map(([id, entry]) => [id, { ...entry, updatedAt: at }])))
  }, [])

  const toggleSolved = useCallback((id) => {
    setProgress((prev) =>
      applyPatch(
        prev,
        id,
        stamped(
          prev[id]?.solved
            ? { solved: false, solvedAt: undefined, reviewedAt: undefined, reviews: undefined, history: undefined }
            : { solved: true, solvedAt: localDate() },
        ),
      ),
    )
  }, [])

  const toggleBookmark = useCallback((id) => {
    setProgress((prev) => applyPatch(prev, id, stamped({ bookmarked: !prev[id]?.bookmarked })))
  }, [])

  // How the re-solve went: 'got' advances the schedule, 'struggled' sends the
  // problem back to the 3-day relearn step and saves it.
  const reviewProblem = useCallback((id, result) => {
    setProgress((prev) => applyPatch(prev, id, stamped(recordReview(prev[id], result, localDate()))))
  }, [])

  const changeNotes = useCallback((id, notes) => setProgress((prev) => applyPatch(prev, id, stamped({ notes }))), [])
  const changeLink = useCallback((id, link) => setProgress((prev) => applyPatch(prev, id, stamped({ link }))), [])

  // The images are already stored by the time their ids arrive here.
  const addNoteImages = useCallback((id, imageIds) => {
    setProgress((prev) => applyPatch(prev, id, stamped({ images: [...(prev[id]?.images ?? []), ...imageIds].slice(0, MAX_NOTE_IMAGES) })))
  }, [])

  const removeNoteImage = useCallback((id, imageId) => {
    setProgress((prev) => {
      const images = (prev[id]?.images ?? []).filter((item) => item !== imageId)
      return applyPatch(prev, id, stamped({ images: images.length > 0 ? images : undefined }))
    })
    deleteImages([imageId])
  }, [])

  const clearNote = useCallback((id, imageIds) => {
    setProgress((prev) => applyPatch(prev, id, stamped({ notes: undefined, images: undefined })))
    deleteImages(imageIds)
  }, [])

  // Puts one problem's entry back exactly as it was, for Undo. Restored with a
  // fresh stamp rather than its old one, because undoing is itself a change:
  // with the old stamp the cloud's copy of what was just undone would look
  // newer and win.
  const restoreEntry = useCallback((id, entry) => {
    setProgress((prev) => {
      const next = { ...prev }
      if (entry) next[id] = { ...entry, updatedAt: new Date().toISOString() }
      else delete next[id]
      return next
    })
  }, [])

  return {
    progress,
    tombstones,
    applySynced,
    replaceProgress,
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
