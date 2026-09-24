import { useEffect, useRef, useState } from 'react'
import { formatDate } from '../progress.js'
import { resolvesToDark } from '../theme.js'
import AccountMenu, { MENU_ITEM_CLASS, MENU_SUB_CLASS } from './AccountMenu.jsx'
import { CheckIcon, MoonIcon, SunIcon } from './icons.jsx'

const TABS = [
  { value: 'home', label: 'Home' },
  { value: 'problems', label: 'Problems' },
  { value: 'patterns', label: 'Patterns' },
]

const ICON_BUTTON_CLASS = 'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-tint hover:text-ink'

export default function TopBar({ view, onViewChange, solved, total, theme, onThemeChange, sync, lastBackup, onExport, onExportCsv, onImport }) {
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
    <header className="relative z-30 shrink-0">
      <div className="shell !pb-0">
        <div className="flex h-[54px] items-center gap-3 border-b border-line sm:gap-7">
          <button type="button" onClick={() => onViewChange('home')} className="flex shrink-0 items-center gap-[9px] rounded-md" aria-label="DSA Tracker home">
            <span className="grid h-[21px] w-[21px] place-items-center rounded-[5px] bg-fill text-onfill">
              <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
            </span>
            <span className="hidden text-sm font-bold tracking-[-0.01em] text-ink md:block">DSA Tracker</span>
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
                  className={`relative px-2.5 text-[13px] font-medium sm:px-[13px] ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
                >
                  {tab.label}
                  {active && <span className="absolute inset-x-2.5 -bottom-px h-0.5 bg-accent sm:inset-x-[13px]" aria-hidden="true" />}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="mono hidden text-[12.5px] text-muted sm:inline" aria-label={`${solved} of ${total} solved`}>
              <b className="font-semibold text-ink">{solved}</b> / {total}
            </span>

            <button
              type="button"
              onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Light theme' : 'Dark theme'}
              className={ICON_BUTTON_CLASS}
            >
              {isDark ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
            </button>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={sync.configured ? 'Account and backup options' : 'Backup options'}
                className={ICON_BUTTON_CLASS}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <circle cx="3" cy="8" r="1.3" />
                  <circle cx="8" cy="8" r="1.3" />
                  <circle cx="13" cy="8" r="1.3" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 flex w-[296px] animate-fade-up flex-col gap-3 rounded-2xl border border-rule bg-low p-3.5"
                >
                  <AccountMenu sync={sync} />
                  {sync.configured && <hr className="border-line" />}
                  <div>
                    <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => runMenuAction(onExport)}>
                      Export backup
                      <span className={MENU_SUB_CLASS}>A file you can import on any device</span>
                    </button>
                    <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => runMenuAction(onExportCsv)}>
                      Export for Excel
                      <span className={MENU_SUB_CLASS}>CSV in the Master tab’s column order</span>
                    </button>
                    <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => runMenuAction(() => fileInputRef.current?.click())}>
                      Import backup…
                      <span className={MENU_SUB_CLASS}>Merge it in, or replace what&rsquo;s here</span>
                    </button>
                  </div>
                  <p className="border-t border-line px-2 pt-2.5 text-[11.5px] text-muted">
                    {sync.configured ? '' : 'Progress is saved in this browser. '}
                    {lastBackup ? `Last backup: ${formatDate(lastBackup)}.` : 'Not backed up yet.'}
                  </p>
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
      </div>
    </header>
  )
}
