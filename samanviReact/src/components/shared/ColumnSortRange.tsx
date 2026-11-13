import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import { cn } from '@/lib/utils'

export type SortDir = 'asc' | 'desc' | null
export type RangeValue = { min: string; max: string }

/**
 * Click-to-sort arrow for a table header: none -> Low to High -> High to Low -> none.
 */
export function SortToggle({ dir, onChange, variant = 'light' }: { dir: SortDir; onChange: (d: SortDir) => void; variant?: 'light' | 'dark' }) {
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <button type="button" title={dir === 'asc' ? 'Low to High (click for High to Low)' : dir === 'desc' ? 'High to Low (click to clear)' : 'Sort'}
      onClick={() => onChange(dir === null ? 'asc' : dir === 'asc' ? 'desc' : null)}
      className={cn('p-0.5 rounded transition-colors', variant === 'light'
        ? (dir ? 'bg-white text-blue-700' : 'text-white/70 hover:text-white hover:bg-white/15')
        : (dir ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-700'))}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

/**
 * Range filter for a number or date column: From / To, plus the two sort
 * directions. Empty From or To means open-ended.
 */
export function RangeFilterDropdown({ kind, value, onChange, dir, onSort, unit, variant = 'light' }: {
  kind: 'number' | 'date'
  value: RangeValue
  onChange: (v: RangeValue) => void
  /** Leave out dir / onSort for a range-only filter (no sort buttons). */
  dir?: SortDir
  onSort?: (d: SortDir) => void
  unit?: string
  variant?: 'light' | 'dark'
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [draft, setDraft] = useState<RangeValue>(value)
  const btnRef = useRef<HTMLButtonElement>(null)
  const active = !!(value.min || value.max)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (document.getElementById('range-filter-panel')?.contains(t) || document.getElementById('drp-panel')?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey) }
  }, [open])

  const show = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setDraft(value)
    setOpen(true)
  }
  const apply = (v: RangeValue) => { onChange(v); setOpen(false) }
  const lowHigh = kind === 'date' ? ['Oldest first', 'Newest first'] : ['Low to High', 'High to Low']
  const inputCls = 'h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30'

  return (
    <>
      <button ref={btnRef} type="button" onClick={show} title="Sort / range"
        className={cn('p-0.5 rounded transition-colors', variant === 'light'
          ? (active || dir ? 'bg-white text-blue-700' : 'text-white/70 hover:text-white hover:bg-white/15')
          : (active || dir ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-700'))}>
        <SlidersHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && rect && createPortal(
        <div id="range-filter-panel" onMouseDown={e => e.stopPropagation()}
          style={{ position: 'fixed', top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)), zIndex: 99998 }}
          className="w-64 rounded-xl border border-slate-200 bg-white shadow-2xl p-3 space-y-3 text-left font-normal">
          {onSort && <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Sort</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['asc', 'desc'] as const).map((d, i) => (
                <button key={d} type="button" onClick={() => onSort(dir === d ? null : d)}
                  className={cn('h-8 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center justify-center gap-1',
                    dir === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700')}>
                  {d === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}{lowHigh[i]}
                </button>
              ))}
            </div>
          </div>}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Range{unit ? ` (${unit})` : ''}</div>
            {kind === 'date' ? (
              <DateRangePicker from={draft.min} to={draft.max} className="w-full min-w-0"
                onChange={r => setDraft({ min: r.fromdate, max: r.todate })} />
            ) : (
              <div className="flex items-center gap-1.5">
                <input type="number" inputMode="decimal" placeholder="From" value={draft.min} onChange={e => setDraft(d => ({ ...d, min: e.target.value }))} className={inputCls} />
                <span className="text-slate-400 text-xs">to</span>
                <input type="number" inputMode="decimal" placeholder="To" value={draft.max} onChange={e => setDraft(d => ({ ...d, max: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') apply(draft) }} className={inputCls} />
              </div>
            )}
          </div>
          <div className="flex justify-between gap-2 pt-1 border-t border-slate-100">
            <button type="button" onClick={() => { setDraft({ min: '', max: '' }); apply({ min: '', max: '' }) }} className="text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg px-2 py-1">Clear</button>
            <button type="button" onClick={() => apply(draft)} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1">Apply</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/** True when `v` (number, or 'YYYY-MM-DD…' date) lies inside the range. */
export function inRange(v: number | string | null | undefined, r: RangeValue | undefined, kind: 'number' | 'date') {
  if (!r || (!r.min && !r.max)) return true
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) return false
  if (kind === 'date') {
    const d = String(v).slice(0, 10)
    return (!r.min || d >= r.min) && (!r.max || d <= r.max)
  }
  const n = Number(v)
  return (r.min === '' || n >= Number(r.min)) && (r.max === '' || n <= Number(r.max))
}

/** Compare for sorting: numbers numerically, everything else as text; blanks always last. */
export function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc' = 'asc') {
  const blank = (x: unknown) => x === null || x === undefined || x === '' || x === '-'
  if (blank(a) && blank(b)) return 0
  if (blank(a)) return 1
  if (blank(b)) return -1
  const na = Number(a), nb = Number(b)
  const c = !isNaN(na) && !isNaN(nb) ? na - nb : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? c : -c
}
