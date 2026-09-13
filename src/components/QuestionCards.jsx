import { memo } from 'react'
import { isDone, topicName } from '../constants.js'
import { ConfidenceDots, DifficultyLabel, LinkButton, StatusSelect } from './QuestionControls.jsx'

const Card = memo(function Card({ question, status, confidence, showTopic, onChange, onOpen }) {
  const done = isDone(status)

  return (
    <li className={`rounded-xl border bg-white p-4 shadow-sm ${done ? 'border-emerald-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onOpen(question.id)} className="min-w-0 text-left">
          <span className="block font-medium leading-snug text-slate-900">{question.problem}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {showTopic && `${topicName(question.topic)} · `}
            {question.pattern}
          </span>
        </button>
        <DifficultyLabel difficulty={question.difficulty} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
        <StatusSelect id={question.id} problem={question.problem} status={status} onChange={onChange} />
        <ConfidenceDots id={question.id} problem={question.problem} confidence={confidence} onChange={onChange} />
        <LinkButton link={question.link} problem={question.problem} label={question.platform} />
      </div>
    </li>
  )
})

export default function QuestionCards({ questions, progress, showTopic, onChange, onOpen }) {
  return (
    <ul className="space-y-3 px-4 py-4">
      {questions.map((question) => (
        <Card
          key={question.id}
          question={question}
          status={progress[question.id]?.status ?? 'Not Started'}
          confidence={progress[question.id]?.confidence ?? ''}
          showTopic={showTopic}
          onChange={onChange}
          onOpen={onOpen}
        />
      ))}
    </ul>
  )
}
