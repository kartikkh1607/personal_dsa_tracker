import { CheckIcon } from './icons.jsx'

// Shown while the question list is fetched. It mirrors the real layout - top
// bar, a headline, then cards - so the page doesn't jump when the data lands.
// The shimmer is a plain pulse, which index.css already neutralises under
// prefers-reduced-motion.
function Block({ className }) {
  return <div className={`animate-pulse rounded-lg bg-tint ${className}`} />
}

function Card() {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <Block className="h-4 w-40" />
      <Block className="mt-3 h-3 w-64 max-w-full" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Block className="h-5 w-5 shrink-0 rounded-full" />
            <Block className="h-3 flex-1" />
            <Block className="h-5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AppSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-canvas font-sans text-ink">
      <header className="shrink-0 border-b border-line bg-card">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-8 sm:px-6">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-fill text-onfill">
            <CheckIcon className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-ink md:block">DSA Tracker</span>
          <Block className="ml-2 h-4 w-48" />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto" aria-busy="true" aria-live="polite">
        <p className="sr-only">Loading your problems…</p>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
          <Block className="h-3 w-28" />
          <Block className="mt-3 h-7 w-72 max-w-full" />
          <Block className="mt-3 h-4 w-96 max-w-full" />
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
              <Card />
              <Card />
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              <Card />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
