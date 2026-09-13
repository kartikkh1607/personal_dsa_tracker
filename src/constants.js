export const STATUSES = ['Not Started', 'Attempted', 'Solved', 'Mastered', 'Revisit']

export const DEFAULT_STATUS = 'Not Started'

// "Done" means Solved or Mastered - used everywhere progress is counted.
export const DONE_STATUSES = ['Solved', 'Mastered']

export const CONFIDENCE_LEVELS = ['1', '2', '3', '4', '5']

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

export function isDone(status) {
  return DONE_STATUSES.includes(status)
}

// Each status gets its own colour so a long table can be scanned at a glance.
export const STATUS_STYLES = {
  'Not Started': 'border-slate-200 bg-slate-50 text-slate-500',
  Attempted: 'border-amber-200 bg-amber-50 text-amber-700',
  Solved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Mastered: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Revisit: 'border-rose-200 bg-rose-50 text-rose-700',
}

// Difficulty keeps the green / amber / red scale, shown as a dot plus a label
// so it never reads as the same kind of control as the status pill.
export const DIFFICULTY_STYLES = {
  Easy: { text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Medium: { text: 'text-amber-700', dot: 'bg-amber-500' },
  Hard: { text: 'text-rose-700', dot: 'bg-rose-500' },
}
