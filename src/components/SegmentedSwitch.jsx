import { useLayoutEffect, useRef, useState } from 'react'

// A row of options where exactly one is pressed. The highlight is one element
// that slides to whichever option is pressed, so changing it reads as a move
// rather than a swap. It is measured from the buttons themselves, and
// re-measured when they change size (a count coming and going, or the web
// font landing).
export default function SegmentedSwitch({ label, options, value, onChange }) {
  const groupRef = useRef(null)
  const [thumb, setThumb] = useState(null)

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return undefined
    function measure() {
      const pressed = group.querySelector('[aria-pressed="true"]')
      if (pressed) setThumb((previous) => ({ left: pressed.offsetLeft, width: pressed.offsetWidth, moved: previous !== null }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const button of group.querySelectorAll('button')) observer.observe(button)
    return () => observer.disconnect()
  }, [value, options.length])

  return (
    <div ref={groupRef} role="group" aria-label={label} className="seg">
      {/* No slide on the first measurement: it would sweep in from the left
          edge on load. */}
      {thumb && (
        <span
          className={`seg-thumb ${thumb.moved ? 'is-moving' : ''}`}
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
          aria-hidden="true"
        />
      )}
      {options.map((option) => (
        <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
