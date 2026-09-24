import { useEffect, useId, useRef, useState } from 'react'
import { DIFFICULTIES } from '../constants.js'
import { Difficulty } from './QuestionControls.jsx'
import { CheckIcon, ChevronDownIcon } from './icons.jsx'

const DOT_CLASS = { Easy: 'dif--e', Medium: 'dif--m', Hard: 'dif--h' }

// The difficulty filter, as a chip that opens a short list. A native select
// can't be styled open or animated, so this is the ARIA listbox pattern
// instead: the list takes focus when it opens, arrows and Home/End move, Enter
// or Space picks, Escape and Tab close, and a letter jumps to its option.
//
// The list animates both ways. Closing plays the exit animation and only
// unmounts when it ends; under reduced motion index.css cuts it to 1ms, so
// the list still goes, it just doesn't travel.
export default function DifficultyFilter({ value, onChange, any }) {
  const options = [any, ...DIFFICULTIES]
  // 'open', 'closing' while the exit plays, or 'closed' and unmounted.
  const [state, setState] = useState('closed')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()
  const open = state === 'open'
  const labelOf = (option) => (option === any ? 'Any difficulty' : option)

  function openList() {
    setActive(Math.max(0, options.indexOf(value)))
    setState('open')
  }

  function close({ refocus = false } = {}) {
    setState((current) => (current === 'closed' ? current : 'closing'))
    if (refocus) buttonRef.current?.focus()
  }

  function choose(option) {
    if (option !== value) onChange(option)
    close({ refocus: true })
  }

  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  // A press anywhere else closes it, without pulling focus back.
  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setState('closing')
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function handleButtonKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  function handleListKeyDown(event) {
    // Keys pressed while picking belong to the list, not to the page's
    // shortcuts: x or b here must not tick or save the first problem.
    event.stopPropagation()
    const last = options.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(index + 1, last))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(options[active])
        break
      case 'Escape':
        event.preventDefault()
        close({ refocus: true })
        break
      case 'Tab':
        // Focus moves on by itself; the list just gets out of the way.
        close()
        break
      default:
        if (event.key.length === 1) {
          const match = options.findIndex((option) => labelOf(option).toLowerCase().startsWith(event.key.toLowerCase()))
          if (match >= 0) setActive(match)
        }
    }
  }

  const listId = `${id}-list`
  const optionId = (index) => `${id}-option-${index}`

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={value === any ? 'Any difficulty' : `Difficulty: ${value}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleButtonKeyDown}
        className={`chip ${value !== any ? 'is-on' : ''}`}
      >
        {value !== any && <span className={`dif-dot ${DOT_CLASS[value]}`} aria-hidden="true" />}
        {labelOf(value)}
        <ChevronDownIcon className="chev h-3 w-3" />
      </button>

      {state !== 'closed' && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label="Difficulty"
          aria-activedescendant={optionId(active)}
          data-state={state}
          onKeyDown={handleListKeyDown}
          onAnimationEnd={() => setState((current) => (current === 'closing' ? 'closed' : current))}
          className="pop absolute left-0 top-full z-30 mt-1.5 w-[188px] rounded-xl border border-rule bg-low p-1 focus:outline-none"
        >
          {options.map((option, index) => {
            const selected = option === value
            return (
              <li
                key={option}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                data-active={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className="opt"
              >
                {option === any ? <span className="text-ink">Any difficulty</span> : <Difficulty difficulty={option} />}
                {selected && <CheckIcon className="ml-auto h-3.5 w-3.5 text-accent" strokeWidth={2.4} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
