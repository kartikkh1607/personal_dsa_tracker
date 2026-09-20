import { useCallback, useState } from 'react'
import { progressToCsv } from '../csv.js'
import { downloadFile } from '../download.js'
import { addDays } from '../progress.js'
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

// Reads a backup file's text into progress we're willing to load, or null if it
// isn't one. Pure and separate from the hook: this is the part that has to be
// right, because it stands between a stranger's file and the user's progress.
export function parseBackup(text, questionIds) {
  try {
    return sanitizeProgress(progressFromBackup(JSON.parse(text)), questionIds)
  } catch {
    // Unreadable JSON is treated exactly like a valid file of the wrong shape.
    return null
  }
}

export function importedCount(progress) {
  const count = Object.keys(progress).length
  return `Imported progress for ${count} ${count === 1 ? 'problem' : 'problems'}`
}

// Export, import and the "you haven't backed up lately" nudge.
export function useBackup({ progress, setProgress, questions, questionIds, today, showToast }) {
  const [lastBackup, setLastBackup] = useState(() => readLocal(BACKUP_KEY))
  const [backupSnoozedUntil, setBackupSnoozedUntil] = useState(() => readLocal(BACKUP_SNOOZE_KEY))

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

      const count = Object.keys(safeProgress).length
      const hasProgress = Object.keys(progress).length > 0
      if (hasProgress && !window.confirm(`Replace your current progress with the ${count} entries in "${file.name}"? This can't be undone.`)) return

      setProgress(safeProgress)
      showToast(importedCount(safeProgress))
    },
    [progress, setProgress, questionIds, showToast],
  )

  const showBackupReminder = needsBackupReminder({
    progressCount: Object.keys(progress).length,
    lastBackup,
    snoozedUntil: backupSnoozedUntil,
    today,
  })

  return { lastBackup, showBackupReminder, handleExport, handleExportCsv, handleImport, snoozeBackup }
}
