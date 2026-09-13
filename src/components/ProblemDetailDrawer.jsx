import { useEffect, useRef } from 'react'
import { topicName } from '../constants.js'
import { getConfidence, getStatus } from '../progress.js'
import { ConfidenceDots, DifficultyLabel, LinkButton, StatusSelect, TierBadge } from './QuestionControls.jsx'

export default function ProblemDetailDrawer({ question, progress, relatedQuestions, onChange, onSelectRelated, onClose }) {
  const closeButtonRef = useRef(null)
  const status = getStatus(progress, question.id)
  const confidence = getConfidence(progress, question.id)

  // Return focus to whatever opened the drawer once it closes.
  useEffect(() => {
    const previous = document.activeElement
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [question.id])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end bg-slate-950/30 sm:items-stretch sm:justify-end"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-detail-title"
        className="flex max-h-[90dvh] w-full animate-sheet-up flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-none sm:w-[28rem] sm:animate-slide-in sm:rounded-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:px-6">
          <p className="truncate text-sm text-slate-500">
            <span className="tabular-nums">#{question.id}</span> · Phase {question.phase} · {topicName(question.topic)}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close problem details"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <h2 id="problem-detail-title" className="text-2xl font-semibold tracking-tight text-slate-900">
            {question.problem}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
            <DifficultyLabel difficulty={question.difficulty} />
            <TierBadge tier={question.tier} />
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
            <span>{question.pattern}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
            <span>{question.platform}</span>
          </div>

          <div className="mt-6">
            <LinkButton link={question.link} problem={question.problem} verified={question.linkVerified} prominent />
            {!question.linkVerified && (
              <p className="mt-2.5 text-xs leading-5 text-slate-500">
                {question.platform} problem URLs change over time, so this opens a search instead of a fixed link.
              </p>
            )}
          </div>

          <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your progress</h3>
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">Status</span>
              <StatusSelect id={question.id} problem={question.problem} status={status} onChange={onChange} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">Confidence</span>
              <ConfidenceDots id={question.id} problem={question.problem} confidence={confidence} onChange={onChange} />
            </div>
          </section>

          {relatedQuestions.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-semibold text-slate-900">Related problems</h3>
              <ul className="-mx-2 mt-2">
                {relatedQuestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectRelated(item.id)}
                      className="group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-700 group-hover:text-indigo-700">{item.problem}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.tier} · {item.pattern}
                        </span>
                      </span>
                      <DifficultyLabel difficulty={item.difficulty} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>
  )
}
