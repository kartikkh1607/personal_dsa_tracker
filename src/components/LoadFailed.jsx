// The question list couldn't be fetched. The first thing anyone wants to know
// is whether their progress survived, so that's what this says.
export default function LoadFailed({ onRetry }) {
  return (
    <div className="grid h-dvh place-items-center bg-canvas px-6 font-sans text-ink">
      <div className="max-w-sm text-center">
        <p className="font-semibold">Couldn’t load the problems</p>
        <p className="mt-1 text-sm text-muted">Your progress is safe in this browser. This is usually a connection problem.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-10 rounded-xl bg-fill px-4 text-sm font-semibold text-onfill transition-colors hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
