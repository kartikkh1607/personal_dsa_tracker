import { useCallback, useState } from 'react'
import { progressToCsv } from '../csv.js'
import { downloadFile } from '../download.js'
import { addDays } from '../progress.js'
import { mergeProgress, rowFromEntry } from '../sync/merge.js'
import {
  BACKUP_KEY,
  BACKUP_SNOOZE_KEY,
  DATA_VERSION,
  needsBackupReminder,
  progressFromBackup,
  readLocal,
  sanitizeProgress,
  writeLocal,
} from '../storage.js'

// Excel only reads the CSV as UTF-8 if it starts with a byte-order mark. Built
// from its code point rather than written as an escape, which lints as an
// irregular whitespace character.
const UTF8_BOM = String.fromCharCode(0xfeff)

const BACKUP_SNOOZE_DAYS = 7

// How many entries the file claims to hold, before any of them are checked.
// A pre-v3 backup is a bare { id: entry } object; from v3 on it's wrapped.
function claimedEntries(raw) {
  const source = raw?.version === DATA_VERSION ? raw.progress : raw
  if (!source || typeof source !== 'object' || Array.isArray(source)) return 0
  return Object.keys(source).length
}

// Reads a backup file's text into progress we're willing to load, or null if it
// isn't one. Pure and separate from the hook: this is the part that has to be
// right, because it stands between a stranger's file and the user's progress.
export function parseBackup(text, questionIds) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    // Unreadable JSON is treated exactly like a valid file of the wrong shape.
    return null
  }

  const progress = sanitizeProgress(progressFromBackup(raw), questionIds)
  if (progress === null) return null

  // A file that listed entries but produced none we recognise is a backup from
  // somewhere else, or a damaged one. Loading it would quietly replace real
  // progress with nothing, so it is refused rather than imported as empty.
  // A genuinely empty backup still imports, since that is what it says it is.
  if (Object.keys(progress).length === 0 && claimedEntries(raw) > 0) return null

  return progress
}

function importedCount(progress) {
  const count = Object.keys(progress).length
  return `Imported progress for ${count} ${count === 1 ? 'problem' : 'problems'}`
}

// Merging an imported file with what this browser already has, through the
// same engine sync uses. The file is treated exactly like rows arriving from
// another device: entry by entry the newer `updatedAt` wins, and anything only
// one side has is kept.
//
// The result is always a superset of what was here, so no id disappears and no
// tombstone is written. That is the difference that matters - a merge cannot
// delete, so importing an old backup while signed in can never take work off
// another device.
export function mergeImported(progress, imported, questionIds) {
  const { progress: merged } = mergeProgress({
    local: progress,
    remote: Object.entries(imported).map(([id, entry]) => rowFromEntry(id, entry)),
    questionIds,
    // Entries too old to carry a stamp on either side get this one, so the
    // merge settles rather than being redone on every sync round.
    now: new Date().toISOString(),
  })
  return merged
}

// What a merge actually did, which is not the same as the file's entry count:
// most of a re-imported backup is usually already here.
function mergedCount(before, after) {
  const added = Object.keys(after).length - Object.keys(before).length
  if (added <= 0) return 'Merged - nothing new in that file'
  return `Merged in ${added} ${added === 1 ? 'problem' : 'problems'}`
}

function replacedCount(progress) {
  const count = Object.keys(progress).length
  return `Replaced with ${count} ${count === 1 ? 'problem' : 'problems'}`
}

// Export, import and the "you haven't backed up lately" nudge.
export function useBackup({ progress, replaceProgress, mergeIntoProgress, restoreProgress, questions, questionIds, today, showToast }) {
  const [lastBackup, setLastBackup] = useState(() => readLocal(BACKUP_KEY))
  const [backupSnoozedUntil, setBackupSnoozedUntil] = useState(() => readLocal(BACKUP_SNOOZE_KEY))
  // A parsed file waiting on the user to say merge or replace.
  const [pendingImport, setPendingImport] = useState(null)

  const handleExport = useCallback(() => {
    downloadFile(`dsa-progress-${today}.json`, JSON.stringify({ version: DATA_VERSION, progress }, null, 2), 'application/json')
    writeLocal(BACKUP_KEY, today)
    setLastBackup(today)
    showToast('Backup exported')
  }, [progress, today, showToast])

  const handleExportCsv = useCallback(() => {
    // The byte-order mark tells Excel the file is UTF-8, so symbols survive.
    downloadFile(`dsa-progress-${today}.csv`, `${UTF8_BOM}${progressToCsv(questions, progress)}`, 'text/csv;charset=utf-8')
    showToast('Exported for Excel')
  }, [questions, progress, today, showToast])

  const snoozeBackup = useCallback(() => {
    const until = addDays(today, BACKUP_SNOOZE_DAYS)
    writeLocal(BACKUP_SNOOZE_KEY, until)
    setBackupSnoozedUntil(until)
  }, [today])

  const handleImport = useCallback(
    async (file) => {
      const safeProgress = parseBackup(await file.text(), questionIds)
      if (safeProgress === null) {
        showToast('That file is not a valid progress backup', { tone: 'error' })
        return
      }

      // With nothing here yet, merge and replace do the same thing, so there
      // is no question worth asking.
      if (Object.keys(progress).length === 0) {
        mergeIntoProgress(mergeImported(progress, safeProgress, questionIds))
        showToast(importedCount(safeProgress))
        return
      }

      setPendingImport({ fileName: file.name, count: Object.keys(safeProgress).length, progress: safeProgress })
    },
    [progress, mergeIntoProgress, questionIds, showToast],
  )

  const cancelImport = useCallback(() => setPendingImport(null), [])

  // The two ways to take the file. Merge is what the dialog offers first and
  // can only add; replace is the destructive one, and the only one that needs
  // an undo to fall back on.
  const confirmImport = useCallback(
    (mode) => {
      if (!pendingImport) return
      const incoming = pendingImport.progress
      setPendingImport(null)

      if (mode === 'merge') {
        const merged = mergeImported(progress, incoming, questionIds)
        mergeIntoProgress(merged)
        showToast(mergedCount(progress, merged))
        return
      }

      // Snapshotted before the replace, because after it the old progress is
      // only recoverable from here.
      const snapshot = progress
      replaceProgress(incoming)
      showToast(replacedCount(incoming), { action: { label: 'Undo', onClick: () => restoreProgress(snapshot) } })
    },
    [pendingImport, progress, questionIds, replaceProgress, mergeIntoProgress, restoreProgress, showToast],
  )

  const showBackupReminder = needsBackupReminder({
    progressCount: Object.keys(progress).length,
    lastBackup,
    snoozedUntil: backupSnoozedUntil,
    today,
  })

  return { lastBackup, showBackupReminder, handleExport, handleExportCsv, handleImport, pendingImport, confirmImport, cancelImport, snoozeBackup }
}
