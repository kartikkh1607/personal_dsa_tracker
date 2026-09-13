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

export function ChevronIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
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

export function FlameIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8.6 1.2c.3 2.1-.8 3.4-1.9 4.6C5.6 7 4.5 8.2 4.5 10.2A3.5 3.5 0 0 0 8 13.8a3.6 3.6 0 0 0 3.6-3.6c0-1.2-.5-2.2-1.1-3 .1 1-.3 1.9-1.1 2.3.4-2.9-.2-6-.8-8.3z" />
    </svg>
  )
}

export function CalendarIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" strokeLinecap="round" />
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

export function MoonIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M13.5 9.6A5.5 5.5 0 0 1 6.4 2.5a5.5 5.5 0 1 0 7.1 7.1z" strokeLinejoin="round" />
    </svg>
  )
}
