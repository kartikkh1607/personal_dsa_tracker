function Icon({ children }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-indigo-600 shadow-sm ring-1 ring-slate-200/70">
      {children}
    </span>
  )
}

function Metric({ label, value, detail, tone = 'indigo', icon }) {
  const tones = {
    indigo: 'from-indigo-50 to-white text-indigo-600',
    emerald: 'from-emerald-50 to-white text-emerald-600',
    amber: 'from-amber-50 to-white text-amber-600',
    rose: 'from-rose-50 to-white text-rose-600',
  }

  return (
    <div className={`min-w-0 rounded-2xl border border-slate-200/80 bg-gradient-to-br ${tones[tone]} p-3.5 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{detail}</p>
        </div>
        <Icon>{icon}</Icon>
      </div>
    </div>
  )
}

function QueueItem({ question, label, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-600">
        {question.id}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-slate-700 group-hover:text-indigo-700">{question.problem}</span>
        <span className="block truncate text-[11px] text-slate-400">{label}</span>
      </span>
    </button>
  )
}

export default function Dashboard({ metrics, queue, queueLabel, onOpenQueue }) {
  return (
    <section className="shrink-0 border-b border-slate-200/80 bg-slate-50/70 px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Your practice space</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">Small wins, every day.</h2>
          </div>
          <button
            type="button"
            onClick={onOpenQueue}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-offset-2"
          >
            Focus on next up
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8h9m-3-3 3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <Metric label="Solved" value={`${metrics.done}/${metrics.total}`} detail={`${metrics.percent}% of your sheet`} tone="emerald" icon={<span className="text-base">✓</span>} />
          <Metric label="In progress" value={metrics.attempted} detail={metrics.attempted === 1 ? 'problem underway' : 'problems underway'} tone="amber" icon={<span className="text-base">↗</span>} />
          <Metric label="Ready to revisit" value={metrics.review} detail={metrics.review === 1 ? 'problem needs a refresh' : 'problems need a refresh'} tone="rose" icon={<span className="text-base">↻</span>} />
          <Metric label="Confidence" value={metrics.averageConfidence ? `${metrics.averageConfidence}/5` : '—'} detail={metrics.rated ? `${metrics.rated} problems rated` : 'Rate problems as you go'} tone="indigo" icon={<span className="text-base">✦</span>} />
        </div>

        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-indigo-950">Next up</p>
              <p className="text-[11px] text-indigo-700/70">{queueLabel}</p>
            </div>
            <button type="button" onClick={onOpenQueue} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">Open queue</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {queue.map((item) => <QueueItem key={item.question.id} {...item} onOpen={onOpenQueue} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
