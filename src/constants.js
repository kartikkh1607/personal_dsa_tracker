export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

export const DIFFICULTY_PILL = {
  Easy: 'bg-easy/10 text-easy',
  Medium: 'bg-medium/10 text-medium',
  Hard: 'bg-hard/10 text-hard',
}

export const DIFFICULTY_TEXT = { Easy: 'text-easy', Medium: 'text-medium', Hard: 'text-hard' }

export const DIFFICULTY_BAR = { Easy: 'bg-easy', Medium: 'bg-medium', Hard: 'bg-hard' }

// Core covers every pattern and is the real target; Depth adds reps on shaky
// patterns; Stretch (Hard + Advanced DS) waits until Core is mostly done.
export const TIERS = ['Core', 'Depth', 'Stretch']

export const TIER_RANK = { Core: 0, Depth: 1, Stretch: 2 }

// The sheet's six phases, in study order. Each problem carries only its phase
// number: the name would otherwise be repeated on all 920 rows, and two rows
// could then disagree about what phase 3 is called.
export const PHASE_NAMES = {
  1: 'Foundations',
  2: 'Search & Strings',
  3: 'Linear DS',
  4: 'Greedy & Backtracking',
  5: 'Trees & Graphs',
  6: 'DP & Closers',
}

export function phaseName(phase) {
  return PHASE_NAMES[phase] ?? ''
}

// The Excel sheet's Stage column, e.g. "1. Foundations - Core". Derived rather
// than stored, so it cannot drift from the phase and tier it describes.
export function stageOf(question) {
  return `${question.phase}. ${phaseName(question.phase)} - ${question.tier}`
}

// Topic strings carry their sheet order, e.g. "06. Binary Search".
export function splitTopic(topic) {
  const match = topic.match(/^(\d+)\.\s*(.*)$/)
  return match ? { number: match[1], name: match[2] } : { number: '', name: topic }
}

export function topicName(topic) {
  return splitTopic(topic).name
}
