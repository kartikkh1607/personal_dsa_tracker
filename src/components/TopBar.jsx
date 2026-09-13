import { useEffect, useRef, useState } from 'react'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'problems', label: 'Problems' },
]

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900'

export default function TopBar({ view, onViewChange, done, total, percent, onExport, onImport }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const fileInputRef = useRef(null)

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

  return (
    <header className="relative z-30 shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <button type="button" onClick={() => onViewChange('overview')} className="flex shrink-0 items-center gap-2.5 rounded-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-[10px] font-bold tracking-wide text-white">DSA</span>
          <span className="hidden text-sm font-semibold text-slate-900 md:block">Practice Tracker</span>
        </button>

        <nav className="flex items-center gap-1" aria-label="Main">
          {TABS.map((tab) => {
            const active = view === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onViewChange(tab.value)}
                aria-current={active ? 'page' : undefined}
                className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                  active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-3" title={`${done} of ${total} problems solved`}>
            <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 sm:block" aria-hidden="true">
              <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm tabular-nums text-slate-500">
              <span className="font-semibold text-slate-900">{done}</span>
              <span className="hidden sm:inline">/{total}</span>
              <span className="sm:hidden"> · {percent}%</span>
            </span>
          </div>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Backup options"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <circle cx="3" cy="8" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="13" cy="8" r="1.4" />
              </svg>
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-60 animate-fade-up rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <p className="px-3 pb-2 pt-1.5 text-xs leading-5 text-slate-500">
                  Progress is saved in this browser. Back it up to move between devices.
                </p>
                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM_CLASS}
                  onClick={() => {
                    setMenuOpen(false)
                    onExport()
                  }}
                >
                  <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M6 1.5v6m0 0L3.5 5M6 7.5 8.5 5M2 10h8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export progress
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM_CLASS}
                  onClick={() => {
                    setMenuOpen(false)
                    fileInputRef.current?.click()
                  }}
                >
                  <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M6 8V2m0 0L3.5 4.5M6 2l2.5 2.5M2 10h8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Import progress…
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
