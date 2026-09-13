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

// Topic strings carry their sheet order, e.g. "06. Binary Search".
export function splitTopic(topic) {
  const match = topic.match(/^(\d+)\.\s*(.*)$/)
  return match ? { number: match[1], name: match[2] } : { number: '', name: topic }
}

export function topicName(topic) {
  return splitTopic(topic).name
}
