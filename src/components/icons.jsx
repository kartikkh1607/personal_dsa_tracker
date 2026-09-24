// Small stroke icons on a 16px grid. They inherit colour from currentColor.

export function CheckIcon({ className = 'h-4 w-4', strokeWidth = 2.2 }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BookmarkIcon({ filled = false, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4.5 2.5h7a1 1 0 0 1 1 1v10l-4.5-3-4.5 3v-10a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  )
}

export function ExternalIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SearchIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SunIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" strokeLinecap="round" />
    </svg>
  )
}

export function ShuffleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 4.5h2.2c1.5 0 2.4.7 3.2 2l1.2 2c.8 1.3 1.7 2 3.2 2H14M2 11.5h2.2c1 0 1.7-.3 2.3-.9M11.8 2.5 14 4.5l-2.2 2M11.8 9.5l2.2 2-2.2 2M9.3 5.4c.6-.6 1.3-.9 2.3-.9H14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MoonIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M13.5 9.6A5.5 5.5 0 0 1 6.4 2.5a5.5 5.5 0 1 0 7.1 7.1z" strokeLinejoin="round" />
    </svg>
  )
}

export function NoteIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3.5 2.5h9a1 1 0 0 1 1 1v6l-4 4h-6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM13.5 9.5h-3a1 1 0 0 0-1 1v3M5.5 5.5h5M5.5 8h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
