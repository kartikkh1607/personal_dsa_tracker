import { memo } from 'react'
import { isDone } from '../constants.js'
import { ConfidenceDots, DifficultyLabel, LinkButton, StatusSelect } from './QuestionControls.jsx'

const Card = memo(function Card({ question, status, confidence, onChange }) {
  const done = isDone(status)

  return (
    <li
      className={`rounded-xl border p-3.5 shadow-sm transition-colors ${
        done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
      }`}
    >
      <p className="font-semibold leading-snug text-slate-800">{question.problem}</p>
      <p className="mt-0.5 text-xs text-slate-500">{question.pattern}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <DifficultyLabel difficulty={question.difficulty} />
        <span className="text-xs text-slate-500">{question.platform}</span>
        <LinkButton link={question.link} problem={question.problem} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-3">
        <StatusSelect id={question.id} problem={question.problem} status={status} onChange={onChange} />
        <span className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Confidence</span>
          <ConfidenceDots
            id={question.id}
            problem={question.problem}
            confidence={confidence}
            onChange={onChange}
          />
        </span>
      </div>
    </li>
  )
})

export default function QuestionCards({ questions, progress, onChange }) {
  return (
    <ul className="space-y-2.5 p-3">
      {questions.map((question) => (
        <Card
          key={question.id}
          question={question}
          status={progress[question.id]?.status ?? 'Not Started'}
          confidence={progress[question.id]?.confidence ?? ''}
          onChange={onChange}
        />
      ))}
    </ul>
  )
}
