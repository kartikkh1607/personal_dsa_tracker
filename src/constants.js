export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

// Difficulty is shown as its letter in a small square, so the letter carries
// the meaning rather than a colour.
export const DIFFICULTY_LETTER = { Easy: 'E', Medium: 'M', Hard: 'H' }

// Topic strings carry their sheet order, e.g. "06. Binary Search".
export function splitTopic(topic) {
  const match = topic.match(/^(\d+)\.\s*(.*)$/)
  return match ? { number: match[1], name: match[2] } : { number: '', name: topic }
}

export function topicName(topic) {
  return splitTopic(topic).name
}
