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
        className="block h-[50px] w-[66px] overflow-hidden rounded-md border border-line bg-tint hover:border-accent"
      >
        {ready && <img src={url} alt="" className="h-full w-full object-cover" />}
        {url === MISSING && <span className="grid h-full place-items-center px-1 text-center text-[10px] leading-3 text-muted">Unavailable</span>}
      </button>
      <button
        type="button"
        onClick={() => onDelete(id)}
        aria-label={`Delete image ${number}`}
        title="Delete image"
        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-rule bg-low text-xs leading-none text-muted hover:border-accent hover:text-accent"
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
    <div role="dialog" aria-modal="true" aria-label="Note image" className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-canvas/95 p-4 sm:p-10" onClick={onClose}>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border border-rule bg-low text-xl leading-none text-ink hover:border-accent hover:text-accent"
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

// Thumbnails, then a dashed tile to add another - or, with none yet, a drop
// zone.
export default function NoteImages({ ids, onDelete, onAdd, canAdd }) {
  const [openId, setOpenId] = useState(null)
  const closeLightbox = useCallback(() => setOpenId(null), [])

  // No images yet: one wide target that says both ways in, rather than a lone
  // + that says neither.
  if (ids.length === 0) {
    if (!canAdd) return null
    return (
      <button
        type="button"
        onClick={onAdd}
        className="block w-full rounded-xl border border-dashed border-rule px-4 py-5 text-center text-[12.5px] text-muted hover:border-accent hover:text-accent"
      >
        Paste a screenshot, or click to add
      </button>
    )
  }

  return (
    <>
      <ul className="flex flex-wrap gap-2 pr-1.5 pt-1.5" aria-label="Note images">
        {ids.map((id, index) => (
          <Thumbnail key={id} id={id} number={index + 1} onOpen={setOpenId} onDelete={onDelete} />
        ))}
        {canAdd && (
          <li>
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add image"
              title="Add an image, or paste a screenshot into the note"
              className="grid h-[50px] w-[66px] place-items-center rounded-md border border-dashed border-line text-base text-muted hover:border-accent hover:text-accent"
            >
              +
            </button>
          </li>
        )}
      </ul>
      {openId && ids.includes(openId) && <Lightbox id={openId} onClose={closeLightbox} />}
    </>
  )
}
