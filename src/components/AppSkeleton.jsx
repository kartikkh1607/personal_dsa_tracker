import { CheckIcon } from './icons.jsx'

// Shown while the question list is fetched. It mirrors the real layout - top
// bar, the headline band, then board rows - so the page doesn't jump when the
// data lands. The shimmer is a plain pulse, which index.css already
// neutralises under prefers-reduced-motion.
function Block({ className }) {
  return <div className={`animate-pulse bg-tint ${className}`} />
}

function BoardRows({ count }) {
  return Array.from({ length: count }, (_, row) => (
    <div key={row} className="flex items-center gap-5 border-b border-line py-3">
      <Block className="h-3 w-5 shrink-0" />
      <Block className="h-3 flex-1" />
      <Block className="hidden h-3 w-40 shrink-0 sm:block" />
      <Block className="h-[19px] w-[19px] shrink-0 rounded" />
      <Block className="h-3 w-8 shrink-0" />
      <Block className="h-6 w-32 shrink-0 rounded-md" />
    </div>
  ))
}

export default function AppSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-canvas font-sans text-ink">
      <header className="shrink-0">
        <div className="shell !pb-0">
          <div className="flex h-[54px] items-center gap-7 border-b border-line">
            <span className="flex items-center gap-[9px]">
              <span className="grid h-[21px] w-[21px] place-items-center rounded-[5px] bg-fill text-onfill">
                <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
              </span>
              <span className="hidden text-sm font-bold text-ink md:block">DSA Tracker</span>
            </span>
            <Block className="h-3 w-48" />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto" aria-busy="true" aria-live="polite">
        <p className="sr-only">Loading your problems…</p>
        <div className="shell">
          <div className="pb-5 pt-[30px]">
            <Block className="h-3 w-40" />
            <Block className="mt-3 h-10 w-[28rem] max-w-full" />
            <Block className="mt-3 h-3 w-80 max-w-full" />
          </div>
          <div className="sec">
            <Block className="h-3 w-36" />
            <div className="mt-3">
              <BoardRows count={6} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
