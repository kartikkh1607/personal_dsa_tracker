// The question list couldn't be fetched. The first thing anyone wants to know
// is whether their progress survived, so that's what this says.
export default function LoadFailed({ onRetry }) {
  return (
    <div className="grid h-dvh place-items-center bg-canvas px-6 font-sans text-ink">
      <div className="max-w-sm text-center">
        <p className="font-semibold">Couldn’t load the problems</p>
        <p className="mt-1 text-sm text-ink-2">Your progress is safe in this browser. This is usually a connection problem.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-contrast transition-colors hover:bg-brand-strong"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
