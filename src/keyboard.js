// Shortcuts must never fire while the user is writing a note, pasting a link
// or typing in the search box, so every global key handler checks this first.
export function isTypingTarget(element) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    Boolean(element?.isContentEditable)
  )
}

// The two review outcomes, by key: g for "Got it", s for "Struggled".
export const REVIEW_KEYS = { g: 'got', s: 'struggled' }
