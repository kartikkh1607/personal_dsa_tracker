import { memo } from 'react'
import { isDone, topicName } from '../constants.js'
import { ConfidenceDots, DifficultyLabel, LinkButton, StatusSelect, TierBadge } from './QuestionControls.jsx'

// Memoised on primitives, so changing one row's status re-renders that row only
// rather than all 570.
const Row = memo(function Row({ question, status, confidence, showTopic, onChange, onOpen }) {
  const done = isDone(status)

  return (
    <tr
      onClick={() => onOpen(question.id)}
      className={`group cursor-pointer border-b border-slate-100 transition-colors ${done ? 'bg-emerald-50/40 hover:bg-emerald-50/80' : 'bg-white hover:bg-slate-50'}`}
    >
      <td className="w-14 py-3 pl-6 pr-2 align-middle text-xs tabular-nums text-slate-400">{question.id}</td>
      <td className="px-3 py-3">
        {/* The click bubbles to the row, so keyboard users get the same action. */}
        <button type="button" className="text-left font-medium text-slate-800 transition-colors group-hover:text-indigo-700">
          {question.problem}
        </button>
        <p className="mt-0.5 text-xs text-slate-500">
          {showTopic && <span>{topicName(question.topic)} · </span>}
          {question.pattern}
        </p>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <DifficultyLabel difficulty={question.difficulty} />
          <TierBadge tier={question.tier} />
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusSelect id={question.id} problem={question.problem} status={status} onChange={onChange} />
      </td>
      <td className="px-3 py-3">
        <ConfidenceDots id={question.id} problem={question.problem} confidence={confidence} onChange={onChange} />
      </td>
      <td className="py-3 pl-3 pr-6 text-right">
        <LinkButton link={question.link} problem={question.problem} label={question.platform} verified={question.linkVerified} />
      </td>
    </tr>
  )
})

const COLUMNS = [
  { label: '#', className: 'pl-6 pr-2' },
  { label: 'Problem', className: 'px-3' },
  { label: 'Level', className: 'px-3' },
  { label: 'Status', className: 'px-3' },
  { label: 'Confidence', className: 'px-3' },
  { label: 'Practice', className: 'pl-3 pr-6 text-right' },
]

export default function QuestionTable({ questions, progress, showTopic, onChange, onOpen }) {
  return (
    <table className="w-full min-w-[760px] border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50/95 shadow-[0_1px_0_0_rgb(226,232,240)] backdrop-blur">
        <tr>
          {COLUMNS.map((column) => (
            <th key={column.label} scope="col" className={`py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${column.className}`}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {questions.map((question) => (
          <Row
            key={question.id}
            question={question}
            status={progress[question.id]?.status ?? 'Not Started'}
            confidence={progress[question.id]?.confidence ?? ''}
            showTopic={showTopic}
            onChange={onChange}
            onOpen={onOpen}
          />
        ))}
      </tbody>
    </table>
  )
}
