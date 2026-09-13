import { useEffect, useRef, useState } from 'react'
import { formatDate } from '../progress.js'
import { resolvesToDark } from '../theme.js'
import { CheckIcon, MoonIcon, SunIcon } from './icons.jsx'

const TABS = [
  { value: 'home', label: 'Home' },
  { value: 'problems', label: 'Problems' },
  { value: 'patterns', label: 'Patterns' },
]

const MENU_ITEM_CLASS = 'flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-subtle hover:text-ink'
const ICON_BUTTON_CLASS = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-subtle hover:text-ink'

export default function TopBar({ view, onViewChange, solved, total, theme, onThemeChange, lastBackup, onExport, onExportCsv, onImport }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const fileInputRef = useRef(null)
  const isDark = resolvesToDark(theme)

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  function handleFileChange(event) {
    const file = event.target.files[0]
    if (file) onImport(file)
    // Reset so choosing the same file again still fires a change.
    event.target.value = ''
  }

  function runMenuAction(action) {
    setMenuOpen(false)
    action()
  }

  return (
    <header className="relative z-30 shrink-0 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-8 sm:px-6">
        <button type="button" onClick={() => onViewChange('home')} className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="DSA Tracker home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-contrast">
            <CheckIcon className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-ink md:block">DSA Tracker</span>
        </button>

        <nav className="flex h-full min-w-0 items-stretch" aria-label="Main">
          {TABS.map((tab) => {
            const active = view === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onViewChange(tab.value)}
                aria-current={active ? 'page' : undefined}
                className={`relative px-2.5 text-sm font-medium transition-colors sm:px-3 ${active ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
              >
                {tab.label}
                {active && <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-brand sm:inset-x-3" aria-hidden="true" />}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <span className="mr-1 hidden rounded-full bg-subtle px-2.5 py-1 text-xs font-medium tabular-nums text-ink-2 lg:inline-flex">
            {solved} / {total} solved
          </span>

          <button
            type="button"
            onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light theme' : 'Dark theme'}
            className={ICON_BUTTON_CLASS}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Backup options"
              className={ICON_BUTTON_CLASS}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <circle cx="3" cy="8" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="13" cy="8" r="1.4" />
              </svg>
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-72 animate-fade-up rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                <p className="px-3 pb-2 pt-1.5 text-xs leading-5 text-ink-3">
                  Progress is saved in this browser. {lastBackup ? `Last backup: ${formatDate(lastBackup)}.` : 'Not backed up yet.'}
                </p>
                <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => runMenuAction(onExport)}>
                  Export backup
                  <span className="text-xs text-ink-3">A file you can import on any device</span>
                </button>
                <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => runMenuAction(onExportCsv)}>
                  Export for Excel
                  <span className="text-xs text-ink-3">CSV in the Master tab’s column order</span>
                </button>
                <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => runMenuAction(() => fileInputRef.current?.click())}>
                  Import backup…
                  <span className="text-xs text-ink-3">Replaces the progress in this browser</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChange}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
