import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ListFilter, Search, X } from 'lucide-react'

interface ColumnFilterDropdownProps {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  variant?: 'light' | 'dark'
}

export function ColumnFilterDropdown({ options, selected, onChange, variant = 'dark' }: ColumnFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<string[]>(selected)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const PANEL_MAX_H = 280
  const PANEL_W = 240

  const active = selected.length > 0

  const openPanel = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setPending(selected)
    setSearch('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const panel = document.getElementById('col-filter-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
  const allChecked = filteredOptions.length > 0 && filteredOptions.every(o => pending.includes(o))

  const toggleAll = () => {
    if (allChecked) setPending(p => p.filter(v => !filteredOptions.includes(v)))
    else setPending(p => [...new Set([...p, ...filteredOptions])])
  }
  const toggleOne = (o: string) => setPending(p => p.includes(o) ? p.filter(v => v !== o) : [...p, o])
  const apply = () => { onChange(pending); setOpen(false) }
  const clear = () => { onChange([]); setOpen(false) }

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = rect ? spaceBelow < PANEL_MAX_H + 8 : false

  const panel = open && rect && createPortal(
    <div
      id="col-filter-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: Math.min(rect.left, window.innerWidth - PANEL_W - 8),
        width: PANEL_W,
        maxHeight: PANEL_MAX_H,
        zIndex: 99999,
      }}
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 text-xs outline-none placeholder:text-slate-400 bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 border-b border-slate-100 cursor-pointer hover:bg-slate-50 flex-shrink-0">
        <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 rounded accent-blue-600" />
        Select All
      </label>

      <ul className="overflow-y-auto flex-1 py-1">
        {filteredOptions.length === 0 ? (
          <li className="px-3 py-3 text-xs text-slate-400 text-center">No values</li>
        ) : filteredOptions.map(opt => (
          <li key={opt}>
            <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={pending.includes(opt)}
                onChange={() => toggleOne(opt)}
                className="w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0"
              />
              <span className="truncate" title={opt}>{opt}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 flex-shrink-0">
        <button onClick={clear} className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors">
          Clear
        </button>
        <button onClick={apply} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
          Apply
        </button>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors flex-shrink-0 ${
          variant === 'light'
            ? active ? 'bg-white text-blue-700' : 'text-white/70 hover:text-white hover:bg-white/10'
            : active ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
        title="Filter"
      >
        <ListFilter className="w-3.5 h-3.5" />
      </button>
      {panel}
    </>
  )
}
