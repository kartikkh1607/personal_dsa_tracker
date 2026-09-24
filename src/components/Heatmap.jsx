import { dateFromIso, formatDate, isoFromDate } from '../progress.js'

// Wide enough to fill the page with square cells: one column per week.
const WEEKS = 26
// Empty, then 28%, 58% and 100% of the accent (see index.css).
const LEVELS = ['heat-0', 'heat-1', 'heat-2', 'heat-3']

function levelFor(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  return 3
}

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

// What a day's square means in words, for its tooltip and for screen readers.
function describe(day) {
  if (!day) return 'nothing'
  const parts = []
  if (day.solves > 0) parts.push(`${day.solves} solved`)
  if (day.reviews > 0) parts.push(`${plural(day.reviews, 'review')}`)
  return parts.join(' · ')
}

// Practice per day, one column per week (Sunday first). A day counts if you
// solved something or reviewed something, so a day spent entirely on reviews
// still shows up.
export default function Heatmap({ activity, today }) {
  const end = dateFromIso(today)
  const start = new Date(end)
  start.setDate(end.getDate() - end.getDay() - (WEEKS - 1) * 7)
  const days = []
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) days.push(isoFromDate(date))

  let solves = 0
  let reviews = 0
  let activeDays = 0
  for (const day of days) {
    const counts = activity.get(day)
    if (!counts) continue
    solves += counts.solves
    reviews += counts.reviews
    activeDays++
  }

  const summary = [solves > 0 && `${solves} solved`, reviews > 0 && plural(reviews, 'review')].filter(Boolean).join(' · ') || 'Nothing yet'

  return (
    <>
      <div className="sech">
        <h2 id="activity-heading" className="lbl">
          Activity · {WEEKS} weeks
        </h2>
        <p className="lbl ml-auto">
          {summary} · {plural(activeDays, 'day')}
        </p>
      </div>
      <div
        role="img"
        aria-label={`${summary} across ${plural(activeDays, 'day')} in the last ${WEEKS} weeks`}
        className="mt-2 grid grid-flow-col grid-rows-7 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const counts = activity.get(day)
          const total = counts ? counts.solves + counts.reviews : 0
          return <span key={day} title={`${describe(counts)} · ${formatDate(day)}`} className={`aspect-square ${LEVELS[levelFor(total)]}`} />
        })}
      </div>
    </>
  )
}
