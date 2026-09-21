import { createStore, del, delMany, entries, get, set } from 'idb-keyval'

// Note images live in IndexedDB, not localStorage: a few screenshots would use
// up localStorage's ~5MB and break saving. A note keeps only the image ids.
// Each record is { blob, createdAt } under its id.
export const MAX_NOTE_IMAGES = 20
export const IMAGE_ID_PATTERN = /^img_[a-z0-9]{6,32}$/
const MAX_WIDTH = 1200
const QUALITY = 0.8
// An unreferenced image is only removed once it's this old. A fresh one may
// belong to a change not yet written (the save is batched) or to another tab.
export const ORPHAN_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000

let store = null
function imageStore() {
  store ??= createStore('dsa-tracker-images', 'images')
  return store
}

export function isImageFile(file) {
  return Boolean(file) && file.type.startsWith('image/')
}

function newImageId() {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0')
  return `img_${Date.now().toString(36)}${random}`
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

// Scales down to MAX_WIDTH and re-encodes as WebP, or JPEG where the browser
// can't make WebP. toBlob quietly returns a PNG for a type it doesn't support,
// so the result's type is what tells us.
export async function compressImage(file) {
  const source = await decode(file)
  const scale = Math.min(1, MAX_WIDTH / source.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const context = canvas.getContext('2d')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()

  const webp = await canvasToBlob(canvas, 'image/webp')
  if (webp?.type === 'image/webp') return webp

  // JPEG has no transparency, so fill clear areas white instead of black.
  context.globalCompositeOperation = 'destination-over'
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const jpeg = await canvasToBlob(canvas, 'image/jpeg')
  if (!jpeg) throw new Error('Could not encode image')
  return jpeg
}

// Compresses and stores each file, returning the ids of those that saved.
export async function storeImages(files) {
  const ids = []
  for (const file of files) {
    try {
      const blob = await compressImage(file)
      const id = newImageId()
      await set(id, { blob, createdAt: Date.now() }, imageStore())
      ids.push(id)
    } catch {
      // Unreadable image or storage blocked - the caller reports the shortfall.
    }
  }
  return ids
}

export async function loadImage(id) {
  const record = await get(id, imageStore())
  return record?.blob instanceof Blob ? record.blob : null
}

export async function deleteImages(ids) {
  if (!ids || ids.length === 0) return
  try {
    if (ids.length === 1) await del(ids[0], imageStore())
    else await delMany(ids, imageStore())
  } catch {
    // Storage blocked - the startup cleanup gets it later.
  }
}

// How long a removed image's bytes are kept before they actually go.
//
// Deleting them the moment the note lets go would make Undo a lie: the entry
// comes back pointing at ids whose blobs are gone, and the note renders as
// "Image unavailable". So the delete waits out the undo toast instead.
//
// Nothing leaks if the tab closes inside the window: an image no note refers to
// is collected by cleanupOrphanImages on a later start-up. Losing the timer
// costs a few kilobytes for a week, which is the cheaper way to be wrong.
export const UNDO_GRACE_MS = 10_000

const pendingDeletions = new Map()

export function scheduleImageDeletion(ids, delay = UNDO_GRACE_MS) {
  for (const id of ids ?? []) {
    clearTimeout(pendingDeletions.get(id))
    pendingDeletions.set(
      id,
      setTimeout(() => {
        pendingDeletions.delete(id)
        deleteImages([id])
      }, delay),
    )
  }
}

// Called when an entry comes back, for whatever images it still refers to.
export function cancelImageDeletion(ids) {
  for (const id of ids ?? []) {
    const timer = pendingDeletions.get(id)
    if (timer === undefined) continue
    clearTimeout(timer)
    pendingDeletions.delete(id)
  }
}

// Ids of stored images that no note refers to and that are old enough to be
// safely unreachable. Records without a valid timestamp are left alone.
export function findOrphans(records, referencedIds, now, minAge = ORPHAN_MIN_AGE_MS) {
  return records
    .filter(([id, record]) => !referencedIds.has(id) && Number.isFinite(record?.createdAt) && now - record.createdAt >= minAge)
    .map(([id]) => id)
}

export async function cleanupOrphanImages(progress) {
  try {
    const referenced = new Set(Object.values(progress).flatMap((entry) => entry.images ?? []))
    const orphans = findOrphans(await entries(imageStore()), referenced, Date.now())
    await deleteImages(orphans)
  } catch {
    // IndexedDB unavailable - nothing to clean.
  }
}

// Asks the browser not to evict stored images when the disk runs low.
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {})
}
