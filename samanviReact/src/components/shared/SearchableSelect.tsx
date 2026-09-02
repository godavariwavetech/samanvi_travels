import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, RefreshCw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
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
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Select…', displayLabel, onReload, reloading, className, disabled, onClear }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options

  const openDropdown = () => {
    if (disabled) return
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
    setSearch('')
  }

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

  const canClear = !!onClear && !!value && !disabled

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div
      id="ss-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left, width: rect.width, maxHeight: 320, zIndex: 99999,
      }}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="relative flex-shrink-0 border-b border-slate-100">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full h-10 pl-9 pr-3 text-sm focus:outline-none"
        />
      </div>
      <ul className="overflow-y-auto flex-1">
        {filtered.length === 0 && (
          <li className="px-4 py-2.5 text-sm text-slate-400">No matches</li>
        )}
        {filtered.map((o) => (
          <li
            key={o.value}
            onMouseDown={() => { onChange(o.value); setOpen(false) }}
            className={cn(
              'px-4 py-2.5 text-sm cursor-pointer transition-colors',
              value === o.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50',
            )}
          >
            {o.label}
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
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 py-2 pl-4 text-sm shadow-sm transition-all hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-100 disabled:hover:border-slate-200',
            canClear ? 'pr-11' : 'pr-4',
          )}
        >
          <span className={cn('truncate', (selected || displayLabel) ? 'text-slate-900' : 'text-slate-400')}>
            {selected ? selected.label : (displayLabel || placeholder)}
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
