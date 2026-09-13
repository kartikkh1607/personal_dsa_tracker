function ActionButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
      {...props}
    >
      {children}
    </button>
  )
}

function Stat({ value, label, accent }) {
  return (
    <div className="text-right">
      <div className={`text-lg font-semibold tabular-nums leading-tight ${accent || 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
    </div>
  )
}

export default function TopBar({ total, done, percent, fraction, onExport, onImport }) {
  function handleImportFile(event) {
    const file = event.target.files[0]
    if (file) onImport(file)
    // Reset so picking the same file twice still fires a change event.
    event.target.value = ''
  }

  return (
    <header className="relative z-20 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-[11px] font-bold tracking-wide text-white shadow-md shadow-indigo-200">
            DSA
          </span>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-800">Practice Tracker</h1>
            <p className="text-[11px] font-medium text-slate-400">Build the habit, one problem at a time</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 border-r border-slate-200 pr-4 sm:gap-6">
          <Stat
            value={
              <>
                {done}
                <span className="text-base font-normal text-slate-300"> / {total}</span>
              </>
            }
            label="Solved"
          />
          <Stat value={`${percent}%`} label="Complete" accent="text-indigo-600" />
        </div>

        <div className="flex items-center gap-2">
          <ActionButton onClick={onExport} title="Download your progress as a JSON file">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 1.5v6m0 0L3.5 5M6 7.5 8.5 5M2 9.5h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </ActionButton>

          <label
            title="Restore progress from a previously exported file"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 8V2m0 0L3.5 4.5M6 2l2.5 2.5M2 9.5h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Import
            <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Overall progress reads as a single line across the whole app. Driven by the
          exact fraction, so it starts moving before the rounded percent reaches 1%. */}
      <div className="h-0.5 w-full bg-slate-100">
        <div
          className="h-0.5 bg-indigo-500 transition-[width] duration-200"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </header>
  )
}
