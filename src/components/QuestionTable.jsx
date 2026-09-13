import { memo } from 'react'
import { isDone } from '../constants.js'
import { ConfidenceDots, DifficultyLabel, LinkButton, StatusSelect } from './QuestionControls.jsx'

// Memoised on primitives, so changing one row's status re-renders that row only
// rather than all 570.
const Row = memo(function Row({ question, status, confidence, onChange }) {
  const done = isDone(status)

  return (
    <tr className={`border-b border-slate-100 transition-colors ${done ? 'bg-emerald-50/50' : 'hover:bg-indigo-50/30'}`}>
      <td className="px-4 py-2.5">
        <span className="font-medium text-slate-800">{question.problem}</span>
      </td>
      <td className="px-4 py-2.5 text-slate-500">{question.pattern}</td>
      <td className="px-4 py-2.5">
        <DifficultyLabel difficulty={question.difficulty} />
      </td>
      <td className="px-4 py-2.5 text-slate-500">{question.platform}</td>
      <td className="px-4 py-2.5">
        <LinkButton link={question.link} problem={question.problem} />
      </td>
      <td className="px-4 py-2.5">
        <StatusSelect id={question.id} problem={question.problem} status={status} onChange={onChange} />
      </td>
      <td className="px-4 py-2.5">
        <ConfidenceDots
          id={question.id}
          problem={question.problem}
          confidence={confidence}
          onChange={onChange}
        />
      </td>
    </tr>
  )
})

const COLUMNS = ['Problem', 'Pattern', 'Difficulty', 'Platform', 'Link', 'Status', 'Confidence']

export default function QuestionTable({ questions, progress, onChange }) {
  return (
    <table className="w-full min-w-[850px] border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
        <tr>
          {COLUMNS.map((column) => (
            <th
              key={column}
              className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              {column}
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
            onChange={onChange}
          />
        ))}
      </tbody>
    </table>
  )
}
