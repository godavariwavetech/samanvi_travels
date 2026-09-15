import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, RefreshCw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
  // Muted secondary text beside the label (e.g. a ledger's parent group).
  // Display only - it is searchable but never part of the picked value.
  hint?: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  displayLabel?: string
  onReload?: () => void
  reloading?: boolean
  className?: string
  disabled?: boolean
  // Pass to get an inline clear (×) button once something is selected — lets a
  // wrongly picked row be emptied again without a dedicated "— none —" option.
  onClear?: () => void
  // Class for the trigger button itself (height, padding) — the wrapper's
  // className sizes the whole control, this styles just the visible box.
  buttonClassName?: string
}

// The one dropdown implementation every select in the app renders through:
// Select (native-looking, option children) and MasterListPicker both delegate
// here, so search, arrow-key highlighting and Enter-to-pick behave identically
// everywhere rather than per component.
//
// Keyboard: on the closed trigger, ArrowDown / Enter / Space open it. Inside,
// typing filters; ArrowUp / ArrowDown move the highlight (wrapping); Home / End
// jump; Enter picks the highlighted row; Escape or Tab closes. Focus returns to
// the trigger on close so tabbing carries on from where the user was.
export function SearchableSelect({
  value, onChange, options, placeholder = 'Select…', displayLabel, onReload, reloading,
  className, disabled, onClear, buttonClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [hi, setHi] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = search.trim()
    ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    : options

  const openDropdown = () => {
    if (disabled) return
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
    setSearch('')
    // Start on the current value so Enter with no other key is a no-op pick,
    // the way a native select behaves.
    const idx = options.findIndex((o) => o.value === value)
    setHi(idx >= 0 ? idx : 0)
  }
  const closeDropdown = (refocus = true) => {
    setOpen(false)
    if (refocus) btnRef.current?.focus()
  }
  const pick = (v: string) => {
    onChange(v)
    closeDropdown()
  }

  // A new filter invalidates the highlight — it may now point past the end or
  // at a row that no longer matches — so it goes back to the first match.
  useEffect(() => { if (open) setHi(0) }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return
    const li = listRef.current?.children[hi] as HTMLElement | undefined
    li?.scrollIntoView({ block: 'nearest' })
  }, [hi, open])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const close = (e: MouseEvent) => {
      if (document.getElementById('ss-panel')?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (document.getElementById('ss-panel')?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = filtered.length
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (n) setHi((h) => (h + 1) % n)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (n) setHi((h) => (h - 1 + n) % n)
        break
      case 'Home':
        e.preventDefault(); setHi(0); break
      case 'End':
        e.preventDefault(); setHi(Math.max(0, n - 1)); break
      case 'Enter':
        e.preventDefault()
        if (n && filtered[hi]) pick(filtered[hi].value)
        break
      case 'Escape':
        e.preventDefault(); closeDropdown(); break
      case 'Tab':
        // Let focus move on naturally, but don't leave the panel behind.
        closeDropdown(false); break
    }
  }

  const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open) return
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDropdown()
    }
  }

  const canClear = !!onClear && !!value && !disabled

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div
      id="ss-panel"
      role="listbox"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left, width: Math.max(rect.width, 160), maxHeight: 320, zIndex: 99999,
      }}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="relative flex-shrink-0 border-b border-slate-100">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Type to search… ↑↓ to move, Enter to pick"
          className="w-full h-10 pl-9 pr-3 text-sm focus:outline-none"
        />
      </div>
      <ul ref={listRef} className="overflow-y-auto flex-1">
        {filtered.length === 0 && (
          <li className="px-4 py-2.5 text-sm text-slate-400">No matches</li>
        )}
        {filtered.map((o, i) => (
          <li
            key={o.value === '' ? '__empty__' : o.value}
            role="option"
            aria-selected={value === o.value}
            onMouseDown={() => pick(o.value)}
            onMouseEnter={() => setHi(i)}
            className={cn(
              'px-4 py-2.5 text-sm cursor-pointer transition-colors',
              i === hi
                ? 'bg-blue-600 text-white'
                : value === o.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800',
            )}
          >
            {o.label}
            {o.hint && (
              <span className={cn('ml-2 text-xs font-normal', i === hi ? 'text-blue-100' : 'text-slate-400')}>— {o.hint}</span>
            )}
          </li>
        ))}
      </ul>
    </div>,
    document.body
  )

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative flex-1 min-w-0">
        <button
          ref={btnRef}
          type="button"
          onClick={openDropdown}
          onKeyDown={onButtonKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 py-2 pl-4 text-sm shadow-sm transition-all hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-100 disabled:hover:border-slate-200',
            canClear ? 'pr-11' : 'pr-4',
            buttonClassName,
          )}
        >
          <span className={cn('truncate', (selected || displayLabel) ? 'text-slate-900' : 'text-slate-400')}>
            {selected ? selected.label : (displayLabel || placeholder)}
            {selected?.hint && <span className="ml-1.5 text-xs text-slate-400">— {selected.hint}</span>}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform', open && 'rotate-180')} />
        </button>
        {canClear && (
          <button
            type="button"
            onClick={() => { onClear!(); setOpen(false) }}
            title="Clear"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {onReload && !disabled && (
        <button
          type="button"
          onClick={onReload}
          disabled={reloading}
          title="Reload"
          className="flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 bg-white/50 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', reloading && 'animate-spin')} />
        </button>
      )}
      {panel}
    </div>
  )
}
