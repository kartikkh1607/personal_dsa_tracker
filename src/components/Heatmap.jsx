import { useEffect, useRef } from 'react'
import { dateFromIso, formatDate, isoFromDate } from '../progress.js'

const WEEKS = 18
const LEVELS = ['bg-subtle', 'bg-brand/30', 'bg-brand/55', 'bg-brand/80', 'bg-brand']

function levelFor(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

// Solves per day for the last few months, one column per week (Sunday first).
export default function Heatmap({ activity, today }) {
  const scrollRef = useRef(null)

  // On narrow screens the grid scrolls; start at the most recent weeks.
  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [])

  const end = dateFromIso(today)
  const start = new Date(end)
  start.setDate(end.getDate() - end.getDay() - (WEEKS - 1) * 7)
  const days = []
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) days.push(isoFromDate(date))

  const total = days.reduce((sum, day) => sum + (activity.get(day) ?? 0), 0)
  const activeDays = days.filter((day) => activity.has(day)).length

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium text-ink-2">Activity</h3>
        <p className="text-xs text-ink-3">
          {total} solved on {activeDays} {activeDays === 1 ? 'day' : 'days'} · last {WEEKS} weeks
        </p>
      </div>
      <div ref={scrollRef} className="mt-3 overflow-x-auto pb-1">
        <div role="img" aria-label={`${total} problems solved in the last ${WEEKS} weeks`} className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {days.map((day) => {
            const count = activity.get(day) ?? 0
            return <span key={day} title={`${count} solved · ${formatDate(day)}`} className={`h-3 w-3 rounded-[3px] ${LEVELS[levelFor(count)]}`} />
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-ink-3" aria-hidden="true">
        Less
        {LEVELS.map((level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[3px] ${level}`} />
        ))}
        More
      </div>
    </div>
  )
}
