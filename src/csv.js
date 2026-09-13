// Exports progress in the Excel sheet's Master tab column order, so the Status,
// Last Revised and Notes columns can be pasted straight into the workbook.
const HEADERS = ['#', 'Topic', 'Pattern', 'Problem', 'Difficulty', 'Tier', 'Platform', 'Link', 'Status', 'Last Revised', 'Notes']

// Spreadsheet apps run cells that start with these characters as formulas, so
// user text like notes gets a leading apostrophe to keep it plain text.
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value) {
  let text = String(value ?? '')
  if (FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// The sheet's own words: a solved problem you've bookmarked is one to Revisit.
export function sheetStatus(entry) {
  if (!entry?.solved) return 'Not Started'
  return entry.bookmarked ? 'Revisit' : 'Solved'
}

export function progressToCsv(questions, progress) {
  const rows = questions.map((question) => {
    const entry = progress[question.id]
    return [
      question.id,
      question.topic,
      question.pattern,
      question.problem,
      question.difficulty,
      question.tier,
      question.platform,
      entry?.link ?? question.link,
      sheetStatus(entry),
      entry?.reviewedAt ?? entry?.solvedAt ?? '',
      entry?.notes ?? '',
    ]
  })
  return [HEADERS, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}
