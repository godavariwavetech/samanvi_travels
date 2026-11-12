import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { SearchableSelect } from './SearchableSelect'
import { cn, todayISO } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
const daysIn = (y: number, m: number) => new Date(y || 2000, m, 0).getDate() // m is 1-based; leap year assumed until a year is picked
type Parts = { d: string; m: string; y: string }
const split = (iso: string): Parts => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return match ? { y: match[1], m: String(Number(match[2])), d: String(Number(match[3])) } : { d: '', m: '', y: '' }
}

// Day / Month / Year dropdowns for master records (dates of birth, joining,
// document validity) where the year is often decades away and paging a
// calendar month by month is slow. Same props as DateField — value is
// 'YYYY-MM-DD' and onChange gets an event-shaped { target: { value } } — so it
// drops in wherever DateField was. onChange fires only once all three parts are
// picked ('' when cleared); a half-picked date stays on screen until finished.
// Strings only, never a Date object, so no timezone shifts.
export function DateSelect({ value, onChange, min, max, className, disabled, name }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'min' | 'max'> & {
  value?: string | number | readonly string[]
  min?: string | number
  max?: string | number
}) {
  const v = String(value ?? '')
  const [parts, setParts] = useState<Parts>(() => split(v))
  const lastSent = useRef(v)

  // Follow the parent when it sets or resets the value (edit prefill, form reset).
  useEffect(() => {
    if (v !== lastSent.current) { setParts(split(v)); lastSent.current = v }
  }, [v])

  const lo = min ? String(min) : ''
  const hi = max ? String(max) : ''
  const thisYear = Number(todayISO().slice(0, 4))
  // A saved year outside the usual window (old record) still shows as picked.
  const saved = Number(parts.y) || 0
  const minYear = Math.min(lo ? Number(lo.slice(0, 4)) : 1940, saved || Infinity)
  const maxYear = Math.max(hi ? Number(hi.slice(0, 4)) : thisYear + 30, saved)

  const emit = (iso: string) => {
    lastSent.current = iso
    const target = { value: iso, name: name ?? '' }
    onChange?.({ target, currentTarget: target } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch }
    // Keep the day valid for the month (31 Jan -> Feb becomes 28/29).
    if (next.d && next.m) {
      const last = daysIn(Number(next.y), Number(next.m))
      if (Number(next.d) > last) next.d = String(last)
    }
    if (next.d && next.m && next.y) {
      let iso = `${next.y}-${pad(Number(next.m))}-${pad(Number(next.d))}`
      // Out of range: pull back to the nearest allowed day.
      if (lo && iso < lo) iso = lo
      if (hi && iso > hi) iso = hi
      setParts(split(iso))
      emit(iso)
      return
    }
    setParts(next)
    if (lastSent.current) emit('')
  }

  const y = Number(parts.y), m = Number(parts.m)
  // Options past min/max are hidden once the year (and month) narrow it down.
  const monthOk = (mm: number) => !y || ((!lo || `${y}-${pad(mm)}` >= lo.slice(0, 7)) && (!hi || `${y}-${pad(mm)}` <= hi.slice(0, 7)))
  const dayOk = (dd: number) => !y || !m || ((!lo || `${y}-${pad(m)}-${pad(dd)}` >= lo) && (!hi || `${y}-${pad(m)}-${pad(dd)}` <= hi))

  const dayOpts = Array.from({ length: m ? daysIn(y, m) : 31 }, (_, i) => i + 1).filter(dayOk).map(d => ({ value: String(d), label: pad(d) }))
  const monthOpts = MONTHS.map((label, i) => ({ value: String(i + 1), label })).filter(o => monthOk(Number(o.value)))
  const yearOpts = Array.from({ length: Math.max(0, maxYear - minYear + 1) }, (_, i) => String(maxYear - i)).map(yy => ({ value: yy, label: yy }))

  const any = !!(parts.d || parts.m || parts.y)
  const btn = 'h-11 px-2.5 bg-white'

  return (
    <div className={cn('flex items-center gap-1.5', disabled && 'pointer-events-none opacity-60', className)}>
      <SearchableSelect className="flex-[0.85] min-w-0" buttonClassName={btn} placeholder="Day" disabled={disabled}
        value={parts.d} options={dayOpts} onChange={d => update({ d })} />
      <SearchableSelect className="flex-1 min-w-0" buttonClassName={btn} placeholder="Month" disabled={disabled}
        value={parts.m} options={monthOpts} onChange={mm => update({ m: mm })} />
      <SearchableSelect className="flex-[1.05] min-w-0" buttonClassName={btn} placeholder="Year" disabled={disabled}
        value={parts.y} options={yearOpts} onChange={yy => update({ y: yy })} />
      {any && !disabled && (
        <button type="button" title="Clear date" onClick={() => update({ d: '', m: '', y: '' })}
          className="flex-none p-1 text-slate-400 hover:text-red-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
