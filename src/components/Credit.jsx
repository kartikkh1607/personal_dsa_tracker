// A quiet sign-off at the end of each page.
export default function Credit({ className = '' }) {
  return (
    <footer className={`flex flex-col items-center px-4 pb-4 pt-12 text-center ${className}`}>
      <div className="flex w-full max-w-[14rem] items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-hard/70" fill="currentColor">
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-3">Made with care by</p>
      <p className="mt-0.5 font-script text-[1.75rem] leading-tight text-brand-strong sm:text-3xl">Kartik Khandelwal</p>
    </footer>
  )
}
