import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadImage } from '../images.js'

const MISSING = 'missing'

// An object URL for a stored image: null while loading, MISSING if it can't be read.
function useImageUrl(id) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let objectUrl = null
    let cancelled = false
    loadImage(id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          setUrl(MISSING)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(MISSING)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}

function Thumbnail({ id, number, onOpen, onDelete }) {
  const url = useImageUrl(id)
  const ready = url !== null && url !== MISSING
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onOpen(id)}
        disabled={!ready}
        aria-label={`Open image ${number} full size`}
        className="block h-20 w-20 overflow-hidden rounded-lg border border-line bg-tint transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {ready && <img src={url} alt="" className="h-full w-full object-cover" />}
        {url === MISSING && <span className="grid h-full place-items-center px-1 text-center text-[11px] leading-4 text-muted">Image unavailable</span>}
      </button>
      <button
        type="button"
        onClick={() => onDelete(id)}
        aria-label={`Delete image ${number}`}
        title="Delete image"
        className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-line bg-card text-sm leading-none text-muted transition-colors hover:border-accent hover:text-accent"
      >
        ×
      </button>
    </li>
  )
}

// Full-size view. It sits above the problem panel, so it takes Escape and Tab
// before the panel's own handlers see them.
function Lightbox({ id, onClose }) {
  const url = useImageUrl(id)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    closeButtonRef.current?.focus()
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        event.stopPropagation()
        closeButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Note image" className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-black/80 p-4 sm:p-10" onClick={onClose}>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-2xl leading-none text-white transition-colors hover:bg-black/70"
      >
        ×
      </button>
      {url && url !== MISSING && (
        <img src={url} alt="Note image, full size" className="max-h-full max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
      )}
    </div>,
    document.body,
  )
}

// Attachment strip under the note text.
export default function NoteImages({ ids, onDelete }) {
  const [openId, setOpenId] = useState(null)
  const closeLightbox = useCallback(() => setOpenId(null), [])

  if (ids.length === 0) return null
  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-3 pr-2 pt-2" aria-label="Note images">
        {ids.map((id, index) => (
          <Thumbnail key={id} id={id} number={index + 1} onOpen={setOpenId} onDelete={onDelete} />
        ))}
      </ul>
      {openId && ids.includes(openId) && <Lightbox id={openId} onClose={closeLightbox} />}
    </>
  )
}
