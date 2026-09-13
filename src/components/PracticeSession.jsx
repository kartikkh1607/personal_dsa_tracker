import { useState } from 'react'
import { isDone, topicName } from '../constants.js'
import { getConfidence, getStatus } from '../progress.js'
import { ConfidenceDots, DifficultyLabel, LinkButton } from './QuestionControls.jsx'

const OUTCOMES = [
  {
    status: 'Solved',
    label: 'Solved it',
    idle: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
    active: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  {
    status: 'Attempted',
    label: 'Needed a hint',
    idle: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
    active: 'border-amber-300 bg-amber-50 text-amber-700',
  },
  {
    status: 'Revisit',
    label: 'Couldn’t solve',
    idle: 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
    active: 'border-rose-300 bg-rose-50 text-rose-700',
  },
]

const SECONDARY_BUTTON = 'inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40'

function SessionSummary({ questions, progress, canRestart, onRestart, onExit }) {
  const counts = [
    { label: 'Solved', value: questions.filter((q) => isDone(getStatus(progress, q.id))).length, className: 'text-emerald-600' },
    { label: 'Needed a hint', value: questions.filter((q) => getStatus(progress, q.id) === 'Attempted').length, className: 'text-amber-600' },
    { label: 'To revisit', value: questions.filter((q) => getStatus(progress, q.id) === 'Revisit').length, className: 'text-rose-600' },
  ]

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-600" aria-hidden="true">
        ✓
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Session complete</h1>
      <p className="mt-2 text-slate-500">Nice work. Here’s how it went.</p>

      <dl className="mt-8 grid w-full grid-cols-3 gap-3">
        {counts.map((count) => (
          <div key={count.label} className="rounded-xl border border-slate-200 bg-white px-3 py-4">
            <dd className={`text-2xl font-semibold tabular-nums ${count.className}`}>{count.value}</dd>
            <dt className="mt-1 text-xs text-slate-500">{count.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {canRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Start another session
          </button>
        )}
        <button type="button" onClick={onExit} className={SECONDARY_BUTTON}>
          Back to overview
        </button>
      </div>
    </div>
  )
}

export default function PracticeSession({ questions, index, progress, canRestart, onAdvance, onChange, onRestart, onExit }) {
  const [finished, setFinished] = useState(false)
  const question = questions[index]

  if (finished) {
    return <SessionSummary questions={questions} progress={progress} canRestart={canRestart} onRestart={onRestart} onExit={onExit} />
  }
  if (!question) return null

  const isLast = index === questions.length - 1
  const status = getStatus(progress, question.id)

  function next() {
    if (isLast) setFinished(true)
    else onAdvance(1)
  }

  function mark(nextStatus) {
    onChange(question.id, 'status', nextStatus)
    next()
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onExit} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          ← Leave session
        </button>
        <p className="text-sm tabular-nums text-slate-500">
          Problem <span className="font-medium text-slate-900">{index + 1}</span> of {questions.length}
        </p>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {questions.map((item, i) => (
          <span
            key={item.id}
            className={`h-1 flex-1 rounded-full transition-colors ${i < index ? 'bg-indigo-600' : i === index ? 'bg-indigo-300' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <section key={question.id} className="my-auto animate-fade-up py-10 sm:py-14">
        <p className="text-sm font-medium text-indigo-600">{topicName(question.topic)}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{question.problem}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <DifficultyLabel difficulty={question.difficulty} />
          <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
          <span>{question.pattern}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
          <span>{question.platform}</span>
        </div>

        <div className="mt-8">
          <LinkButton link={question.link} problem={question.problem} prominent />
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="font-medium text-slate-900">How did it go?</p>
          <p className="mt-1 text-sm text-slate-500">Recording an outcome moves you on to the next problem.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {OUTCOMES.map((outcome) => (
              <button
                key={outcome.status}
                type="button"
                onClick={() => mark(outcome.status)}
                aria-pressed={status === outcome.status}
                className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
                  status === outcome.status ? outcome.active : `border-slate-200 bg-white text-slate-700 ${outcome.idle}`
                }`}
              >
                {outcome.label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-600">Confidence</span>
            <ConfidenceDots id={question.id} problem={question.problem} confidence={getConfidence(progress, question.id)} onChange={onChange} />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <button type="button" onClick={() => onAdvance(-1)} disabled={index === 0} className={SECONDARY_BUTTON}>
          ← Previous
        </button>
        <button type="button" onClick={next} className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800">
          {isLast ? 'Finish session' : 'Skip →'}
        </button>
      </div>
    </div>
  )
}
