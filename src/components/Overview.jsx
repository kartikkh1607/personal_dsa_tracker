import { topicName } from '../constants.js'
import { DifficultyLabel, TierBadge } from './QuestionControls.jsx'

const MINUTES_PER_PROBLEM = 15
const RING_RADIUS = 34
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ProgressRing({ percent }) {
  return (
    <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`${percent}% of the Core track complete`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums text-slate-900">{percent}%</span>
    </div>
  )
}

function QueueLine({ item, index, onOpen }) {
  const { question } = item
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(question.id)}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-indigo-700">{question.problem}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {topicName(question.topic)} · {item.label}
          </span>
        </span>
        <span className="hidden sm:inline-flex">
          <TierBadge tier={question.tier} />
        </span>
        <DifficultyLabel difficulty={question.difficulty} />
      </button>
    </li>
  )
}

function PhaseLine({ item, isCurrent, onSelect }) {
  const percent = item.coreTotal ? Math.round((item.coreDone / item.coreTotal) * 100) : 0
  const complete = item.coreTotal > 0 && item.coreDone === item.coreTotal

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.phase)}
        aria-current={isCurrent ? 'step' : undefined}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50"
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
            complete ? 'bg-emerald-100 text-emerald-700' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {complete ? '✓' : item.phase}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm font-medium group-hover:text-indigo-700 ${isCurrent ? 'text-slate-900' : 'text-slate-600'}`}>{item.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">
              {item.coreDone}/{item.coreTotal}
            </span>
          </span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <span className={`block h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />
          </span>
        </span>
      </button>
    </li>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  )
}

const CARD_CLASS = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'

export default function Overview({ metrics, queue, onStartSession, onBrowseProblems, onSelectPhase, onOpenQuestion }) {
  const isNew = metrics.done === 0 && metrics.attempted === 0 && metrics.review === 0
  const hasCarryOver = queue.some((item) => item.priority < 3)
  const currentPhase = metrics.phaseStats.find((phase) => phase.coreDone < phase.coreTotal)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{isNew ? 'Let’s get started' : 'Welcome back'}</h1>
        <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
          {isNew
            ? `Start with the Core track: ${metrics.coreTotal} problems that cover every pattern, in ${metrics.phaseStats.length} phases.`
            : currentPhase
              ? `You’re in Phase ${currentPhase.phase}, ${currentPhase.name}. Here’s what to work on next.`
              : `The Core track is done. Time for Depth practice on your weaker patterns.`}
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
        <section className={`${CARD_CLASS} min-w-0 lg:col-span-2`} aria-labelledby="session-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="session-heading" className="text-base font-semibold text-slate-900">
                Today’s session
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {queue.length > 0
                  ? `${queue.length} ${queue.length === 1 ? 'problem' : 'problems'} · about ${queue.length * MINUTES_PER_PROBLEM} minutes`
                  : 'Nothing queued right now'}
              </p>
            </div>
            {queue.length > 0 && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {hasCarryOver ? 'Revision first' : queue[0].label}
              </span>
            )}
          </div>

          {queue.length > 0 ? (
            <ol className="-mx-2 mt-4 divide-y divide-slate-100">
              {queue.map((item, index) => (
                <QueueLine key={item.question.id} item={item} index={index} onOpen={onOpenQuestion} />
              ))}
            </ol>
          ) : (
            <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-6 text-center">
              <p className="font-medium text-emerald-800">You’re all caught up.</p>
              <p className="mt-1 text-sm text-emerald-700/80">Every problem is solved with solid confidence. Great work.</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={onStartSession}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Start session
                <span aria-hidden="true">→</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBrowseProblems}
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Browse all problems
            </button>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className={CARD_CLASS} aria-label="Progress">
            <div className="flex items-center gap-5">
              <ProgressRing percent={metrics.corePercent} />
              <div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                  {metrics.coreDone}
                  <span className="text-base font-normal text-slate-400">/{metrics.coreTotal}</span>
                </p>
                <p className="text-sm text-slate-500">Core problems solved</p>
                <p className="mt-1 text-xs text-slate-400">
                  {metrics.done} of {metrics.total} overall
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
              <Stat label="In progress" value={metrics.attempted} />
              <Stat label="To review" value={metrics.review} />
              <Stat label="Confidence" value={metrics.averageConfidence ? `${metrics.averageConfidence}/5` : '—'} />
            </dl>
          </section>

          <section className={CARD_CLASS} aria-labelledby="plan-heading">
            <h2 id="plan-heading" className="text-base font-semibold text-slate-900">
              Study plan
            </h2>
            <p className="mt-1 text-sm text-slate-500">Core problems by phase. Go in order: each phase builds on the last.</p>
            <ol className="-mx-2 mt-3">
              {metrics.phaseStats.map((phase) => (
                <PhaseLine key={phase.phase} item={phase} isCurrent={phase === currentPhase} onSelect={onSelectPhase} />
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
